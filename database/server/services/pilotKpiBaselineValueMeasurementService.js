"use strict";
class PilotKpiBaselineValueMeasurementService{
 constructor(database,evidenceService,liveShiftService){this.database=database;this.evidence=evidenceService;this.liveShift=liveShiftService;}
 now(){return new Date().toISOString();}
 key(o,l){return `${o}:${l}`;}
 metrics(){return ["covers","revenue","laborHours","laborCost","tableTurns","avgWaitMinutes","serviceRecoveries","managerInterventions","complaints"];}
 async setBaseline(o,allowed=[],l,input={},actor){
  await this.liveShift.snapshot(o,allowed,l);
  const values={};for(const k of this.metrics()){const v=Number(input[k]);values[k]=Number.isFinite(v)?v:null;}
  const required=["covers","revenue","laborHours","avgWaitMinutes","managerInterventions"];
  const missing=required.filter(k=>values[k]===null);
  if(missing.length){const e=new Error(`Baseline missing required metrics: ${missing.join(", ")}`);e.statusCode=400;throw e;}
  const baseline={organizationId:o,locationId:l,label:String(input.label||"pre-pilot baseline").slice(0,120),periodStart:input.periodStart||null,periodEnd:input.periodEnd||null,values,recordedAt:this.now(),recordedBy:actor||"admin",source:String(input.source||"operator-verified").slice(0,120)};
  await this.database.mutate(db=>{db.pilotKpiBaselines=db.pilotKpiBaselines||{};db.pilotKpiBaselines[this.key(o,l)]=baseline;return true;});
  return baseline;
 }
 async report(o,allowed=[],l,shiftId=null,input={}){
  const live=await this.liveShift.snapshot(o,allowed,l),db=await this.database.read(),baseline=(db.pilotKpiBaselines||{})[this.key(o,l)]||null;
  if(!baseline){const e=new Error("A verified KPI baseline is required before value measurement.");e.statusCode=409;throw e;}
  const sid=shiftId||live.shift?.id;if(!sid){const e=new Error("No pilot shift is available for KPI measurement.");e.statusCode=404;throw e;}
  const outcome=await this.evidence.outcome(o,allowed,l,sid);
  const actual={};for(const k of this.metrics()){const v=Number(input[k]);actual[k]=Number.isFinite(v)?v:null;}
  const deltas={};
  for(const k of this.metrics()){
   const b=baseline.values[k],a=actual[k];
   deltas[k]=(b===null||a===null)?null:{absolute:a-b,percent:b===0?null:((a-b)/b)*100};
  }
  const derived={
   revenuePerLaborHour:actual.revenue!==null&&actual.laborHours>0?actual.revenue/actual.laborHours:null,
   baselineRevenuePerLaborHour:baseline.values.revenue!==null&&baseline.values.laborHours>0?baseline.values.revenue/baseline.values.laborHours:null,
   evidenceRevenueProtected:outcome.totals.revenueProtected,
   evidenceCostAvoided:outcome.totals.costAvoided,
   evidenceMinutesSaved:outcome.totals.minutesSaved,
   evidenceGuestRecoveries:outcome.totals.guestRecoveries
  };
  if(derived.revenuePerLaborHour!==null&&derived.baselineRevenuePerLaborHour!==null)derived.revenuePerLaborHourDelta=derived.revenuePerLaborHour-derived.baselineRevenuePerLaborHour;
  return {version:"81.50.0",generatedAt:this.now(),organizationId:o,locationId:l,shiftId:sid,baseline,actual,deltas,derived,evidenceIntegrity:outcome.evidenceIntegrity,evidenceCount:outcome.evidenceCount,policy:{baselineRequired:true,actualsRemainSourceAttributed:true,evidenceAndKpiResultsSeparated:true,noCausalClaimFromCorrelation:true,noAutomaticFinancialClaim:true,humanReviewRequired:true}};
 }
}
module.exports=PilotKpiBaselineValueMeasurementService;
