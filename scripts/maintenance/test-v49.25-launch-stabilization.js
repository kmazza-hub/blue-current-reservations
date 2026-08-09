"use strict";
const assert=require("assert");
const Service=require("../../server/services/launchStabilizationService");

(async()=>{
  const state={launchStabilizationObservations:[],launchStabilizationDeclarations:[]},audit=[],events=[];
  const command={
    locations:[{
      locationId:"a",locationName:"A",wave:1,
      result:{status:"CUTOVER_SUCCEEDED"}
    }]
  };
  let portfolio={
    locations:[{
      locationId:"a",locationName:"A",readinessScore:88,attentionLevel:"healthy",urgentPredictiveInterventions:0
    }]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>command},
    {snapshot:async()=>portfolio}
  );

  let snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.version,"49.25.0");
  assert.equal(snap.locations[0].stabilizationReady,false);
  assert.equal(snap.policy.autonomousRollback,false);

  const obs=await svc.observe("org",["a"],"a",{
    observationWindowHours:4,
    firstServiceVerified:true,
    severity:"none",
    apiHealthy:true,
    authenticationHealthy:true,
    reservationIntegrity:true,
    floorIntegrity:true,
    kitchenIntegrity:true,
    workforceIntegrity:true,
    note:"First live dinner service completed cleanly."
  },"Tester");

  assert.equal(obs.firstServiceVerified,true);
  assert.equal(obs.healthPassed,6);
  assert.equal(obs.severity,"none");

  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.locations[0].stabilizationReady,true);
  assert.equal(snap.locations[0].rollbackRecommendation,"NO_ROLLBACK_SIGNAL");

  const declaration=await svc.declare("org",["a"],"a",{decision:"STABLE",approver:"VP Ops"},"Tester");
  assert.equal(declaration.decision,"STABLE");
  assert.equal(declaration.executionState,"NO_AUTOMATIC_ACTION");

  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.status,"stabilization-complete");
  assert.equal(snap.locations[0].stabilizationState,"STABLE");

  portfolio={locations:[{locationId:"a",locationName:"A",readinessScore:60,attentionLevel:"critical",urgentPredictiveInterventions:2}]};
  const bad=await svc.observe("org",["a"],"a",{
    observationWindowHours:2,
    firstServiceVerified:true,
    severity:"critical",
    incident:"Authentication degradation during dinner.",
    apiHealthy:true,
    authenticationHealthy:false,
    reservationIntegrity:true,
    floorIntegrity:true,
    kitchenIntegrity:true,
    workforceIntegrity:true
  },"Tester");
  assert.equal(bad.severity,"critical");

  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.locations[0].rollbackRecommendation,"REVIEW_ROLLBACK");

  let rollbackBlocked=false;
  try{await svc.declare("org",["a"],"a",{decision:"ROLLBACK",approver:"VP Ops"},"Tester");}
  catch(e){rollbackBlocked=/documented human reason/i.test(e.message);}
  assert(rollbackBlocked);

  const rollback=await svc.declare("org",["a"],"a",{decision:"ROLLBACK",approver:"VP Ops",reason:"Critical auth degradation requires controlled rollback."},"Tester");
  assert.equal(rollback.executionState,"ROLLBACK_DECIDED_NOT_EXECUTED");

  assert.equal(audit.length,4);
  assert.equal(events.length,4);

  console.log(JSON.stringify({
    ok:true,version:"49.25.0",
    firstServiceVerification:true,
    cleanObservation:true,
    stableDeclaration:true,
    criticalIncidentSignal:true,
    rollbackRecommendation:true,
    rollbackDecisionRequiresReason:true,
    rollbackExecutionState:"ROLLBACK_DECIDED_NOT_EXECUTED",
    autonomousRollback:false,
    automaticStableDeclaration:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
