"use strict";
class CommercialDeploymentReleaseDisciplineService {
 constructor(database,auditService,realtimeHub,supportabilityService){Object.assign(this,{database,auditService,realtimeHub,supportabilityService});}
 now(){return new Date().toISOString();}
 async approvals(org){const db=await this.database.read();return(db.commercialReleaseApprovals||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));}
 async snapshot(org,allowed){
  const [support,approvals]=await Promise.all([this.supportabilityService.snapshot(org,allowed),this.approvals(org)]),latest=approvals[0]||null;
  const checks=[
   {id:"SUPPORTABILITY_CLEAR",passed:support.releaseSupportable===true,actual:support.status},
   {id:"IMMUTABLE_BUILD_ID",passed:!!latest?.buildId,actual:latest?.buildId||"missing"},
   {id:"CHANGE_FREEZE_ACKNOWLEDGED",passed:latest?.changeFreeze===true,actual:String(latest?.changeFreeze===true)},
   {id:"PREDEPLOY_BACKUP_EVIDENCE",passed:!!latest?.backupEvidence,actual:latest?.backupEvidence?"recorded":"missing"},
   {id:"ROLLBACK_PLAN_EVIDENCE",passed:!!latest?.rollbackEvidence,actual:latest?.rollbackEvidence?"recorded":"missing"},
   {id:"DEPLOYMENT_PLAN_EVIDENCE",passed:!!latest?.deploymentPlan,actual:latest?.deploymentPlan?"recorded":"missing"},
   {id:"POSTDEPLOY_VERIFICATION_PLAN",passed:!!latest?.verificationPlan,actual:latest?.verificationPlan?"recorded":"missing"},
   {id:"HUMAN_RELEASE_APPROVAL",passed:latest?.decision==="APPROVED",actual:latest?.decision||"not approved"}];
  const ok=checks.every(x=>x.passed);
  return{version:"97.0.0",gate:"COMMERCIAL_HARDENING_DEPLOYMENT_RELEASE_DISCIPLINE",generatedAt:this.now(),releaseAuthorized:ok,status:ok?"CONTROLLED_RELEASE_AUTHORIZED":"CONTROLLED_RELEASE_BLOCKED",checks,latestApproval:latest,supportability:support,policy:{immutableBuildIdentityRequired:true,changeFreezeRequired:true,preDeployBackupRequired:true,rollbackEvidenceRequired:true,postDeployVerificationRequired:true,humanReleaseApprovalRequired:true,approvalDoesNotDeploy:true,noAutomaticDeployment:true,noAutomaticRollback:true,autonomousProductionChanges:false},nextGate:"LIVE_PILOT_EXECUTION_AND_FIELD_EVIDENCE"};
 }
 async approve(org,allowed,input,actor){
  const support=await this.supportabilityService.snapshot(org,allowed);if(!support.releaseSupportable)throw new Error("Production supportability must be clear before release approval.");
  for(const k of["buildId","backupEvidence","rollbackEvidence","deploymentPlan","verificationPlan"])if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
  if(input.changeFreeze!==true)throw new Error("changeFreeze must be explicitly acknowledged.");
  const decision=String(input.decision||"").toUpperCase();if(!["APPROVED","HOLD"].includes(decision))throw new Error("decision must be APPROVED or HOLD.");
  const rec={id:`cra_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,buildId:String(input.buildId).trim().slice(0,200),changeFreeze:true,backupEvidence:String(input.backupEvidence).trim().slice(0,3000),rollbackEvidence:String(input.rollbackEvidence).trim().slice(0,3000),deploymentPlan:String(input.deploymentPlan).trim().slice(0,4000),verificationPlan:String(input.verificationPlan).trim().slice(0,4000),createdAt:this.now(),createdBy:actor,deploymentPerformed:false};
  await this.database.mutate(db=>{db.commercialReleaseApprovals||=[];db.commercialReleaseApprovals.push(rec);return rec;});
  await this.auditService.record({organizationId:org,actor,action:`Commercial release ${decision}: ${rec.buildId}`,category:"commercial_release"});this.realtimeHub.publish("commercial-release:approval",{organizationId:org,id:rec.id,decision,buildId:rec.buildId});return rec;
 }}
module.exports=CommercialDeploymentReleaseDisciplineService;
