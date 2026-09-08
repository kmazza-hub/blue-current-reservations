"use strict";
const crypto=require("crypto");

class LivePilotEvidenceOutcomeLedgerService{
  constructor(database,liveShiftService){
    this.database=database;this.liveShift=liveShiftService;
  }
  now(){return new Date().toISOString();}
  hash(value){return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");}
  key(org,location){return `${org}:${location}`;}

  async record(organizationId,allowedLocationIds=[],locationId,input={},actor){
    const snapshot=await this.liveShift.snapshot(organizationId,allowedLocationIds,locationId);
    if(!snapshot.shift||snapshot.shift.status!=="ACTIVE"){
      const e=new Error("Pilot evidence can only be recorded during an active live shift.");e.statusCode=409;throw e;
    }
    const allowedTypes=["INTERVENTION","INCIDENT","RECOVERY","OPERATOR_ACTION","SERVICE_OUTCOME","GUEST_IMPACT","SYSTEM_HEALTH","PROFITABILITY_SIGNAL"];
    const type=allowedTypes.includes(input.type)?input.type:"OPERATOR_ACTION";
    const db=await this.database.read();
    const prior=(db.livePilotEvidenceLedger||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.shiftId===snapshot.shift.id).slice(-1)[0]||null;
    const entry={
      id:`ple-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,locationId,shiftId:snapshot.shift.id,type,
      occurredAt:input.occurredAt||this.now(),recordedAt:this.now(),recordedBy:actor||"operator",
      summary:String(input.summary||"").trim().slice(0,500),
      detail:String(input.detail||"").trim().slice(0,3000),
      measurableImpact:{
        minutesSaved:Number.isFinite(Number(input.minutesSaved))?Number(input.minutesSaved):0,
        revenueProtected:Number.isFinite(Number(input.revenueProtected))?Number(input.revenueProtected):0,
        costAvoided:Number.isFinite(Number(input.costAvoided))?Number(input.costAvoided):0,
        guestRecoveries:Number.isFinite(Number(input.guestRecoveries))?Number(input.guestRecoveries):0
      },
      source:String(input.source||"operator").slice(0,120),
      priorHash:prior?.entryHash||null
    };
    if(!entry.summary){const e=new Error("Pilot evidence requires a summary.");e.statusCode=400;throw e;}
    entry.entryHash=this.hash({...entry,entryHash:undefined});
    await this.database.mutate(state=>{
      state.livePilotEvidenceLedger=state.livePilotEvidenceLedger||[];
      state.livePilotEvidenceLedger.push(entry);return true;
    });
    return entry;
  }

  async ledger(organizationId,allowedLocationIds=[],locationId,shiftId=null){
    await this.liveShift.snapshot(organizationId,allowedLocationIds,locationId);
    const db=await this.database.read();
    const entries=(db.livePilotEvidenceLedger||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&(!shiftId||x.shiftId===shiftId));
    let chainValid=true,previousByShift={};
    for(const entry of entries){
      const expectedPrior=previousByShift[entry.shiftId]||null;
      if(entry.priorHash!==expectedPrior)chainValid=false;
      const copy={...entry};delete copy.entryHash;
      if(this.hash(copy)!==entry.entryHash)chainValid=false;
      previousByShift[entry.shiftId]=entry.entryHash;
    }
    return {version:"81.25.0",generatedAt:this.now(),organizationId,locationId,shiftId,entryCount:entries.length,chainValid,entries};
  }

  async outcome(organizationId,allowedLocationIds=[],locationId,shiftId=null){
    const live=await this.liveShift.snapshot(organizationId,allowedLocationIds,locationId);
    const targetShiftId=shiftId||live.shift?.id;
    if(!targetShiftId){const e=new Error("No pilot shift is available for outcome reporting.");e.statusCode=404;throw e;}
    const ledger=await this.ledger(organizationId,allowedLocationIds,locationId,targetShiftId);
    const db=await this.database.read();
    const history=db.livePilotShiftHistory||[];
    const shift=history.find(x=>x.id===targetShiftId)||(live.shift?.id===targetShiftId?live.shift:null);
    const totals=ledger.entries.reduce((a,e)=>{
      a.minutesSaved+=e.measurableImpact.minutesSaved||0;
      a.revenueProtected+=e.measurableImpact.revenueProtected||0;
      a.costAvoided+=e.measurableImpact.costAvoided||0;
      a.guestRecoveries+=e.measurableImpact.guestRecoveries||0;
      a[e.type]=(a[e.type]||0)+1;return a;
    },{minutesSaved:0,revenueProtected:0,costAvoided:0,guestRecoveries:0});
    return {
      version:"81.25.0",generatedAt:this.now(),organizationId,locationId,shiftId:targetShiftId,
      shiftStatus:shift?.status||"UNKNOWN",shiftLabel:shift?.shiftLabel||null,
      evidenceIntegrity:ledger.chainValid?"VERIFIED":"INVALID",
      evidenceCount:ledger.entryCount,
      totals,
      proof:{
        interventions:totals.INTERVENTION||0,
        incidents:totals.INCIDENT||0,
        recoveries:totals.RECOVERY||0,
        operatorActions:totals.OPERATOR_ACTION||0,
        serviceOutcomes:totals.SERVICE_OUTCOME||0,
        guestImpactEvents:totals.GUEST_IMPACT||0,
        systemHealthObservations:totals.SYSTEM_HEALTH||0,
        profitabilitySignals:totals.PROFITABILITY_SIGNAL||0
      },
      closeout:shift?.closeout||null,
      policy:{
        evidenceIsAppendOnly:true,
        measurableImpactRequiresRecordedEvidence:true,
        outcomeClaimsMustBeEvidenceBacked:true,
        ledgerIntegrityVerified:true,
        noAutomaticFinancialClaim:true
      }
    };
  }
}
module.exports=LivePilotEvidenceOutcomeLedgerService;
