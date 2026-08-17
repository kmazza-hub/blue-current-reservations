"use strict";

class PilotFirstServiceStabilizationHypercareService {
  constructor(database,pilotLaunchDayCommandControlService,pilotStabilizationExitService,pilotCloseoutOutcomeService) {
    Object.assign(this,{database,pilotLaunchDayCommandControlService,pilotStabilizationExitService,pilotCloseoutOutcomeService});
  }
  async current(organizationId,allowedLocationIds) {
    const [launch,stabilization,closeout,db]=await Promise.all([
      this.pilotLaunchDayCommandControlService.current(organizationId,allowedLocationIds),
      this.pilotStabilizationExitService.snapshot(organizationId,allowedLocationIds),
      this.pilotCloseoutOutcomeService.snapshot(organizationId,allowedLocationIds),
      this.database.read()
    ]);
    const stabById=new Map((stabilization.locations||[]).map(x=>[x.locationId,x]));
    const closeById=new Map((closeout.locations||[]).map(x=>[x.locationId,x]));
    const locations=(launch.locations||[]).map(loc=>{
      const stab=stabById.get(loc.locationId)||null,close=closeById.get(loc.locationId)||null;
      const latest=stab?.latestAssessment||null;
      const openIncidents=Number(loc.openIncidentCount||0);
      const critical=Number(loc.criticalIncidentCount||0);
      const checks=[
        {id:"LAUNCH_DAY_COMMAND",passed:loc.commandReady===true,actual:loc.commandReady?"READY":"HOLD"},
        {id:"NO_CRITICAL_INCIDENTS",passed:critical===0,actual:`${critical} critical`},
        {id:"INCIDENT_FOLLOWUP",passed:openIncidents===0,actual:`${openIncidents} open`},
        {id:"OPERATOR_CONFIDENCE",passed:Number(latest?.operatorConfidence||0)>=4,actual:latest?`${latest.operatorConfidence}/5`:"not assessed"},
        {id:"WORKFLOW_STABILITY",passed:latest?.workflowStability==="STABLE",actual:latest?.workflowStability||"not assessed"},
        {id:"GUEST_IMPACT",passed:["NONE","LOW"].includes(latest?.guestImpact),actual:latest?.guestImpact||"not assessed"},
        {id:"SUPPORT_BURDEN",passed:["LOW","MANAGEABLE"].includes(latest?.supportLoad),actual:latest?.supportLoad||"not assessed"},
        {id:"REPEATED_HEALTH",passed:Number(stab?.healthyRecentObservations||0)>=3,actual:`${stab?.healthyRecentObservations||0} healthy recent observations`},
        {id:"DATA_KPI_CONFIDENCE",passed:stab?.checks?.find(x=>x.id==="DATA_INTEGRITY_RECHECK")?.passed===true&&stab?.checks?.find(x=>x.id==="EXECUTIVE_KPI_RECHECK")?.passed===true,actual:"recheck required"},
        {id:"UNRESOLVED_DEBT_VISIBLE",passed:true,actual:`${close?.unresolvedDebt?.length||0} visible debt item(s)`}
      ];
      const hardHold=critical>0||checks.filter(x=>["LAUNCH_DAY_COMMAND","WORKFLOW_STABILITY","DATA_KPI_CONFIDENCE"].includes(x.id)&&!x.passed).length>0;
      const all=checks.every(x=>x.passed);
      const recommendation=hardHold?"HOLD":all?"PROCEED":"PROCEED_WITH_CONDITIONS";
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
        recommendation,stabilizationState:stab?.stabilizationState||"ASSESSMENT_REQUIRED",
        operatorAssessment:latest,unresolvedDebt:close?.unresolvedDebt||[],
        openIncidentCount:openIncidents,criticalIncidentCount:critical
      };
    });
    return {
      version:"95.25.0",gate:"PILOT_FIRST_SERVICE_STABILIZATION_AND_HYPERCARE",generatedAt:new Date().toISOString(),
      locations,
      recommendation:locations.some(x=>x.recommendation==="HOLD")?"HOLD":
        locations.every(x=>x.recommendation==="PROCEED")?"PROCEED":"PROCEED_WITH_CONDITIONS",
      hypercare:{
        incidentFollowup:true,operatorFrictionReview:true,supportBurdenReview:true,recoveryVerification:true,
        repeatedHealthRequired:true,dataKpiRecheck:true,unresolvedDebtVisible:true
      },
      safety:{
        recommendationIsAdvisory:true,humanNextServiceDecisionRequired:true,
        noAutomaticNextService:true,noAutomaticRollback:true,noAutomaticExpansion:true,
        autonomousProductionChanges:false
      },
      nextGate:"PILOT_REPEAT_SERVICE_RELIABILITY_AND_CONFIDENCE"
    };
  }
}
module.exports=PilotFirstServiceStabilizationHypercareService;
