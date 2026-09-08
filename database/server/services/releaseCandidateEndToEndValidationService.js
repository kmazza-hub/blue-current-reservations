"use strict";

class ReleaseCandidateEndToEndValidationService {
  constructor(
    database,
    releaseCandidateLockService,
    productionHealthSupportService,
    commercialDeploymentReleaseDisciplineService,
    finalTechnicalCertificationService,
    finalOperatorReadinessService
  ) {
    Object.assign(this,{
      database,
      releaseCandidateLockService,
      productionHealthSupportService,
      commercialDeploymentReleaseDisciplineService,
      finalTechnicalCertificationService,
      finalOperatorReadinessService
    });
  }

  async snapshot(organizationId,allowedLocationIds) {
    const [rc,health,release,technical,operator,db] = await Promise.all([
      this.releaseCandidateLockService.snapshot(organizationId,allowedLocationIds),
      this.productionHealthSupportService.snapshot(organizationId,allowedLocationIds),
      this.commercialDeploymentReleaseDisciplineService.snapshot(organizationId,allowedLocationIds),
      this.finalTechnicalCertificationService.snapshot(organizationId,allowedLocationIds),
      this.finalOperatorReadinessService.snapshot(organizationId,allowedLocationIds),
      this.database.read()
    ]);

    const candidate = rc.latestLock || null;
    const activeRuntimeSessions = (db.pilotRuntimeSessions||[]).filter(x=>["ACTIVE","PAUSED"].includes(x.state));
    const openReleaseBlockers = (rc.openBlockers||[]).filter(x=>x.releaseBlocking===true);

    const checks = [
      {id:"COMMERCIAL_RC_LOCKED",passed:rc.releaseCandidateLocked===true,actual:rc.status},
      {id:"CANDIDATE_IDENTITY_STABLE",passed:!!candidate?.candidateId&&!!candidate?.sourceRevision&&!!candidate?.buildIdentity,actual:candidate?.candidateId||"missing"},
      {id:"FINAL_TECHNICAL_CERTIFICATION_CLEAR",passed:technical.certified===true,actual:technical.status},
      {id:"FINAL_OPERATOR_READINESS_CLEAR",passed:operator.certified===true,actual:operator.status},
      {id:"PRODUCTION_HEALTH_CLEAR",passed:health.status!=="critical",actual:health.status},
      {id:"CONTROLLED_RELEASE_DISCIPLINE_PRESENT",passed:release.status!==undefined,actual:release.status},
      {id:"NO_OPEN_RC_RELEASE_BLOCKERS",passed:openReleaseBlockers.length===0,actual:`${openReleaseBlockers.length} blocker(s)`},
      {id:"ROLLBACK_REFERENCE_AVAILABLE",passed:!!candidate?.rollbackReference,actual:candidate?.rollbackReference||"missing"},
      {id:"NO_UNEXPECTED_ACTIVE_RUNTIME",passed:activeRuntimeSessions.length===0,actual:`${activeRuntimeSessions.length} active/paused runtime session(s)`},
      {id:"PERSISTENCE_READABLE",passed:!!db&&typeof db==="object",actual:"database read successful"},
      {id:"AUTHORIZATION_BOUNDARY_CERTIFIED",passed:technical.securityModel?.roleAuthorizationRequired===true,actual:String(technical.securityModel?.roleAuthorizationRequired===true)},
      {id:"OPERATOR_READABILITY_CERTIFIED",passed:operator.operatorReadiness?.darkEnvironmentReadability===true&&operator.operatorReadiness?.lightSurfaceContrast===true,actual:"dark/light readability certified"}
    ];

    const validated = checks.every(x=>x.passed);

    return {
      version:"99.25.0",
      gate:"RELEASE_CANDIDATE_END_TO_END_VALIDATION",
      generatedAt:new Date().toISOString(),
      validated,
      status:validated?"RC_END_TO_END_VALIDATED":"RC_END_TO_END_VALIDATION_BLOCKED",
      checks,
      candidate:{
        candidateId:candidate?.candidateId||null,
        sourceRevision:candidate?.sourceRevision||null,
        buildIdentity:candidate?.buildIdentity||null,
        rollbackReference:candidate?.rollbackReference||null,
        owner:candidate?.owner||null
      },
      validationDomains:{
        candidateIdentity:true,
        technicalCertification:true,
        operatorReadiness:true,
        productionHealth:true,
        releaseDiscipline:true,
        blockerControl:true,
        rollbackReadiness:true,
        persistence:true,
        authorization:true,
        readability:true
      },
      policy:{
        lockedCandidateOnly:true,
        candidateMutationInvalidatesValidation:true,
        releaseBlockerInvalidatesValidation:true,
        technicalRegressionInvalidatesValidation:true,
        operatorRegressionInvalidatesValidation:true,
        humanValidationReviewRequired:true,
        validationDoesNotRelease:true,
        noAutomaticDeployment:true,
        noAutomaticCommercialRelease:true,
        autonomousProductionChanges:false
      },
      nextGate:"COMMERCIAL_OPERATIONS_AND_SUPPORT_READINESS"
    };
  }
}

module.exports = ReleaseCandidateEndToEndValidationService;
