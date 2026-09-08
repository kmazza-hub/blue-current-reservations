"use strict";
class CommercialProductionReliabilitySupportabilityService {
  constructor(productionHealthSupportService,productionIncidentCommandService,productionRecoveryReviewService,defectControlService) {
    Object.assign(this,{productionHealthSupportService,productionIncidentCommandService,productionRecoveryReviewService,defectControlService});
  }
  async snapshot(organizationId,allowedLocationIds) {
    const [health,incidents,recovery,defects]=await Promise.all([
      this.productionHealthSupportService.snapshot(organizationId,allowedLocationIds),
      this.productionIncidentCommandService.snapshot(organizationId,allowedLocationIds),
      this.productionRecoveryReviewService.snapshot(organizationId,allowedLocationIds),
      this.defectControlService.snapshot(organizationId,allowedLocationIds)
    ]);
    const activeCommands=incidents.activeCommands||[];
    const unresolvedRecovery=(recovery.incidents||[]).filter(x=>x.reviewState!=="POST_INCIDENT_REVIEW_ACCEPTED");
    const criticalSupport=(health.eventHistory||[]).filter(x=>x.severity==="critical"&&!["resolved","closed"].includes(x.status));
    const checks=[
      {id:"PRODUCTION_HEALTH_VISIBLE",passed:Array.isArray(health.locations),actual:health.status},
      {id:"SUPPORT_OWNERSHIP_VISIBLE",passed:(health.locations||[]).every(x=>!!x.supportOwner&&!!x.escalationOwner),actual:`${(health.locations||[]).filter(x=>x.supportOwner&&x.escalationOwner).length}/${(health.locations||[]).length} owned`},
      {id:"NO_CRITICAL_SUPPORT_EVENTS",passed:criticalSupport.length===0,actual:`${criticalSupport.length} critical support event(s)`},
      {id:"NO_CRITICAL_INCIDENT_COMMANDS",passed:activeCommands.filter(x=>x.severity==="critical").length===0,actual:`${activeCommands.filter(x=>x.severity==="critical").length} critical command(s)`},
      {id:"RECOVERY_REVIEWS_COMPLETE",passed:unresolvedRecovery.length===0,actual:`${unresolvedRecovery.length} recovery review(s) open`},
      {id:"RELIABILITY_NOT_BREACHED",passed:health.platform?.reliabilityStatus!=="breached",actual:health.platform?.reliabilityStatus||"unknown"},
      {id:"ERROR_BUDGET_VISIBLE",passed:health.platform?.errorBudgetRemaining!==undefined,actual:String(health.platform?.errorBudgetRemaining??"unknown")},
      {id:"LATENCY_VISIBLE",passed:health.platform?.p95LatencyMs!==undefined,actual:`${health.platform?.p95LatencyMs??0}ms p95`},
      {id:"SERVER_ERRORS_VISIBLE",passed:health.platform?.serverErrors!==undefined,actual:String(health.platform?.serverErrors??0)},
      {id:"COMMERCIAL_BLOCKERS_CLEAR",passed:Number(defects.summary?.releaseBlockers||0)===0,actual:`${defects.summary?.releaseBlockers||0} release blocker(s)`}
    ];
    const releaseSupportable=checks.every(x=>x.passed);
    return {
      version:"96.75.0",gate:"COMMERCIAL_HARDENING_PRODUCTION_RELIABILITY_AND_SUPPORTABILITY",generatedAt:new Date().toISOString(),
      releaseSupportable,status:releaseSupportable?"PRODUCTION_SUPPORTABILITY_CLEAR":"PRODUCTION_SUPPORTABILITY_OPEN",
      checks,
      operatingPicture:{
        productionHealth:health.status,incidentCommand:incidents.status,recoveryReview:recovery.status,
        reliabilityScore:health.platform?.reliabilityScore??null,errorBudgetRemaining:health.platform?.errorBudgetRemaining??null,
        p95LatencyMs:health.platform?.p95LatencyMs??null,serverErrors:health.platform?.serverErrors??null,
        releaseBlockers:defects.summary?.releaseBlockers||0
      },
      supportabilityModel:{
        supportOwnerRequired:true,escalationOwnerRequired:true,incidentCommandRequiredForMajorEvents:true,
        recoveryReviewRequired:true,rootCauseRequired:true,correctiveActionOwnershipRequired:true,
        reliabilityAndErrorBudgetVisible:true
      },
      policy:{
        supportActionsHumanInitiated:true,incidentContainmentHumanDirected:true,recoveryReviewHumanAuthored:true,
        correctiveActionsHumanOwned:true,noAutomaticRemediation:true,noAutomaticIncidentResolution:true,
        noAutomaticRelease:true,autonomousProductionChanges:false
      },
      nextGate:"COMMERCIAL_HARDENING_DEPLOYMENT_RELEASE_DISCIPLINE"
    };
  }
}
module.exports=CommercialProductionReliabilitySupportabilityService;
