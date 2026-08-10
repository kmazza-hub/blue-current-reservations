"use strict";
class FinalProductReleaseCandidateService{
 constructor(database,auditService,realtimeHub,pilotLiveServiceAcceptanceService,pilotCloseoutOutcomeService,pilotReleaseCandidateCertificationService){
  Object.assign(this,{database,auditService,realtimeHub,pilotLiveServiceAcceptanceService,pilotCloseoutOutcomeService,pilotReleaseCandidateCertificationService});
 }
 now(){return new Date().toISOString();}
 async reviews(org){const db=await this.database.read();return (db.finalProductReleaseReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
 async certifications(org){const db=await this.database.read();return (db.finalProductReleaseCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
 async snapshot(org,allowed){
  const [live,closeout,rc,reviews,certs]=await Promise.all([this.pilotLiveServiceAcceptanceService.snapshot(org,allowed),this.pilotCloseoutOutcomeService.snapshot(org,allowed),this.pilotReleaseCandidateCertificationService.snapshot(org,allowed),this.reviews(org),this.certifications(org)]);
  const review=reviews[0]||null,cert=certs[0]||null;
  const accepted=(live.locations||[]).length>0&&(live.locations||[]).every(x=>x.decision?.decision==="ACCEPT");
  const closeoutEvidence=(closeout.locations||[]).length>0&&(closeout.locations||[]).every(x=>!!x.review);
  const checks=[
   {id:"PILOT_RELEASE_CANDIDATE",passed:rc.certification?.decision==="RC_APPROVE",actual:rc.certification?.decision||rc.status},
   {id:"LIVE_SERVICE_ACCEPTANCE",passed:accepted,actual:`${(live.locations||[]).filter(x=>x.decision?.decision==="ACCEPT").length}/${(live.locations||[]).length} accepted`},
   {id:"PILOT_CLOSEOUT_EVIDENCE",passed:closeoutEvidence,actual:`${(closeout.locations||[]).filter(x=>x.review).length}/${(closeout.locations||[]).length} reviewed`},
   {id:"PRODUCT_SCOPE_FREEZE",passed:review?.productScopeFreeze==="PASS",actual:review?.productScopeFreeze||"not reviewed"},
   {id:"CRITICAL_DEFECT_GATE",passed:review?.criticalDefectGate==="PASS",actual:review?.criticalDefectGate||"not reviewed"},
   {id:"SECURITY_PRIVACY_GATE",passed:review?.securityPrivacyGate==="PASS",actual:review?.securityPrivacyGate||"not reviewed"},
   {id:"DATA_INTEGRITY_GATE",passed:review?.dataIntegrityGate==="PASS",actual:review?.dataIntegrityGate||"not reviewed"},
   {id:"PERFORMANCE_RELIABILITY_GATE",passed:review?.performanceReliabilityGate==="PASS",actual:review?.performanceReliabilityGate||"not reviewed"},
   {id:"RECOVERY_SUPPORT_GATE",passed:review?.recoverySupportGate==="PASS",actual:review?.recoverySupportGate||"not reviewed"},
   {id:"OPERATOR_USABILITY_GATE",passed:review?.operatorUsabilityGate==="PASS",actual:review?.operatorUsabilityGate||"not reviewed"},
   {id:"COMMERCIAL_READINESS_GATE",passed:review?.commercialReadinessGate==="PASS",actual:review?.commercialReadinessGate||"not reviewed"},
   {id:"RELEASE_NOTES",passed:!!review?.releaseNotes,actual:review?.releaseNotes?"documented":"missing"},
   {id:"KNOWN_LIMITATIONS",passed:!!review?.knownLimitations,actual:review?.knownLimitations?"documented":"missing"},
   {id:"FINAL_SUCCESS_CRITERIA",passed:!!review?.finalSuccessCriteria,actual:review?.finalSuccessCriteria?"documented":"missing"},
   {id:"FINAL_RC_RECOMMENDATION",passed:review?.recommendation==="APPROVE",actual:review?.recommendation||"not decided"},
   {id:"HUMAN_FINAL_RC_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}
  ];
  const finalRcReady=checks.slice(0,-1).every(x=>x.passed);
  return {version:"58.0.0",generatedAt:this.now(),status:cert?.decision==="FINAL_RC_APPROVE"?"final-product-release-candidate-certified":cert?.decision==="HOLD"?"final-product-release-candidate-hold":review?"final-product-release-in-review":"final-product-release-review-required",headline:`Final Product Release Candidate ${finalRcReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,finalRcReady,checks,review,certification:cert,linked:{pilotRc:rc.status,liveService:live.status,pilotCloseout:closeout.status},policy:{pilotAcceptanceRequired:true,pilotCloseoutEvidenceRequired:true,criticalDefectsMustBeReviewed:true,securityPrivacyReviewRequired:true,dataIntegrityReviewRequired:true,reliabilityReviewRequired:true,recoverySupportReviewRequired:true,operatorUsabilityReviewRequired:true,commercialReadinessReviewRequired:true,humanFinalRcApproveHoldRequired:true,certificationDoesNotDeploy:true,certificationDoesNotActivateCustomer:true,certificationDoesNotExpandLocations:true,certificationDoesNotMutateRestaurantState:true,autonomousProductionChanges:false}};
 }
 async review(org,allowed,input,actor){
  const pass=["productScopeFreeze","criticalDefectGate","securityPrivacyGate","dataIntegrityGate","performanceReliabilityGate","recoverySupportGate","operatorUsabilityGate","commercialReadinessGate"];
  for(const k of pass)if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
  for(const k of ["releaseVersion","buildHash","releaseNotes","knownLimitations","finalSuccessCriteria"])if(!String(input[k]||"").trim())throw new Error(`${k} is required.`);
  const recommendation=String(input.recommendation||"").toUpperCase();if(!["APPROVE","HOLD"].includes(recommendation))throw new Error("recommendation must be APPROVE or HOLD.");
  const record={id:`fpr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,reviewedAt:this.now(),reviewedBy:actor,releaseVersion:String(input.releaseVersion).trim().slice(0,100),buildHash:String(input.buildHash).trim().slice(0,256),...Object.fromEntries(pass.map(k=>[k,String(input[k]).toUpperCase()])),releaseNotes:String(input.releaseNotes).trim().slice(0,7000),knownLimitations:String(input.knownLimitations).trim().slice(0,7000),finalSuccessCriteria:String(input.finalSuccessCriteria).trim().slice(0,5000),recommendation,note:String(input.note||"").trim().slice(0,2500),deploymentPerformed:false,customerActivated:false,locationExpansionPerformed:false,restaurantStateMutated:false};
  await this.database.mutate(db=>{db.finalProductReleaseReviews||=[];db.finalProductReleaseReviews.push(record);return record;});
  await this.auditService.record({organizationId:org,actor,action:`Final product RC review recorded: ${recommendation}`,category:"final_product_release"});
  return record;
 }
 async certify(org,allowed,input,actor){
  const state=await this.snapshot(org,allowed),decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
  if(!["FINAL_RC_APPROVE","HOLD"].includes(decision))throw new Error("Decision must be FINAL_RC_APPROVE or HOLD.");
  if(!evidence)throw new Error("Final RC certification evidence is required.");
  if(decision==="FINAL_RC_APPROVE"&&!state.finalRcReady&&!reason)throw new Error("FINAL_RC_APPROVE with open gates requires an executive override reason.");
  if(decision==="HOLD"&&!reason)throw new Error("HOLD requires a documented reason.");
  const record={id:`fpc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,decision,status:"FINAL_PRODUCT_RELEASE_CANDIDATE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,6000),reason:reason.slice(0,3000),gateSnapshot:state.checks,release:{version:state.review?.releaseVersion||null,buildHash:state.review?.buildHash||null},deploymentPerformedByCertification:false,customerActivatedByCertification:false,locationExpansionPerformedByCertification:false,restaurantStateMutatedByCertification:false,autonomousProductionChanges:false};
  await this.database.mutate(db=>{db.finalProductReleaseCertifications||=[];db.finalProductReleaseCertifications.push(record);return record;});
  await this.auditService.record({organizationId:org,actor,action:`Final product RC ${decision} certified; no deployment or customer activation performed`,category:"final_product_release"});
  return record;
 }
}
module.exports=FinalProductReleaseCandidateService;
