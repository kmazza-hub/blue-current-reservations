"use strict";

class PilotReleaseCandidateCertificationService{
  constructor(database,auditService,realtimeHub,productionPilotEnvironmentReadinessService,pilotLaunchControlService,technicalActivationReadinessService,pilotDeploymentPackageService){
    Object.assign(this,{database,auditService,realtimeHub,productionPilotEnvironmentReadinessService,pilotLaunchControlService,technicalActivationReadinessService,pilotDeploymentPackageService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){const db=await this.database.read();return (db.pilotReleaseCandidateReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));}
  async certifications(org){const db=await this.database.read();return (db.pilotReleaseCandidateCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  async snapshot(org,allowed){
    const [environment,launch,technical,deployment,reviews,certs]=await Promise.all([
      this.productionPilotEnvironmentReadinessService.snapshot(org,allowed),
      this.pilotLaunchControlService.snapshot(org,allowed),
      this.technicalActivationReadinessService.snapshot(org,allowed),
      this.pilotDeploymentPackageService.snapshot(org,allowed),
      this.reviews(org),this.certifications(org)
    ]);
    const review=reviews[0]||null,cert=certs[0]||null;
    const envReady=environment.certification?.decision==="GO"||environment.readinessReady===true;
    const launchLocations=launch.locations||[];
    const launchControlReady=launchLocations.length>0&&launchLocations.every(x=>x.launchReady||x.authorization?.status==="PILOT_LAUNCH_AUTHORIZED");
    const technicalReady=(technical.locations||[]).length>0&&(technical.locations||[]).every(x=>x.technicallyReady||x.goLiveAuthorization?.status==="AUTHORIZED_FOR_GO_LIVE");
    const deploymentReady=(deployment.locations||[]).length>0&&(deployment.locations||[]).every(x=>x.deploymentReady||x.certification?.status==="PILOT_DEPLOYMENT_CERTIFIED");
    const checks=[
      {id:"PRODUCTION_ENVIRONMENT_READY",passed:envReady,actual:environment.status},
      {id:"TECHNICAL_READINESS",passed:technicalReady,actual:technical.status},
      {id:"DEPLOYMENT_PACKAGE",passed:deploymentReady,actual:deployment.status},
      {id:"PILOT_LAUNCH_CONTROL",passed:launchControlReady,actual:launch.status},
      {id:"RELEASE_VERSION",passed:!!review?.releaseVersion,actual:review?.releaseVersion||"missing"},
      {id:"BUILD_HASH",passed:!!review?.buildHash,actual:review?.buildHash||"missing"},
      {id:"CHANGE_FREEZE",passed:review?.changeFreeze==="PASS",actual:review?.changeFreeze||"not reviewed"},
      {id:"REGRESSION_EVIDENCE",passed:review?.regressionEvidence==="PASS",actual:review?.regressionEvidence||"not reviewed"},
      {id:"SECURITY_SIGNOFF",passed:review?.securitySignoff==="PASS",actual:review?.securitySignoff||"not reviewed"},
      {id:"BACKUP_RESTORE_SIGNOFF",passed:review?.backupRestoreSignoff==="PASS",actual:review?.backupRestoreSignoff||"not reviewed"},
      {id:"OBSERVABILITY_SIGNOFF",passed:review?.observabilitySignoff==="PASS",actual:review?.observabilitySignoff||"not reviewed"},
      {id:"SUPPORT_SIGNOFF",passed:review?.supportSignoff==="PASS",actual:review?.supportSignoff||"not reviewed"},
      {id:"ROLLBACK_SIGNOFF",passed:review?.rollbackSignoff==="PASS",actual:review?.rollbackSignoff||"not reviewed"},
      {id:"KNOWN_ISSUES_REGISTER",passed:!!review?.knownIssuesRegister,actual:review?.knownIssuesRegister?"documented":"missing"},
      {id:"PILOT_SUCCESS_CRITERIA",passed:!!review?.pilotSuccessCriteria,actual:review?.pilotSuccessCriteria?"documented":"missing"},
      {id:"RC_RECOMMENDATION",passed:review?.rcRecommendation==="APPROVE",actual:review?.rcRecommendation||"not decided"},
      {id:"HUMAN_RC_CERTIFICATION",passed:!!cert,actual:cert?.decision||"not certified"}
    ];
    const rcReady=checks.slice(0,-1).every(x=>x.passed);
    return {
      version:"57.0.0",generatedAt:this.now(),
      status:cert?.decision==="RC_APPROVE"?"pilot-release-candidate-certified":cert?.decision==="HOLD"?"pilot-release-candidate-hold":review?"pilot-release-candidate-in-review":"pilot-release-candidate-review-required",
      headline:`Pilot Release Candidate ${rcReady?"READY":"OPEN"} · ${checks.filter(x=>x.passed).length}/${checks.length} gates pass.`,
      rcReady,checks,review,certification:cert,
      linked:{environment:environment.status,technical:technical.status,deployment:deployment.status,launch:launch.status},
      releaseCandidate:review?{releaseVersion:review.releaseVersion,buildHash:review.buildHash,knownIssuesRegister:review.knownIssuesRegister,pilotSuccessCriteria:review.pilotSuccessCriteria,recommendation:review.rcRecommendation}:null,
      policy:{
        releaseCandidateRequiresHumanReview:true,
        immutableBuildIdentificationRequired:true,
        changeFreezeRequired:true,
        regressionEvidenceRequired:true,
        securitySignoffRequired:true,
        backupRestoreSignoffRequired:true,
        observabilitySignoffRequired:true,
        supportSignoffRequired:true,
        rollbackSignoffRequired:true,
        knownIssuesRegisterRequired:true,
        pilotSuccessCriteriaRequired:true,
        humanRcApproveHoldRequired:true,
        certificationDoesNotDeploy:true,
        certificationDoesNotPerformCutover:true,
        certificationDoesNotStartRuntime:true,
        certificationDoesNotActivatePilot:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,input,actor){
    const passFields=["changeFreeze","regressionEvidence","securitySignoff","backupRestoreSignoff","observabilitySignoff","supportSignoff","rollbackSignoff"];
    for(const k of passFields)if(!["PASS","FAIL"].includes(String(input[k]||"").toUpperCase()))throw new Error(`${k} must be PASS or FAIL.`);
    const releaseVersion=String(input.releaseVersion||"").trim(),buildHash=String(input.buildHash||"").trim();
    const knownIssuesRegister=String(input.knownIssuesRegister||"").trim(),pilotSuccessCriteria=String(input.pilotSuccessCriteria||"").trim();
    if(!releaseVersion||!buildHash||!knownIssuesRegister||!pilotSuccessCriteria)throw new Error("Release version, build hash, known-issues register, and pilot success criteria are required.");
    const rcRecommendation=String(input.rcRecommendation||"").toUpperCase();
    if(!["APPROVE","HOLD"].includes(rcRecommendation))throw new Error("rcRecommendation must be APPROVE or HOLD.");
    const record={
      id:`prcr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      reviewedAt:this.now(),reviewedBy:actor,releaseVersion:releaseVersion.slice(0,100),buildHash:buildHash.slice(0,256),
      ...Object.fromEntries(passFields.map(k=>[k,String(input[k]).toUpperCase()])),
      knownIssuesRegister:knownIssuesRegister.slice(0,6000),pilotSuccessCriteria:pilotSuccessCriteria.slice(0,5000),
      rcRecommendation,note:String(input.note||"").trim().slice(0,2500),
      deploymentPerformed:false,cutoverPerformed:false,runtimeStarted:false,pilotActivated:false
    };
    await this.database.mutate(db=>{db.pilotReleaseCandidateReviews||=[];db.pilotReleaseCandidateReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot Release Candidate review recorded: ${rcRecommendation}`,category:"pilot_release_candidate"});
    this.realtimeHub.publish("pilot-release-candidate:reviewed",{organizationId:org,id:record.id});
    return record;
  }
  async certify(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["RC_APPROVE","HOLD"].includes(decision))throw new Error("Decision must be RC_APPROVE or HOLD.");
    if(!evidence)throw new Error("Release-candidate certification evidence is required.");
    if(decision==="RC_APPROVE"&&!state.rcReady&&!reason)throw new Error("RC_APPROVE with open gates requires an executive override reason.");
    if(decision==="HOLD"&&!reason)throw new Error("HOLD requires a documented reason.");
    const record={
      id:`prcc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      decision,status:"PILOT_RELEASE_CANDIDATE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,
      evidence:evidence.slice(0,5000),reason:reason.slice(0,2500),gateSnapshot:state.checks,
      releaseCandidate:state.releaseCandidate,
      deploymentPerformedByCertification:false,cutoverPerformedByCertification:false,
      runtimeStartedByCertification:false,pilotActivatedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.pilotReleaseCandidateCertifications||=[];db.pilotReleaseCandidateCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot Release Candidate ${decision} certified; no deployment/cutover performed`,category:"pilot_release_candidate"});
    this.realtimeHub.publish("pilot-release-candidate:certified",{organizationId:org,id:record.id,decision});
    return record;
  }
}
module.exports=PilotReleaseCandidateCertificationService;
