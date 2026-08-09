"use strict";
class PilotStabilizationExitService {
  constructor(database,auditService,realtimeHub,pilotExecutionObservationService,dataIntegrityRecoveryService,managementExecutiveAccuracyService){
    Object.assign(this,{database,auditService,realtimeHub,pilotExecutionObservationService,dataIntegrityRecoveryService,managementExecutiveAccuracyService});
  }
  now(){return new Date().toISOString();}
  async assessments(org){const db=await this.database.read();return(db.pilotStabilizationAssessments||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.assessedAt)-new Date(a.assessedAt));}
  async decisions(org){const db=await this.database.read();return(db.pilotStabilizationExitDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));}
  rank(x){return {none:0,low:1,medium:2,high:3,critical:4}[String(x||"none").toLowerCase()]??0;}
  async snapshot(org,allowed){
    const [execution,integrity,accuracy,assessments,decisions]=await Promise.all([
      this.pilotExecutionObservationService.snapshot(org,allowed),
      this.dataIntegrityRecoveryService.snapshot(org,allowed),
      this.managementExecutiveAccuracyService.snapshot(org,allowed),
      this.assessments(org),this.decisions(org)
    ]);
    const locations=(execution.locations||[]).map(loc=>{
      const history=assessments.filter(x=>x.locationId===loc.locationId),assessment=history[0]||null,decision=decisions.find(x=>x.locationId===loc.locationId)||null;
      const recent=(loc.observations||[]).slice(0,5),healthy=recent.filter(x=>Object.values(x.health||{}).every(Boolean)&&this.rank(x.severity)<=1).length;
      const highCritical=(loc.observations||[]).filter(x=>this.rank(x.severity)>=3).length;
      const confidence=Number(assessment?.operatorConfidence||0),guestImpact=assessment?.guestImpact||"UNASSESSED",supportLoad=assessment?.supportLoad||"UNASSESSED";
      const accuracyLoc=(accuracy.locations||[]).find(x=>x.locationId===loc.locationId)||null;
      const checks=[
        {id:"EXECUTION_CONTINUE",passed:loc.currentDecision?.decision==="CONTINUE",actual:loc.currentDecision?.decision||"not recorded"},
        {id:"MILESTONES_COMPLETE",passed:loc.totalMilestones>0&&loc.confirmedMilestones===loc.totalMilestones,actual:`${loc.confirmedMilestones}/${loc.totalMilestones}`},
        {id:"REPEATED_HEALTH",passed:healthy>=3,actual:`${healthy}/${recent.length} healthy recent observations`},
        {id:"INCIDENT_TREND",passed:highCritical===0,actual:`${highCritical} high/critical observations`},
        {id:"OPERATOR_CONFIDENCE",passed:confidence>=4,actual:assessment?`${confidence}/5`:"not assessed"},
        {id:"WORKFLOW_STABILITY",passed:assessment?.workflowStability==="STABLE",actual:assessment?.workflowStability||"not assessed"},
        {id:"GUEST_IMPACT",passed:["NONE","LOW"].includes(guestImpact),actual:guestImpact},
        {id:"SUPPORT_LOAD",passed:["LOW","MANAGEABLE"].includes(supportLoad),actual:supportLoad},
        {id:"DATA_INTEGRITY_RECHECK",passed:["data-integrity-ready-for-certification","data-integrity-recovery-certified"].includes(integrity.status),actual:integrity.status},
        {id:"EXECUTIVE_KPI_RECHECK",passed:!!accuracyLoc&&accuracyLoc.criticalIssues?.length===0&&accuracyLoc.trustState!=="EXECUTIVE_DATA_NOT_TRUSTED",actual:accuracyLoc?.trustState||"unavailable"},
        {id:"STABILIZATION_WINDOW",passed:!!assessment?.window?.start&&!!assessment?.window?.end,actual:assessment?.window?.start?`${assessment.window.start} → ${assessment.window.end}`:"not recorded"}
      ];
      return {locationId:loc.locationId,locationName:loc.locationName,executionSession:loc.session||null,currentExecutionDecision:loc.currentDecision||null,latestAssessment:assessment,assessmentHistory:history,observations:(loc.observations||[]).slice(0,12),healthyRecentObservations:healthy,highCriticalIncidents:highCritical,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,stabilizationReady:checks.every(x=>x.passed),exitDecision:decision,stabilizationState:decision?.decision==="STABLE"?"PILOT_STABLE":decision?.decision==="EXTEND"?"PILOT_EXTENDED":decision?.decision==="ROLLBACK"?"ROLLBACK_RECOMMENDED":assessment?"STABILIZATION_ASSESSED":"STABILIZATION_ASSESSMENT_REQUIRED"};
    });
    return {version:"52.5.0",generatedAt:this.now(),status:locations.some(x=>x.exitDecision?.decision==="STABLE")?"pilot-stable":locations.some(x=>x.latestAssessment)?"pilot-stabilization-in-review":"pilot-stabilization-awaiting-assessment",headline:`${locations.filter(x=>x.stabilizationReady).length}/${locations.length} location(s) satisfy all stabilization gates; ${locations.filter(x=>x.exitDecision).length} human exit decision(s) recorded.`,locations,dependencyStatus:{execution:execution.status,dataIntegrity:integrity.status,executiveAccuracy:accuracy.status},policy:{repeatedObservationRequired:true,operatorAssessmentHumanRequired:true,guestImpactReviewRequired:true,dataIntegrityRecheckRequired:true,executiveKpiTrustRecheckRequired:true,humanStableExtendRollbackDecisionRequired:true,stableDecisionDoesNotExpandRollout:true,rollbackDecisionDoesNotExecuteRollback:true,noAutomaticPilotExit:true,noAutomaticRolloutExpansion:true,autonomousProductionChanges:false}};
  }
  async assess(org,allowed,locationId,input,actor){
    const execution=await this.pilotExecutionObservationService.snapshot(org,allowed),loc=(execution.locations||[]).find(x=>x.locationId===locationId);
    if(!loc?.session)throw new Error("Pilot execution session is required before stabilization assessment.");
    const confidence=Number(input.operatorConfidence); if(!(confidence>=1&&confidence<=5))throw new Error("Operator confidence from 1 to 5 is required.");
    const workflowStability=String(input.workflowStability||"").toUpperCase(),guestImpact=String(input.guestImpact||"").toUpperCase(),supportLoad=String(input.supportLoad||"").toUpperCase();
    if(!["STABLE","MIXED","UNSTABLE"].includes(workflowStability))throw new Error("Workflow stability must be STABLE, MIXED, or UNSTABLE.");
    if(!["NONE","LOW","MEDIUM","HIGH"].includes(guestImpact))throw new Error("Guest impact must be NONE, LOW, MEDIUM, or HIGH.");
    if(!["LOW","MANAGEABLE","HIGH","CRITICAL"].includes(supportLoad))throw new Error("Support load must be LOW, MANAGEABLE, HIGH, or CRITICAL.");
    const start=String(input.windowStart||"").trim(),end=String(input.windowEnd||"").trim(),evidence=String(input.evidence||"").trim();
    if(!start||!end)throw new Error("Stabilization window start and end are required."); if(!evidence)throw new Error("Human stabilization evidence is required.");
    const record={id:`psa_${Date.now()}`,organizationId:org,locationId,locationName:loc.locationName,sessionId:loc.session.id,assessedAt:this.now(),assessedBy:actor,operatorConfidence:confidence,workflowStability,guestImpact,supportLoad,window:{start,end},evidence,note:String(input.note||"").trim(),automaticOperationalAction:false,automaticRolloutExpansion:false};
    await this.database.mutate(db=>{db.pilotStabilizationAssessments||=[];db.pilotStabilizationAssessments.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot stabilization assessment recorded for ${locationId}`,category:"pilot_stabilization"});
    this.realtimeHub.publish("pilot-stabilization:assessed",{organizationId:org,locationId,id:record.id}); return record;
  }
  async decide(org,allowed,locationId,input,actor){
    const snap=await this.snapshot(org,allowed),loc=snap.locations.find(x=>x.locationId===locationId); if(!loc?.latestAssessment)throw new Error("Human stabilization assessment is required before an exit decision.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["STABLE","EXTEND","ROLLBACK"].includes(decision))throw new Error("Decision must be STABLE, EXTEND, or ROLLBACK."); if(!evidence)throw new Error("Human exit-decision evidence is required.");
    if(decision==="STABLE"&&!loc.stabilizationReady&&!reason)throw new Error("STABLE with open gates requires an executive reason."); if(["EXTEND","ROLLBACK"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={id:`pse_${Date.now()}`,organizationId:org,locationId,locationName:loc.locationName,decision,decidedAt:this.now(),decidedBy:actor,evidence,reason,stabilizationAssessmentId:loc.latestAssessment.id,gateSnapshot:{passed:loc.passed,total:loc.total,checks:loc.checks},rolloutExpandedByDecision:false,rollbackExecutedByDecision:false,productionMutationPerformed:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.pilotStabilizationExitDecisions||=[];db.pilotStabilizationExitDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot stabilization decision ${decision} recorded for ${locationId}; no rollout expansion or rollback executed`,category:"pilot_stabilization"});
    this.realtimeHub.publish("pilot-stabilization:decision",{organizationId:org,locationId,id:record.id,decision}); return record;
  }
}
module.exports=PilotStabilizationExitService;
