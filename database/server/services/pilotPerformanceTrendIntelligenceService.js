"use strict";

class PilotPerformanceTrendIntelligenceService{
  constructor(database,kpiService,evidenceService,liveShiftService){
    this.database=database;this.kpi=kpiService;this.evidence=evidenceService;this.liveShift=liveShiftService;
  }
  now(){return new Date().toISOString();}
  avg(values){const v=values.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
  direction(values,lowerIsBetter=false){
    const v=values.filter(Number.isFinite);if(v.length<2)return "INSUFFICIENT_DATA";
    const half=Math.max(1,Math.floor(v.length/2)),early=this.avg(v.slice(0,half)),late=this.avg(v.slice(-half));
    if(early===null||late===null)return "INSUFFICIENT_DATA";
    const delta=late-early,tolerance=Math.max(Math.abs(early)*0.02,0.01);
    if(Math.abs(delta)<=tolerance)return "STABLE";
    const improving=lowerIsBetter?delta<0:delta>0;
    return improving?"IMPROVING":"DECLINING";
  }
  consistency(values){
    const v=values.filter(Number.isFinite);if(v.length<2)return {rating:"INSUFFICIENT_DATA",coefficientOfVariation:null};
    const mean=this.avg(v);if(mean===0)return {rating:"STABLE",coefficientOfVariation:0};
    const variance=v.reduce((s,x)=>s+Math.pow(x-mean,2),0)/v.length,cv=Math.sqrt(variance)/Math.abs(mean);
    return {rating:cv<=0.08?"HIGH":cv<=0.18?"MODERATE":"LOW",coefficientOfVariation:cv};
  }
  async recordShiftMeasurement(o,allowed=[],l,shiftId,input={},actor){
    const report=await this.kpi.report(o,allowed,l,shiftId,input);
    const db=await this.database.read();
    const history=db.livePilotShiftHistory||[];
    const shift=history.find(x=>x.id===shiftId);
    if(!shift||shift.status!=="CLOSED"){const e=new Error("Trend measurement requires a closed pilot shift.");e.statusCode=409;throw e;}
    const measurement={
      id:`ptm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId:l,shiftId,
      shiftLabel:shift.shiftLabel||null,
      shiftClosedAt:shift.closedAt||null,
      measuredAt:this.now(),measuredBy:actor||"admin",
      actual:report.actual,deltas:report.deltas,derived:report.derived,
      evidenceIntegrity:report.evidenceIntegrity,evidenceCount:report.evidenceCount,
      source:String(input.source||"verified shift closeout").slice(0,120)
    };
    await this.database.mutate(state=>{
      state.pilotPerformanceMeasurements=state.pilotPerformanceMeasurements||[];
      const idx=state.pilotPerformanceMeasurements.findIndex(x=>x.organizationId===o&&x.locationId===l&&x.shiftId===shiftId);
      if(idx>=0)state.pilotPerformanceMeasurements[idx]=measurement;else state.pilotPerformanceMeasurements.push(measurement);
      return true;
    });
    return measurement;
  }
  async report(o,allowed=[],l){
    await this.liveShift.snapshot(o,allowed,l);
    const db=await this.database.read();
    const rows=(db.pilotPerformanceMeasurements||[]).filter(x=>x.organizationId===o&&x.locationId===l)
      .sort((a,b)=>new Date(a.shiftClosedAt||a.measuredAt)-new Date(b.shiftClosedAt||b.measuredAt));
    const metric=(name)=>rows.map(x=>Number(x.actual?.[name])).filter(Number.isFinite);
    const evidence=(name)=>rows.map(x=>Number(x.derived?.[name])).filter(Number.isFinite);
    const trends={
      covers:this.direction(metric("covers")),
      revenue:this.direction(metric("revenue")),
      laborHours:this.direction(metric("laborHours"),true),
      tableTurns:this.direction(metric("tableTurns")),
      avgWaitMinutes:this.direction(metric("avgWaitMinutes"),true),
      managerInterventions:this.direction(metric("managerInterventions"),true),
      complaints:this.direction(metric("complaints"),true)
    };
    const consistency={
      revenue:this.consistency(metric("revenue")),
      avgWaitMinutes:this.consistency(metric("avgWaitMinutes")),
      managerInterventions:this.consistency(metric("managerInterventions")),
      tableTurns:this.consistency(metric("tableTurns"))
    };
    const cumulative={
      evidenceRevenueProtected:evidence("evidenceRevenueProtected").reduce((a,b)=>a+b,0),
      evidenceCostAvoided:evidence("evidenceCostAvoided").reduce((a,b)=>a+b,0),
      evidenceMinutesSaved:evidence("evidenceMinutesSaved").reduce((a,b)=>a+b,0),
      evidenceGuestRecoveries:evidence("evidenceGuestRecoveries").reduce((a,b)=>a+b,0),
      evidenceCount:rows.reduce((a,x)=>a+(Number(x.evidenceCount)||0),0)
    };
    const verifiedRows=rows.filter(x=>x.evidenceIntegrity==="VERIFIED").length;
    const improving=Object.values(trends).filter(x=>x==="IMPROVING").length;
    const declining=Object.values(trends).filter(x=>x==="DECLINING").length;
    const repeatability=rows.length<3?"INSUFFICIENT_DATA":
      verifiedRows!==rows.length?"EVIDENCE_REVIEW_REQUIRED":
      declining>improving?"MIXED_OR_DECLINING":
      Object.values(consistency).filter(x=>x.rating==="LOW").length>=2?"VARIABLE":
      improving>=3?"REPEATABLE_IMPROVEMENT":"STABLE";
    return {
      version:"81.75.0",generatedAt:this.now(),organizationId:o,locationId:l,
      measuredShiftCount:rows.length,verifiedEvidenceShiftCount:verifiedRows,
      trends,consistency,cumulative,repeatability,measurements:rows,
      policy:{
        minimumThreeShiftsForRepeatability:true,
        evidenceIntegrityRequired:true,
        trendsDoNotProveCausation:true,
        cumulativeValueMustRemainEvidenceBacked:true,
        humanPilotReviewRequired:true,
        noAutomaticExpansionDecision:true
      }
    };
  }
}
module.exports=PilotPerformanceTrendIntelligenceService;
