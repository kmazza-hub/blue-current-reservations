"use strict";

class PilotStabilizationExitService {
  constructor(database,auditService,realtimeHub,pilotExecutionObservationService,dataIntegrityRecoveryService,managementExecutiveAccuracyService){
    Object.assign(this,{database,auditService,realtimeHub,pilotExecutionObservationService,dataIntegrityRecoveryService,managementExecutiveAccuracyService});
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async assessments(org){
    const db=await this.database.read();
    return (db.pilotStabilizationAssessments||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.assessedAt)-new Date(a.assessedAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.pilotStabilizationExitDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  severityRank(x){return {none:0,low:1,medium:2,high:3,critical:4}[String(x||"none").toLowerCase()]??0;}
  async snapshot(org,allowed){
    const [execution,integrity,accuracy,assessments,decisions]=await Promise.all([
      this.pilotExecutionObservationService.snapshot(org,allowed),
      this.dataIntegrityRecoveryService.snapshot(org,allowed),
      this.managementExecutiveAccuracyService.snapshot(org,allowed),
      this.assessments(org),this.decisions(org)
    ]);
    const locations=(execution.locations||[]).map(loc=>{
      const locationAssessments=assessments.filter(x=>x.locationId===loc.locationId);
      const latestAssessment=locationAssessments[0]||null;
      const decision=decisions.find(x=>x.locationId===loc.locationId)||null;
      const observations=loc.observations||[];
      const recent=observations.slice(0,5);
      const healthyObservations=recent.filter(x=>Object.values(x.health||{}).every(Boolean)&&this.severityRank(x.severity)<=1).length;
      const highCritical=observations.filter(x=>this.severityRank(x.severity)>=3).length;
      const severityTrend=recent.map(x=>this.severityRank(x.severity));
      const trendImproving=severityTrend.length<2||severityTrend[0]<=Math.max(...severityTrend.slice(1));
      const confidence=Number(latestAssessment?.operatorConfidence||0);
      const workflowStable=latestAssessment?.workflowStability==="STABLE";
      const guestImpact=latestAssessment?.guestImpact||"UNASSESSED";
      const supportLoad=latestAssessment?.supportLoad||"UNASSESSED";
      const integrityReady=["data-integrity-ready-for-certification","data-integrity-recovery-certified"].includes(integrity.status);
      const accuracyLoc=(accuracy.locations||[]).find(x=>x.locationId===loc.locationId)||null;
      const executiveTrusted=accuracyLoc?.criticalIssues?.length===0 && accuracyLoc?.trustState!=="EXECUTIVE_DATA_NOT_TRUSTED";
      const executionContinued=loc.currentDecision?.decision==="CONTINUE";
      const milestonesComplete=loc.confirmedMilestones===loc.totalMilestones&&loc.totalMilestones>0;
      const stabilizationWindow=latestAssessment?.window||null;
      const checks=[
        {id:"EXECUTION_CONTINUE",label:"Pilot execution has a human CONTINUE decision",passed:executionContinued,actual:loc.currentDecision?.decision||"no CONTINUE decision"},
        {id:"MILESTONES_COMPLETE",label:"All first-live milestones are confirmed",passed:milestonesComplete,actual:`${loc.confirmedMilestones}/${loc.totalMilestones}`},
        {id:"REPEATED_HEALTH",label:"At least three recent observations are healthy/low severity",passed:healthyObservations>=3,actual:`${healthyObservations}/${recent.length} healthy recent observation(s)`},
        {id:"INCIDENT_TREND",label:"Incident severity is stable or improving",passed:trendImproving&&highCritical===0,actual:`${highCritical} high/critical total · trend ${trendImproving?"stable/improving":"worsening"}`},
        {id:"OPERATOR_CONFIDENCE",label:"Operator confidence is at least 4/5",passed:confidence>=4,actual:latestAssessment?`${confidence}/5`:"not assessed"},
        {id:"WORKFLOW_STABILITY",label:"Reservation/floor/service/kitchen workflow stability is confirmed",passed:workflowStable,actual:latestAssessment?.workflowStability||"not assessed"},
        {id:"GUEST_IMPACT",label:"Guest impact is none or low",passed:["NONE","LOW"].includes(guestImpact),actual:guestImpact},
        {id:"SUPPORT_LOAD",label:"Support load is manageable",passed:["LOW","MANAGEABLE"].includes(supportLoad),actual:supportLoad},
        {id:"DATA_INTEGRITY_RECHECK",label:"Data integrity recheck is ready/certified",passed:integrityReady,actual:integrity.status},
        {id:"EXECUTIVE_KPI_RECHECK",label:"Location has no critical executive KPI trust issues",passed:executiveTrusted,actual:accuracyLoc?.trustState||"not available"},
        {id:"STABILIZATION_WINDOW",label:"Human stabilization window is recorded",passed:!!stabilizationWindow?.start&&!!stabilizationWindow?.end,actual:stabilizationWindow?.start?`${stabilizationWindow.start} → ${stabilizationWindow.end}`:"not recorded"}
      ];
      const passed=checks.filter(x=>x.passed).length;
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        executionSession:loc.session||null,currentExecutionDecision:loc.currentDecision||null,
        latestAssessment,assessmentHistory:locationAssessments,
        observations:observations.slice(0,12),
        healthyRecentObservations:healthyObservations,
        highCriticalIncidents:highCritical,
        checks,passed,total:checks.length,
        stabilizationReady:checks.every(x=>x.passed),
        exitDecision:decision,
        stabilizationState:decision?.decision==="STABLE"?"PILOT_STABLE":decision?.decision==="EXTEND"?"PILOT_EXTENDED":decision?.decision==="ROLLBACK"?"ROLLBACK_RECOMMENDED":latestAssessment?"STABILIZATION_ASSESSED":"STABILIZATION_ASSESSMENT_REQUIRED"
      };
    });
    return {
      version:"51.65.0",generatedAt:this.now(),
      status:locations.some(x=>x.exitDecision?.decision==="STABLE")?"pilot-stable":locations.some(x=>x.latestAssessment)?"pilot-stabilization-in-review":"pilot-stabilization-awaiting-assessment",
      headline:`${locations.filter(x=>x.stabilizationReady).length}/${locations.length} location(s) satisfy all stabilization/exit gates; ${locations.filter(x=>x.exitDecision).length} human exit decision(s) recorded.`,
      locations,
      dependencyStatus:{execution:execution.status,dataIntegrity:integrity.status,executiveAccuracy:accuracy.status},
      policy:{
        repeatedObservationRequired:true,
        operatorAssessmentHumanRequired:true,
        guestImpactReviewRequired:true,
        dataIntegrityRecheckRequired:true,
        executiveKpiTrustRecheckRequired:true,
        humanStableExtendRollbackDecisionRequired:true,
        stableDecisionDoesNotExpandRollout:true,
        rollbackDecisionDoesNotExecuteRollback:true,
        noAutomaticPilotExit:true,
        noAutomaticRolloutExpansion:true,
        autonomousProductionChanges:false
      }
    };
  }
  async assess(org,allowed,locationId,input,actor){
    if(!this.allowed(locationId,allowed))throw new Error("Location is outside your authorized scope.");
    const execution=await this.pilotExecutionObservationService.snapshot(org,allowed);
    const loc=(execution.locations||[]).find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Pilot location not found.");
    if(!loc.session)throw new Error("Pilot execution session is required before stabilization assessment.");
    const confidence=Math.max(1,Math.min(5,Number(input.operatorConfidence)||0));
    if(!confidence)throw new Error("Operator confidence from 1 to 5 is required.");
    const workflowStability=String(input.workflowStability||"").toUpperCase();
    if(!["STABLE","MIXED","UNSTABLE"].includes(workflowStability))throw new Error("Workflow stability must be STABLE, MIXED, or UNSTABLE.");
    const guestImpact=String(input.guestImpact||"").toUpperCase();
    if(!["NONE","LOW","MEDIUM","HIGH"].includes(guestImpact))throw new Error("Guest impact must be NONE, LOW, MEDIUM, or HIGH.");
    const supportLoad=String(input.supportLoad||"").toUpperCase();
    if(!["LOW","MANAGEABLE","HIGH","CRITICAL"].includes(supportLoad))throw new Error("Support load must be LOW, MANAGEABLE, HIGH, or CRITICAL.");
    const start=String(input.windowStart||"").trim().slice(0,80),end=String(input.windowEnd||"").trim().slice(0,80);
    if(!start||!end)throw new Error("Stabilization window start and end are required.");
    const evidence=String(input.evidence||"").trim().slice(0,3200);
    if(!evidence)throw new Error("Human stabilization assessment evidence is required.");
    const record={
      id:`psa_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,
      sessionId:loc.session.id,assessedAt:this.now(),assessedBy:actor,
      operatorConfidence:confidence,workflowStability,guestImpact,supportLoad,
      window:{start,end},
      evidence,note:String(input.note||"").trim().slice(0,1800),
      guestImpactReviewed:true,supportLoadReviewed:true,
      automaticOperationalAction:false,automaticRolloutExpansion:false
    };
    await this.database.mutate(db=>{db.pilotStabilizationAssessments||=[];db.pilotStabilizationAssessments.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot stabilization assessment recorded for ${locationId}`,category:"pilot_stabilization"});
    this.realtimeHub.publish("pilot-stabilization:assessed",{organizationId:org,locationId,id:record.id});
    return record;
  }
  async decide(org,allowed,locationId,input,actor){
    const snap=await this.snapshot(org,allowed);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Pilot location not found.");
    if(!loc.latestAssessment)throw new Error("Human stabilization assessment is required before an exit decision.");
    const decision=String(input.decision||"").toUpperCase();
    if(!["STABLE","EXTEND","ROLLBACK"].includes(decision))throw new Error("Decision must be STABLE, EXTEND, or ROLLBACK.");
    const evidence=String(input.evidence||"").trim().slice(0,3400);
    const reason=String(input.reason||"").trim().slice(0,2200);
    if(!evidence)throw new Error("Human pilot-exit decision evidence is required.");
    if(decision==="STABLE"&&!loc.stabilizationReady&&!reason)throw new Error("STABLE with open stabilization gates requires a documented executive override reason.");
    if(["EXTEND","ROLLBACK"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented human reason.`);
    const record={
      id:`pse_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,
      decision,decidedAt:this.now(),decidedBy:actor,evidence,reason,
      stabilizationAssessmentId:loc.latestAssessment.id,
      gateSnapshot:{passed:loc.passed,total:loc.total,checks:loc.checks},
      rolloutExpandedByDecision:false,
      rollbackExecutedByDecision:false,
      productionMutationPerformed:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.pilotStabilizationExitDecisions||=[];db.pilotStabilizationExitDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot stabilization exit decision ${decision} recorded for ${locationId}; no rollout expansion or rollback executed`,category:"pilot_stabilization"});
    this.realtimeHub.publish("pilot-stabilization:decision",{organizationId:org,locationId,id:record.id,decision});
    return record;
  }
}
module.exports=PilotStabilizationExitService;
