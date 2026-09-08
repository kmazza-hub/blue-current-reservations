"use strict";

class V52OperationalReadinessCertificationService {
  constructor(database,auditService,realtimeHub,operationalIntegrationExpansionOrchestrationService,expansionRepeatabilityCertificationService,expansionPortfolioProofService){
    Object.assign(this,{database,auditService,realtimeHub,operationalIntegrationExpansionOrchestrationService,expansionRepeatabilityCertificationService,expansionPortfolioProofService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){const db=await this.database.read();return (db.v52OperationalReadinessReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
  async certifications(org){const db=await this.database.read();return (db.v52OperationalReadinessCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  async snapshot(org,allowed){
    const [orchestration,repeatability,portfolio,reviews,certifications]=await Promise.all([
      this.operationalIntegrationExpansionOrchestrationService.snapshot(org,allowed),
      this.expansionRepeatabilityCertificationService.snapshot(org,allowed),
      this.expansionPortfolioProofService.snapshot(org,allowed),
      this.reviews(org),this.certifications(org)
    ]);
    const review=reviews[0]||null,certification=certifications[0]||null;
    const checks=[
      {id:"PORTFOLIO_PROOF_COMPLETE",passed:portfolio.decision?.decision==="REPEAT",actual:portfolio.decision?.decision||"not complete"},
      {id:"REPEATABILITY_CERTIFIED",passed:repeatability.certification?.status==="REPEATABILITY_CERTIFIED",actual:repeatability.certification?.status||"not certified"},
      {id:"ORCHESTRATION_READY",passed:orchestration.decision?.decision==="READY",actual:orchestration.decision?.decision||"not ready"},
      {id:"V52_SCOPE_REVIEW",passed:!!review?.scopeReview,actual:review?.scopeReview?"recorded":"missing"},
      {id:"REGRESSION_EVIDENCE",passed:!!review?.regressionEvidence,actual:review?.regressionEvidence?"recorded":"missing"},
      {id:"SECURITY_AUTH_REVIEW",passed:!!review?.securityAuthReview,actual:review?.securityAuthReview?"recorded":"missing"},
      {id:"DATA_INTEGRITY_REVIEW",passed:!!review?.dataIntegrityReview,actual:review?.dataIntegrityReview?"recorded":"missing"},
      {id:"RECOVERY_ROLLBACK_REVIEW",passed:!!review?.recoveryRollbackReview,actual:review?.recoveryRollbackReview?"recorded":"missing"},
      {id:"OBSERVABILITY_SUPPORT_REVIEW",passed:!!review?.observabilitySupportReview,actual:review?.observabilitySupportReview?"recorded":"missing"},
      {id:"OPERATOR_WORKFLOW_REVIEW",passed:!!review?.operatorWorkflowReview,actual:review?.operatorWorkflowReview?"recorded":"missing"},
      {id:"OPEN_DEBT_REGISTER",passed:!!review?.openDebtRegister,actual:review?.openDebtRegister?"recorded":"missing"},
      {id:"V53_ENTRY_CRITERIA",passed:!!review?.v53EntryCriteria,actual:review?.v53EntryCriteria?"recorded":"missing"},
      {id:"HUMAN_V52_CERTIFICATION",passed:certification?.status==="V52_OPERATIONAL_READINESS_CERTIFIED",actual:certification?.status||"not certified"}
    ];
    return {
      version:"53.0.0",generatedAt:this.now(),
      status:certification?.status==="V52_OPERATIONAL_READINESS_CERTIFIED"?"v52-closed-v53-entry-certified":review?"v52-readiness-in-review":"v52-readiness-review-required",
      headline:`${checks.filter(x=>x.passed).length}/${checks.length} V52 closure gates pass.`,
      orchestrationStatus:orchestration.status,repeatabilityStatus:repeatability.status,portfolioStatus:portfolio.status,
      review,certification,checks,certificationReady:checks.slice(0,-1).every(x=>x.passed),
      v53Entry:certification?{approved:true,certificationId:certification.id,focus:"operational integration, restaurant workflow hardening, production-readiness evidence"}:{approved:false},
      policy:{
        v52ClosureRequiresHumanReview:true,
        regressionEvidenceRequired:true,
        securityAuthReviewRequired:true,
        dataIntegrityReviewRequired:true,
        recoveryRollbackReviewRequired:true,
        observabilitySupportReviewRequired:true,
        operatorWorkflowReviewRequired:true,
        openDebtRegisterRequired:true,
        humanCertificationRequired:true,
        certificationDoesNotDeploy:true,
        certificationDoesNotActivateLocations:true,
        certificationDoesNotMutateRestaurantState:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,input,actor){
    const orchestration=await this.operationalIntegrationExpansionOrchestrationService.snapshot(org,allowed);
    if(orchestration.decision?.decision!=="READY")throw new Error("Operational orchestration must have a human READY decision before V52 closure review.");
    const fields=["scopeReview","regressionEvidence","securityAuthReview","dataIntegrityReview","recoveryRollbackReview","observabilitySupportReview","operatorWorkflowReview","openDebtRegister","v53EntryCriteria"];
    const data={}; for(const key of fields){const v=String(input[key]||"").trim();if(!v)throw new Error(`${key} is required.`);data[key]=v.slice(0,4500);}
    const record={id:`v52rr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,reviewedAt:this.now(),reviewedBy:actor,...data,note:String(input.note||"").trim().slice(0,2200),deploymentPerformed:false,restaurantStateMutated:false};
    await this.database.mutate(db=>{db.v52OperationalReadinessReviews||=[];db.v52OperationalReadinessReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"V52 operational-readiness closure review recorded",category:"v52_operational_readiness"});
    this.realtimeHub.publish("v52-operational-readiness:reviewed",{organizationId:org,id:record.id}); return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed); if(!state.certificationReady)throw new Error("All V52 operational-readiness gates must pass before certification.");
    const evidence=String(input.evidence||"").trim(),acceptance=String(input.acceptance||"").trim();
    if(!evidence||!acceptance)throw new Error("Certification evidence and executive acceptance are required.");
    const record={id:`v52cert_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,status:"V52_OPERATIONAL_READINESS_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,reviewId:state.review.id,evidence:evidence.slice(0,4500),acceptance:acceptance.slice(0,3000),gateSnapshot:state.checks.slice(0,-1),deploymentPerformedByCertification:false,locationsActivatedByCertification:false,restaurantStateMutatedByCertification:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.v52OperationalReadinessCertifications||=[];db.v52OperationalReadinessCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"V52 closed and V53 entry certified; no deployment or restaurant mutation performed",category:"v52_operational_readiness"});
    this.realtimeHub.publish("v52-operational-readiness:certified",{organizationId:org,id:record.id}); return record;
  }
}
module.exports=V52OperationalReadinessCertificationService;
