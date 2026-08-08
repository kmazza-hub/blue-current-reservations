"use strict";

class PilotProofProgramService {
  constructor(database,auditService,realtimeHub,pilotValueScorecardService){
    Object.assign(this,{database,auditService,realtimeHub,pilotValueScorecardService});
  }
  now(){return new Date().toISOString();}
  round(n,d=0){const p=10**d;return Math.round((Number(n)||0)*p)/p;}
  async program(organizationId){return this.pilotValueScorecardService.activeProgram(organizationId);}
  async configure(organizationId,allowedLocationIds,input,actor){
    const program=await this.program(organizationId);
    if(!program)throw new Error("Capture the pilot value baseline before configuring success criteria.");
    const snapshot=await this.pilotValueScorecardService.snapshot(organizationId,allowedLocationIds);
    const supplied=Array.isArray(input.locationObjectives)?input.locationObjectives:[];
    const objectives=snapshot.portfolio.locations.map(row=>{
      const custom=supplied.find(x=>x.locationId===row.locationId)||{};
      return {
        locationId:row.locationId,locationName:row.locationName,
        objective:String(custom.objective||`Improve operating rhythm and reduce the highest modeled controllable constraint at ${row.locationName}.`).slice(0,500),
        owner:String(custom.owner||input.defaultOwner||program.sponsor||actor).slice(0,120),
        readinessTarget:Number(custom.readinessTarget||Math.min(100,row.readinessScore+5)),
        rhythmTarget:Number(custom.rhythmTarget||Math.min(100,row.rhythmScore+20)),
        leakageReductionTargetPercent:Number(custom.leakageReductionTargetPercent||10)
      };
    });
    const criteria={
      minimumOverallScore:Number(input.minimumOverallScore||65),
      minimumAdoptionScore:Number(input.minimumAdoptionScore||65),
      minimumOperatingScore:Number(input.minimumOperatingScore||65),
      minimumValueScore:Number(input.minimumValueScore||50),
      maximumHighAttentionLocations:Number.isFinite(Number(input.maximumHighAttentionLocations))?Number(input.maximumHighAttentionLocations):0
    };
    const config={configuredAt:this.now(),configuredBy:actor,criteria,locationObjectives:objectives};
    await this.database.mutate(db=>{const p=(db.pilotValuePrograms||[]).find(x=>x.id===program.id);p.proofProgram=config;return config;});
    await this.auditService.record({organizationId,actor,action:`Pilot proof success criteria configured: ${program.id}`,category:"pilot_value"});
    this.realtimeHub.publish("pilot-proof:configured",{programId:program.id,...config});
    return config;
  }
  trend(program,current){
    const points=[{
      id:"baseline",capturedAt:program.baseline.capturedAt,label:"Baseline",
      readiness:program.baseline.metrics.averageReadiness,rhythm:program.baseline.metrics.averageRhythmScore,
      leakage:program.baseline.metrics.modeledLeakageDollars,verifiedValue:0,overall:null
    },...(program.checkpoints||[]).map((x,i)=>({
      id:x.id,capturedAt:x.capturedAt,label:`Checkpoint ${i+1}`,
      readiness:x.current?.averageReadiness||0,rhythm:x.current?.averageRhythmScore||0,
      leakage:x.current?.modeledLeakageDollars||0,verifiedValue:x.evidence?.verifiedRealizedImpactDollars||0,overall:x.scorecard?.overall??null
    }))];
    points.push({id:"current",capturedAt:current.generatedAt,label:"Current",readiness:current.current.averageReadiness,rhythm:current.current.averageRhythmScore,leakage:current.current.modeledLeakageDollars,verifiedValue:current.evidence.verifiedRealizedImpactDollars,overall:current.scorecard.overall});
    return points;
  }
  locationEvidence(program,current){
    const baseline=new Map((program.baseline.locations||[]).map(x=>[x.locationId,x]));
    const objectives=new Map((program.proofProgram?.locationObjectives||[]).map(x=>[x.locationId,x]));
    return current.portfolio.locations.map(row=>{
      const b=baseline.get(row.locationId)||{},o=objectives.get(row.locationId)||{};
      const leakageBase=Number(b.modeledLeakageDollars||0);
      const leakageReduction=leakageBase>0?Math.max(0,(leakageBase-Number(row.modeledLeakageDollars||0))/leakageBase*100):0;
      const readinessLift=Number(row.readinessScore||0)-Number(b.readinessScore||0);
      const rhythmLift=Number(row.rhythmScore||0)-Number(b.rhythmScore||0);
      const targetChecks=[
        o.readinessTarget==null?null:Number(row.readinessScore||0)>=Number(o.readinessTarget),
        o.rhythmTarget==null?null:Number(row.rhythmScore||0)>=Number(o.rhythmTarget),
        o.leakageReductionTargetPercent==null?null:leakageReduction>=Number(o.leakageReductionTargetPercent)
      ].filter(x=>x!==null);
      return {
        locationId:row.locationId,locationName:row.locationName,owner:o.owner||program.sponsor,
        objective:o.objective||"Success criteria not yet configured.",
        readiness:{baseline:Number(b.readinessScore||0),current:Number(row.readinessScore||0),lift:this.round(readinessLift,1),target:o.readinessTarget??null},
        rhythm:{baseline:Number(b.rhythmScore||0),current:Number(row.rhythmScore||0),lift:this.round(rhythmLift,1),target:o.rhythmTarget??null},
        leakage:{baseline:leakageBase,current:Number(row.modeledLeakageDollars||0),reductionPercent:this.round(leakageReduction,1),targetReductionPercent:o.leakageReductionTargetPercent??null},
        activeActions:Number(row.activeActions||0),attentionLevel:row.attentionLevel,
        targetsMet:targetChecks.filter(Boolean).length,targetsMeasured:targetChecks.length
      };
    });
  }
  recommendation(current,config,locations){
    if(!config)return {decision:"CONFIGURE",confidence:"high",reason:"Executive success criteria have not been committed yet.",nextAction:"Configure pilot success criteria before making a continuation or expansion decision."};
    const c=config.criteria,sc=current.scorecard;
    const gates={
      overall:sc.overall>=c.minimumOverallScore,
      adoption:sc.adoption>=c.minimumAdoptionScore,
      operating:sc.operating>=c.minimumOperatingScore,
      value:sc.value>=c.minimumValueScore,
      attention:current.current.highAttentionLocations<=c.maximumHighAttentionLocations
    };
    const passed=Object.values(gates).filter(Boolean).length;
    const age=current.program.ageDays,duration=current.program.pilotDays;
    let decision,reason;
    if(passed===5&&age>=Math.min(7,Math.floor(duration*.25))){decision="EXPAND";reason="Committed executive success gates are currently satisfied with sufficient pilot observation time.";}
    else if(passed>=3){decision="CONTINUE";reason="The pilot is showing material progress, but not every committed success gate is satisfied yet.";}
    else {decision="INTERVENE";reason="Multiple committed success gates are currently below target and require leadership intervention before expansion.";}
    if(age>=duration&&passed<5){decision="INTERVENE";reason="The configured pilot period has reached its target duration without satisfying all executive success gates.";}
    return {decision,confidence:current.program.checkpointCount>=2?"high":"moderate",reason,gates,passed,total:5,nextAction:decision==="EXPAND"?"Prepare the expansion decision packet and confirm rollout scope.":decision==="CONTINUE"?"Continue the pilot and capture the next evidence checkpoint.":"Review stalled adoption and location exceptions before the next checkpoint."};
  }
  async snapshot(organizationId,allowedLocationIds){
    const program=await this.program(organizationId);
    if(!program)return {version:"48.10.0",status:"baseline-required",headline:"Capture the V48 pilot baseline first.",program:null};
    const current=await this.pilotValueScorecardService.snapshot(organizationId,allowedLocationIds);
    const locations=this.locationEvidence(program,current),config=program.proofProgram||null,recommendation=this.recommendation(current,config,locations);
    const exceptions=locations.filter(x=>x.attentionLevel!=="healthy"||(x.targetsMeasured&&x.targetsMet<x.targetsMeasured)).map(x=>({
      locationId:x.locationId,locationName:x.locationName,owner:x.owner,
      type:x.attentionLevel!=="healthy"?"operating-attention":"success-target-gap",
      reason:x.attentionLevel!=="healthy"?`${x.attentionLevel} leadership attention state`:`${x.targetsMet}/${x.targetsMeasured} configured location targets currently met`
    }));
    return {
      version:"48.10.0",generatedAt:this.now(),status:config?"proof-program-active":"criteria-required",
      headline:config?`${recommendation.decision}: ${recommendation.reason}`:"Baseline is active. Commit executive success criteria before evaluating the pilot.",
      program:{id:program.id,name:program.name,sponsor:program.sponsor,pilotDays:program.pilotDays,ageDays:current.program.ageDays,configured:!!config},
      successCriteria:config?.criteria||null,
      locationObjectives:locations,trend:this.trend(program,current),
      valueLedger:{verifiedRealizedImpactDollars:current.evidence.verifiedRealizedImpactDollars,definition:current.evidence.attribution.verifiedValueDefinition,checkpointCount:current.program.checkpointCount},
      scorecard:current.scorecard,recommendation,exceptions,
      policy:{humanCommercialDecisionRequired:true,automaticExpansion:false,automaticAttribution:false}
    };
  }
}
module.exports=PilotProofProgramService;
