"use strict";

class ExpansionPortfolioProofService {
  constructor(database,auditService,realtimeHub,expansionCohortObservationService,managementExecutiveAccuracyService,dataIntegrityRecoveryService){
    Object.assign(this,{database,auditService,realtimeHub,expansionCohortObservationService,managementExecutiveAccuracyService,dataIntegrityRecoveryService});
  }
  now(){return new Date().toISOString();}
  rank(v){return {none:0,low:1,medium:2,high:3,critical:4}[String(v||"none").toLowerCase()]??0;}
  async assessments(org){
    const db=await this.database.read();
    return (db.expansionPortfolioProofAssessments||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.assessedAt)-new Date(a.assessedAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.expansionPortfolioProofDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  async snapshot(org,allowed){
    const [cohortState,accuracy,integrity,assessments,decisions]=await Promise.all([
      this.expansionCohortObservationService.snapshot(org,allowed),
      this.managementExecutiveAccuracyService.snapshot(org,allowed),
      this.dataIntegrityRecoveryService.snapshot(org,allowed),
      this.assessments(org),this.decisions(org)
    ]);

    const assessment=assessments[0]||null;
    const decision=decisions[0]||null;
    const cohorts=cohortState.cohorts||[];
    const activated=cohorts.filter(x=>x.activation);
    const continued=cohorts.filter(x=>x.decision?.decision==="CONTINUE");
    const pausedHeld=cohorts.filter(x=>["PAUSE","HOLD"].includes(x.decision?.decision));
    const observations=activated.flatMap(x=>x.observations||[]);
    const recent=observations.sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt)).slice(0,12);
    const healthyRecent=recent.filter(x=>Object.values(x.health||{}).every(Boolean)&&this.rank(x.severity)<=1).length;
    const highCritical=observations.filter(x=>this.rank(x.severity)>=3).length;
    const supportManageable=recent.length>0&&recent.every(x=>["LOW","MANAGEABLE"].includes(String(x.supportLoad||"").toUpperCase()));
    const expandedLocationIds=[...new Set(activated.flatMap(x=>(x.locations||[]).map(l=>l.locationId)))];
    const accuracyLocations=(accuracy.locations||[]).filter(x=>expandedLocationIds.includes(x.locationId));
    const trustedKpis=expandedLocationIds.length>0&&accuracyLocations.length===expandedLocationIds.length&&accuracyLocations.every(x=>(x.criticalIssues||[]).length===0&&x.trustState!=="EXECUTIVE_DATA_NOT_TRUSTED");
    const integrityReady=["data-integrity-ready-for-certification","data-integrity-recovery-certified"].includes(integrity.status);

    const checks=[
      {id:"COHORTS_ACTIVATED",passed:activated.length>0,actual:`${activated.length}/${cohorts.length} cohort(s) activated`},
      {id:"COHORT_DECISIONS_CONTINUE",passed:activated.length>0&&continued.length===activated.length,actual:`${continued.length}/${activated.length} activated cohort(s) CONTINUE`},
      {id:"NO_PAUSE_HOLD",passed:pausedHeld.length===0,actual:`${pausedHeld.length} paused/held cohort(s)`},
      {id:"REPEATED_PORTFOLIO_HEALTH",passed:healthyRecent>=3,actual:`${healthyRecent}/${recent.length} healthy recent observation(s)`},
      {id:"NO_HIGH_CRITICAL_INCIDENTS",passed:highCritical===0,actual:`${highCritical} high/critical incident(s)`},
      {id:"SUPPORT_LOAD_MANAGEABLE",passed:supportManageable,actual:recent.length?`${recent.length} recent observation(s) reviewed`:"no observations"},
      {id:"DATA_INTEGRITY_RECHECK",passed:integrityReady,actual:integrity.status},
      {id:"EXPANDED_KPI_TRUST",passed:trustedKpis,actual:`${accuracyLocations.length}/${expandedLocationIds.length} expanded location(s) reconciled`},
      {id:"PORTFOLIO_OUTCOME_EVIDENCE",passed:!!assessment?.portfolioOutcomeEvidence,actual:assessment?.portfolioOutcomeEvidence?"recorded":"not recorded"},
      {id:"OPERATOR_CONFIDENCE",passed:Number(assessment?.operatorConfidence||0)>=4,actual:assessment?`${assessment.operatorConfidence}/5`:"not assessed"},
      {id:"SUPPORT_BURDEN_REVIEW",passed:!!assessment?.supportBurdenReview,actual:assessment?.supportBurdenReview?"recorded":"not assessed"},
      {id:"REPLICATION_LESSONS",passed:!!assessment?.replicationLessons,actual:assessment?.replicationLessons?"recorded":"not assessed"},
      {id:"STABILIZATION_WINDOW",passed:!!assessment?.window?.start&&!!assessment?.window?.end,actual:assessment?.window?.start?`${assessment.window.start} → ${assessment.window.end}`:"not recorded"}
    ];

    return {
      version:"52.30.0",generatedAt:this.now(),
      status:decision?.decision==="REPEAT"?"expansion-model-repeat-approved":decision?.decision==="HOLD"?"expansion-model-held":decision?.decision==="ROLLBACK"?"expansion-model-rollback-recommended":assessment?"expansion-portfolio-proof-in-review":"expansion-portfolio-proof-required",
      headline:`${checks.filter(x=>x.passed).length}/${checks.length} portfolio-proof gates pass; ${expandedLocationIds.length} expanded location(s), ${highCritical} high/critical incident(s).`,
      expandedLocationIds,cohorts:{total:cohorts.length,activated:activated.length,continued:continued.length,pausedHeld:pausedHeld.length},
      recentObservations:recent,assessment,decision,checks,
      proofReady:checks.every(x=>x.passed),
      dependencyStatus:{cohortObservation:cohortState.status,dataIntegrity:integrity.status,executiveAccuracy:accuracy.status},
      policy:{
        repeatedPortfolioObservationRequired:true,
        cohortContinueRequired:true,
        supportBurdenReviewRequired:true,
        dataIntegrityRecheckRequired:true,
        executiveKpiReconciliationRequired:true,
        humanPortfolioAssessmentRequired:true,
        humanRepeatHoldRollbackDecisionRequired:true,
        repeatDecisionDoesNotStartNewRollout:true,
        rollbackDecisionDoesNotExecuteRollback:true,
        noAutomaticExpansionRepeat:true,
        autonomousProductionChanges:false
      }
    };
  }
  async assess(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    const confidence=Number(input.operatorConfidence);
    if(!(confidence>=1&&confidence<=5))throw new Error("Operator confidence from 1 to 5 is required.");
    for(const key of ["portfolioOutcomeEvidence","supportBurdenReview","replicationLessons","windowStart","windowEnd"]){
      if(!String(input[key]||"").trim())throw new Error(`${key} is required.`);
    }
    const record={
      id:`epp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      assessedAt:this.now(),assessedBy:actor,operatorConfidence:confidence,
      portfolioOutcomeEvidence:String(input.portfolioOutcomeEvidence).trim().slice(0,3500),
      supportBurdenReview:String(input.supportBurdenReview).trim().slice(0,3000),
      replicationLessons:String(input.replicationLessons).trim().slice(0,3500),
      window:{start:String(input.windowStart).trim().slice(0,100),end:String(input.windowEnd).trim().slice(0,100)},
      note:String(input.note||"").trim().slice(0,1800),
      expandedLocationIds:state.expandedLocationIds,
      automaticRolloutStarted:false,productionMutationPerformed:false
    };
    await this.database.mutate(db=>{db.expansionPortfolioProofAssessments||=[];db.expansionPortfolioProofAssessments.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:"Expansion portfolio-proof assessment recorded",category:"expansion_portfolio_proof"});
    this.realtimeHub.publish("expansion-portfolio-proof:assessed",{organizationId:org,id:record.id});
    return record;
  }
  async decide(org,allowed,input,actor){
    const state=await this.snapshot(org,allowed);
    if(!state.assessment)throw new Error("Human portfolio-proof assessment is required before a decision.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["REPEAT","HOLD","ROLLBACK"].includes(decision))throw new Error("Decision must be REPEAT, HOLD, or ROLLBACK.");
    if(!evidence)throw new Error("Human portfolio decision evidence is required.");
    if(decision==="REPEAT"&&!state.proofReady&&!reason)throw new Error("REPEAT with open proof gates requires an executive override reason.");
    if(["HOLD","ROLLBACK"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented human reason.`);
    const record={
      id:`epr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,
      decision,decidedAt:this.now(),decidedBy:actor,evidence:evidence.slice(0,3500),reason:reason.slice(0,2200),
      assessmentId:state.assessment.id,gateSnapshot:{passed:state.checks.filter(x=>x.passed).length,total:state.checks.length,checks:state.checks},
      newRolloutStartedByDecision:false,rollbackExecutedByDecision:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.expansionPortfolioProofDecisions||=[];db.expansionPortfolioProofDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Expansion portfolio decision ${decision} recorded; no rollout or rollback executed`,category:"expansion_portfolio_proof"});
    this.realtimeHub.publish("expansion-portfolio-proof:decision",{organizationId:org,id:record.id,decision});
    return record;
  }
}
module.exports=ExpansionPortfolioProofService;
