"use strict";

class FailureRecoveryShiftContinuityService {
  constructor(database,auditService,realtimeHub,peakServiceWorkflowResilienceService,dataIntegrityRecoveryService,reliabilityAutomationService){
    Object.assign(this,{database,auditService,realtimeHub,peakServiceWorkflowResilienceService,dataIntegrityRecoveryService,reliabilityAutomationService});
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async rehearsals(org){const db=await this.database.read();return (db.failureRecoveryShiftContinuityRehearsals||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.rehearsedAt)-new Date(a.rehearsedAt));}
  async decisions(org){const db=await this.database.read();return (db.failureRecoveryShiftContinuityDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));}
  async snapshot(org,allowed){
    const [db,peak,integrity,reliability,rehearsals,decisions]=await Promise.all([
      this.database.read(),this.peakServiceWorkflowResilienceService.snapshot(org,allowed),
      this.dataIntegrityRecoveryService.snapshot(org,allowed),this.reliabilityAutomationService.evaluate(org),
      this.rehearsals(org),this.decisions(org)
    ]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===org&&this.allowed(x.id,allowed)).map(loc=>{
      const peakLoc=(peak.locations||[]).find(x=>x.locationId===loc.id)||null;
      const rehearsal=rehearsals.find(x=>x.locationId===loc.id)||null;
      const decision=decisions.find(x=>x.locationId===loc.id)||null;
      const scenarios=rehearsal?.scenarios||[];
      const scenarioMap=new Map(scenarios.map(x=>[x.id,x]));
      const required=["API_FAILURE","CONNECTOR_FAILURE","STALE_DATA","OFFLINE_CONTINUITY","DEVICE_SURFACE_FAILURE","RECONNECT_RECONCILIATION"];
      const scenarioChecks=required.map(id=>{
        const r=scenarioMap.get(id);
        return {id:`SCENARIO_${id}`,passed:r?.status==="PASS",actual:r?.status||"not rehearsed"};
      });
      const highCritical=(rehearsal?.findings||[]).filter(x=>x.status!=="RESOLVED"&&["high","critical"].includes(String(x.severity||"").toLowerCase()));
      const checks=[
        {id:"PEAK_SERVICE_BASELINE",passed:peakLoc?.certification?.decision==="READY"||peakLoc?.resilienceReady===true,actual:peakLoc?.state||"not ready"},
        {id:"DATA_INTEGRITY_AVAILABLE",passed:["data-integrity-ready-for-certification","data-integrity-recovery-certified"].includes(integrity.status),actual:integrity.status},
        {id:"RELIABILITY_MODEL_AVAILABLE",passed:!!reliability&&Array.isArray(reliability.runbooks),actual:reliability?.status||"unavailable"},
        ...scenarioChecks,
        {id:"FALLBACK_RUNBOOK",passed:!!rehearsal?.fallbackRunbook,actual:rehearsal?.fallbackRunbook?"recorded":"missing"},
        {id:"ESCALATION_OWNER",passed:!!rehearsal?.escalationOwner,actual:rehearsal?.escalationOwner||"missing"},
        {id:"RECOVERY_TIME_OBJECTIVE",passed:Number(rehearsal?.recoveryTimeMinutes)>=0&&Number(rehearsal?.recoveryTimeMinutes)<=Number(rehearsal?.maxRecoveryMinutes||15),actual:rehearsal?`${rehearsal.recoveryTimeMinutes}m / ${rehearsal.maxRecoveryMinutes}m max`:"not measured"},
        {id:"SHIFT_CONTINUITY",passed:rehearsal?.shiftContinuity==="PASS",actual:rehearsal?.shiftContinuity||"not assessed"},
        {id:"NO_HIGH_CRITICAL_FINDINGS",passed:highCritical.length===0,actual:`${highCritical.length} high/critical open finding(s)`},
        {id:"HUMAN_RECOVERY_DECISION",passed:!!decision,actual:decision?.decision||"not decided"}
      ];
      return {locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,rehearsal,decision,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,recoveryReady:checks.slice(0,-1).every(x=>x.passed),highCriticalFindings:highCritical,state:decision?.decision==="RECOVER"?"RECOVERY_CERTIFIED":decision?.decision==="DEGRADED"?"DEGRADED_MODE_ACCEPTED":decision?.decision==="HOLD"?"SHIFT_CONTINUITY_HOLD":rehearsal?"RECOVERY_REHEARSED":"RECOVERY_REHEARSAL_REQUIRED"};
    });
    return {version:"53.75.0",generatedAt:this.now(),status:locations.some(x=>x.decision?.decision==="HOLD")?"shift-continuity-hold":locations.some(x=>x.decision?.decision==="RECOVER")?"failure-recovery-ready":locations.some(x=>x.rehearsal)?"failure-recovery-in-review":"failure-recovery-rehearsal-required",headline:`${locations.filter(x=>x.recoveryReady).length}/${locations.length} location(s) satisfy failure-recovery gates; ${locations.reduce((n,x)=>n+x.highCriticalFindings.length,0)} high/critical finding(s).`,reliability:{status:reliability.status,score:reliability.score,breached:reliability.breached,warning:reliability.warning},locations,policy:{humanFailureRehearsalRequired:true,fallbackRunbookRequired:true,offlineContinuityRequired:true,reconnectReconciliationRequired:true,shiftContinuityRequired:true,humanRecoverDegradedHoldDecisionRequired:true,recoverDecisionDoesNotExecuteRecovery:true,degradedModeDoesNotMutateRestaurantState:true,holdDoesNotStopRestaurantAutomatically:true,noAutomaticRecoveryActions:true,autonomousProductionChanges:false}};
  }
  async rehearse(org,allowed,locationId,input,actor){
    if(!this.allowed(locationId,allowed))throw new Error("Location is outside your authorized scope.");
    const required=["API_FAILURE","CONNECTOR_FAILURE","STALE_DATA","OFFLINE_CONTINUITY","DEVICE_SURFACE_FAILURE","RECONNECT_RECONCILIATION"];
    const supplied=new Map((Array.isArray(input.scenarios)?input.scenarios:[]).map(x=>[String(x.id||"").toUpperCase(),x]));
    const scenarios=required.map(id=>{const x=supplied.get(id);if(!x)throw new Error(`${id} rehearsal evidence is required.`);const status=String(x.status||"").toUpperCase();if(!["PASS","FAIL"].includes(status))throw new Error(`${id} status must be PASS or FAIL.`);const evidence=String(x.evidence||"").trim();if(!evidence)throw new Error(`${id} evidence is required.`);return{id,status,evidence:evidence.slice(0,2500)};});
    const fallbackRunbook=String(input.fallbackRunbook||"").trim(),escalationOwner=String(input.escalationOwner||"").trim(),shiftContinuity=String(input.shiftContinuity||"").toUpperCase(),evidence=String(input.evidence||"").trim();
    if(!fallbackRunbook||!escalationOwner||!evidence)throw new Error("Fallback runbook, escalation owner, and rehearsal evidence are required.");
    if(!["PASS","FAIL"].includes(shiftContinuity))throw new Error("shiftContinuity must be PASS or FAIL.");
    const recoveryTimeMinutes=Math.max(0,Number(input.recoveryTimeMinutes)||0),maxRecoveryMinutes=Math.max(1,Number(input.maxRecoveryMinutes)||15);
    const findings=(Array.isArray(input.findings)?input.findings:[]).map((x,i)=>({id:String(x.id||`finding_${i+1}`),severity:String(x.severity||"medium").toLowerCase(),issue:String(x.issue||"").trim().slice(0,1800),status:String(x.status||"OPEN").toUpperCase()})).filter(x=>x.issue);
    const record={id:`frs_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,rehearsedAt:this.now(),rehearsedBy:actor,scenarios,fallbackRunbook:fallbackRunbook.slice(0,4000),escalationOwner:escalationOwner.slice(0,180),recoveryTimeMinutes,maxRecoveryMinutes,shiftContinuity,evidence:evidence.slice(0,4000),findings,note:String(input.note||"").trim().slice(0,2200),automaticRecoveryExecuted:false,restaurantStateMutated:false};
    await this.database.mutate(db=>{db.failureRecoveryShiftContinuityRehearsals||=[];db.failureRecoveryShiftContinuityRehearsals.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Failure-recovery rehearsal recorded for ${locationId}; no recovery action executed`,category:"failure_recovery_shift"});
    this.realtimeHub.publish("failure-recovery-shift:rehearsed",{organizationId:org,locationId,id:record.id});return record;
  }
  async decide(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);if(!loc?.rehearsal)throw new Error("Failure-recovery rehearsal is required before a decision.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["RECOVER","DEGRADED","HOLD"].includes(decision))throw new Error("Decision must be RECOVER, DEGRADED, or HOLD.");
    if(!evidence)throw new Error("Human recovery decision evidence is required.");
    if(decision==="RECOVER"&&!loc.recoveryReady&&!reason)throw new Error("RECOVER with open recovery gates requires an executive override reason.");
    if(["DEGRADED","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={id:`frd_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,locationName:loc.locationName,decision,decidedAt:this.now(),decidedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2400),gateSnapshot:loc.checks,recoveryExecutedByDecision:false,restaurantStateMutatedByDecision:false,automaticServiceStop:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.failureRecoveryShiftContinuityDecisions||=[];db.failureRecoveryShiftContinuityDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Failure-recovery decision ${decision} recorded for ${locationId}; no automatic recovery executed`,category:"failure_recovery_shift"});
    this.realtimeHub.publish("failure-recovery-shift:decision",{organizationId:org,locationId,id:record.id,decision});return record;
  }
}
module.exports=FailureRecoveryShiftContinuityService;
