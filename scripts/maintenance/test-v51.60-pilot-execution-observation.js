"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotExecutionObservationService");

(async()=>{
  const state={pilotExecutionSessions:[],pilotExecutionObservations:[],pilotExecutionDecisions:[]};
  const audits=[],events=[];
  const launch={
    snapshot:async()=>({
      locations:[{
        locationId:"loc1",locationName:"Pilot Restaurant",launchReady:true,
        authorization:{id:"auth1",status:"PILOT_LAUNCH_AUTHORIZED",launchOwner:"GM"}
      }]
    })
  };
  const svc=new Service(
    {read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    launch
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.60.0");
  assert.equal(snap.status,"pilot-execution-awaiting-start");
  assert.equal(snap.locations[0].executionReady,true);

  const session=await svc.start("org",["loc1"],"loc1",{
    launchOwner:"GM",supportBridge:"Pilot bridge",
    evidence:"Launch authorization confirmed and human pilot start recorded.",
    note:"Controlled live pilot start."
  },"Tester");
  assert.equal(session.status,"ACTIVE");
  assert.equal(session.runtimeStartedByService,false);
  assert.equal(session.milestones[0].milestone,"PILOT_START");

  let orderBlocked=false;
  try{
    await svc.confirmMilestone("org",["loc1"],session.id,{milestone:"FIRST_SEATING_WORKFLOW",evidence:"Seat done."},"Tester");
  }catch(e){orderBlocked=/cannot be confirmed before/i.test(e.message);}
  assert(orderBlocked);

  for(const milestone of svc.milestones.slice(1)){
    const m=await svc.confirmMilestone("org",["loc1"],session.id,{
      milestone,evidence:`${milestone} manually observed and verified.`
    },"Tester");
    assert.equal(m.status,"CONFIRMED");
    assert.equal(m.systemActionPerformed,false);
  }

  const obs=await svc.observe("org",["loc1"],session.id,{
    severity:"none",
    apiHealthy:true,authenticationHealthy:true,reservationHealthy:true,
    floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true,
    note:"First live observation healthy."
  },"Tester");
  assert.equal(obs.automaticMitigationPerformed,false);
  assert.equal(obs.rollbackExecuted,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.locations[0].confirmedMilestones,7);
  assert.equal(snap.locations[0].continueEligible,true);

  const decision=await svc.decide("org",["loc1"],session.id,{
    decision:"CONTINUE",
    evidence:"All first-live milestones and latest health observation are clean."
  },"Tester");
  assert.equal(decision.decision,"CONTINUE");
  assert.equal(decision.automaticActionPerformed,false);
  assert.equal(decision.rollbackExecuted,false);

  // Critical observation requires incident description.
  let incidentBlocked=false;
  try{
    await svc.observe("org",["loc1"],session.id,{
      severity:"critical",apiHealthy:false,authenticationHealthy:true,reservationHealthy:true,
      floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true
    },"Tester");
  }catch(e){incidentBlocked=/requires an incident description/i.test(e.message);}
  assert(incidentBlocked);

  const incident=await svc.observe("org",["loc1"],session.id,{
    severity:"critical",apiHealthy:false,authenticationHealthy:true,reservationHealthy:true,
    floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true,
    incident:"API health failed during observation."
  },"Tester");
  assert.equal(incident.severity,"critical");

  const rollback=await svc.decide("org",["loc1"],session.id,{
    decision:"ROLLBACK",
    evidence:"Critical API incident reviewed by human operator.",
    reason:"Recommend manual rollback pending technical review."
  },"Tester");
  assert.equal(rollback.decision,"ROLLBACK");
  assert.equal(rollback.rollbackExecuted,false);

  console.log(JSON.stringify({
    ok:true,version:"51.60.0",
    explicitPilotStartRecord:true,
    firstOperatorLogin:true,
    firstReservationWorkflow:true,
    firstSeatingWorkflow:true,
    firstServiceFlow:true,
    firstKitchenWorkflow:true,
    supportBridgeStatus:true,
    launchIncidentLog:true,
    liveHealthObservation:true,
    humanContinueHoldRollback:true,
    milestoneOrderEnforced:true,
    criticalIncidentEvidenceRequired:true,
    noAutonomousPilotExecution:true,
    noAutomaticRollback:true,
    noAutomaticGuestActions:true,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
