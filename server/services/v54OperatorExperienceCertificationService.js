"use strict";
class V54OperatorExperienceCertificationService{
 constructor(database,auditService,realtimeHub,operatorSpeedWorkflowSimplificationService,managerInterventionDecisionSpeedService,roleBasedServiceErgonomicsService){Object.assign(this,{database,auditService,realtimeHub,operatorSpeedWorkflowSimplificationService,managerInterventionDecisionSpeedService,roleBasedServiceErgonomicsService});}
 now(){return new Date().toISOString();}
 async reviews(org){const db=await this.database.read();return (db.v54OperatorExperienceReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
 async certifications(org){const db=await this.database.read();return (db.v54OperatorExperienceCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
 async snapshot(org,allowed){
  const [speed,manager,ergonomics,reviews,certs]=await Promise.all([this.operatorSpeedWorkflowSimplificationService.snapshot(org,allowed),this.managerInterventionDecisionSpeedService.snapshot(org,allowed),this.roleBasedServiceErgonomicsService.snapshot(org,allowed),this.reviews(org),this.certifications(org)]);
  const review=reviews[0]||null,cert=certs[0]||null;
  const speedReady=(speed.locations||[]).length>0&&(speed.locations||[]).every(x=>x.usabilityReady||x.certification?.decision==="READY");
  const managerReady=(manager.locations||[]).length>0&&(manager.locations||[]).every(x=>x.decisionReady||x.certification?.decision==="READY");
  const ergonomicReady=(ergonomics.locations||[]).length>0&&(ergonomics.locations||[]).every(x=>x.ergonomicReady||x.certification?.decision==="READY");
  const checks=[
   {id:"OPERATOR_SPEED",passed:speedReady,actual:speed.status},
   {id:"MANAGER_INTERVENTION",passed:managerReady,actual:manager.status},
   {id:"ROLE_ERGONOMICS",passed:ergonomicReady,actual:ergonomics.status},
   {id:"LIVE_SERVICE_USABILITY",passed:review?.liveServiceUsability==="PASS",actual:review?.liveServiceUsability||"not reviewed"},
   {id:"TRAINING_BURDEN",passed:review?.trainingBurden==="PASS",actual:review?.trainingBurden||"not reviewed"},
   {id:"SHIFT_HANDOFF",passed:review?.shiftHandoff==="PASS",actual:review?.shiftHandoff||"not reviewed"},
   {id:"ACCESSIBILITY_READABILITY",passed:review?.accessibilityReadability==="PASS",actual:review?.accessibilityReadability||"not reviewed"},
   {id:"OPERATOR_ACCEPTANCE",passed:!!review?.operatorAcceptance,actual:review?.operatorAcceptance||"not reviewed"},
   {id:"MANAGER_ACCEPTANCE",passed:!!review?.managerAcceptance,actual:review?.managerAcceptance||"not reviewed"},
   {id:"V55_ENTRY",passed:review?.v55Entry==="APPROVED",actual:review?.v55Entry||"not reviewed"},
   {id:"HUMAN_V54_CERTIFICATION",passed:!!cert,actual:cert?.status||"not certified"}];
  const closureReady=checks.slice(0,-1).every(x=>x.passed);
  return {version:"55.0.0",generatedAt:this.now(),status:cert?"v54-operator-experience-certified":review?"v54-operator-experience-in-review":"v54-operator-experience-certification-required",headline:`V54 operator-experience closure ${closureReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,checks,closureReady,review,certification:cert,linked:{operatorSpeed:speed.status,managerIntervention:manager.status,roleErgonomics:ergonomics.status},policy:{operatorSpeedEvidenceRequired:true,managerInterventionEvidenceRequired:true,roleErgonomicsEvidenceRequired:true,liveServiceUsabilityRequired:true,trainingBurdenRequired:true,shiftHandoffRequired:true,accessibilityReadabilityRequired:true,humanOperatorAcceptanceRequired:true,humanManagerAcceptanceRequired:true,humanV54CertificationRequired:true,certificationDoesNotChangeLayout:true,certificationDoesNotChangePermissions:true,certificationDoesNotExecuteRestaurantActions:true,autonomousProductionChanges:false}};
 }
 async review(org,allowed,input,actor){
  for(const k of ["liveServiceUsability","trainingBurden","shiftHandoff","accessibilityReadability"])if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
  for(const k of ["operatorAcceptance","managerAcceptance"])if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
  const v55Entry=String(input.v55Entry||"").toUpperCase();if(!["APPROVED","HOLD"].includes(v55Entry))throw new Error("v55Entry must be APPROVED or HOLD.");
  const record={id:`v54ux_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,reviewedAt:this.now(),reviewedBy:actor,liveServiceUsability:String(input.liveServiceUsability).toUpperCase(),trainingBurden:String(input.trainingBurden).toUpperCase(),shiftHandoff:String(input.shiftHandoff).toUpperCase(),accessibilityReadability:String(input.accessibilityReadability).toUpperCase(),operatorAcceptance:String(input.operatorAcceptance).trim().slice(0,3500),managerAcceptance:String(input.managerAcceptance).trim().slice(0,3500),v55Entry,note:String(input.note||"").trim().slice(0,2500),layoutChanged:false,permissionsChanged:false,restaurantActionExecuted:false};
  await this.database.mutate(db=>{db.v54OperatorExperienceReviews||=[];db.v54OperatorExperienceReviews.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:"V54 operator experience closure review recorded",category:"v54_operator_experience"});return record;
 }
 async certify(org,allowed,input,actor){
  const state=await this.snapshot(org,allowed);if(!state.closureReady)throw new Error("All V54 operator-experience closure gates must pass before certification.");
  const evidence=String(input.evidence||"").trim(),acceptance=String(input.acceptance||"").trim();if(!evidence||!acceptance)throw new Error("Certification evidence and acceptance are required.");
  const record={id:`v54uxc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,status:"V54_OPERATOR_EXPERIENCE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4500),acceptance:acceptance.slice(0,3000),gateSnapshot:state.checks.slice(0,-1),layoutChangedByCertification:false,permissionsChangedByCertification:false,restaurantActionExecutedByCertification:false,autonomousProductionChanges:false};
  await this.database.mutate(db=>{db.v54OperatorExperienceCertifications||=[];db.v54OperatorExperienceCertifications.push(record);return record;});await this.auditService.record({organizationId:org,actor,action:"V54 operator experience certified; V55 entry approved",category:"v54_operator_experience"});return record;
 }}
module.exports=V54OperatorExperienceCertificationService;
