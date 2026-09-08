"use strict";

class PeakServiceStressTestService {
  constructor(database,auditService,realtimeHub,restaurantDayLifecycleService,pilotOperationalReadinessService){
    Object.assign(this,{database,auditService,realtimeHub,restaurantDayLifecycleService,pilotOperationalReadinessService});
    this.scenarios=[
      {id:"RESERVATION_BURST",label:"Reservation burst",failure:false},
      {id:"HIGH_OCCUPANCY",label:"High occupancy / seating pressure",failure:false},
      {id:"RAPID_TABLE_TURNS",label:"Rapid table turns",failure:false},
      {id:"STAFF_CHANGE",label:"Mid-service staff change",failure:false},
      {id:"KITCHEN_PRESSURE",label:"Kitchen pressure",failure:false},
      {id:"DELAYED_REQUESTS",label:"Delayed requests",failure:true},
      {id:"API_FAILURE",label:"API failure",failure:true},
      {id:"CONNECTOR_FAILURE",label:"Connector / partial dependency failure",failure:true},
      {id:"RECONNECT_RETRY",label:"Reconnect and retry",failure:true},
      {id:"PARTIAL_DEGRADATION_RECOVERY",label:"Partial degradation and recovery",failure:true}
    ];
  }
  now(){return new Date().toISOString();}
  allowed(locationId,allowed=[]){return allowed.includes("*")||allowed.includes(locationId);}
  async runs(organizationId){
    const db=await this.database.read();
    return (db.peakServiceStressRuns||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  }
  capacityModel(db,organizationId,locationId){
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId)||{};
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const people=[
      ...(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status==="active"),
      ...(db.employees||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status==="active")
    ];
    const kitchen=(db.kitchenStations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const connectors=(db.liveConnectors||[]).filter(x=>x.organizationId===organizationId&&(!x.locationId||x.locationId===locationId));
    const connected=connectors.filter(x=>["connected","active","ready"].includes(String(x.status||"").toLowerCase()));
    const seats=tables.reduce((n,x)=>n+Number(x.seats||0),0);
    return {
      configuredCapacity:Number(location.capacity||seats||0),tables:tables.length,seats,
      reservations:reservations.length,activePeople:people.length,kitchenStations:kitchen.length,
      connectors:connectors.length,connectedConnectors:connected.length
    };
  }
  scenarioPrerequisites(model,scenarioId){
    const common=[
      {id:"floor",label:"Floor capacity exists",passed:model.tables>0,actual:`${model.tables} tables / ${model.seats} seats`},
      {id:"workforce",label:"Active workforce context exists",passed:model.activePeople>0,actual:`${model.activePeople} active people`}
    ];
    const extra={
      RESERVATION_BURST:[{id:"reservation-path",label:"Reservation data/path exists",passed:model.reservations>0||model.connectedConnectors>0,actual:`${model.reservations} reservations / ${model.connectedConnectors} live connectors`}],
      HIGH_OCCUPANCY:[],
      RAPID_TABLE_TURNS:[],
      STAFF_CHANGE:[],
      KITCHEN_PRESSURE:[{id:"kitchen",label:"Kitchen capacity model exists",passed:model.kitchenStations>0,actual:`${model.kitchenStations} kitchen stations`}],
      DELAYED_REQUESTS:[],
      API_FAILURE:[],
      CONNECTOR_FAILURE:[{id:"connector",label:"A connector exists to exercise dependency failure",passed:model.connectors>0,actual:`${model.connectors} connectors`}],
      RECONNECT_RETRY:[{id:"connector",label:"A connector exists to exercise reconnect/retry",passed:model.connectors>0,actual:`${model.connectors} connectors`}],
      PARTIAL_DEGRADATION_RECOVERY:[]
    };
    return [...common,...(extra[scenarioId]||[])];
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,lifecycle,baseline,runs]=await Promise.all([
      this.database.read(),
      this.restaurantDayLifecycleService.snapshot(organizationId,allowedLocationIds),
      this.pilotOperationalReadinessService.snapshot(organizationId,allowedLocationIds),
      this.runs(organizationId)
    ]);
    const lifecycleMap=new Map((lifecycle.locations||[]).map(x=>[x.locationId,x]));
    const baselineMap=new Map((baseline.locations||[]).map(x=>[x.locationId,x]));
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds)).map(loc=>{
      const model=this.capacityModel(db,organizationId,loc.id);
      const run=runs.find(x=>x.locationId===loc.id&&x.status==="ACTIVE")||runs.find(x=>x.locationId===loc.id)||null;
      const results=run?.results||[];
      const scenarioStates=this.scenarios.map(s=>{
        const result=results.filter(x=>x.scenarioId===s.id).slice(-1)[0]||null;
        const prereqs=this.scenarioPrerequisites(model,s.id);
        const prereqPassed=prereqs.every(x=>x.passed);
        return {
          ...s,prerequisites:prereqs,prerequisitesPassed:prereqPassed,
          state:result?.status==="PASS"?"PASS":result?.status==="FAIL"?"FAIL":run?.status==="ACTIVE"?(prereqPassed?"READY":"BLOCKED"):"RUN_REQUIRED",
          result
        };
      });
      const passed=scenarioStates.filter(x=>x.state==="PASS").length;
      const failed=scenarioStates.filter(x=>x.state==="FAIL").length;
      return {
        locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,
        baseline:baselineMap.get(loc.id)||null,lifecycle:lifecycleMap.get(loc.id)||null,
        model,run,scenarios:scenarioStates,
        passed,failed,total:this.scenarios.length,
        stressPercent:Math.round(passed/this.scenarios.length*100),
        stressState:passed===this.scenarios.length?"PEAK_SERVICE_STRESS_CERTIFIED":failed>0?"PEAK_SERVICE_STRESS_FAILED":run?.status==="ACTIVE"?"PEAK_SERVICE_STRESS_ACTIVE":"PEAK_SERVICE_STRESS_NOT_STARTED"
      };
    });
    const total=locations.reduce((n,x)=>n+x.total,0),passed=locations.reduce((n,x)=>n+x.passed,0),failed=locations.reduce((n,x)=>n+x.failed,0);
    return {
      version:"51.15.0",generatedAt:this.now(),
      status:locations.length===0?"restaurant-required":passed===total&&total>0?"peak-service-stress-certified":failed>0?"peak-service-stress-failures-open":locations.some(x=>x.run?.status==="ACTIVE")?"peak-service-stress-in-progress":"peak-service-stress-ready",
      headline:locations.length===0?"No authorized restaurant locations are available for peak-service stress testing.":`${passed}/${total} peak-service scenarios have human-recorded PASS evidence; ${failed} currently fail.`,
      scenarios:this.scenarios,locations,
      totals:{scenarios:total,passed,failed,open:Math.max(0,total-passed-failed)},
      policy:{
        simulationDoesNotMutateOperations:true,
        resultEvidenceHumanRecorded:true,
        failureRecoveryEvidenceRequired:true,
        syntheticPassesProhibited:true,
        prerequisiteOverrideRequiresReason:true,
        automaticRetryExecution:false,
        automaticFailureRecovery:false,
        automaticScenarioPass:false,
        autonomousProductionChanges:false
      }
    };
  }
  async start(organizationId,allowedLocationIds,locationId,input,actor){
    if(!this.allowed(locationId,allowedLocationIds))throw new Error("Location is outside your authorized scope.");
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant location not found.");
    if(loc.run?.status==="ACTIVE")throw new Error("An active peak-service stress run already exists.");
    const now=this.now();
    const record={
      id:`pss_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,status:"ACTIVE",
      mode:"CONTROLLED_REHEARSAL",startedAt:now,startedBy:actor,
      targetOccupancyPercent:Math.max(50,Math.min(Number(input.targetOccupancyPercent)||95,100)),
      reservationBurstCount:Math.max(1,Math.min(Number(input.reservationBurstCount)||25,500)),
      tableTurnMinutes:Math.max(10,Math.min(Number(input.tableTurnMinutes)||55,240)),
      simulatedLatencyMs:Math.max(0,Math.min(Number(input.simulatedLatencyMs)||1800,30000)),
      note:String(input.note||"").trim().slice(0,1000),
      baselineModel:loc.model,results:[]
    };
    await this.database.mutate(db=>{db.peakServiceStressRuns||=[];db.peakServiceStressRuns.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Peak-service controlled rehearsal started for ${locationId}`,category:"pilot_stress"});
    this.realtimeHub.publish("peak-service-stress:started",{id:record.id,organizationId,locationId});
    return record;
  }
  async recordResult(organizationId,allowedLocationIds,runId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.run?.id===runId);
    if(!loc||loc.run.status!=="ACTIVE")throw new Error("Active peak-service stress run not found.");
    const scenarioId=String(input.scenarioId||"").toUpperCase();
    const scenario=loc.scenarios.find(x=>x.id===scenarioId);
    if(!scenario)throw new Error("Unknown peak-service scenario.");
    const status=String(input.status||"").toUpperCase();
    if(!["PASS","FAIL"].includes(status))throw new Error("Scenario result must be PASS or FAIL.");
    const evidence=String(input.evidence||"").trim().slice(0,2200);
    if(!evidence)throw new Error("Human-recorded stress-test evidence is required.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1500);
    if(!scenario.prerequisitesPassed&&!overrideReason)throw new Error("Scenario prerequisites are open. A documented rehearsal override reason is required.");
    const recoveryEvidence=String(input.recoveryEvidence||"").trim().slice(0,2200);
    if(scenario.failure&&status==="PASS"&&!recoveryEvidence)throw new Error("Failure/reconnect scenario PASS requires human-recorded recovery evidence.");
    const now=this.now();
    const record={
      id:`psr_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      scenarioId,scenarioLabel:scenario.label,status,
      recordedAt:now,recordedBy:actor,evidence,recoveryEvidence:recoveryEvidence||null,
      overrideUsed:!scenario.prerequisitesPassed,overrideReason,
      prerequisiteSnapshot:{passed:scenario.prerequisites.filter(x=>x.passed).length,total:scenario.prerequisites.length,checks:scenario.prerequisites},
      observedLatencyMs:Math.max(0,Number(input.observedLatencyMs)||0),
      observedErrorCount:Math.max(0,Number(input.observedErrorCount)||0),
      observedDuplicateCount:Math.max(0,Number(input.observedDuplicateCount)||0),
      operationalMutationPerformed:false,
      syntheticPass:false
    };
    const updated=await this.database.mutate(db=>{
      const run=(db.peakServiceStressRuns||[]).find(x=>x.id===runId&&x.organizationId===organizationId);
      if(!run)return null;
      run.results||=[];run.results.push(record);
      const latest=new Map();
      for(const r of run.results)latest.set(r.scenarioId,r);
      if(this.scenarios.every(s=>latest.get(s.id)?.status==="PASS")){
        run.status="COMPLETED";run.completedAt=now;run.completedBy=actor;
      }
      return {...run};
    });
    if(!updated)throw new Error("Peak-service stress run not found.");
    await this.auditService.record({organizationId,actor,action:`Peak-service scenario ${scenarioId} recorded ${status} for ${updated.locationId}`,category:"pilot_stress"});
    this.realtimeHub.publish("peak-service-stress:result",{runId,organizationId,locationId:updated.locationId,scenarioId,status});
    return record;
  }
}
module.exports=PeakServiceStressTestService;
