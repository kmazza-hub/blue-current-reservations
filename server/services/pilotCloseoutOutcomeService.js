"use strict";

class PilotCloseoutOutcomeService {
  constructor(database,auditService,realtimeHub,pilotStabilizationExitService){
    Object.assign(this,{database,auditService,realtimeHub,pilotStabilizationExitService});
  }
  now(){return new Date().toISOString();}
  async reviews(org){
    const db=await this.database.read();
    return (db.pilotCloseoutReviews||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.pilotExpansionDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  async snapshot(org,allowed){
    const [stabilization,reviews,decisions]=await Promise.all([
      this.pilotStabilizationExitService.snapshot(org,allowed),
      this.reviews(org),this.decisions(org)
    ]);
    const locations=(stabilization.locations||[]).map(loc=>{
      const review=reviews.find(x=>x.locationId===loc.locationId)||null;
      const decision=decisions.find(x=>x.locationId===loc.locationId)||null;
      const stable=loc.exitDecision?.decision==="STABLE";
      const debt=(review?.unresolvedDebt||[]).filter(x=>x.status!=="CLOSED");
      const incidentOpen=(review?.incidentCloseout||[]).filter(x=>x.status!=="CLOSED");
      const prerequisites=review?.expansionPrerequisites||[];
      const checks=[
        {id:"PILOT_STABLE",passed:stable,actual:loc.exitDecision?.decision||"no STABLE decision"},
        {id:"OBJECTIVE_REVIEW",passed:!!review?.objectiveOutcomeSummary,actual:review?.objectiveOutcomeSummary?"recorded":"not recorded"},
        {id:"OPERATOR_FEEDBACK",passed:!!review?.operatorFeedback,actual:review?.operatorFeedback?"recorded":"not recorded"},
        {id:"GUEST_IMPACT_SUMMARY",passed:!!review?.guestImpactSummary,actual:review?.guestImpactSummary?"recorded":"not recorded"},
        {id:"INCIDENT_CLOSEOUT",passed:!!review&&incidentOpen.length===0,actual:review?`${incidentOpen.length} open incident(s)`:"not reviewed"},
        {id:"SUPPORT_BURDEN",passed:!!review?.supportBurdenSummary,actual:review?.supportBurdenSummary?"recorded":"not recorded"},
        {id:"DATA_KPI_CONFIDENCE",passed:!!review?.dataKpiConfidenceSummary,actual:review?.dataKpiConfidenceSummary?"recorded":"not recorded"},
        {id:"DEBT_REGISTER",passed:!!review,actual:review?`${debt.length} unresolved debt item(s)`:"not recorded"},
        {id:"LESSONS_LEARNED",passed:!!review?.lessonsLearned,actual:review?.lessonsLearned?"recorded":"not recorded"},
        {id:"EXPANSION_PREREQUISITES",passed:prerequisites.length>0&&prerequisites.every(x=>x.status==="MET"),actual:review?`${prerequisites.filter(x=>x.status==="MET").length}/${prerequisites.length} met`:"not recorded"}
      ];
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        stabilizationState:loc.stabilizationState,stabilizationDecision:loc.exitDecision||null,
        review,decision,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
        unresolvedDebt:debt,openIncidents:incidentOpen,
        expansionReady:checks.every(x=>x.passed)&&debt.filter(x=>["high","critical"].includes(String(x.severity).toLowerCase())).length===0,
        closeoutState:decision?.decision==="EXPAND"?"EXPANSION_APPROVED":decision?.decision==="HOLD"?"EXPANSION_HELD":decision?.decision==="RETIRE"?"PILOT_RETIRED":review?"CLOSEOUT_REVIEWED":"CLOSEOUT_REQUIRED"
      };
    });
    return {
      version:"52.10.0",generatedAt:this.now(),
      status:locations.some(x=>x.decision?.decision==="EXPAND")?"pilot-expansion-approved":locations.some(x=>x.review)?"pilot-closeout-in-review":"pilot-closeout-required",
      headline:`${locations.filter(x=>x.expansionReady).length}/${locations.length} location(s) satisfy expansion-readiness criteria; ${locations.reduce((n,x)=>n+x.unresolvedDebt.length,0)} unresolved debt item(s) remain.`,
      locations,
      policy:{
        stablePilotRequiredForCloseout:true,
        operatorFeedbackRequired:true,
        guestImpactSummaryRequired:true,
        incidentCloseoutRequired:true,
        unresolvedDebtMustRemainVisible:true,
        expansionPrerequisitesHumanReviewed:true,
        humanExpandHoldRetireDecisionRequired:true,
        expandDecisionDoesNotDeploy:true,
        noAutomaticMultiLocationRollout:true,
        noAutomaticPilotRetirement:true,
        autonomousProductionChanges:false
      }
    };
  }
  async review(org,allowed,locationId,input,actor){
    const stabilization=await this.pilotStabilizationExitService.snapshot(org,allowed);
    const loc=(stabilization.locations||[]).find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Pilot location not found.");
    if(loc.exitDecision?.decision!=="STABLE")throw new Error("Pilot must have a human STABLE decision before closeout review.");
    const req=["objectiveOutcomeSummary","operatorFeedback","guestImpactSummary","supportBurdenSummary","dataKpiConfidenceSummary","lessonsLearned"];
    for(const key of req)if(!String(input[key]||"").trim())throw new Error(`${key} is required.`);
    const prereq=Array.isArray(input.expansionPrerequisites)?input.expansionPrerequisites:[];
    if(!prereq.length)throw new Error("At least one expansion prerequisite is required.");
    const record={
      id:`pcr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,
      reviewedAt:this.now(),reviewedBy:actor,
      objectiveOutcomeSummary:String(input.objectiveOutcomeSummary).trim().slice(0,3500),
      operatorFeedback:String(input.operatorFeedback).trim().slice(0,3500),
      guestImpactSummary:String(input.guestImpactSummary).trim().slice(0,2800),
      supportBurdenSummary:String(input.supportBurdenSummary).trim().slice(0,2800),
      dataKpiConfidenceSummary:String(input.dataKpiConfidenceSummary).trim().slice(0,2800),
      lessonsLearned:String(input.lessonsLearned).trim().slice(0,3500),
      incidentCloseout:(Array.isArray(input.incidentCloseout)?input.incidentCloseout:[]).map((x,i)=>({id:String(x.id||`incident_${i+1}`),summary:String(x.summary||"").trim().slice(0,1800),status:String(x.status||"OPEN").toUpperCase()})).filter(x=>x.summary),
      unresolvedDebt:(Array.isArray(input.unresolvedDebt)?input.unresolvedDebt:[]).map((x,i)=>({id:String(x.id||`debt_${i+1}`),summary:String(x.summary||"").trim().slice(0,1800),severity:String(x.severity||"medium").toLowerCase(),status:String(x.status||"OPEN").toUpperCase()})).filter(x=>x.summary),
      expansionPrerequisites:prereq.map((x,i)=>({id:String(x.id||`prereq_${i+1}`),summary:String(x.summary||"").trim().slice(0,1500),status:String(x.status||"OPEN").toUpperCase()})).filter(x=>x.summary),
      rolloutPerformed:false,productionMutationPerformed:false
    };
    await this.database.mutate(db=>{db.pilotCloseoutReviews||=[];db.pilotCloseoutReviews.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot closeout review recorded for ${locationId}`,category:"pilot_closeout"});
    this.realtimeHub.publish("pilot-closeout:reviewed",{organizationId:org,locationId,id:record.id});
    return record;
  }
  async decide(org,allowed,locationId,input,actor){
    const snap=await this.snapshot(org,allowed);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc?.review)throw new Error("Pilot closeout review is required before an expansion decision.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["EXPAND","HOLD","RETIRE"].includes(decision))throw new Error("Decision must be EXPAND, HOLD, or RETIRE.");
    if(!evidence)throw new Error("Human expansion decision evidence is required.");
    if(decision==="EXPAND"&&!loc.expansionReady&&!reason)throw new Error("EXPAND with open readiness criteria requires an executive override reason.");
    if(["HOLD","RETIRE"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={
      id:`ped52_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,decision,
      decidedAt:this.now(),decidedBy:actor,evidence,reason,reviewId:loc.review.id,
      readinessSnapshot:{passed:loc.passed,total:loc.total,checks:loc.checks,unresolvedDebt:loc.unresolvedDebt},
      rolloutPerformedByDecision:false,retirementPerformedByDecision:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.pilotExpansionDecisions||=[];db.pilotExpansionDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot expansion decision ${decision} recorded for ${locationId}; no rollout or retirement executed`,category:"pilot_closeout"});
    this.realtimeHub.publish("pilot-closeout:decision",{organizationId:org,locationId,id:record.id,decision});
    return record;
  }
}
module.exports=PilotCloseoutOutcomeService;
