"use strict";
class PilotRepeatServiceReliabilityConfidenceService {
  constructor(firstServiceHypercare,pilotStabilizationExitService,pilotSessionCloseoutEvidenceService,pilotLearningNextSessionDecisionService) {
    Object.assign(this,{firstServiceHypercare,pilotStabilizationExitService,pilotSessionCloseoutEvidenceService,pilotLearningNextSessionDecisionService});
  }
  async current(organizationId,allowedLocationIds) {
    const [hypercare,stabilization,closeouts,learning]=await Promise.all([
      this.firstServiceHypercare.current(organizationId,allowedLocationIds),
      this.pilotStabilizationExitService.snapshot(organizationId,allowedLocationIds),
      this.pilotSessionCloseoutEvidenceService.portfolio(organizationId),
      this.pilotLearningNextSessionDecisionService.portfolio(organizationId)
    ]);
    const stabById=new Map((stabilization.locations||[]).map(x=>[x.locationId,x]));
    const closeoutRows=closeouts.closeouts||[],learningRows=learning.history||[];
    const locations=(hypercare.locations||[]).map(loc=>{
      const stab=stabById.get(loc.locationId)||null;
      const locationCloseouts=closeoutRows.filter(x=>x.locationId===loc.locationId || !x.locationId);
      const sessionIds=new Set(locationCloseouts.map(x=>x.sessionId).filter(Boolean));
      const decisions=learningRows.filter(x=>sessionIds.has(x.sessionId));
      const assessments=(stab?.assessmentHistory||[]).slice(0,3);
      const confidences=assessments.map(x=>Number(x.operatorConfidence||0)).filter(Boolean);
      const avg=confidences.length?confidences.reduce((a,b)=>a+b,0)/confidences.length:0;
      const stable=assessments.filter(x=>x.workflowStability==="STABLE").length;
      const support=assessments.filter(x=>["LOW","MANAGEABLE"].includes(x.supportLoad)).length;
      const guest=assessments.filter(x=>["NONE","LOW"].includes(x.guestImpact)).length;
      const checks=[
        {id:"MULTIPLE_CLOSED_SERVICES",passed:locationCloseouts.length>=2,actual:`${locationCloseouts.length} closed service(s)`},
        {id:"REPEATED_HEALTH",passed:Number(stab?.healthyRecentObservations||0)>=3,actual:`${stab?.healthyRecentObservations||0} healthy observations`},
        {id:"NO_HIGH_CRITICAL_TREND",passed:Number(stab?.highCriticalIncidents||0)===0,actual:`${stab?.highCriticalIncidents||0} high/critical observation(s)`},
        {id:"OPERATOR_CONFIDENCE",passed:avg>=4,actual:avg?avg.toFixed(1):"not assessed"},
        {id:"WORKFLOW_STABILITY",passed:assessments.length>0&&stable===assessments.length,actual:`${stable}/${assessments.length} stable`},
        {id:"SUPPORT_BURDEN_NOT_INCREASING",passed:assessments.length>0&&support===assessments.length,actual:`${support}/${assessments.length} low/manageable`},
        {id:"GUEST_IMPACT_CONTROLLED",passed:assessments.length>0&&guest===assessments.length,actual:`${guest}/${assessments.length} none/low`},
        {id:"NEXT_SESSION_DECISIONS_RECORDED",passed:decisions.length>=Math.min(2,locationCloseouts.length),actual:`${decisions.length} decision(s)`},
        {id:"NO_AUTOMATIC_NEXT_SESSION",passed:true,actual:"human decision required"},
        {id:"HYPERCARE_NOT_HOLD",passed:loc.recommendation!=="HOLD",actual:loc.recommendation}
      ];
      const hardHold=checks.some(x=>["NO_HIGH_CRITICAL_TREND","WORKFLOW_STABILITY","HYPERCARE_NOT_HOLD"].includes(x.id)&&!x.passed);
      const confidenceState=hardHold?"HOLD":checks.every(x=>x.passed)?"REPEATABLE":"BUILDING_CONFIDENCE";
      return {locationId:loc.locationId,locationName:loc.locationName,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,confidenceState,closedServices:locationCloseouts.length,learningDecisions:decisions.length,averageOperatorConfidence:Number(avg.toFixed(2))};
    });
    return {
      version:"95.50.0",gate:"PILOT_REPEAT_SERVICE_RELIABILITY_AND_CONFIDENCE",generatedAt:new Date().toISOString(),
      ready:locations.length>0&&locations.every(x=>x.confidenceState==="REPEATABLE"),
      confidence:locations.some(x=>x.confidenceState==="HOLD")?"HOLD":locations.every(x=>x.confidenceState==="REPEATABLE")?"REPEATABLE":"BUILDING_CONFIDENCE",
      locations,
      reliabilityModel:{multipleServicesRequired:true,repeatedHealthRequired:true,operatorConfidenceRequired:true,supportBurdenMustRemainControlled:true,guestImpactMustRemainControlled:true,humanLearningDecisionPerSession:true},
      safety:{confidenceIsAdvisory:true,humanNextSessionDecisionRequired:true,noAutomaticNextSession:true,noAutomaticExpansion:true,noAutomaticRollback:true,autonomousProductionChanges:false},
      nextGate:"PILOT_EXIT_READINESS_AND_V96_CERTIFICATION"
    };
  }
}
module.exports=PilotRepeatServiceReliabilityConfidenceService;
