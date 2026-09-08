"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotLaunchControlService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant",status:"open"}],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1",name:"T1",seats:4,status:"available"}],
    sections:[{id:"s1",organizationId:"org",locationId:"loc1",name:"Main"}],
    memberships:[{id:"m1",organizationId:"org",userId:"u1",role:"owner",locationIds:["*"]}],
    liveConnectors:[{id:"c1",organizationId:"org",locationId:"loc1",type:"reservations",status:"connected"}],
    pilotLaunchControls:[],pilotLaunchAuthorizations:[]
  };
  const audits=[],events=[];
  const svc=new Service(
    {read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({locations:[{locationId:"loc1",certification:{status:"PILOT_DEPLOYMENT_CERTIFIED"}}]})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.55.0");
  assert.equal(snap.status,"pilot-launch-control-required");
  assert.equal(snap.locations[0].launchReady,false);

  const control=await svc.configure("org",["loc1"],"loc1",{
    launchOwner:"GM",
    launchWindowStart:"2026-08-15T16:00",
    launchWindowEnd:"2026-08-15T23:00",
    operatorRoster:[
      {id:"op1",name:"GM",role:"general manager",confirmed:true},
      {id:"op2",name:"Host Lead",role:"host",confirmed:true}
    ],
    supportChannel:"Pilot support bridge",
    supportOwner:"Blue Current Support",
    escalationOwner:"Technical Owner",
    blockers:[{id:"b1",severity:"medium",issue:"Final host tablet placement",status:"OPEN",owner:"GM"}],
    prelaunchEvidence:"Health/auth checks, floor configuration, operator access, support path, and rollback path reviewed.",
    note:"Controlled launch rehearsal."
  },"Tester");
  assert.equal(control.status,"PILOT_LAUNCH_CONTROL_CONFIGURED");
  assert.equal(control.runtimeStarted,false);
  assert.equal(control.goLivePerformed,false);
  assert(control.configurationFreeze.hash);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.locations[0].openBlockers.length,1);
  assert.equal(snap.locations[0].launchReady,false);

  let authorizationBlocked=false;
  try{
    await svc.authorize("org",["loc1"],"loc1",{evidence:"test",note:"test"},"Tester");
  }catch(e){authorizationBlocked=/all pilot launch-control gates/i.test(e.message);}
  assert(authorizationBlocked);

  const resolved=await svc.resolveBlocker("org",control.id,"b1",{resolution:"Host tablet placed, powered, logged in, and verified."},"Tester");
  assert.equal(resolved.status,"RESOLVED");

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"pilot-launch-ready-for-authorization");
  assert.equal(snap.locations[0].launchReady,true);
  assert.equal(snap.locations[0].passed,10);

  const auth=await svc.authorize("org",["loc1"],"loc1",{
    evidence:"Launch owner, roster, support bridge, frozen configuration, window, deployment certification, and zero blockers were verified.",
    note:"Human authorization to proceed with the controlled pilot window."
  },"Tester");
  assert.equal(auth.status,"PILOT_LAUNCH_AUTHORIZED");
  assert.equal(auth.runtimeStartedByAuthorization,false);
  assert.equal(auth.goLivePerformedByAuthorization,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"pilot-launch-authorized");

  // Configuration drift after freeze must reopen the gate.
  state.tables.push({id:"t2",organizationId:"org",locationId:"loc1",name:"T2",seats:4,status:"available"});
  const drifted=await svc.snapshot("org",["loc1"]);
  const drift=drifted.locations[0].checks.find(x=>x.id==="CONFIGURATION_UNCHANGED");
  assert.equal(drift.passed,false);

  console.log(JSON.stringify({
    ok:true,version:"51.55.0",
    pilotLocationSelection:true,
    configurationFreeze:true,
    configurationDriftDetection:true,
    prelaunchVerification:true,
    launchWindow:true,
    launchOwner:true,
    operatorRosterConfirmation:true,
    supportBridge:true,
    blockerResolutionEvidence:true,
    humanLaunchAuthorization:true,
    authorizationDoesNotStartRuntime:true,
    authorizationDoesNotPerformGoLive:true,
    automaticLaunch:false,
    automaticGoLive:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
