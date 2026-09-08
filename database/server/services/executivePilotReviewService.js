"use strict";

class ExecutivePilotReviewService {
  constructor(database,auditService,realtimeHub,pilotProofProgramService){Object.assign(this,{database,auditService,realtimeHub,pilotProofProgramService});}
  now(){return new Date().toISOString();}
  money(n){return `$${Math.round(Number(n)||0).toLocaleString("en-US")}`;}
  sentence(proof){
    const r=proof.recommendation||{};
    if(r.decision==="EXPAND")return "The committed pilot gates are satisfied; leadership can evaluate a controlled expansion while preserving human approval.";
    if(r.decision==="CONTINUE")return "The pilot is producing meaningful evidence, but additional checkpoints are required before an expansion decision.";
    if(r.decision==="INTERVENE")return "The pilot has unresolved success-gate or location exceptions that should be addressed before expansion.";
    return "Executive success criteria must be committed before the pilot can support a commercial decision.";
  }
  packet(proof){
    const trend=proof.trend||[],base=trend[0]||{},cur=trend[trend.length-1]||{};
    const gates=proof.recommendation?.gates||{};
    return {
      title:`${proof.program?.name||"Blue Current Pilot"} — Executive Pilot Review`,
      decision:proof.recommendation?.decision||"CONFIGURE",
      confidence:proof.recommendation?.confidence||"moderate",
      executiveSummary:this.sentence(proof),
      baselineVsCurrent:{
        readiness:{baseline:base.readiness??0,current:cur.readiness??0,delta:(cur.readiness??0)-(base.readiness??0)},
        operatingRhythm:{baseline:base.rhythm??0,current:cur.rhythm??0,delta:(cur.rhythm??0)-(base.rhythm??0)},
        modeledLeakage:{baseline:base.leakage??0,current:cur.leakage??0,delta:(cur.leakage??0)-(base.leakage??0)},
        verifiedRealizedValue:{baseline:0,current:proof.valueLedger?.verifiedRealizedImpactDollars||0}
      },
      successGates:Object.entries(gates).map(([name,passed])=>({name,passed:!!passed})),
      exceptions:(proof.exceptions||[]).map(x=>({...x})),
      locationReview:(proof.locationObjectives||[]).map(x=>({
        locationId:x.locationId,locationName:x.locationName,owner:x.owner,objective:x.objective,
        targetsMet:x.targetsMet,targetsMeasured:x.targetsMeasured,attentionLevel:x.attentionLevel,
        readinessLift:x.readiness.lift,rhythmLift:x.rhythm.lift,leakageReductionPercent:x.leakage.reductionPercent
      })),
      evidence:{
        verifiedRealizedImpactDollars:proof.valueLedger?.verifiedRealizedImpactDollars||0,
        verifiedDefinition:proof.valueLedger?.definition||"",
        checkpointCount:proof.valueLedger?.checkpointCount||0,
        observedNotAutomaticallyAttributed:["readiness movement","operating-rhythm movement","modeled leakage movement"]
      },
      recommendation:{
        decision:proof.recommendation?.decision||"CONFIGURE",
        reason:proof.recommendation?.reason||"",
        nextAction:proof.recommendation?.nextAction||"",
        humanApprovalRequired:true
      }
    };
  }
  async snapshot(organizationId,allowedLocationIds){
    const proof=await this.pilotProofProgramService.snapshot(organizationId,allowedLocationIds);
    if(!proof.program)return {version:"48.15.0",status:"baseline-required",generatedAt:this.now(),headline:"Pilot baseline required before an executive review packet can be generated.",packet:null};
    const packet=this.packet(proof);
    return {version:"48.15.0",status:proof.status==="proof-program-active"?"review-ready":"criteria-required",generatedAt:this.now(),headline:packet.executiveSummary,packet,proofProgram:proof,policy:{decisionSupportOnly:true,humanApprovalRequired:true,automaticCommercialCommitment:false}};
  }
  text(snapshot){
    if(!snapshot.packet)return "BLUE CURRENT EXECUTIVE PILOT REVIEW\n\nPilot baseline required.";
    const p=snapshot.packet,b=p.baselineVsCurrent;
    const lines=[
      "BLUE CURRENT EXECUTIVE PILOT REVIEW",p.title,"",
      `RECOMMENDATION: ${p.decision} (${p.confidence} confidence)`,p.executiveSummary,"",
      "BASELINE VS CURRENT",
      `Readiness: ${b.readiness.baseline} -> ${b.readiness.current} (${b.readiness.delta>=0?"+":""}${b.readiness.delta})`,
      `Operating rhythm: ${b.operatingRhythm.baseline}% -> ${b.operatingRhythm.current}% (${b.operatingRhythm.delta>=0?"+":""}${b.operatingRhythm.delta})`,
      `Modeled leakage: ${this.money(b.modeledLeakage.baseline)} -> ${this.money(b.modeledLeakage.current)}`,
      `Verified realized value: ${this.money(b.verifiedRealizedValue.current)}`,"",
      "SUCCESS GATES",...p.successGates.map(x=>`${x.passed?"PASS":"OPEN"} — ${x.name}`),"",
      "LOCATION REVIEW",...p.locationReview.map(x=>`${x.locationName} — owner ${x.owner}; targets ${x.targetsMet}/${x.targetsMeasured}; readiness ${x.readinessLift>=0?"+":""}${x.readinessLift}; rhythm ${x.rhythmLift>=0?"+":""}${x.rhythmLift}; leakage reduction ${x.leakageReductionPercent}%`),"",
      "EXCEPTIONS",...(p.exceptions.length?p.exceptions.map(x=>`${x.locationName} — ${x.reason}`):["None"]),"",
      "NEXT ACTION",p.recommendation.nextAction,"",
      "EVIDENCE BOUNDARY",p.evidence.verifiedDefinition,"Observed readiness, operating-rhythm, and modeled leakage movement are not automatically attributed to Blue Current.","Commercial decisions require human approval."
    ];
    return lines.join("\n");
  }
  async archive(organizationId,allowedLocationIds,input,actor){
    const snapshot=await this.snapshot(organizationId,allowedLocationIds);
    if(!snapshot.packet)throw new Error("Pilot baseline is required before archiving a review packet.");
    const record={id:`epr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,createdAt:this.now(),createdBy:actor,note:String(input.note||"").slice(0,700),packet:snapshot.packet,text:this.text(snapshot)};
    await this.database.mutate(db=>{db.executivePilotReviews||=[];db.executivePilotReviews.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Executive pilot review archived: ${record.id}`,category:"pilot_value"});
    this.realtimeHub.publish("pilot-review:archived",{id:record.id,organizationId,decision:record.packet.decision});
    return record;
  }
}
module.exports=ExecutivePilotReviewService;
