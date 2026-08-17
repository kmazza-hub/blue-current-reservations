"use strict";

class PilotExitReadinessV96PreparationService {
  constructor(repeatConfidence,pilotCloseoutOutcomeService,pilotReleaseCandidateCertificationService) {
    Object.assign(this,{repeatConfidence,pilotCloseoutOutcomeService,pilotReleaseCandidateCertificationService});
  }
  async current(organizationId,allowedLocationIds) {
    const [repeat,closeout,rc]=await Promise.all([
      this.repeatConfidence.current(organizationId,allowedLocationIds),
      this.pilotCloseoutOutcomeService.snapshot(organizationId,allowedLocationIds),
      this.pilotReleaseCandidateCertificationService.snapshot(organizationId,allowedLocationIds)
    ]);
    const closeById=new Map((closeout.locations||[]).map(x=>[x.locationId,x]));
    const locations=(repeat.locations||[]).map(loc=>{
      const c=closeById.get(loc.locationId)||null;
      const highCriticalDebt=(c?.unresolvedDebt||[]).filter(x=>["high","critical"].includes(String(x.severity||"").toLowerCase()));
      const checks=[
        {id:"REPEAT_SERVICE_CONFIDENCE",passed:loc.confidenceState==="REPEATABLE",actual:loc.confidenceState},
        {id:"PILOT_STABLE",passed:c?.stabilizationDecision?.decision==="STABLE",actual:c?.stabilizationDecision?.decision||"not stable"},
        {id:"CLOSEOUT_REVIEW",passed:!!c?.review,actual:c?.review?"recorded":"missing"},
        {id:"INCIDENT_CLOSEOUT",passed:(c?.openIncidents||[]).length===0,actual:`${c?.openIncidents?.length||0} open incident(s)`},
        {id:"NO_HIGH_CRITICAL_DEBT",passed:highCriticalDebt.length===0,actual:`${highCriticalDebt.length} high/critical debt item(s)`},
        {id:"OPERATOR_FEEDBACK",passed:!!c?.review?.operatorFeedback,actual:c?.review?.operatorFeedback?"recorded":"missing"},
        {id:"GUEST_IMPACT_SUMMARY",passed:!!c?.review?.guestImpactSummary,actual:c?.review?.guestImpactSummary?"recorded":"missing"},
        {id:"SUPPORT_BURDEN_SUMMARY",passed:!!c?.review?.supportBurdenSummary,actual:c?.review?.supportBurdenSummary?"recorded":"missing"},
        {id:"DATA_KPI_CONFIDENCE",passed:!!c?.review?.dataKpiConfidenceSummary,actual:c?.review?.dataKpiConfidenceSummary?"recorded":"missing"},
        {id:"LESSONS_LEARNED",passed:!!c?.review?.lessonsLearned,actual:c?.review?.lessonsLearned?"recorded":"missing"}
      ];
      return {
        locationId:loc.locationId,locationName:loc.locationName,checks,
        passed:checks.filter(x=>x.passed).length,total:checks.length,
        exitReady:checks.every(x=>x.passed),
        unresolvedDebt:c?.unresolvedDebt||[],openIncidents:c?.openIncidents||[]
      };
    });
    const releaseChecks=[
      {id:"RELEASE_CANDIDATE_REVIEW",passed:!!rc.review,actual:rc.review?"recorded":"missing"},
      {id:"IMMUTABLE_BUILD_ID",passed:!!rc.releaseCandidate?.releaseVersion&&!!rc.releaseCandidate?.buildHash,actual:rc.releaseCandidate?.buildHash||"missing"},
      {id:"CHANGE_FREEZE",passed:rc.review?.changeFreeze==="PASS",actual:rc.review?.changeFreeze||"not reviewed"},
      {id:"REGRESSION_EVIDENCE",passed:rc.review?.regressionEvidence==="PASS",actual:rc.review?.regressionEvidence||"not reviewed"},
      {id:"SECURITY_SIGNOFF",passed:rc.review?.securitySignoff==="PASS",actual:rc.review?.securitySignoff||"not reviewed"},
      {id:"BACKUP_RESTORE_SIGNOFF",passed:rc.review?.backupRestoreSignoff==="PASS",actual:rc.review?.backupRestoreSignoff||"not reviewed"},
      {id:"OBSERVABILITY_SIGNOFF",passed:rc.review?.observabilitySignoff==="PASS",actual:rc.review?.observabilitySignoff||"not reviewed"},
      {id:"SUPPORT_SIGNOFF",passed:rc.review?.supportSignoff==="PASS",actual:rc.review?.supportSignoff||"not reviewed"},
      {id:"ROLLBACK_SIGNOFF",passed:rc.review?.rollbackSignoff==="PASS",actual:rc.review?.rollbackSignoff||"not reviewed"},
      {id:"KNOWN_ISSUES_REGISTER",passed:!!rc.releaseCandidate?.knownIssuesRegister,actual:rc.releaseCandidate?.knownIssuesRegister?"documented":"missing"},
      {id:"PILOT_SUCCESS_CRITERIA",passed:!!rc.releaseCandidate?.pilotSuccessCriteria,actual:rc.releaseCandidate?.pilotSuccessCriteria?"documented":"missing"}
    ];
    const locationReady=locations.length>0&&locations.every(x=>x.exitReady);
    const releaseReady=releaseChecks.every(x=>x.passed);
    return {
      version:"95.75.0",gate:"PILOT_EXIT_READINESS_AND_V96_CERTIFICATION_PREPARATION",generatedAt:new Date().toISOString(),
      certificationPreparationReady:locationReady&&releaseReady,
      status:locationReady&&releaseReady?"READY_FOR_V96_CERTIFICATION":"V96_EVIDENCE_OPEN",
      locations,releaseChecks,
      evidenceCompleteness:{locationReady,releaseReady,releaseChecksPassed:releaseChecks.filter(x=>x.passed).length,releaseChecksTotal:releaseChecks.length},
      safety:{
        preparationDoesNotCertifyV96:true,humanV96CertificationRequired:true,
        certificationDoesNotDeploy:true,certificationDoesNotStartRuntime:true,
        noAutomaticExpansion:true,autonomousProductionChanges:false
      },
      nextGate:"V96_PILOT_READY_CERTIFICATION"
    };
  }
}
module.exports=PilotExitReadinessV96PreparationService;
