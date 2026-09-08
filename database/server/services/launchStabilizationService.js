"use strict";

class LaunchStabilizationService {
  constructor(database,auditService,realtimeHub,goLiveCommandService,multiLocationPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,goLiveCommandService,multiLocationPerformanceService});
  }
  now(){return new Date().toISOString();}
  async observations(organizationId){
    const db=await this.database.read();
    return (db.launchStabilizationObservations||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));
  }
  async declarations(organizationId){
    const db=await this.database.read();
    return (db.launchStabilizationDeclarations||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.declaredAt)-new Date(a.declaredAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [command,portfolio,observations,declarations]=await Promise.all([
      this.goLiveCommandService.snapshot(organizationId,allowedLocationIds),
      this.multiLocationPerformanceService.snapshot(organizationId,allowedLocationIds),
      this.observations(organizationId),
      this.declarations(organizationId)
    ]);
    const pmap=new Map((portfolio.locations||[]).map(x=>[x.locationId,x]));
    const obsByLoc=new Map(),decByLoc=new Map();
    for(const o of observations){if(!obsByLoc.has(o.locationId))obsByLoc.set(o.locationId,[]);obsByLoc.get(o.locationId).push(o);}
    for(const d of declarations)if(!decByLoc.has(d.locationId))decByLoc.set(d.locationId,d);

    const locations=(command.locations||[])
      .filter(x=>x.result?.status==="CUTOVER_SUCCEEDED"||x.result?.status==="ROLLED_BACK"||x.result?.status==="CUTOVER_FAILED")
      .map(loc=>{
        const current=pmap.get(loc.locationId)||{};
        const history=(obsByLoc.get(loc.locationId)||[]).sort((a,b)=>new Date(a.observedAt)-new Date(b.observedAt));
        const latest=history[history.length-1]||null;
        const declaration=decByLoc.get(loc.locationId)||null;
        const successful=loc.result?.status==="CUTOVER_SUCCEEDED";
        const firstServiceVerified=history.some(x=>x.firstServiceVerified===true);
        const criticalIncidents=history.filter(x=>x.severity==="critical").length;
        const highIncidents=history.filter(x=>x.severity==="high").length;
        const healthFailures=history.filter(x=>x.healthPassed<x.healthTotal).length;
        const stableObservations=history.filter(x=>x.healthPassed===x.healthTotal&&x.firstServiceVerified&&x.severity==="none").length;
        const exitChecks=[
          {id:"successful-cutover",label:"Successful human-recorded production cutover",passed:successful,actual:loc.result?.status||"none"},
          {id:"observation",label:"At least one post-launch observation recorded",passed:history.length>0,actual:history.length},
          {id:"first-service",label:"First-service verification completed",passed:firstServiceVerified,actual:firstServiceVerified?"verified":"open"},
          {id:"health",label:"Latest stabilization health is fully healthy",passed:!!latest&&latest.healthPassed===latest.healthTotal,actual:latest?`${latest.healthPassed}/${latest.healthTotal}`:"no observation"},
          {id:"critical-incidents",label:"No unresolved critical launch incident",passed:criticalIncidents===0,actual:criticalIncidents},
          {id:"operating-attention",label:"Current leadership attention is not High/Critical",passed:!["high","critical"].includes(current.attentionLevel),actual:current.attentionLevel||"unknown"},
          {id:"minimum-stable-observation",label:"At least one clean first-service stabilization observation",passed:stableObservations>=1,actual:stableObservations}
        ];
        const passed=exitChecks.filter(x=>x.passed).length;
        const rollbackRecommended=!successful||criticalIncidents>0||healthFailures>=2||["high","critical"].includes(current.attentionLevel);
        return {
          locationId:loc.locationId,locationName:loc.locationName,wave:loc.wave,
          cutoverStatus:loc.result?.status||"NOT_RECORDED",
          observedAt:latest?.observedAt||null,
          observationCount:history.length,
          firstServiceVerified,
          currentReadiness:Number(current.readinessScore||0),
          attentionLevel:current.attentionLevel||"unknown",
          urgentPredictiveInterventions:Number(current.urgentPredictiveInterventions||0),
          exitChecks,exitPassed:passed,exitTotal:exitChecks.length,
          stabilizationReady:passed===exitChecks.length,
          rollbackRecommendation:rollbackRecommended?"REVIEW_ROLLBACK":"NO_ROLLBACK_SIGNAL",
          latestObservation:latest,
          healthTimeline:history,
          declaration,
          stabilizationState:declaration?.decision||"OBSERVING"
        };
      });

    return {
      version:"49.25.0",generatedAt:this.now(),
      status:locations.length===0?"successful-cutover-required":locations.every(x=>x.declaration?.decision==="STABLE")?"stabilization-complete":"stabilization-review",
      headline:locations.length===0?"A human-recorded cutover result is required before launch stabilization begins.":`${locations.filter(x=>x.stabilizationReady).length}/${locations.length} launched location(s) currently meet all stabilization exit criteria.`,
      locations,observationHistory:observations,declarationHistory:declarations,
      policy:{
        observationIsHumanRecorded:true,
        rollbackRecommendationIsAdvisory:true,
        humanStabilizationDeclarationRequired:true,
        autonomousRollback:false,
        automaticStableDeclaration:false
      }
    };
  }

  async observe(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location requires a recorded launch result before stabilization observation.");
    const severity=String(input.severity||"none").toLowerCase();
    if(!["none","low","medium","high","critical"].includes(severity))throw new Error("Severity must be none, low, medium, high, or critical.");
    const health={
      apiHealthy:input.apiHealthy===true,
      authenticationHealthy:input.authenticationHealthy===true,
      reservationIntegrity:input.reservationIntegrity===true,
      floorIntegrity:input.floorIntegrity===true,
      kitchenIntegrity:input.kitchenIntegrity===true,
      workforceIntegrity:input.workforceIntegrity===true
    };
    const passed=Object.values(health).filter(Boolean).length,now=this.now();
    const record={
      id:`lso_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,wave:loc.wave,
      observedAt:now,observedBy:actor,
      observationWindowHours:Math.max(1,Math.min(Number(input.observationWindowHours)||4,168)),
      firstServiceVerified:input.firstServiceVerified===true,
      health:{...health},healthPassed:passed,healthTotal:Object.keys(health).length,
      severity,
      incident:String(input.incident||"").trim().slice(0,1500),
      note:String(input.note||"").slice(0,1000)
    };
    if(["high","critical"].includes(severity)&&!record.incident)throw new Error("High/Critical stabilization severity requires an incident description.");
    await this.database.mutate(db=>{db.launchStabilizationObservations||=[];db.launchStabilizationObservations.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Launch stabilization observation recorded for ${locationId}: health ${passed}/${record.healthTotal}; severity ${severity}`,category:"launch_stabilization"});
    this.realtimeHub.publish("launch-stabilization:observed",{id:record.id,organizationId,locationId,severity,firstServiceVerified:record.firstServiceVerified});
    return record;
  }

  async declare(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location is not in launch stabilization.");
    const decision=String(input.decision||"").toUpperCase();
    if(!["STABLE","EXTEND","ROLLBACK"].includes(decision))throw new Error("Decision must be STABLE, EXTEND, or ROLLBACK.");
    const approver=String(input.approver||actor||"").trim().slice(0,160);
    if(!approver)throw new Error("Stabilization approver is required.");
    const reason=String(input.reason||"").trim().slice(0,1500);
    if(decision==="STABLE"&&!loc.stabilizationReady&&!reason)throw new Error("STABLE with open stabilization criteria requires a documented executive reason.");
    if(decision==="ROLLBACK"&&!reason)throw new Error("ROLLBACK requires a documented human reason.");
    const record={
      id:`lsd_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,wave:loc.wave,
      decision,approver,declaredBy:actor,declaredAt:this.now(),reason,
      exitCriteriaAtDecision:{passed:loc.exitPassed,total:loc.exitTotal,checks:loc.exitChecks},
      rollbackRecommendationAtDecision:loc.rollbackRecommendation,
      executionState:decision==="ROLLBACK"?"ROLLBACK_DECIDED_NOT_EXECUTED":"NO_AUTOMATIC_ACTION"
    };
    await this.database.mutate(db=>{db.launchStabilizationDeclarations||=[];db.launchStabilizationDeclarations.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Launch stabilization declared ${decision} for ${locationId} by ${approver}; no autonomous rollback/action executed`,category:"launch_stabilization"});
    this.realtimeHub.publish("launch-stabilization:declared",{id:record.id,organizationId,locationId,decision,approver});
    return record;
  }
}
module.exports=LaunchStabilizationService;
