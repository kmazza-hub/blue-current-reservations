"use strict";

class PortfolioDecisionAccountabilityService{
  constructor(database,exceptionCommandService){
    this.database=database;
    this.exceptions=exceptionCommandService;
  }
  now(){return new Date().toISOString();}
  key(o,id){return `${o}:${id}`;}

  async create(o,allowed=[],input={},actor){
    const exceptionId=String(input.exceptionId||"").trim();
    if(!exceptionId){const e=new Error("Decision requires an exceptionId.");e.statusCode=400;throw e;}

    const command=await this.exceptions.list(o,allowed);
    const exception=command.exceptions.find(x=>x.id===exceptionId);
    if(!exception){const e=new Error("Portfolio exception not found.");e.statusCode=404;throw e;}
    if(!exception.owner){const e=new Error("Exception must be acknowledged and owned before a decision is recorded.");e.statusCode=409;throw e;}

    const decisionType=String(input.decisionType||"").toUpperCase();
    const allowedTypes=["CONTINUE_MONITORING","CORRECTIVE_ACTION","ROLLBACK","HOLD_EXPANSION","RESUME","ESCALATE","CLOSE"];
    if(!allowedTypes.includes(decisionType)){
      const e=new Error(`Decision type must be one of: ${allowedTypes.join(", ")}`);e.statusCode=400;throw e;
    }

    const rationale=String(input.rationale||"").trim().slice(0,3000);
    const expectedOutcome=String(input.expectedOutcome||"").trim().slice(0,1800);
    const accountableOwner=String(input.accountableOwner||exception.owner||"").trim().slice(0,120);
    const followUpAt=String(input.followUpAt||"").trim();

    if(rationale.length<10){const e=new Error("Decision requires a rationale.");e.statusCode=400;throw e;}
    if(expectedOutcome.length<10){const e=new Error("Decision requires an expected outcome.");e.statusCode=400;throw e;}
    if(!accountableOwner){const e=new Error("Decision requires an accountable owner.");e.statusCode=400;throw e;}
    if(!followUpAt || !Number.isFinite(new Date(followUpAt).getTime())){
      const e=new Error("Decision requires a valid followUpAt timestamp.");e.statusCode=400;throw e;
    }

    const record={
      id:`pdl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,
      exceptionId,
      locationId:exception.locationId,
      reason:exception.reason,
      severity:exception.severity,
      decisionType,
      rationale,
      expectedOutcome,
      accountableOwner,
      followUpAt:new Date(followUpAt).toISOString(),
      status:"OPEN",
      decidedAt:this.now(),
      decidedBy:actor||"executive",
      reviewedAt:null,
      reviewedBy:null,
      outcome:null,
      outcomeRating:null,
      autonomousOperationalAction:false
    };

    await this.database.mutate(db=>{
      db.portfolioDecisionLedger=db.portfolioDecisionLedger||[];
      db.portfolioDecisionLedger.push(record);
      return true;
    });

    return record;
  }

  async list(o,allowed=[]){
    await this.exceptions.list(o,allowed);
    const db=await this.database.read();
    const rows=(db.portfolioDecisionLedger||[])
      .filter(x=>x.organizationId===o)
      .map(x=>{
        const overdue=x.status==="OPEN" && new Date(x.followUpAt).getTime() < Date.now();
        return {...x,overdue};
      })
      .sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));

    return {
      version:"83.50.0",
      generatedAt:this.now(),
      organizationId:o,
      summary:{
        total:rows.length,
        open:rows.filter(x=>x.status==="OPEN").length,
        reviewed:rows.filter(x=>x.status==="REVIEWED").length,
        overdue:rows.filter(x=>x.overdue).length,
        effective:rows.filter(x=>x.outcomeRating==="EFFECTIVE").length,
        partial:rows.filter(x=>x.outcomeRating==="PARTIAL").length,
        ineffective:rows.filter(x=>x.outcomeRating==="INEFFECTIVE").length
      },
      decisions:rows,
      policy:{
        rationaleRequired:true,
        expectedOutcomeRequired:true,
        accountableOwnerRequired:true,
        followUpRequired:true,
        humanOutcomeReviewRequired:true,
        decisionDoesNotExecuteOperations:true,
        noAutomaticCrossLocationAction:true,
        autonomousProductionChanges:false
      }
    };
  }

  async review(o,allowed=[],decisionId,input={},actor){
    await this.exceptions.list(o,allowed);
    const rating=String(input.outcomeRating||"").toUpperCase();
    if(!["EFFECTIVE","PARTIAL","INEFFECTIVE"].includes(rating)){
      const e=new Error("Outcome rating must be EFFECTIVE, PARTIAL, or INEFFECTIVE.");e.statusCode=400;throw e;
    }
    const outcome=String(input.outcome||"").trim().slice(0,3000);
    if(outcome.length<10){const e=new Error("Decision review requires an outcome summary.");e.statusCode=400;throw e;}

    let reviewed=null;
    await this.database.mutate(db=>{
      const row=(db.portfolioDecisionLedger||[]).find(x=>x.organizationId===o&&x.id===decisionId);
      if(!row){const e=new Error("Portfolio decision not found.");e.statusCode=404;throw e;}
      row.status="REVIEWED";
      row.reviewedAt=this.now();
      row.reviewedBy=actor||row.accountableOwner;
      row.outcome=outcome;
      row.outcomeRating=rating;
      row.followUpRequired=Boolean(input.followUpRequired);
      row.nextFollowUpAt=input.nextFollowUpAt&&Number.isFinite(new Date(input.nextFollowUpAt).getTime())
        ? new Date(input.nextFollowUpAt).toISOString()
        : null;
      reviewed={...row};
      return true;
    });

    return {decision:reviewed,ledger:await this.list(o,allowed)};
  }
}
module.exports=PortfolioDecisionAccountabilityService;
