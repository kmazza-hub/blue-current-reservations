"use strict";
const assert=require("assert");
const Service=require("../../server/services/technicalActivationReadinessService");

(async()=>{
  const state={
    users:[{id:"u1",organizationId:"org",status:"active"}],
    memberships:[{organizationId:"org",userId:"u1",locationIds:["a","b"]}],
    configurations:[{id:"cfg_a",locationId:"a"}],
    tables:[{organizationId:"org",locationId:"a"}],
    sections:[{organizationId:"org",locationId:"a"}],
    reservations:[{organizationId:"org",locationId:"a"}],
    staff:[{organizationId:"org",locationId:"a",status:"active"}],
    employees:[],
    kitchenStations:[{organizationId:"org",locationId:"a"}],
    liveConnectors:[
      {organizationId:"org",type:"reservations",status:"not-configured"},
      {organizationId:"org",type:"kitchen",status:"not-configured"},
      {organizationId:"org",type:"labor",status:"not-configured"}
    ],
    technicalGoLiveAuthorizations:[]
  };
  const audit=[],events=[];
  const activation={
    plan:{id:"plan1",readinessFloor:75},
    locations:[
      {locationId:"a",locationName:"A",wave:1,preflightPassed:true,activationControlState:"APPROVED_NOT_DEPLOYED",approval:{status:"APPROVED_FOR_ACTIVATION",overrideUsed:false}},
      {locationId:"b",locationName:"B",wave:2,preflightPassed:false,activationControlState:"APPROVED_NOT_DEPLOYED",approval:{status:"APPROVED_FOR_ACTIVATION",overrideUsed:true}}
    ]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>activation}
  );

  let snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.version,"49.10.0");
  const a=snap.locations.find(x=>x.locationId==="a");
  const b=snap.locations.find(x=>x.locationId==="b");
  assert.equal(a.technicallyReady,true);
  assert.equal(a.requiredPassed,a.requiredTotal);
  assert.equal(a.productionCutoverState,"NOT_PERFORMED");
  assert.equal(b.technicallyReady,false);
  assert.ok(b.blockers.length>=4);
  assert.equal(snap.policy.automaticCutover,false);
  assert.equal(snap.policy.authorizationDoesNotDeploy,true);

  const authA=await svc.authorize("org",["a","b"],"a",{approver:"CTO",launchWindow:"Monday 09:00",rollbackOwner:"Ops"},"Tester");
  assert.equal(authA.status,"AUTHORIZED_FOR_GO_LIVE");
  assert.equal(authA.productionCutoverState,"NOT_PERFORMED");
  assert.equal(authA.overrideUsed,false);

  let blocked=false;
  try{await svc.authorize("org",["a","b"],"b",{approver:"CTO"},"Tester");}
  catch(e){blocked=/override reason/i.test(e.message);}
  assert(blocked);

  const authB=await svc.authorize("org",["a","b"],"b",{approver:"CTO",overrideReason:"Executive accepts missing demo configuration for staged technical rehearsal."},"Tester");
  assert.equal(authB.overrideUsed,true);
  assert.equal(authB.productionCutoverState,"NOT_PERFORMED");

  snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.authorizationHistory.length,2);
  assert.equal(snap.locations.find(x=>x.locationId==="a").goLiveState,"AUTHORIZED_NOT_CUT_OVER");

  const packet=svc.packet(snap,"a");
  assert.equal(packet.productionCutoverState,"NOT_PERFORMED");
  assert.equal(packet.technicallyReady,true);
  assert.equal(audit.length,2);
  assert.equal(events.length,2);

  console.log(JSON.stringify({
    ok:true,version:"49.10.0",
    technicalChecks:true,
    blockerDetection:true,
    technicalPacket:true,
    goLiveAuthorization:true,
    blockerOverrideGuard:true,
    productionCutoverState:"NOT_PERFORMED",
    automaticProvisioning:false,
    automaticCutover:false,
    automaticGoLive:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
