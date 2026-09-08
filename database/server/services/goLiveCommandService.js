"use strict";

class GoLiveCommandService {
  constructor(database,auditService,realtimeHub,locationDeploymentPackageService,technicalActivationReadinessService){
    Object.assign(this,{database,auditService,realtimeHub,locationDeploymentPackageService,technicalActivationReadinessService});
  }
  now(){return new Date().toISOString();}
  async commands(organizationId){
    const db=await this.database.read();
    return (db.goLiveCommands||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async results(organizationId){
    const db=await this.database.read();
    return (db.goLiveCutoverResults||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.recordedAt)-new Date(a.recordedAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [deployment,technical,commands,results]=await Promise.all([
      this.locationDeploymentPackageService.snapshot(organizationId,allowedLocationIds),
      this.technicalActivationReadinessService.snapshot(organizationId,allowedLocationIds),
      this.commands(organizationId),
      this.results(organizationId)
    ]);
    const technicalMap=new Map((technical.locations||[]).map(x=>[x.locationId,x]));
    const latestCommand=new Map();
    for(const x of commands)if(!latestCommand.has(x.locationId))latestCommand.set(x.locationId,x);
    const latestResult=new Map();
    for(const x of results)if(!latestResult.has(x.locationId))latestResult.set(x.locationId,x);

    const locations=(deployment.locations||[]).map(loc=>{
      const pkg=loc.deploymentPackage||null;
      const tech=technicalMap.get(loc.locationId)||null;
      const command=latestCommand.get(loc.locationId)||null;
      const result=latestResult.get(loc.locationId)||null;
      const finalChecks=[
        {id:"deployment-package",label:"Deployment package is prepared",passed:pkg?.status==="READY_FOR_DEPLOYMENT_EXECUTION",actual:pkg?.status||"missing"},
        {id:"go-live-authorization",label:"Human go-live authorization remains present",passed:loc.goLiveAuthorized===true,actual:loc.goLiveAuthorized?"authorized":"not authorized"},
        {id:"technical-readiness",label:"Technical readiness is currently complete or was explicitly overridden at authorization",passed:tech?.technicallyReady===true||tech?.goLiveAuthorization?.overrideUsed===true,actual:tech?.technicallyReady?"ready":tech?.goLiveAuthorization?.overrideUsed?"authorized override":"not ready"},
        {id:"deployment-owner",label:"Deployment owner is assigned",passed:!!pkg?.deploymentOwner,actual:pkg?.deploymentOwner||"missing"},
        {id:"rollback-owner",label:"Rollback owner is assigned",passed:!!pkg?.rollbackOwner,actual:pkg?.rollbackOwner||"missing"},
        {id:"launch-window",label:"Launch window is defined",passed:!!pkg?.launchWindow,actual:pkg?.launchWindow||"missing"},
        {id:"cutover-not-already-complete",label:"Production cutover is not already recorded complete",passed:result?.status!=="CUTOVER_SUCCEEDED",actual:result?.status||"not recorded"}
      ];
      const passed=finalChecks.filter(x=>x.passed).length;
      return {
        locationId:loc.locationId,locationName:loc.locationName,wave:loc.wave,
        packageId:pkg?.id||null,
        packageState:loc.packageState,
        deploymentOwner:pkg?.deploymentOwner||null,
        rollbackOwner:pkg?.rollbackOwner||null,
        launchWindow:pkg?.launchWindow||null,
        finalChecks,finalPassed:passed,finalTotal:finalChecks.length,
        finalPreCutoverPassed:passed===finalChecks.length,
        command,result,
        commandState:command?.status||"NOT_AUTHORIZED",
        cutoverResultState:result?.status||"NOT_RECORDED",
        productionState:result?.status==="CUTOVER_SUCCEEDED"?"CUTOVER_RECORDED_SUCCESS":result?.status==="ROLLED_BACK"?"ROLLED_BACK":result?.status==="CUTOVER_FAILED"?"CUTOVER_FAILED":"NOT_PERFORMED"
      };
    });

    return {
      version:"49.20.0",generatedAt:this.now(),
      status:!deployment.locations?.length?"deployment-package-required":locations.every(x=>x.result?.status==="CUTOVER_SUCCEEDED")?"cutover-results-complete":"go-live-command-review",
      headline:!deployment.locations?.length?"A prepared location deployment package is required before Go-Live Command.":`${locations.filter(x=>x.finalPreCutoverPassed).length}/${locations.length} location(s) currently pass the final pre-cutover command checks.`,
      locations,commandHistory:commands,resultHistory:results,
      policy:{
        explicitExecutionAuthorizationRequired:true,
        adminExecutionAuthorizationRequired:true,
        authorizationDoesNotExecuteDeployment:true,
        resultRecordingIsManual:true,
        automatedCutover:false,
        autonomousProductionDeployment:false,
        rollbackMustBeHumanDirected:true
      }
    };
  }

  async authorizeExecution(organizationId,allowedLocationIds,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snapshot.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location does not have a deployment package in Go-Live Command.");
    const operator=String(input.deploymentOperator||loc.deploymentOwner||actor||"").trim().slice(0,160);
    const rollbackOperator=String(input.rollbackOperator||loc.rollbackOwner||"").trim().slice(0,160);
    if(!operator)throw new Error("Deployment operator is required.");
    if(!rollbackOperator)throw new Error("Rollback operator is required.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1500);
    if(!loc.finalPreCutoverPassed&&!overrideReason)throw new Error("Final pre-cutover checks have open gates. A documented executive override reason is required.");
    const now=this.now();
    const record={
      id:`glc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,wave:loc.wave,packageId:loc.packageId,
      status:"AUTHORIZED_FOR_MANUAL_CUTOVER",
      deploymentExecutionState:"AUTHORIZED_NOT_EXECUTED",
      productionCutoverState:"NOT_PERFORMED",
      deploymentOperator:operator,rollbackOperator,
      authorizedBy:actor,authorizedAt:now,
      launchWindow:String(input.launchWindow||loc.launchWindow||"").slice(0,160),
      overrideUsed:!loc.finalPreCutoverPassed,overrideReason,
      finalPreCutoverSnapshot:{passed:loc.finalPassed,total:loc.finalTotal,checks:loc.finalChecks},
      note:String(input.note||"").slice(0,1000)
    };
    await this.database.mutate(db=>{db.goLiveCommands||=[];db.goLiveCommands.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Manual production cutover authorized for ${locationId}; execution NOT performed${record.overrideUsed?" with documented override":""}`,category:"go_live_command"});
    this.realtimeHub.publish("go-live-command:authorized",{id:record.id,organizationId,locationId,deploymentOperator:operator,overrideUsed:record.overrideUsed});
    return record;
  }

  async recordResult(organizationId,allowedLocationIds,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snapshot.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location is not in Go-Live Command.");
    if(loc.command?.status!=="AUTHORIZED_FOR_MANUAL_CUTOVER")throw new Error("Manual cutover execution authorization is required before recording a cutover result.");
    const status=String(input.status||"").toUpperCase();
    if(!["CUTOVER_SUCCEEDED","CUTOVER_FAILED","ROLLED_BACK"].includes(status))throw new Error("Result status must be CUTOVER_SUCCEEDED, CUTOVER_FAILED, or ROLLED_BACK.");
    const operator=String(input.deploymentOperator||loc.command.deploymentOperator||actor||"").trim().slice(0,160);
    const rollbackOperator=String(input.rollbackOperator||loc.command.rollbackOperator||"").trim().slice(0,160);
    const health={
      apiHealthy:input.apiHealthy===true,
      authenticationHealthy:input.authenticationHealthy===true,
      reservationIntegrity:input.reservationIntegrity===true,
      floorIntegrity:input.floorIntegrity===true,
      kitchenIntegrity:input.kitchenIntegrity===true,
      workforceIntegrity:input.workforceIntegrity===true
    };
    const healthPassed=Object.values(health).filter(Boolean).length;
    if(status==="CUTOVER_SUCCEEDED"&&healthPassed<Object.keys(health).length)throw new Error("CUTOVER_SUCCEEDED requires all post-cutover health checks to pass.");
    if(status==="ROLLED_BACK"&&!rollbackOperator)throw new Error("Rollback operator is required for ROLLED_BACK.");
    const incident=String(input.incident||"").trim().slice(0,1500);
    if(status==="CUTOVER_FAILED"&&!incident)throw new Error("CUTOVER_FAILED requires a launch incident description.");
    const now=this.now();
    const record={
      id:`glr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,wave:loc.wave,
      commandId:loc.command.id,packageId:loc.packageId,
      status,
      deploymentOperator:operator,rollbackOperator,
      recordedBy:actor,recordedAt:now,
      postCutoverHealth:{...health,passed:healthPassed,total:Object.keys(health).length},
      incident,
      note:String(input.note||"").slice(0,1000),
      systemExecutionClaim:false,
      resultSource:"HUMAN_RECORDED"
    };
    await this.database.mutate(db=>{
      db.goLiveCutoverResults||=[];
      db.goLiveCutoverResults.push(record);
      const pkg=(db.locationDeploymentPackages||[]).find(x=>x.id===loc.packageId);
      if(pkg){
        pkg.deploymentExecutionState=status==="CUTOVER_SUCCEEDED"?"MANUAL_CUTOVER_RECORDED":status==="ROLLED_BACK"?"ROLLBACK_RECORDED":"MANUAL_CUTOVER_FAILED";
        pkg.productionCutoverState=status;
      }
      return record;
    });
    await this.auditService.record({organizationId,actor,action:`Human-recorded cutover result for ${locationId}: ${status}; Blue Current did not execute deployment`,category:"go_live_command"});
    this.realtimeHub.publish("go-live-command:result-recorded",{id:record.id,organizationId,locationId,status});
    return record;
  }
}
module.exports=GoLiveCommandService;
