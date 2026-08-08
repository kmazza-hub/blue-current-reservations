"use strict";

class PilotDecisionLedgerService {
  constructor(database,auditService,realtimeHub,executivePilotReviewService){Object.assign(this,{database,auditService,realtimeHub,executivePilotReviewService});}
  now(){return new Date().toISOString();}
  async list(organizationId){
    const db=await this.database.read();
    return (db.pilotDecisionLedger||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  normalizeDecision(value){
    const v=String(value||"").toUpperCase();
    if(!["CONTINUE","INTERVENE","EXPAND","PAUSE","CLOSE"].includes(v))throw new Error("Decision must be CONTINUE, INTERVENE, EXPAND, PAUSE, or CLOSE.");
    return v;
  }
  normalizeLocations(value,allowed){
    const requested=Array.isArray(value)?[...new Set(value.map(String))]:[];
    const allowedSet=new Set((allowed||[]).map(String));
    if(allowedSet.has("*"))return requested;
    const invalid=requested.filter(x=>!allowedSet.has(x));
    if(invalid.length)throw new Error(`Rollout scope contains unauthorized location(s): ${invalid.join(", ")}`);
    return requested;
  }
  async sign(organizationId,allowedLocationIds,input,actor){
    const review=await this.executivePilotReviewService.snapshot(organizationId,allowedLocationIds);
    if(!review.packet)throw new Error("Executive pilot review is required before recording a decision.");
    const decision=this.normalizeDecision(input.decision);
    const approver=String(input.approver||actor||"").trim().slice(0,160);
    if(!approver)throw new Error("Approver is required.");
    const conditions=String(input.conditions||"").trim().slice(0,1500);
    const followUp=String(input.followUp||"").trim().slice(0,1000);
    const rolloutLocationIds=this.normalizeLocations(input.rolloutLocationIds,allowedLocationIds);
    if(decision==="EXPAND"&&!rolloutLocationIds.length)throw new Error("EXPAND requires an explicit rollout location scope.");
    if(decision==="EXPAND"&&review.packet.decision!=="EXPAND"&&!conditions)throw new Error("Expanding against the current Blue Current recommendation requires documented executive conditions.");
    const now=this.now();
    const record={
      id:`pdl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,
      pilotId:review.proofProgram?.program?.id||null,pilotName:review.proofProgram?.program?.name||review.packet.title,
      decision,systemRecommendation:review.packet.decision,recommendationConfidence:review.packet.confidence,
      approver,decidedBy:actor,decidedAt:now,conditions,followUp,rolloutLocationIds,
      evidenceSnapshot:{
        verifiedRealizedImpactDollars:review.packet.evidence.verifiedRealizedImpactDollars,
        successGates:review.packet.successGates,
        exceptions:review.packet.exceptions.map(x=>({locationId:x.locationId,locationName:x.locationName,type:x.type,reason:x.reason})),
        baselineVsCurrent:review.packet.baselineVsCurrent
      },
      acknowledgment:{
        humanDecision:true,
        systemDidNotApprove:true,
        recommendationWasOverridden:decision!==review.packet.decision
      }
    };
    await this.database.mutate(db=>{db.pilotDecisionLedger||=[];db.pilotDecisionLedger.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Pilot decision signed: ${decision} by ${approver} (${record.id})`,category:"pilot_value"});
    this.realtimeHub.publish("pilot-decision:signed",{id:record.id,organizationId,decision,approver});
    return record;
  }
  async snapshot(organizationId,allowedLocationIds){
    const review=await this.executivePilotReviewService.snapshot(organizationId,allowedLocationIds);
    const decisions=await this.list(organizationId),latest=decisions[0]||null;
    const availableLocations=(review.packet?.locationReview||[]).map(x=>({locationId:x.locationId,locationName:x.locationName}));
    return {
      version:"48.20.0",generatedAt:this.now(),status:review.packet?"decision-ready":"review-required",
      headline:latest?`${latest.decision} signed by ${latest.approver}. Blue Current recommendation at signing: ${latest.systemRecommendation}.`:"No human pilot decision has been signed yet.",
      currentRecommendation:review.packet?{decision:review.packet.decision,confidence:review.packet.confidence,reason:review.packet.recommendation.reason}:null,
      availableLocations,latestDecision:latest,history:decisions,
      policy:{humanSignatureRequired:true,automaticApproval:false,automaticExpansion:false,systemRecommendationIsNonBinding:true}
    };
  }
}
module.exports=PilotDecisionLedgerService;
