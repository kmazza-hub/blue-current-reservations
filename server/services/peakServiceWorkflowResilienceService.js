"use strict";

class PeakServiceWorkflowResilienceService {
  constructor(database,auditService,realtimeHub,restaurantWorkflowIntegrationService,peakServiceStressTestService){
    Object.assign(this,{database,auditService,realtimeHub,restaurantWorkflowIntegrationService,peakServiceStressTestService});
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async observations(org){const db=await this.database.read();return (db.peakServiceWorkflowObservations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));}
  async certifications(org){const db=await this.database.read();return (db.peakServiceWorkflowCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  metrics(db,org,locationId){
    const tables=(db.tables||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const occupied=tables.filter(x=>["seated","occupied"].includes(String(x.status||"").toLowerCase()));
    const flows=(db.serviceFlows||[]).filter(x=>x.organizationId===org&&x.locationId===locationId&&String(x.course||"").toLowerCase()!=="closed");
    const tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===org&&x.locationId===locationId&& !["served","closed","complete"].includes(String(x.status||"").toLowerCase()));
    const staff=(db.staff||[]).filter(x=>x.organizationId===org&&x.locationId===locationId&& !["off","inactive"].includes(String(x.status||"").toLowerCase()));
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===org&&x.locationId===locationId&&String(x.status||"").toLowerCase()==="waiting");
    const ready=flows.filter(x=>x.expoStatus==="ready");
    const highRisk=flows.filter(x=>["high","critical"].includes(String(x.risk||"").toLowerCase()));
    const pickup=ready.filter(x=>x.readyAt&&!x.deliveredAt).map(x=>Math.max(0,Math.floor((Date.now()-new Date(x.readyAt))/60000)));
    const occupancy=tables.length?Math.round(occupied.length/tables.length*100):0;
    const covers=occupied.reduce((n,t)=>n+Number(t.partySize||0),0);
    return {tables:tables.length,occupiedTables:occupied.length,occupancyPercent:occupancy,activeServiceFlows:flows.length,kitchenTickets:tickets.length,activeStaff:staff.length,reservations:reservations.length,waiting:waitlist.length,readyForRunner:ready.length,highRiskTables:highRisk.length,activeCovers:covers,averagePickupMinutes:pickup.length?Math.round(pickup.reduce((a,b)=>a+b,0)/pickup.length):0};
  }
  async snapshot(org,allowed){
    const [db,workflow,stress,obs,certs]=await Promise.all([this.database.read(),this.restaurantWorkflowIntegrationService.snapshot(org,allowed),this.peakServiceStressTestService.snapshot(org,allowed),this.observations(org),this.certifications(org)]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===org&&this.allowed(x.id,allowed)).map(loc=>{
      const metrics=this.metrics(db,org,loc.id);
      const workflowLoc=(workflow.locations||[]).find(x=>x.locationId===loc.id)||null;
      const stressLoc=(stress.locations||[]).find(x=>x.locationId===loc.id)||null;
      const history=obs.filter(x=>x.locationId===loc.id),latest=history[0]||null;
      const cert=certs.find(x=>x.locationId===loc.id)||null;
      const open=(latest?.findings||[]).filter(x=>x.status!=="RESOLVED");
      const critical=open.filter(x=>["high","critical"].includes(String(x.severity||"").toLowerCase()));
      const thresholds=latest?.thresholds||{};
      const checks=[
        {id:"WORKFLOW_INTEGRATION",passed:workflowLoc?.certification?.status==="RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED"||workflowLoc?.workflowReady===true,actual:workflowLoc?.state||"not ready"},
        {id:"PEAK_STRESS_BASELINE",passed:stressLoc?.failed===0,actual:`${stressLoc?.passed||0}/${stressLoc?.total||0} stress scenarios pass; ${stressLoc?.failed||0} fail`},
        {id:"PEAK_OBSERVATION",passed:!!latest,actual:latest?.observedAt||"not observed"},
        {id:"HANDOFF_LATENCY",passed:!!latest&&Number(latest.handoffLatencySeconds)<=Number(thresholds.maxHandoffLatencySeconds||90),actual:latest?`${latest.handoffLatencySeconds}s / ${thresholds.maxHandoffLatencySeconds}s max`:"not measured"},
        {id:"OPERATOR_WORKLOAD",passed:!!latest&&Number(latest.operatorWorkloadScore)<=Number(thresholds.maxOperatorWorkloadScore||4),actual:latest?`${latest.operatorWorkloadScore}/5`:"not measured"},
        {id:"KITCHEN_CONGESTION",passed:!!latest&&Number(latest.kitchenCongestionScore)<=Number(thresholds.maxKitchenCongestionScore||4),actual:latest?`${latest.kitchenCongestionScore}/5`:"not measured"},
        {id:"FLOOR_CONGESTION",passed:!!latest&&Number(latest.floorCongestionScore)<=Number(thresholds.maxFloorCongestionScore||4),actual:latest?`${latest.floorCongestionScore}/5`:"not measured"},
        {id:"RECOVERY_TIME",passed:!!latest&&Number(latest.recoveryMinutes)<=Number(thresholds.maxRecoveryMinutes||10),actual:latest?`${latest.recoveryMinutes}m / ${thresholds.maxRecoveryMinutes}m max`:"not measured"},
        {id:"NO_HIGH_CRITICAL_FINDINGS",passed:critical.length===0,actual:`${critical.length} high/critical open finding(s)`},
        {id:"SERVICE_COMPLETION",passed:latest?.serviceCompletion==="PASS",actual:latest?.serviceCompletion||"not assessed"},
        {id:"HUMAN_RESILIENCE_DECISION",passed:!!cert,actual:cert?.decision||"not certified"}
      ];
      return {locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,metrics,workflowState:workflowLoc?.state||null,stressState:stressLoc?.stressState||null,latestObservation:latest,observations:history.slice(0,10),certification:cert,checks,passed:checks.filter(x=>x.passed).length,total:checks.length,resilienceReady:checks.slice(0,-1).every(x=>x.passed),state:cert?.decision==="READY"?"PEAK_SERVICE_READY":cert?.decision==="DEGRADED"?"PEAK_SERVICE_DEGRADED":cert?.decision==="HOLD"?"PEAK_SERVICE_HOLD":latest?"PEAK_SERVICE_OBSERVED":"PEAK_SERVICE_OBSERVATION_REQUIRED"};
    });
    return {version:"53.50.0",generatedAt:this.now(),status:locations.some(x=>x.certification?.decision==="HOLD")?"peak-service-hold":locations.some(x=>x.certification?.decision==="READY")?"peak-service-ready":locations.some(x=>x.latestObservation)?"peak-service-resilience-in-review":"peak-service-resilience-observation-required",headline:`${locations.filter(x=>x.resilienceReady).length}/${locations.length} location(s) satisfy peak-service resilience gates; ${locations.reduce((n,x)=>n+(x.latestObservation?.findings||[]).filter(f=>["high","critical"].includes(String(f.severity||"").toLowerCase())&&f.status!=="RESOLVED").length,0)} high/critical finding(s).`,locations,policy:{integratedWorkflowRequired:true,peakStressEvidenceRequired:true,humanPeakObservationRequired:true,operatorWorkloadThresholdRequired:true,kitchenFloorCongestionThresholdRequired:true,recoveryTimeThresholdRequired:true,humanReadyDegradedHoldDecisionRequired:true,readyDecisionDoesNotExecuteRestaurantActions:true,degradedHoldDoNotMutateRestaurantState:true,noAutomaticOperationalMutation:true,autonomousProductionChanges:false}};
  }
  async observe(org,allowed,locationId,input,actor){
    if(!this.allowed(locationId,allowed))throw new Error("Location is outside your authorized scope.");
    const thresholds={maxHandoffLatencySeconds:Math.max(1,Number(input.maxHandoffLatencySeconds||90)),maxOperatorWorkloadScore:Math.max(1,Math.min(5,Number(input.maxOperatorWorkloadScore||4))),maxKitchenCongestionScore:Math.max(1,Math.min(5,Number(input.maxKitchenCongestionScore||4))),maxFloorCongestionScore:Math.max(1,Math.min(5,Number(input.maxFloorCongestionScore||4))),maxRecoveryMinutes:Math.max(1,Number(input.maxRecoveryMinutes||10))};
    const nums=["handoffLatencySeconds","operatorWorkloadScore","kitchenCongestionScore","floorCongestionScore","recoveryMinutes"];
    for(const k of nums)if(Number.isNaN(Number(input[k]))||Number(input[k])<0)throw new Error(`${k} must be a non-negative number.`);
    const serviceCompletion=String(input.serviceCompletion||"").toUpperCase();if(!["PASS","FAIL"].includes(serviceCompletion))throw new Error("serviceCompletion must be PASS or FAIL.");
    const evidence=String(input.evidence||"").trim();if(!evidence)throw new Error("Human peak-service observation evidence is required.");
    const findings=(Array.isArray(input.findings)?input.findings:[]).map((x,i)=>({id:String(x.id||`finding_${i+1}`),severity:String(x.severity||"medium").toLowerCase(),area:String(x.area||"GENERAL").toUpperCase(),issue:String(x.issue||"").trim().slice(0,1800),status:String(x.status||"OPEN").toUpperCase()})).filter(x=>x.issue);
    const record={id:`psw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,observedAt:this.now(),observedBy:actor,handoffLatencySeconds:Number(input.handoffLatencySeconds),operatorWorkloadScore:Number(input.operatorWorkloadScore),kitchenCongestionScore:Number(input.kitchenCongestionScore),floorCongestionScore:Number(input.floorCongestionScore),recoveryMinutes:Number(input.recoveryMinutes),serviceCompletion,thresholds,evidence:evidence.slice(0,4000),findings,note:String(input.note||"").trim().slice(0,2200),restaurantStateMutated:false,automaticMitigationPerformed:false};
    await this.database.mutate(db=>{db.peakServiceWorkflowObservations||=[];db.peakServiceWorkflowObservations.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Peak-service workflow resilience observation recorded for ${locationId}`,category:"peak_service_workflow"});
    this.realtimeHub.publish("peak-service-workflow:observed",{organizationId:org,locationId,id:record.id});return record;
  }
  async certify(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);if(!loc)throw new Error("Location not found.");
    const decision=String(input.decision||"").toUpperCase(),evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["READY","DEGRADED","HOLD"].includes(decision))throw new Error("Decision must be READY, DEGRADED, or HOLD.");
    if(!evidence)throw new Error("Human resilience decision evidence is required.");
    if(decision==="READY"&&!loc.resilienceReady&&!reason)throw new Error("READY with open resilience gates requires an executive override reason.");
    if(["DEGRADED","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented reason.`);
    const record={id:`pswc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,locationName:loc.locationName,decision,status:"PEAK_SERVICE_RESILIENCE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2400),gateSnapshot:loc.checks,restaurantActionsExecutedByDecision:false,restaurantStateMutatedByDecision:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.peakServiceWorkflowCertifications||=[];db.peakServiceWorkflowCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Peak-service resilience decision ${decision} recorded for ${locationId}; no restaurant action executed`,category:"peak_service_workflow"});
    this.realtimeHub.publish("peak-service-workflow:certified",{organizationId:org,locationId,id:record.id,decision});return record;
  }
}
module.exports=PeakServiceWorkflowResilienceService;
