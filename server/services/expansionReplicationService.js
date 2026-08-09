"use strict";
class ExpansionReplicationService {
  constructor(database,auditService,realtimeHub,pilotCloseoutOutcomeService,pilotDeploymentPackageService){Object.assign(this,{database,auditService,realtimeHub,pilotCloseoutOutcomeService,pilotDeploymentPackageService});}
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async packages(org){const db=await this.database.read();return(db.expansionReplicationPackages||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
  async approvals(org){const db=await this.database.read();return(db.expansionReplicationApprovals||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt));}
  async snapshot(org,allowed){
    const [db,closeout,deployment,packages,approvals]=await Promise.all([this.database.read(),this.pilotCloseoutOutcomeService.snapshot(org,allowed),this.pilotDeploymentPackageService.snapshot(org,allowed),this.packages(org),this.approvals(org)]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===org&&this.allowed(x.id,allowed));
    const pilot=(closeout.locations||[]).find(x=>x.decision?.decision==="EXPAND")||null;
    const targets=locations.filter(x=>!pilot||x.id!==pilot.locationId).map(loc=>{
      const pkg=packages.find(x=>x.targetLocationId===loc.id)||null,approval=approvals.find(x=>x.targetLocationId===loc.id)||null,dep=(deployment.locations||[]).find(x=>x.locationId===loc.id)||null;
      const checks=[
        {id:"PILOT_EXPANSION_APPROVED",passed:!!pilot,actual:pilot?pilot.locationName:"no pilot EXPAND decision"},
        {id:"TARGET_CONFIG_PRESENT",passed:(dep?.configSummary?.tables||0)>0&&(dep?.configSummary?.sections||0)>0,actual:`${dep?.configSummary?.tables||0} tables · ${dep?.configSummary?.sections||0} sections`},
        {id:"ACCESS_SCOPE_PRESENT",passed:(dep?.configSummary?.memberships||0)>0,actual:`${dep?.configSummary?.memberships||0} membership(s)`},
        {id:"CONNECTOR_REVIEW",passed:!!pkg?.connectorReview,actual:pkg?.connectorReview?"recorded":"not recorded"},
        {id:"CONFIG_DELTA_REVIEW",passed:!!pkg?.configurationDeltaReview,actual:pkg?.configurationDeltaReview?"recorded":"not recorded"},
        {id:"TRAINING_REHEARSAL",passed:!!pkg?.trainingRehearsalPlan,actual:pkg?.trainingRehearsalPlan?"recorded":"not recorded"},
        {id:"SUPPORT_ROLLBACK_PLAN",passed:!!pkg?.supportRollbackPlan,actual:pkg?.supportRollbackPlan?"recorded":"not recorded"},
        {id:"REPLICATION_EVIDENCE",passed:!!pkg?.evidence,actual:pkg?.evidence?"recorded":"not recorded"},
        {id:"HUMAN_APPROVAL",passed:approval?.status==="EXPANSION_REPLICATION_APPROVED",actual:approval?.status||"not approved"}
      ];
      return{targetLocationId:loc.id,targetLocationName:loc.name||loc.displayName||loc.id,sourcePilot:pilot?{locationId:pilot.locationId,locationName:pilot.locationName,decision:"EXPAND"}:null,package:pkg,approval,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,replicationReady:checks.slice(0,8).every(x=>x.passed),state:approval?.status==="EXPANSION_REPLICATION_APPROVED"?"REPLICATION_APPROVED":pkg?"REPLICATION_PACKAGE_GENERATED":"REPLICATION_PACKAGE_REQUIRED"};
    });
    return{version:"52.15.0",generatedAt:this.now(),status:targets.some(x=>x.approval?.status==="EXPANSION_REPLICATION_APPROVED")?"expansion-replication-approved":targets.some(x=>x.package)?"expansion-replication-in-review":"expansion-replication-required",headline:`${targets.filter(x=>x.replicationReady).length}/${targets.length} target location(s) satisfy replication-package gates; ${targets.filter(x=>x.approval).length} approval(s) recorded.`,pilotSource:pilot?{locationId:pilot.locationId,locationName:pilot.locationName}:null,targets,policy:{successfulPilotExpandDecisionRequired:true,targetLocationReviewRequired:true,configurationDeltaReviewRequired:true,connectorReviewRequired:true,trainingRehearsalPlanRequired:true,supportRollbackPlanRequired:true,humanReplicationApprovalRequired:true,approvalDoesNotDeploy:true,approvalDoesNotGoLive:true,noAutomaticMultiLocationRollout:true,autonomousProductionChanges:false}};
  }
  async generate(org,allowed,targetLocationId,input,actor){
    if(!this.allowed(targetLocationId,allowed))throw new Error("Target location is outside your authorized scope.");
    const snap=await this.snapshot(org,allowed); if(!snap.pilotSource)throw new Error("A human EXPAND decision from pilot closeout is required before replication packaging.");
    const target=snap.targets.find(x=>x.targetLocationId===targetLocationId); if(!target)throw new Error("Target location not found.");
    for(const key of ["connectorReview","configurationDeltaReview","trainingRehearsalPlan","supportRollbackPlan","evidence"])if(!String(input[key]||"").trim())throw new Error(`${key} is required.`);
    const record={id:`erp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,sourcePilotLocationId:snap.pilotSource.locationId,sourcePilotLocationName:snap.pilotSource.locationName,targetLocationId,targetLocationName:target.targetLocationName,status:"EXPANSION_REPLICATION_PACKAGE_GENERATED",createdAt:this.now(),createdBy:actor,connectorReview:String(input.connectorReview).trim().slice(0,3000),configurationDeltaReview:String(input.configurationDeltaReview).trim().slice(0,3000),trainingRehearsalPlan:String(input.trainingRehearsalPlan).trim().slice(0,3000),supportRollbackPlan:String(input.supportRollbackPlan).trim().slice(0,3000),evidence:String(input.evidence).trim().slice(0,3500),note:String(input.note||"").trim().slice(0,1800),deploymentPerformed:false,goLivePerformed:false,productionMutationPerformed:false};
    await this.database.mutate(db=>{db.expansionReplicationPackages||=[];db.expansionReplicationPackages.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Expansion replication package generated for ${targetLocationId}; no deployment performed`,category:"expansion_replication"});
    this.realtimeHub.publish("expansion-replication:package-generated",{organizationId:org,targetLocationId,id:record.id}); return record;
  }
  async approve(org,allowed,targetLocationId,input,actor){
    const snap=await this.snapshot(org,allowed),target=snap.targets.find(x=>x.targetLocationId===targetLocationId); if(!target?.replicationReady)throw new Error("Replication package gates must pass before approval.");
    const evidence=String(input.evidence||"").trim(),note=String(input.note||"").trim(); if(!evidence||!note)throw new Error("Human replication approval evidence and note are required.");
    const record={id:`era_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,targetLocationId,targetLocationName:target.targetLocationName,sourcePilotLocationId:target.sourcePilot.locationId,status:"EXPANSION_REPLICATION_APPROVED",approvedAt:this.now(),approvedBy:actor,evidence:evidence.slice(0,3500),note:note.slice(0,1800),gateSnapshot:target.checks,deploymentPerformedByApproval:false,goLivePerformedByApproval:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.expansionReplicationApprovals||=[];db.expansionReplicationApprovals.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Expansion replication approved for ${targetLocationId}; approval did not deploy or go live`,category:"expansion_replication"});
    this.realtimeHub.publish("expansion-replication:approved",{organizationId:org,targetLocationId,id:record.id}); return record;
  }
}
module.exports=ExpansionReplicationService;
