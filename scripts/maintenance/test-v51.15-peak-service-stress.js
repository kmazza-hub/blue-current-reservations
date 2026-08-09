"use strict";
const assert=require("assert");
const Service=require("../../server/services/peakServiceStressTestService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant",capacity:120}],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1",seats:4},{id:"t2",organizationId:"org",locationId:"loc1",seats:4}],
    reservations:[{id:"r1",organizationId:"org",locationId:"loc1"}],
    staff:[{id:"st1",organizationId:"org",locationId:"loc1",status:"active"}],
    employees:[],
    kitchenStations:[{id:"k1",organizationId:"org",locationId:"loc1"}],
    liveConnectors:[{id:"c1",organizationId:"org",locationId:"loc1",type:"reservations",status:"connected"}],
    peakServiceStressRuns:[]
  };
  const audits=[],events=[];
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({locations:[{locationId:"loc1",lifecycleState:"DAY_LIFECYCLE_COMPLETE"}]})},
    {snapshot:async()=>({locations:[{locationId:"loc1",pilotReady:true}]})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.15.0");
  assert.equal(snap.status,"peak-service-stress-ready");
  assert.equal(snap.locations[0].scenarios.length,10);
  assert.equal(snap.policy.syntheticPassesProhibited,true);

  const run=await svc.start("org",["loc1"],"loc1",{
    targetOccupancyPercent:97,
    reservationBurstCount:40,
    tableTurnMinutes:48,
    simulatedLatencyMs:2400
  },"Tester");
  assert.equal(run.status,"ACTIVE");
  assert.equal(run.mode,"CONTROLLED_REHEARSAL");

  const failureScenarios=new Set(["DELAYED_REQUESTS","API_FAILURE","CONNECTOR_FAILURE","RECONNECT_RETRY","PARTIAL_DEGRADATION_RECOVERY"]);
  for(const scenario of svc.scenarios){
    let missingRecoveryBlocked=false;
    if(failureScenarios.has(scenario.id)){
      try{
        await svc.recordResult("org",["loc1"],run.id,{
          scenarioId:scenario.id,status:"PASS",evidence:"Observed controlled failure behavior."
        },"Tester");
      }catch(e){missingRecoveryBlocked=/recovery evidence/i.test(e.message);}
      assert(missingRecoveryBlocked);
    }

    const result=await svc.recordResult("org",["loc1"],run.id,{
      scenarioId:scenario.id,
      status:"PASS",
      evidence:`${scenario.label} exercised under controlled peak-service conditions.`,
      recoveryEvidence:failureScenarios.has(scenario.id)?"System returned to expected operating state after human-controlled retry/recovery verification.":"",
      observedLatencyMs:scenario.id==="DELAYED_REQUESTS"?2400:180,
      observedErrorCount:scenario.id==="API_FAILURE"?3:0,
      observedDuplicateCount:0
    },"Tester");
    assert.equal(result.status,"PASS");
    assert.equal(result.syntheticPass,false);
    assert.equal(result.operationalMutationPerformed,false);
  }

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"peak-service-stress-certified");
  assert.equal(snap.locations[0].passed,10);
  assert.equal(snap.locations[0].stressPercent,100);
  assert.equal(state.peakServiceStressRuns[0].status,"COMPLETED");
  assert.equal(audits.length,11);
  assert.equal(events.length,11);

  // Missing connector prerequisite must require a documented rehearsal override.
  state.liveConnectors=[];
  const run2=await svc.start("org",["loc1"],"loc1",{},"Tester");
  let blocked=false;
  try{
    await svc.recordResult("org",["loc1"],run2.id,{
      scenarioId:"CONNECTOR_FAILURE",status:"FAIL",evidence:"No connector available to exercise."
    },"Tester");
  }catch(e){blocked=/override reason/i.test(e.message);}
  assert(blocked);

  const override=await svc.recordResult("org",["loc1"],run2.id,{
    scenarioId:"CONNECTOR_FAILURE",status:"FAIL",
    evidence:"Known connector absence captured as an intentional stress-readiness finding.",
    overrideReason:"Controlled readiness rehearsal of missing dependency."
  },"Tester");
  assert.equal(override.overrideUsed,true);

  console.log(JSON.stringify({
    ok:true,version:"51.15.0",
    scenarios:10,
    reservationBurst:true,
    occupancyPressure:true,
    rapidTurns:true,
    staffChange:true,
    kitchenPressure:true,
    delayedRequests:true,
    apiFailure:true,
    connectorFailure:true,
    reconnectRetry:true,
    partialDegradationRecovery:true,
    failureRecoveryEvidenceRequired:true,
    syntheticPassesProhibited:true,
    operationalMutationPerformed:false,
    automaticRetryExecution:false,
    automaticFailureRecovery:false,
    automaticScenarioPass:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
