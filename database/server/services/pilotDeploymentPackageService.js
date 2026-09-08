"use strict";

class PilotDeploymentPackageService {
  constructor(database,auditService,realtimeHub,managementExecutiveAccuracyService){
    Object.assign(this,{database,auditService,realtimeHub,managementExecutiveAccuracyService});
    this.checklist=[
      {id:"LOCATION_CONFIG",label:"Restaurant/location configuration"},
      {id:"ENVIRONMENT_PREFLIGHT",label:"Environment and runtime preflight"},
      {id:"ACCESS_PACKAGE",label:"Pilot accounts and access"},
      {id:"CONNECTOR_CHECKLIST",label:"Connector/configuration checklist"},
      {id:"BACKUP_RESTORE",label:"Backup and restore procedure"},
      {id:"STARTUP_RESTART",label:"Startup and restart procedure"},
      {id:"SUPPORT_ESCALATION",label:"Support and escalation procedure"},
      {id:"ROLLBACK",label:"Rollback procedure"},
      {id:"DEPLOYMENT_MANIFEST",label:"Deployment manifest"},
      {id:"DEPLOYMENT_EVIDENCE",label:"Deployment evidence"}
    ];
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async packages(organizationId){
    const db=await this.database.read();
    return (db.pilotDeploymentPackages||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async certifications(organizationId){
    const db=await this.database.read();
    return (db.pilotDeploymentCertifications||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  buildLocationConfig(db,organizationId,locationId){
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId)||null;
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const sections=(db.sections||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const memberships=(db.memberships||[]).filter(x=>x.organizationId===organizationId&&((x.locationIds||[]).includes("*")||(x.locationIds||[]).includes(locationId)));
    const connectors=(db.liveConnectors||[]).filter(x=>x.organizationId===organizationId&&(!x.locationId||x.locationId===locationId));
    return {location,tables:tables.length,sections:sections.length,memberships:memberships.length,connectors};
  }
  procedures(){
    return {
      backupRestore:{
        backup:"Stop the runtime, copy database/data/blue-current.json to a timestamped protected backup, verify SHA-256, then restart.",
        restore:"Stop the runtime, preserve the failed database, restore the verified backup to the configured BLUE_CURRENT_DB path, restart, then run health/auth checks."
      },
      startupRestart:{
        startup:"Run npm run check, then npm run start. Verify /api/health returns the expected release version before operator login.",
        restart:"Terminate the Node process cleanly, run npm run check, restart the service, verify /api/health, authenticate, and reopen the pilot surface."
      },
      supportEscalation:{
        firstLine:"Restaurant pilot lead / GM records the issue, timestamp, location, workflow, screenshot/log evidence, and immediate guest/service impact.",
        escalation:"Escalate application/runtime issues to Blue Current technical owner; escalate access/security or data-integrity issues immediately and suspend the affected workflow if necessary."
      },
      rollback:{
        trigger:"Rollback when the deployed wave causes a reproducible pilot-blocking regression, data-integrity risk, authorization regression, or unrecoverable startup/runtime failure.",
        procedure:"Stop the service, preserve logs/database, restore the last verified repository/database backup, run the prior release regression tests, then restart and verify health/auth before resuming."
      }
    };
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,accuracy,packages,certs]=await Promise.all([
      this.database.read(),
      this.managementExecutiveAccuracyService.snapshot(organizationId,allowedLocationIds),
      this.packages(organizationId),
      this.certifications(organizationId)
    ]);
    const packageMap=new Map(packages.map(x=>[x.locationId,x]));
    const certMap=new Map(certs.map(x=>[x.locationId,x]));
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds)).map(loc=>{
      const config=this.buildLocationConfig(db,organizationId,loc.id);
      const pkg=packageMap.get(loc.id)||null;
      const certification=certMap.get(loc.id)||null;
      const accuracyLoc=accuracy.locations.find(x=>x.locationId===loc.id)||null;
      const checks=[
        {id:"LOCATION_CONFIG",passed:!!config.location&&config.tables>0&&config.sections>0,actual:`${config.tables} tables · ${config.sections} sections`},
        {id:"ENVIRONMENT_PREFLIGHT",passed:true,actual:"repository validation + health/auth verification procedure defined"},
        {id:"ACCESS_PACKAGE",passed:config.memberships>0,actual:`${config.memberships} authorized membership(s)`},
        {id:"CONNECTOR_CHECKLIST",passed:true,actual:`${config.connectors.length} connector record(s); explicit configuration review required`},
        {id:"BACKUP_RESTORE",passed:true,actual:"documented procedure available"},
        {id:"STARTUP_RESTART",passed:true,actual:"documented procedure available"},
        {id:"SUPPORT_ESCALATION",passed:true,actual:"documented procedure available"},
        {id:"ROLLBACK",passed:true,actual:"documented procedure available"},
        {id:"DEPLOYMENT_MANIFEST",passed:!!pkg,actual:pkg?pkg.releaseVersion:"not generated"},
        {id:"DEPLOYMENT_EVIDENCE",passed:!!pkg?.evidence,actual:pkg?.evidence?"human evidence recorded":"not recorded"}
      ];
      const passed=checks.filter(x=>x.passed).length;
      return {
        locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,
        checks,passed,total:checks.length,
        deploymentReady:passed===checks.length,
        package:pkg,certification,
        executiveAccuracyState:accuracyLoc?.trustState||null,
        configSummary:{tables:config.tables,sections:config.sections,memberships:config.memberships,connectors:config.connectors.length},
        deploymentState:certification?.status==="PILOT_DEPLOYMENT_CERTIFIED"?"PILOT_DEPLOYMENT_CERTIFIED":pkg?"PACKAGE_GENERATED":"PACKAGE_REQUIRED"
      };
    });
    return {
      version:"51.50.0",generatedAt:this.now(),
      status:locations.length===0?"restaurant-required":locations.every(x=>x.certification?.status==="PILOT_DEPLOYMENT_CERTIFIED")?"pilot-deployment-certified":locations.some(x=>x.package)?"pilot-deployment-packages-in-progress":"pilot-deployment-package-required",
      headline:`${locations.filter(x=>x.deploymentReady).length}/${locations.length} location(s) currently have complete deployment-package evidence.`,
      checklist:this.checklist,locations,procedures:this.procedures(),
      policy:{
        packageGenerationDoesNotDeploy:true,
        deploymentEvidenceHumanRequired:true,
        certificationHumanRequired:true,
        rollbackProcedureRequired:true,
        backupRestoreProcedureRequired:true,
        supportEscalationRequired:true,
        automaticDeployment:false,
        automaticGoLive:false,
        autonomousProductionChanges:false
      }
    };
  }
  async generate(organizationId,allowedLocationIds,locationId,input,actor){
    if(!this.allowed(locationId,allowedLocationIds))throw new Error("Location is outside your authorized scope.");
    const db=await this.database.read();
    const config=this.buildLocationConfig(db,organizationId,locationId);
    if(!config.location)throw new Error("Restaurant location not found.");
    const evidence=String(input.evidence||"").trim().slice(0,3000);
    if(!evidence)throw new Error("Human deployment-package evidence is required.");
    const releaseVersion=String(input.releaseVersion||"51.50.0").trim().slice(0,80);
    const supportOwner=String(input.supportOwner||"").trim().slice(0,160);
    const escalationOwner=String(input.escalationOwner||"").trim().slice(0,160);
    if(!supportOwner)throw new Error("Pilot support owner is required.");
    if(!escalationOwner)throw new Error("Pilot escalation owner is required.");
    const now=this.now();
    const record={
      id:`pdp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:config.location.name||config.location.displayName||locationId,
      status:"PILOT_DEPLOYMENT_PACKAGE_GENERATED",createdAt:now,createdBy:actor,
      releaseVersion,evidence,supportOwner,escalationOwner,
      environment:String(input.environment||"pilot").trim().slice(0,80),
      deploymentWindow:String(input.deploymentWindow||"").trim().slice(0,240),
      configuration:{
        locationId,locationName:config.location.name||config.location.displayName||locationId,
        tables:config.tables,sections:config.sections,memberships:config.memberships,
        connectors:config.connectors.map(x=>({id:x.id,type:x.type,status:x.status}))
      },
      procedures:this.procedures(),
      manifest:{
        releaseVersion,
        expectedHealthVersion:"51.50.0",
        validationCommands:[
          "npm run check",
          "node scripts/maintenance/test-v51.50-pilot-deployment-package.js",
          "node scripts/maintenance/test-v51.45-management-executive-accuracy.js",
          "npm run start",
          "curl.exe -s http://localhost:8787/api/health"
        ],
        automaticDeployment:false,automaticGoLive:false
      },
      deploymentPerformed:false,goLivePerformed:false
    };
    await this.database.mutate(db=>{db.pilotDeploymentPackages||=[];db.pilotDeploymentPackages.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Pilot deployment package generated for ${locationId}; no deployment performed`,category:"pilot_deployment"});
    this.realtimeHub.publish("pilot-deployment:package-generated",{organizationId,locationId,id:record.id});
    return record;
  }
  async certify(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant location not found.");
    if(!loc.deploymentReady)throw new Error("Pilot deployment package checklist must be complete before certification.");
    const evidence=String(input.evidence||"").trim().slice(0,3200);
    const note=String(input.note||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human pilot-deployment certification evidence is required.");
    if(!note)throw new Error("Human pilot-deployment certification note is required.");
    const record={
      id:`pdc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,
      status:"PILOT_DEPLOYMENT_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,
      evidence,note,packageId:loc.package?.id||null,
      checklistSnapshot:loc.checks,
      deploymentPerformedByCertification:false,
      goLivePerformedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.pilotDeploymentCertifications||=[];db.pilotDeploymentCertifications.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Pilot deployment package certified for ${locationId}; deployment/go-live not performed`,category:"pilot_deployment"});
    this.realtimeHub.publish("pilot-deployment:certified",{organizationId,locationId,id:record.id});
    return record;
  }
}
module.exports=PilotDeploymentPackageService;
