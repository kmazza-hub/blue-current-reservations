"use strict";
class V53RestaurantOperationalCertificationService{
 constructor(database,auditService,realtimeHub,workflowService,peakService,recoveryService){Object.assign(this,{database,auditService,realtimeHub,workflowService,peakService,recoveryService});}
 now(){return new Date().toISOString();}
 async reviews(org){const db=await this.database.read();return (db.v53RestaurantOperationalReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
 async certifications(org){const db=await this.database.read();return (db.v53RestaurantOperationalCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
 async snapshot(org,allowed){
  const [workflow,peak,recovery,reviews,certs]=await Promise.all([this.workflowService.snapshot(org,allowed),this.peakService.snapshot(org,allowed),this.recoveryService.snapshot(org,allowed),this.reviews(org),this.certifications(org)]);
  const review=reviews[0]||null,certification=certs[0]||null;
  const workflowReady=(workflow.locations||[]).length>0&&(workflow.locations||[]).every(x=>x.certification?.status==="RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED"||x.workflowReady);
  const peakReady=(peak.locations||[]).length>0&&(peak.locations||[]).every(x=>x.certification?.decision==="READY"||x.resilienceReady);
  const recoveryReady=(recovery.locations||[]).length>0&&(recovery.locations||[]).every(x=>x.decision?.decision==="RECOVER"||x.recoveryReady);
  const highCritical=(recovery.locations||[]).reduce((n,x)=>n+(x.highCriticalFindings||[]).length,0)+(peak.locations||[]).reduce((n,x)=>n+(x.latestObservation?.findings||[]).filter(f=>["high","critical"].includes(String(f.severity||"").toLowerCase())&&f.status!=="RESOLVED").length,0);
  const checks=[
   {id:"END_TO_END_WORKFLOW",passed:workflowReady,actual:workflow.status},
   {id:"PEAK_SERVICE_RESILIENCE",passed:peakReady,actual:peak.status},
   {id:"FAILURE_RECOVERY_CONTINUITY",passed:recoveryReady,actual:recovery.status},
   {id:"NO_HIGH_CRITICAL_OPERATIONAL_DEBT",passed:highCritical===0,actual:`${highCritical} high/critical finding(s)`},
   {id:"OPERATOR_ACCEPTANCE",passed:!!review?.operatorAcceptance,actual:review?.operatorAcceptance||"not reviewed"},
   {id:"SERVICE_LEADERSHIP_ACCEPTANCE",passed:!!review?.serviceLeadershipAcceptance,actual:review?.serviceLeadershipAcceptance||"not reviewed"},
   {id:"PILOT_OPERATING_MODEL",passed:!!review?.pilotOperatingModel,actual:review?.pilotOperatingModel?"documented":"missing"},
   {id:"SUPPORT_ESCALATION_MODEL",passed:!!review?.supportEscalationModel,actual:review?.supportEscalationModel?"documented":"missing"},
   {id:"V54_ENTRY_CRITERIA",passed:review?.v54EntryCriteria==="APPROVED",actual:review?.v54EntryCriteria||"not reviewed"},
   {id:"HUMAN_V53_CERTIFICATION",passed:!!certification,actual:certification?.status||"not certified"}
  ];
  const closureReady=checks.slice(0,-1).every(x=>x.passed);
  return {version:"54.0.0",generatedAt:this.now(),status:certification?"v53-restaurant-operations-certified":review?"v53-operational-certification-in-review":"v53-operational-certification-required",headline:`V53 operational closure ${closureReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,checks,closureReady,review,certification,linked:{workflow:{status:workflow.status,locations:(workflow.locations||[]).length},peak:{status:peak.status,locations:(peak.locations||[]).length},recovery:{status:recovery.status,locations:(recovery.locations||[]).length}},policy:{restaurantWorkflowEvidenceRequired:true,peakServiceEvidenceRequired:true,failureRecoveryEvidenceRequired:true,humanOperatorAcceptanceRequired:true,humanServiceLeadershipAcceptanceRequired:true,pilotOperatingModelRequired:true,supportEscalationModelRequired:true,humanV53CertificationRequired:true,certificationDoesNotDeploy:true,certificationDoesNotActivatePilot:true,certificationDoesNotMutateRestaurantState:true,autonomousProductionChanges:false}};
 }
 async review(org,allowed,input,actor){
  const required=["operatorAcceptance","serviceLeadershipAcceptance","pilotOperatingModel","supportEscalationModel"];for(const k of required)if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
  const v54EntryCriteria=String(input.v54EntryCriteria||"").toUpperCase();if(!["APPROVED","HOLD"].includes(v54EntryCriteria))throw new Error("v54EntryCriteria must be APPROVED or HOLD.");
  const record={id:`v53or_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,reviewedAt:this.now(),reviewedBy:actor,operatorAcceptance:String(input.operatorAcceptance).trim().slice(0,3500),serviceLeadershipAcceptance:String(input.serviceLeadershipAcceptance).trim().slice(0,3500),pilotOperatingModel:String(input.pilotOperatingModel).trim().slice(0,4500),supportEscalationModel:String(input.supportEscalationModel).trim().slice(0,4500),v54EntryCriteria,note:String(input.note||"").trim().slice(0,2500),restaurantStateMutated:false,pilotActivated:false};
  await this.database.mutate(db=>{db.v53RestaurantOperationalReviews||=[];db.v53RestaurantOperationalReviews.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:"V53 restaurant operational closure review recorded",category:"v53_operational_certification"});this.realtimeHub.publish("v53-operational-certification:reviewed",{organizationId:org,id:record.id});return record;
 }
 async certify(org,allowed,input,actor){
  const state=await this.snapshot(org,allowed);if(!state.closureReady)throw new Error("All V53 operational closure gates must pass before certification.");
  const evidence=String(input.evidence||"").trim(),acceptance=String(input.acceptance||"").trim();if(!evidence||!acceptance)throw new Error("Certification evidence and executive acceptance are required.");
  const record={id:`v53cert_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,status:"V53_RESTAURANT_OPERATIONAL_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4500),acceptance:acceptance.slice(0,3000),gateSnapshot:state.checks.slice(0,-1),deploymentPerformedByCertification:false,pilotActivatedByCertification:false,restaurantStateMutatedByCertification:false,autonomousProductionChanges:false};
  await this.database.mutate(db=>{db.v53RestaurantOperationalCertifications||=[];db.v53RestaurantOperationalCertifications.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:"V53 restaurant operations certified; V54 entry approved without deployment",category:"v53_operational_certification"});this.realtimeHub.publish("v53-operational-certification:certified",{organizationId:org,id:record.id});return record;
 }
}
module.exports=V53RestaurantOperationalCertificationService;
