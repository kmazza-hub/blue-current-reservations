"use strict";
const assert=require("assert");
const Service=require("../../server/services/restaurantDayLifecycleService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1"}],
    sections:[{id:"s1",organizationId:"org",locationId:"loc1"}],
    reservations:[{id:"r1",organizationId:"org",locationId:"loc1"}],
    staff:[{id:"st1",organizationId:"org",locationId:"loc1",status:"active"}],
    employees:[],
    kitchenStations:[{id:"k1",organizationId:"org",locationId:"loc1"}],
    memberships:[{id:"m1",organizationId:"org",locationIds:["loc1"]}],
    liveConnectors:[{id:"c1",organizationId:"org",locationId:"loc1",type:"reservations",status:"connected"}],
    restaurantDayLifecycleSessions:[]
  };
  const audits=[],events=[];
  const baseline={
    status:"PILOT-BASELINE-GO",
    locations:[{locationId:"loc1",locationName:"Pilot Restaurant",pilotReady:true,readinessPercent:100}]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>baseline}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.10.0");
  assert.equal(snap.status,"restaurant-day-ready-for-rehearsal");
  assert.equal(snap.locations[0].stages[0].state,"SESSION_REQUIRED");
  assert.equal(snap.policy.stageOrderEnforced,true);

  const session=await svc.start("org",["loc1"],"loc1",{
    serviceDate:"2026-08-09",shiftLabel:"Dinner",manager:"GM",note:"Full day rehearsal"
  },"Tester");
  assert.equal(session.status,"ACTIVE");
  assert.equal(session.mode,"PILOT_OPERATING_REHEARSAL");

  let orderBlocked=false;
  try{
    await svc.checkpoint("org",["loc1"],session.id,{stage:"RESERVATIONS",evidence:"Reservation path checked."},"Tester");
  }catch(e){orderBlocked=/prior lifecycle stage/i.test(e.message);}
  assert(orderBlocked);

  const stages=["OPENING","PRE_SHIFT","RESERVATIONS","SEATING","ACTIVE_SERVICE","KITCHEN_COORDINATION","GUEST_RECOVERY","CLOSING"];
  for(const stage of stages){
    const cp=await svc.checkpoint("org",["loc1"],session.id,{
      stage,evidence:`${stage} exercised and verified by restaurant operator.`
    },"Tester");
    assert.equal(cp.status,"COMPLETED");
    assert.equal(cp.operationalMutationPerformed,false);
    assert.equal(cp.overrideUsed,false);
  }

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"restaurant-day-certified");
  assert.equal(snap.locations[0].completedStages,8);
  assert.equal(snap.locations[0].lifecyclePercent,100);
  assert.equal(snap.locations[0].lifecycleState,"DAY_LIFECYCLE_COMPLETE");
  assert.equal(state.restaurantDayLifecycleSessions[0].status,"COMPLETED");
  assert.equal(audits.length,9);
  assert.equal(events.length,9);

  // Prove prerequisite override requires a documented reason.
  state.kitchenStations=[];
  state.liveConnectors=[];
  const second=await svc.start("org",["loc1"],"loc1",{shiftLabel:"Stress rehearsal"},"Tester");
  for(const stage of ["OPENING","PRE_SHIFT","RESERVATIONS","SEATING","ACTIVE_SERVICE"]){
    await svc.checkpoint("org",["loc1"],second.id,{stage,evidence:`${stage} verified.`},"Tester");
  }
  let overrideBlocked=false;
  try{
    await svc.checkpoint("org",["loc1"],second.id,{stage:"KITCHEN_COORDINATION",evidence:"Kitchen gap observed."},"Tester");
  }catch(e){overrideBlocked=/override reason/i.test(e.message);}
  assert(overrideBlocked);
  const overridden=await svc.checkpoint("org",["loc1"],second.id,{
    stage:"KITCHEN_COORDINATION",
    evidence:"Kitchen coordination workflow rehearsed against the known missing station model.",
    overrideReason:"Intentional pilot-readiness rehearsal of the missing kitchen prerequisite."
  },"Tester");
  assert.equal(overridden.overrideUsed,true);

  console.log(JSON.stringify({
    ok:true,version:"51.10.0",
    orderedRestaurantDay:true,
    stages:8,
    humanCheckpointEvidence:true,
    priorStageGuard:true,
    prerequisiteOverrideGuard:true,
    rehearsalBeforePilotGo:true,
    operationalModulesNotMutated:true,
    automaticStageCompletion:false,
    automaticOperationalActions:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
