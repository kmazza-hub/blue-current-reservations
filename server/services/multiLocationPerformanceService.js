"use strict";

class MultiLocationPerformanceService {
  constructor(database,auditService,realtimeHub,managerOperatingRhythmService){
    Object.assign(this,{database,auditService,realtimeHub,managerOperatingRhythmService});
  }
  now(){return new Date().toISOString();}
  clamp(n,min=0,max=100){return Math.max(min,Math.min(max,Number(n)||0));}
  async snapshot(organizationId,allowedLocationIds=["*"]){
    const db=await this.database.read();
    const wildcard=allowedLocationIds.includes("*");
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&(wildcard||allowedLocationIds.includes(x.id)));
    const rows=[];
    for(const location of locations){
      const rhythm=await this.managerOperatingRhythmService.snapshot(organizationId,location.id);
      const s=rhythm.summary||{},p=rhythm.profitability?.summary||{},top=rhythm.profitability?.topConstraint||null;
      const predicted=rhythm.predictiveInterventions||[];
      const urgent=predicted.filter(x=>Number(x.etaMinutes)<=30).length;
      const carryover=(rhythm.activeActions||[]).filter(x=>["blocked","accepted","in_progress"].includes(x.status)).length;
      const readiness=Number(s.readinessScore||0),margin=Number(s.modeledControllableMarginPercent||0),leakage=Number(p.modeledLeakageDollars||0);
      const predictivePenalty=Math.min(30,predicted.reduce((sum,x)=>sum+(x.severity==="critical"?12:x.severity==="high"?8:4),0));
      const leakagePenalty=Math.min(28,leakage/250);
      const actionPenalty=Math.min(18,carryover*5);
      const readinessPenalty=Math.max(0,(90-readiness)*.65);
      const realizationBonus=Math.min(8,Number(s.realizationRatePercent||0)*.08);
      const attentionScore=Math.round(this.clamp(predictivePenalty+leakagePenalty+actionPenalty+readinessPenalty-realizationBonus,0,100));
      rows.push({
        locationId:location.id,
        locationName:location.name||location.id,
        attentionScore,
        attentionLevel:attentionScore>=70?"critical":attentionScore>=50?"high":attentionScore>=30?"watch":"healthy",
        readinessScore:readiness,
        rhythmScore:Number(s.rhythmScore||0),
        modeledControllableContributionDollars:Number(s.modeledControllableContributionDollars||0),
        modeledControllableMarginPercent:margin,
        modeledLeakageDollars:leakage,
        activeActions:Number(s.activeActions||0),
        completedActions:Number(s.completedActions||0),
        realizedImpactDollars:Number(s.realizedImpactDollars||0),
        realizationRatePercent:Number(s.realizationRatePercent||0),
        predictiveInterventions:predicted.length,
        urgentPredictiveInterventions:urgent,
        nextConstraint:predicted[0]?{type:predicted[0].type,etaMinutes:predicted[0].etaMinutes,pressure:predicted[0].pressure}:null,
        topProfitConstraint:top?{label:top.label,modeledLeakageDollars:top.modeledLeakageDollars,category:top.category}:null,
        latestHandoff:rhythm.latestHandoff?{shift:rhythm.latestHandoff.shift,authorName:rhythm.latestHandoff.authorName,createdAt:rhythm.latestHandoff.createdAt}:null,
        latestCloseout:rhythm.latestCloseout?{resultStatus:rhythm.latestCloseout.resultStatus,createdAt:rhythm.latestCloseout.createdAt}:null,
        reason:this.reason({readiness,leakage,carryover,predicted,top})
      });
    }
    rows.sort((a,b)=>b.attentionScore-a.attentionScore||b.modeledLeakageDollars-a.modeledLeakageDollars);
    rows.forEach((x,i)=>x.rank=i+1);
    const portfolio={
      locations:rows.length,
      critical:rows.filter(x=>x.attentionLevel==="critical").length,
      high:rows.filter(x=>x.attentionLevel==="high").length,
      watch:rows.filter(x=>x.attentionLevel==="watch").length,
      totalControllableContributionDollars:rows.reduce((s,x)=>s+x.modeledControllableContributionDollars,0),
      totalModeledLeakageDollars:rows.reduce((s,x)=>s+x.modeledLeakageDollars,0),
      totalRealizedImpactDollars:rows.reduce((s,x)=>s+x.realizedImpactDollars,0),
      activeActions:rows.reduce((s,x)=>s+x.activeActions,0),
      urgentPredictiveInterventions:rows.reduce((s,x)=>s+x.urgentPredictiveInterventions,0),
      averageReadiness:rows.length?Math.round(rows.reduce((s,x)=>s+x.readinessScore,0)/rows.length):0,
      averageRhythmScore:rows.length?Math.round(rows.reduce((s,x)=>s+x.rhythmScore,0)/rows.length):0
    };
    const first=rows[0]||null;
    return {
      version:"47.35.0",generatedAt:this.now(),organizationId,
      headline:first?`${first.locationName} needs leadership attention first: ${first.reason}`:"No authorized locations are available.",
      portfolio,
      locations:rows,
      exceptionQueue:rows.filter(x=>x.attentionScore>=30).slice(0,10).map(x=>({
        rank:x.rank,locationId:x.locationId,locationName:x.locationName,attentionScore:x.attentionScore,attentionLevel:x.attentionLevel,
        reason:x.reason,nextAction:this.nextAction(x)
      })),
      policy:{rankBy:"predictive risk + modeled leakage + action carryover + readiness - realized outcome credit",humanLeadershipRequired:true,automaticCrossLocationExecution:false}
    };
  }
  reason({readiness,leakage,carryover,predicted,top}){
    const parts=[];
    if(predicted.length)parts.push(`${predicted.length} predictive intervention${predicted.length===1?"":"s"} active`);
    if(leakage>0)parts.push(`$${Math.round(leakage).toLocaleString()} modeled leakage`);
    if(carryover>0)parts.push(`${carryover} unresolved action${carryover===1?"":"s"}`);
    if(readiness<85)parts.push(`readiness ${Math.round(readiness)}`);
    if(top?.label)parts.push(`top constraint: ${top.label}`);
    return parts.slice(0,3).join(" · ")||"operating signals are currently within expected range";
  }
  nextAction(row){
    if(row.nextConstraint&&row.nextConstraint.etaMinutes<=30)return `Escalate ${row.nextConstraint.type} now; forecast threshold in ${row.nextConstraint.etaMinutes} minutes.`;
    if(row.topProfitConstraint)return `Review ${row.topProfitConstraint.label} and assign the location GM to the highest-value corrective action.`;
    if(row.activeActions>0)return `Review ${row.activeActions} active action${row.activeActions===1?"":"s"} for ownership and blockers.`;
    return "Maintain current operating cadence and monitor exceptions.";
  }
  async acknowledge(organizationId,locationId,input,actor){
    const record={
      id:`mla_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,
      owner:String(input.owner||actor||"Area Leader").slice(0,120),
      note:String(input.note||"Leadership review acknowledged.").slice(0,600),
      status:"acknowledged",
      actor,createdAt:this.now()
    };
    await this.database.mutate(db=>{db.multiLocationLeadershipActions||=[];db.multiLocationLeadershipActions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Multi-location leadership attention acknowledged: ${locationId}`,category:"multi_location_performance"});
    this.realtimeHub.publish("multi-location-performance:acknowledged",record);
    return record;
  }
}
module.exports=MultiLocationPerformanceService;
