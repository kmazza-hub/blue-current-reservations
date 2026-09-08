"use strict";

class PilotExecutiveReviewExpansionGateService{
  constructor(database,trendService,recoveryService,liveShiftService){
    this.database=database;this.trends=trendService;this.recovery=recoveryService;this.liveShift=liveShiftService;
  }
  now(){return new Date().toISOString();}
  key(o,l){return `${o}:${l}`;}

  async evaluate(o,allowed=[],l){
    const trend=await this.trends.report(o,allowed,l);
    const incidents=await this.recovery.list(o,allowed,l);
    const live=await this.liveShift.snapshot(o,allowed,l);
    const db=await this.database.read();
    const operator=(db.pilotExecutiveOperatorReview||{})[this.key(o,l)]||{};
    const criticalOpen=incidents.incidents.filter(x=>x.severity==="CRITICAL"&&x.status!=="RESOLVED").length;
    const allEvidenceVerified=trend.measuredShiftCount>0&&trend.verifiedEvidenceShiftCount===trend.measuredShiftCount;
    const reliability={
      noOpenCriticalIncidents:criticalOpen===0,
      noActiveShift:!live.shift||live.shift.status!=="ACTIVE",
      evidenceVerified:allEvidenceVerified,
      sufficientMeasuredShifts:trend.measuredShiftCount>=3
    };
    const blockers=[];
    if(!reliability.noOpenCriticalIncidents)blockers.push("openCriticalIncident");
    if(!reliability.noActiveShift)blockers.push("activePilotShift");
    if(!reliability.evidenceVerified)blockers.push("evidenceIntegrityIncomplete");

    const reviewComplete=Boolean(operator.operationalFitReviewed&&operator.staffImpactReviewed&&operator.guestImpactReviewed&&operator.supportBurdenReviewed);
    let recommendation="CONTINUE_PILOT";
    if(blockers.length)recommendation="HOLD";
    else if(trend.repeatability==="MIXED_OR_DECLINING")recommendation="HOLD";
    else if(trend.repeatability==="REPEATABLE_IMPROVEMENT"&&reviewComplete)recommendation="EXPAND";
    else if(trend.measuredShiftCount>=3&&trend.repeatability==="VARIABLE")recommendation="CONTINUE_PILOT";
    else if(operator.retireRecommended===true&&reviewComplete)recommendation="RETIRE";

    return {
      version:"82.0.0",generatedAt:this.now(),organizationId:o,locationId:l,
      recommendation,blockers,reliability,operatorReview:operator,
      performance:{
        measuredShiftCount:trend.measuredShiftCount,
        repeatability:trend.repeatability,
        trends:trend.trends,
        consistency:trend.consistency,
        cumulativeEvidenceValue:trend.cumulative
      },
      incidentSummary:{
        total:incidents.counts.total,
        open:incidents.counts.open,
        investigating:incidents.counts.investigating,
        resolved:incidents.counts.resolved,
        openCritical:criticalOpen
      },
      policy:{
        recommendationIsAdvisory:true,
        humanExecutiveDecisionRequired:true,
        expansionRequiresExplicitApproval:true,
        expansionRequiresRepeatableImprovement:true,
        expansionRequiresOperatorReview:true,
        criticalIncidentBlocksExpansion:true,
        noAutomaticMultiLocationRollout:true,
        noAutomaticPilotRetirement:true
      }
    };
  }

  async setOperatorReview(o,allowed=[],l,input={},actor){
    await this.liveShift.snapshot(o,allowed,l);
    const review={
      operationalFitReviewed:Boolean(input.operationalFitReviewed),
      staffImpactReviewed:Boolean(input.staffImpactReviewed),
      guestImpactReviewed:Boolean(input.guestImpactReviewed),
      supportBurdenReviewed:Boolean(input.supportBurdenReviewed),
      operationalFit:String(input.operationalFit||"").slice(0,1500),
      staffImpact:String(input.staffImpact||"").slice(0,1500),
      guestImpact:String(input.guestImpact||"").slice(0,1500),
      supportBurden:String(input.supportBurden||"").slice(0,1500),
      retireRecommended:Boolean(input.retireRecommended),
      notes:String(input.notes||"").slice(0,2500),
      reviewedAt:this.now(),reviewedBy:actor||"admin"
    };
    await this.database.mutate(db=>{db.pilotExecutiveOperatorReview=db.pilotExecutiveOperatorReview||{};db.pilotExecutiveOperatorReview[this.key(o,l)]=review;return true;});
    return this.evaluate(o,allowed,l);
  }

  async decide(o,allowed=[],l,input={},actor){
    const evaluation=await this.evaluate(o,allowed,l);
    const decision=String(input.decision||"").toUpperCase();
    const allowedDecisions=["CONTINUE_PILOT","EXPAND","HOLD","RETIRE"];
    if(!allowedDecisions.includes(decision)){const e=new Error("Decision must be CONTINUE_PILOT, EXPAND, HOLD, or RETIRE.");e.statusCode=400;throw e;}
    if(decision==="EXPAND"){
      const review=evaluation.operatorReview||{};
      const complete=review.operationalFitReviewed&&review.staffImpactReviewed&&review.guestImpactReviewed&&review.supportBurdenReviewed;
      if(evaluation.blockers.length||evaluation.performance.repeatability!=="REPEATABLE_IMPROVEMENT"||!complete){
        const e=new Error("Expansion is blocked until repeatable improvement, complete operator review, evidence integrity, and incident gates pass.");e.statusCode=409;throw e;
      }
    }
    const record={
      id:`ped-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId:l,decision,recommendationAtDecision:evaluation.recommendation,
      rationale:String(input.rationale||"").trim().slice(0,3000),
      decidedAt:this.now(),decidedBy:actor||"executive",
      multiLocationRolloutAuthorized:false,
      autonomousProductionChangesAuthorized:false
    };
    if(record.rationale.length<10){const e=new Error("Executive decision requires a rationale.");e.statusCode=400;throw e;}
    await this.database.mutate(db=>{
      db.pilotExecutiveDecisions=db.pilotExecutiveDecisions||[];
      db.pilotExecutiveDecisions.push(record);
      db.pilotExecutiveCurrentDecision=db.pilotExecutiveCurrentDecision||{};
      db.pilotExecutiveCurrentDecision[this.key(o,l)]=record;
      return true;
    });
    return {decision:record,evaluation:await this.evaluate(o,allowed,l)};
  }
}
module.exports=PilotExecutiveReviewExpansionGateService;
