"use strict";

class LocationDeploymentPackageService {
  constructor(database,auditService,realtimeHub,technicalActivationReadinessService){
    Object.assign(this,{database,auditService,realtimeHub,technicalActivationReadinessService});
  }
  now(){return new Date().toISOString();}
  async packages(organizationId){
    const db=await this.database.read();
    return (db.locationDeploymentPackages||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  buildManifest(location,technical,input={}){
    const auth=location.goLiveAuthorization;
    const moduleMatrix=(location.checks||[])
      .filter(x=>["floor","reservations","kitchen","workforce"].includes(x.category))
      .map(x=>({
        module:x.category,
        enabledForDeployment:x.passed,
        source:x.actual,
        required:x.required
      }));
    const connectorRequirements=(location.checks||[])
      .filter(x=>x.category==="integrations"||["reservation-model","kitchen-model","workforce-model"].includes(x.id))
      .map(x=>({id:x.id,label:x.label,current:x.actual,required:x.required,satisfied:x.passed}));
    return {
      locationId:location.locationId,
      locationName:location.locationName,
      wave:location.wave,
      technicalReadinessPercent:location.technicalReadinessPercent,
      technicallyReady:location.technicallyReady,
      goLiveAuthorizationId:auth?.id||null,
      goLiveApprover:auth?.approver||null,
      launchWindow:String(input.launchWindow||auth?.launchWindow||"").slice(0,160),
      deploymentOwner:String(input.deploymentOwner||auth?.approver||"").slice(0,160),
      rollbackOwner:String(input.rollbackOwner||auth?.rollbackOwner||"").slice(0,160),
      configurationRequirements:(location.checks||[]).filter(x=>["configuration","identity"].includes(x.category)).map(x=>({id:x.id,label:x.label,satisfied:x.passed,current:x.actual})),
      moduleEnablementMatrix:moduleMatrix,
      connectorRequirements,
      blockers:location.blockers||[],
      warnings:location.warnings||[],
      rollbackRunbook:{
        owner:String(input.rollbackOwner||auth?.rollbackOwner||"").slice(0,160),
        trigger:String(input.rollbackTrigger||"Critical authentication, data integrity, integration, or service degradation after cutover.").slice(0,700),
        actions:[
          "Stop new production cutover actions for the affected location.",
          "Restore the last certified application/configuration checkpoint.",
          "Disable newly introduced external connector traffic where applicable.",
          "Confirm reservations, floor, kitchen, workforce, and authentication data integrity.",
          "Record incident owner, timeline, decision, and recovery evidence before resuming launch."
        ]
      },
      launchRunbook:[
        "Confirm signed human go-live authorization remains valid.",
        "Re-run technical readiness immediately before the launch window.",
        "Confirm deployment owner and rollback owner are available.",
        "Verify configuration and access requirements.",
        "Verify enabled module set and connector state.",
        "Perform production cutover only through an explicit deployment execution workflow.",
        "Run post-cutover health and data-integrity verification.",
        "Enter stabilization monitoring before declaring the location live."
      ]
    };
  }
  async snapshot(organizationId,allowedLocationIds){
    const [technical,packages]=await Promise.all([
      this.technicalActivationReadinessService.snapshot(organizationId,allowedLocationIds),
      this.packages(organizationId)
    ]);
    const latestByLocation=new Map();
    for(const p of packages)if(!latestByLocation.has(p.locationId))latestByLocation.set(p.locationId,p);
    const locations=(technical.locations||[]).map(x=>{
      const pkg=latestByLocation.get(x.locationId)||null;
      return {
        locationId:x.locationId,locationName:x.locationName,wave:x.wave,
        technicallyReady:x.technicallyReady,
        goLiveAuthorized:x.goLiveAuthorization?.status==="AUTHORIZED_FOR_GO_LIVE",
        goLiveState:x.goLiveState,
        blockers:x.blockers||[],
        deploymentPackage:pkg,
        packageState:pkg?.status||"NOT_PREPARED",
        deploymentExecutionState:pkg?.deploymentExecutionState||"NOT_STARTED"
      };
    });
    return {
      version:"49.15.0",generatedAt:this.now(),
      status:!technical.activationPlan?"technical-plan-required":locations.some(x=>x.goLiveAuthorized)?"deployment-package-review":"go-live-authorization-required",
      headline:!technical.activationPlan?"Technical activation plan is required before deployment packaging.":`${locations.filter(x=>x.goLiveAuthorized).length}/${locations.length} location(s) have human go-live authorization and can be packaged for deployment.`,
      locations,packageHistory:packages,
      policy:{
        goLiveAuthorizationRequired:true,
        adminPackagePreparationRequired:true,
        packagePreparationDoesNotDeploy:true,
        deploymentExecutionSeparate:true,
        automaticProvisioning:false,
        automaticDeployment:false,
        automaticCutover:false
      }
    };
  }
  async prepare(organizationId,allowedLocationIds,locationId,input,actor){
    const technical=await this.technicalActivationReadinessService.snapshot(organizationId,allowedLocationIds);
    const location=(technical.locations||[]).find(x=>x.locationId===locationId);
    if(!location)throw new Error("Location is not in technical activation readiness.");
    if(location.goLiveAuthorization?.status!=="AUTHORIZED_FOR_GO_LIVE")throw new Error("Human go-live authorization is required before preparing a deployment package.");
    const deploymentOwner=String(input.deploymentOwner||location.goLiveAuthorization.approver||"").trim().slice(0,160);
    const rollbackOwner=String(input.rollbackOwner||location.goLiveAuthorization.rollbackOwner||"").trim().slice(0,160);
    if(!deploymentOwner)throw new Error("Deployment owner is required.");
    if(!rollbackOwner)throw new Error("Rollback owner is required.");
    const manifest=this.buildManifest(location,technical,{...input,deploymentOwner,rollbackOwner});
    const now=this.now();
    const record={
      id:`ldp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:location.locationName,wave:location.wave,
      status:"READY_FOR_DEPLOYMENT_EXECUTION",
      deploymentExecutionState:"NOT_STARTED",
      productionCutoverState:"NOT_PERFORMED",
      createdAt:now,createdBy:actor,
      deploymentOwner,rollbackOwner,
      launchWindow:manifest.launchWindow,
      note:String(input.note||"").slice(0,1000),
      manifest
    };
    await this.database.mutate(db=>{db.locationDeploymentPackages||=[];db.locationDeploymentPackages.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Location deployment package prepared for ${locationId}; execution NOT started; cutover NOT performed`,category:"technical_activation"});
    this.realtimeHub.publish("location-deployment:package-prepared",{id:record.id,organizationId,locationId,deploymentOwner});
    return record;
  }
  async packet(organizationId,allowedLocationIds,locationId){
    const snapshot=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snapshot.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location is not in deployment-package review.");
    return {
      version:"49.15.0",generatedAt:this.now(),
      locationId,locationName:loc.locationName,
      goLiveAuthorized:loc.goLiveAuthorized,
      packageState:loc.packageState,
      deploymentExecutionState:loc.deploymentExecutionState,
      package:loc.deploymentPackage,
      policy:snapshot.policy
    };
  }
}
module.exports=LocationDeploymentPackageService;
