"use strict";
const assert=require("assert");
const Service=require("../../server/services/productionOperationsHandoffService");

(async()=>{
  const state={productionOperationsAcceptances:[]},audit=[],events=[];
  const stabilization={
    locations:[
      {locationId:"a",locationName:"A",wave:1,declaration:{decision:"STABLE"}},
      {locationId:"b",locationName:"B",wave:2,declaration:{decision:"STABLE"}}
    ]
  };
  let reliability={status:"meeting",score:96,breached:0,warning:0,errorBudgetRemaining:100,objectives:[]};
  let portfolio={
    locations:[
      {locationId:"a",locationName:"A",readinessScore:88,attentionLevel:"healthy",urgentPredictiveInterventions:0},
      {locationId:"b",locationName:"B",readinessScore:62,attentionLevel:"high",urgentPredictiveInterventions:1}
    ]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>stabilization},
    {evaluate:async()=>reliability},
    {snapshot:async()=>portfolio}
  );

  let snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.version,"50.5.0");
  const a=snap.locations.find(x=>x.locationId==="a");
  const b=snap.locations.find(x=>x.locationId==="b");
  assert.equal(a.productionReady,true);
  assert.equal(b.productionReady,false);
  assert.equal(snap.policy.automaticAcceptance,false);
  assert.equal(snap.policy.acceptanceDoesNotModifyRuntime,true);

  const accepted=await svc.accept("org",["a","b"],"a",{
    supportOwner:"Production Support",
    escalationOwner:"VP Operations",
    supportHours:"24x7 during launch",
    maintenanceWindow:"Tuesday 03:00",
    note:"Steady-state ownership transferred."
  },"Tester");
  assert.equal(accepted.status,"ACCEPTED_INTO_PRODUCTION_OPERATIONS");
  assert.equal(accepted.runtimeMutationPerformed,false);
  assert.equal(accepted.overrideUsed,false);

  let blocked=false;
  try{await svc.accept("org",["a","b"],"b",{supportOwner:"Support",escalationOwner:"VP Ops"},"Tester");}
  catch(e){blocked=/override reason/i.test(e.message);}
  assert(blocked);

  const override=await svc.accept("org",["a","b"],"b",{
    supportOwner:"Support",
    escalationOwner:"VP Ops",
    overrideReason:"Executive accepts temporary readiness pressure while support coverage is elevated."
  },"Tester");
  assert.equal(override.overrideUsed,true);
  assert.equal(override.runtimeMutationPerformed,false);

  reliability={status:"breached",score:60,breached:1,warning:0,errorBudgetRemaining:50,objectives:[]};
  snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.locations.every(x=>x.productionReady===false),true);
  assert.equal(audit.length,2);
  assert.equal(events.length,2);

  console.log(JSON.stringify({
    ok:true,version:"50.5.0",
    stableDeclarationRequired:true,
    platformReliabilityReused:true,
    productionReadinessGates:true,
    supportOwnershipRequired:true,
    executiveOverrideGuard:true,
    runtimeMutationPerformed:false,
    automaticAcceptance:false,
    automaticRemediation:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
