"use strict";

class FinalHardeningRealEnvironmentService{
  constructor(database,auditService,realtimeHub,finalProductReleaseCandidateService){
    Object.assign(this,{database,auditService,realtimeHub,finalProductReleaseCandidateService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){
    const db=await this.database.read();
    return (db.finalHardeningEnvironmentReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));
  }
  async certifications(org){
    const db=await this.database.read();
    return (db.finalHardeningEnvironmentCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  async snapshot(org,allowed){
    const [finalRc,reviews,certs]=await Promise.all([
      this.finalProductReleaseCandidateService.snapshot(org,allowed),
      this.reviews(org),this.certifications(org)
    ]);
    const review=reviews[0]||null,cert=certs[0]||null;
    const checks=[
      {id:"FINAL_PRODUCT_RC",passed:finalRc.certification?.decision==="FINAL_RC_APPROVE"||finalRc.finalRcReady===true,actual:finalRc.status},
      {id:"FULL_REGRESSION",passed:review?.fullRegression==="PASS",actual:review?.fullRegression||"not verified"},
      {id:"CRITICAL_DEFECT_CLOSURE",passed:review?.criticalDefectClosure==="PASS",actual:review?.criticalDefectClosure||"not verified"},
      {id:"HIGH_DEFECT_REVIEW",passed:review?.highDefectReview==="PASS",actual:review?.highDefectReview||"not verified"},
      {id:"SECURITY_PRIVACY_VERIFICATION",passed:review?.securityPrivacyVerification==="PASS",actual:review?.securityPrivacyVerification||"not verified"},
      {id:"AUTH_RBAC_VERIFICATION",passed:review?.authRbacVerification==="PASS",actual:review?.authRbacVerification||"not verified"},
      {id:"DATA_PERSISTENCE_INTEGRITY",passed:review?.dataPersistenceIntegrity==="PASS",actual:review?.dataPersistenceIntegrity||"not verified"},
      {id:"BACKUP_RESTORE_DRILL",passed:review?.backupRestoreDrill==="PASS",actual:review?.backupRestoreDrill||"not verified"},
      {id:"ROLLBACK_RECOVERY_DRILL",passed:review?.rollbackRecoveryDrill==="PASS",actual:review?.rollbackRecoveryDrill||"not verified"},
      {id:"PERFORMANCE_LOAD",passed:review?.performanceLoad==="PASS",actual:review?.performanceLoad||"not verified"},
      {id:"OBSERVABILITY_ALERTING",passed:review?.observabilityAlerting==="PASS",actual:review?.observabilityAlerting||"not verified"},
      {id:"PRODUCTION_CONFIG",passed:review?.productionConfiguration==="PASS",actual:review?.productionConfiguration||"not verified"},
      {id:"CONNECTOR_FAILURE_BEHAVIOR",passed:review?.connectorFailureBehavior==="PASS",actual:review?.connectorFailureBehavior||"not verified"},
      {id:"OPERATOR_UX_READABILITY",passed:review?.operatorUxReadability==="PASS",actual:review?.operatorUxReadability||"not verified"},
      {id:"DEVICE_RESPONSIVENESS",passed:review?.deviceResponsiveness==="PASS",actual:review?.deviceResponsiveness||"not verified"},
      {id:"ACCESSIBILITY_REVIEW",passed:review?.accessibilityReview==="PASS",actual:review?.accessibilityReview||"not verified"},
      {id:"SUPPORT_RUNBOOK_VALIDATION",passed:review?.supportRunbookValidation==="PASS",actual:review?.supportRunbookValidation||"not verified"},
      {id:"KNOWN_ISSUES_RECONCILED",passed:!!review?.knownIssuesReconciled,actual:review?.knownIssuesReconciled?"documented":"missing"},
      {id:"REAL_ENVIRONMENT_EVIDENCE",passed:!!review?.realEnvironmentEvidence,actual:review?.realEnvironmentEvidence?"recorded":"missing"},
      {id:"SHIP_RECOMMENDATION",passed:review?.recommendation==="SHIP",actual:review?.recommendation||"not decided"},
      {id:"HUMAN_SHIP_REVISE_HOLD",passed:!!cert,actual:cert?.decision||"not certified"}
    ];
    const hardeningReady=checks.slice(0,-1).every(x=>x.passed);
    return {
      version:"58.50.0",generatedAt:this.now(),
      status:cert?.decision==="SHIP"?"final-hardening-ship-ready":
             cert?.decision==="REVISE"?"final-hardening-revise":
             cert?.decision==="HOLD"?"final-hardening-hold":
             review?"final-hardening-in-review":"final-hardening-review-required",
      headline:`Final hardening ${hardeningReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,
      hardeningReady,checks,review,certification:cert,
      linked:{finalProductRc:finalRc.status},
      policy:{
        noNewArchitectureRequired:true,
        fullRegressionRequired:true,
        criticalDefectClosureRequired:true,
        securityPrivacyVerificationRequired:true,
        backupRestoreDrillRequired:true,
        rollbackRecoveryDrillRequired:true,
        performanceLoadVerificationRequired:true,
        productionConfigurationVerificationRequired:true,
        operatorUxReadabilityRequired:true,
        accessibilityReviewRequired:true,
        realEnvironmentEvidenceRequired:true,
        humanShipReviseHoldRequired:true,
        certificationDoesNotDeploy:true,
        certificationDoesNotStartRuntime:true,
        certificationDoesNotActivateCustomer:true,
        certificationDoesNotMutateRestaurantState:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,input,actor){
    const passFields=[
      "fullRegression","criticalDefectClosure","highDefectReview","securityPrivacyVerification","authRbacVerification",
      "dataPersistenceIntegrity","backupRestoreDrill","rollbackRecoveryDrill","performanceLoad","observabilityAlerting",
      "productionConfiguration","connectorFailureBehavior","operatorUxReadability","deviceResponsiveness",
      "accessibilityReview","supportRunbookValidation"
    ];
    for(const k of passFields){
      if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    }
    const knownIssuesReconciled=String(input.knownIssuesReconciled||"").trim();
    const realEnvironmentEvidence=String(input.realEnvironmentEvidence||"").trim();
    if(!knownIssuesReconciled||!realEnvironmentEvidence)throw new Error("Known-issues reconciliation and real-environment evidence are required.");
    const recommendation=String(input.recommendation||"").toUpperCase();
    if(!["SHIP","REVISE","HOLD"].includes(recommendation))throw new Error("recommendation must be SHIP, REVISE, or HOLD.");
    const record={
      id:`fher_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      reviewedAt:this.now(),reviewedBy:actor,
      ...Object.fromEntries(passFields.map(k=>[k,String(input[k]).toUpperCase()])),
      knownIssuesReconciled:knownIssuesReconciled.slice(0,7000),
      realEnvironmentEvidence:realEnvironmentEvidence.slice(0,7000),
      recommendation,note:String(input.note||"").trim().slice(0,3000),
      deploymentPerformed:false,runtimeStarted:false,customerActivated:false,restaurantStateMutated:false
    };
    await this.database.mutate(db=>{db.finalHardeningEnvironmentReviews||=[];db.finalHardeningEnvironmentReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Final hardening review recorded: ${recommendation}`,category:"final_hardening"});
    this.realtimeHub.publish("final-hardening:reviewed",{organizationId:org,id:record.id,recommendation});
    return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["SHIP","REVISE","HOLD"].includes(decision))throw new Error("Decision must be SHIP, REVISE, or HOLD.");
    if(!evidence)throw new Error("Hardening certification evidence is required.");
    if(decision==="SHIP"&&!state.hardeningReady&&!reason)throw new Error("SHIP with open hardening gates requires an executive override reason.");
    if(["REVISE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={
      id:`fhec_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      decision,status:"FINAL_HARDENING_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,
      evidence:evidence.slice(0,7000),reason:reason.slice(0,3000),gateSnapshot:state.checks,
      deploymentPerformedByCertification:false,runtimeStartedByCertification:false,
      customerActivatedByCertification:false,restaurantStateMutatedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.finalHardeningEnvironmentCertifications||=[];db.finalHardeningEnvironmentCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Final hardening ${decision} certified; no deployment/customer activation performed`,category:"final_hardening"});
    this.realtimeHub.publish("final-hardening:certified",{organizationId:org,id:record.id,decision});
    return record;
  }
}
module.exports=FinalHardeningRealEnvironmentService;
