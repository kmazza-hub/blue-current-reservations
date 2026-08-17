"use strict";

class PilotLearningNextSessionDecisionService{
  constructor(database,closeoutService){
    this.database=database;
    this.closeout=closeoutService;
  }
  now(){return new Date().toISOString();}
  decisions(){return ["REPEAT","HOLD","REVISE","PROGRESS"];}

  async assess(organizationId,sessionId){
    const [closeout,db]=await Promise.all([
      this.closeout.get(organizationId,sessionId),
      this.database.read()
    ]);
    const prior=(db.pilotLearningDecisions||{})[sessionId]||null;
    const incidentCount=Number(closeout.evidence?.runtimeSummary?.incidents||0);
    const outcome=closeout.outcome;
    const suggested=
      outcome==="UNSUCCESSFUL"?"HOLD":
      outcome==="INCONCLUSIVE"?"REPEAT":
      outcome==="SUCCESS_WITH_FOLLOWUP"?"REVISE":"PROGRESS";
    return {
      version:"90.25.0",phase:"C",organizationId,sessionId,
      gate:"PILOT_LEARNING_REVIEW_AND_NEXT_SESSION_DECISION",
      closeoutId:closeout.id,outcome,incidentCount,
      suggestedDecision:suggested,
      humanDecisionRequired:true,
      existingDecision:prior,
      learningInputs:{
        operatorSummary:closeout.operatorSummary,
        lessonsLearned:closeout.lessonsLearned,
        followUp:closeout.followUp,
        runtimeSummary:closeout.evidence?.runtimeSummary||{},
        incidents:closeout.evidence?.incidents||[]
      },
      policy:{
        suggestionIsNonBinding:true,
        systemCannotPromotePilot:true,
        progressRequiresHumanDecision:true,
        automaticExpansion:false,
        autonomousProductionChanges:false
      }
    };
  }

  async decide(organizationId,sessionId,input={},actor){
    const assessment=await this.assess(organizationId,sessionId);
    const decision=String(input.decision||"").toUpperCase();
    const rationale=String(input.rationale||"").trim();
    const changes=Array.isArray(input.requiredChanges)?input.requiredChanges.map(x=>String(x).trim()).filter(Boolean).slice(0,30):[];
    if(!this.decisions().includes(decision)){
      const e=new Error(`decision must be one of: ${this.decisions().join(", ")}`);e.statusCode=400;throw e;
    }
    if(rationale.length<20){const e=new Error("A meaningful human decision rationale is required.");e.statusCode=400;throw e;}
    if(decision==="REVISE"&&changes.length===0){const e=new Error("REVISE requires at least one required change.");e.statusCode=400;throw e;}
    const row={
      id:`plns-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"90.25.0",organizationId,sessionId,
      closeoutId:assessment.closeoutId,
      decision,rationale:rationale.slice(0,5000),
      requiredChanges:changes,
      decidedAt:this.now(),decidedBy:actor||"operator",
      systemSuggestion:assessment.suggestedDecision,
      humanOverride:decision!==assessment.suggestedDecision,
      controls:{
        authorizesAutomaticNextSession:false,
        authorizesAutomaticExpansion:false,
        authorizesProductionChanges:false,
        providerWriteBack:false
      }
    };
    await this.database.mutate(db=>{
      db.pilotLearningDecisions=db.pilotLearningDecisions||{};
      if(db.pilotLearningDecisions[sessionId]){
        const e=new Error("A next-session decision already exists for this closeout.");e.statusCode=409;throw e;
      }
      db.pilotLearningDecisions[sessionId]=row;
      db.pilotLearningDecisionAudit=db.pilotLearningDecisionAudit||[];
      db.pilotLearningDecisionAudit.push(row);
      return true;
    });
    return row;
  }

  async current(organizationId,sessionId){
    const [assessment,db]=await Promise.all([this.assess(organizationId,sessionId),this.database.read()]);
    const decision=(db.pilotLearningDecisions||{})[sessionId]||null;
    return {
      version:"90.25.0",phase:"C",organizationId,sessionId,
      status:decision?`DECIDED_${decision.decision}`:"AWAITING_HUMAN_DECISION",
      assessment,decision,
      nextGate:!decision?"COMPLETE_HUMAN_LEARNING_DECISION":
        decision.decision==="HOLD"?"RESOLVE_HOLD_BEFORE_FURTHER_PILOT":
        decision.decision==="REVISE"?"APPLY_AND_RECERTIFY_REQUIRED_CHANGES":
        decision.decision==="REPEAT"?"PREPARE_NEW_CONTROLLED_SESSION":
        "PREPARE_NEXT_CONTROLLED_PILOT_STAGE",
      safety:{automaticNextSession:false,automaticExpansion:false,autonomousProductionChanges:false}
    };
  }

  async portfolio(organizationId){
    const db=await this.database.read();
    const rows=Object.values(db.pilotLearningDecisions||{}).filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
    const counts=rows.reduce((a,x)=>{a[x.decision]=(a[x.decision]||0)+1;return a;},{});
    return {version:"90.25.0",phase:"C",organizationId,decisions:rows.length,counts,history:rows};
  }
}
module.exports=PilotLearningNextSessionDecisionService;
