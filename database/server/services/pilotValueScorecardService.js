"use strict";

class PilotValueScorecardService {
  constructor(database,auditService,realtimeHub,multiLocationPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,multiLocationPerformanceService});
  }
  now(){return new Date().toISOString();}
  round(n,d=0){const p=10**d;return Math.round((Number(n)||0)*p)/p;}
  async portfolio(organizationId,allowedLocationIds){return this.multiLocationPerformanceService.snapshot(organizationId,allowedLocationIds);}
  metrics(snapshot){
    const p=snapshot.portfolio||{},rows=snapshot.locations||[];
    return {
      locations:Number(p.locations||0),
      averageReadiness:Number(p.averageReadiness||0),
      averageRhythmScore:Number(p.averageRhythmScore||0),
      controllableContributionDollars:Number(p.totalControllableContributionDollars||0),
      modeledLeakageDollars:Number(p.totalModeledLeakageDollars||0),
      realizedImpactDollars:Number(p.totalRealizedImpactDollars||0),
      activeActions:Number(p.activeActions||0),
      urgentPredictiveInterventions:Number(p.urgentPredictiveInterventions||0),
      highAttentionLocations:rows.filter(x=>["high","critical"].includes(x.attentionLevel)).length,
      watchAttentionLocations:rows.filter(x=>x.attentionLevel==="watch").length
    };
  }
  async activeProgram(organizationId){
    const db=await this.database.read();
    return (db.pilotValuePrograms||[]).filter(x=>x.organizationId===organizationId&&x.status==="active").sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0]||null;
  }
  async start(organizationId,allowedLocationIds,input,actor){
    const existing=await this.activeProgram(organizationId);
    if(existing) return existing;
    const portfolio=await this.portfolio(organizationId,allowedLocationIds),baseline=this.metrics(portfolio),now=this.now();
    const record={
      id:`pvp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,status:"active",
      name:String(input.name||"Blue Current Pilot").slice(0,180),
      sponsor:String(input.sponsor||actor||"Executive Sponsor").slice(0,120),
      pilotDays:Math.max(7,Math.min(180,Number(input.pilotDays)||30)),
      targets:{
        readinessLiftPoints:Math.max(0,Number(input.readinessLiftPoints)||5),
        rhythmLiftPoints:Math.max(0,Number(input.rhythmLiftPoints)||20),
        leakageReductionPercent:Math.max(0,Math.min(100,Number(input.leakageReductionPercent)||10)),
        realizationRatePercent:Math.max(0,Math.min(100,Number(input.realizationRatePercent)||60))
      },
      authorizedLocations:portfolio.locations.map(x=>x.locationId),
      baseline:{capturedAt:now,metrics:baseline,locations:portfolio.locations.map(x=>({locationId:x.locationId,locationName:x.locationName,readinessScore:x.readinessScore,rhythmScore:x.rhythmScore,modeledLeakageDollars:x.modeledLeakageDollars,modeledControllableContributionDollars:x.modeledControllableContributionDollars}))},
      checkpoints:[],
      createdBy:actor,createdAt:now
    };
    await this.database.mutate(db=>{db.pilotValuePrograms||=[];db.pilotValuePrograms.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Pilot value baseline started: ${record.id}`,category:"pilot_value"});
    this.realtimeHub.publish("pilot-value:started",record);
    return record;
  }
  evidence(program,current){
    const base=program.baseline.metrics,now=current;
    const readinessDelta=now.averageReadiness-base.averageReadiness;
    const rhythmDelta=now.averageRhythmScore-base.averageRhythmScore;
    const leakageReduction=base.modeledLeakageDollars>0?Math.max(0,(base.modeledLeakageDollars-now.modeledLeakageDollars)/base.modeledLeakageDollars*100):0;
    const contributionDelta=now.controllableContributionDollars-base.controllableContributionDollars;
    const realizedSinceBaseline=Math.max(0,now.realizedImpactDollars-base.realizedImpactDollars);
    const adoptionScore=this.round(Math.min(100,(now.averageRhythmScore/Math.max(1,program.targets.rhythmLiftPoints+base.averageRhythmScore))*100));
    const operatingScore=this.round(Math.max(0,Math.min(100,50+readinessDelta*5+rhythmDelta*1.5-now.highAttentionLocations*8)));
    const valueScore=this.round(Math.max(0,Math.min(100,
      (program.targets.leakageReductionPercent?Math.min(1,leakageReduction/program.targets.leakageReductionPercent)*45:45)+
      (program.targets.realizationRatePercent?Math.min(1,(now.realizedImpactDollars>0?100:0)/program.targets.realizationRatePercent)*25:25)+
      Math.min(30,Math.max(0,readinessDelta)/Math.max(1,program.targets.readinessLiftPoints)*30)
    )));
    return {
      readinessDeltaPoints:this.round(readinessDelta,1),
      rhythmDeltaPoints:this.round(rhythmDelta,1),
      modeledLeakageReductionPercent:this.round(leakageReduction,1),
      modeledLeakageReductionDollars:Math.max(0,Math.round(base.modeledLeakageDollars-now.modeledLeakageDollars)),
      controllableContributionDeltaDollars:Math.round(contributionDelta),
      verifiedRealizedImpactDollars:Math.round(realizedSinceBaseline),
      adoptionScore,operatingScore,valueScore,
      targets:{
        readiness:{target:program.targets.readinessLiftPoints,actual:this.round(readinessDelta,1),met:readinessDelta>=program.targets.readinessLiftPoints},
        rhythm:{target:program.targets.rhythmLiftPoints,actual:this.round(rhythmDelta,1),met:rhythmDelta>=program.targets.rhythmLiftPoints},
        leakageReduction:{target:program.targets.leakageReductionPercent,actual:this.round(leakageReduction,1),met:leakageReduction>=program.targets.leakageReductionPercent},
        realizationRate:{target:program.targets.realizationRatePercent,actual:null,met:false}
      },
      attribution:{
        verifiedValueDefinition:"Only realized impact already measured by completed Blue Current action outcomes is counted as verified pilot value.",
        observedButNotAttributed:["controllable contribution delta","modeled leakage reduction","readiness lift","operating-rhythm lift"],
        caveat:"Observed operating changes are evidence of pilot movement, not proof that Blue Current alone caused the change."
      }
    };
  }
  async snapshot(organizationId,allowedLocationIds){
    const program=await this.activeProgram(organizationId);
    const portfolio=await this.portfolio(organizationId,allowedLocationIds),current=this.metrics(portfolio);
    if(!program)return {
      version:"48.5.0",generatedAt:this.now(),organizationId,status:"baseline-required",
      headline:"Capture the pilot baseline before claiming value.",
      current,program:null,evidence:null,
      policy:{verifiedValueRequiresMeasuredOutcomes:true,counterfactualClaims:false,automaticAttribution:false}
    };
    const ev=this.evidence(program,current);
    const ageDays=Math.max(0,Math.floor((Date.now()-new Date(program.createdAt).getTime())/86400000));
    const targetCount=Object.values(ev.targets).filter(x=>x.actual!==null).length,metCount=Object.values(ev.targets).filter(x=>x.actual!==null&&x.met).length;
    return {
      version:"48.5.0",generatedAt:this.now(),organizationId,status:"pilot-active",
      headline:`${program.name}: ${ev.verifiedRealizedImpactDollars?`$${ev.verifiedRealizedImpactDollars.toLocaleString()} verified realized impact`:"baseline established; verified value will appear only after measured action outcomes"}.`,
      program:{id:program.id,name:program.name,sponsor:program.sponsor,pilotDays:program.pilotDays,ageDays,targets:program.targets,baseline:program.baseline,checkpointCount:program.checkpoints?.length||0},
      current,evidence:ev,
      scorecard:{overall:this.round((ev.adoptionScore+ev.operatingScore+ev.valueScore)/3),adoption:ev.adoptionScore,operating:ev.operatingScore,value:ev.valueScore,targetsMet:metCount,targetsMeasured:targetCount},
      portfolio,
      policy:{verifiedValueRequiresMeasuredOutcomes:true,counterfactualClaims:false,automaticAttribution:false}
    };
  }
  async checkpoint(organizationId,allowedLocationIds,input,actor){
    const program=await this.activeProgram(organizationId);
    if(!program)throw new Error("Pilot baseline is required before a checkpoint.");
    const snapshot=await this.snapshot(organizationId,allowedLocationIds),now=this.now();
    const record={id:`pvc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,capturedAt:now,capturedBy:actor,note:String(input.note||"").slice(0,700),current:snapshot.current,evidence:snapshot.evidence,scorecard:snapshot.scorecard};
    await this.database.mutate(db=>{const p=(db.pilotValuePrograms||[]).find(x=>x.id===program.id);p.checkpoints||=[];p.checkpoints.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Pilot value checkpoint captured: ${program.id}`,category:"pilot_value"});
    this.realtimeHub.publish("pilot-value:checkpoint",record);
    return record;
  }
}
module.exports=PilotValueScorecardService;
