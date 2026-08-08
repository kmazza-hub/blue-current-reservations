"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotDecisionLedgerService");
(async()=>{
  const state={},audit=[],events=[];
  const review={
    packet:{
      title:"Pilot Review",decision:"CONTINUE",confidence:"moderate",
      recommendation:{reason:"More evidence",nextAction:"Checkpoint"},
      evidence:{verifiedRealizedImpactDollars:500},
      successGates:[{name:"overall",passed:false}],exceptions:[],
      baselineVsCurrent:{readiness:{baseline:80,current:84}},
      locationReview:[{locationId:"a",locationName:"A"},{locationId:"b",locationName:"B"}]
    },
    proofProgram:{program:{id:"p1",name:"Pilot"}}
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>review}
  );
  let snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.latestDecision,null);
  let blocked=false;
  try{
    await svc.sign("org",["a","b"],{decision:"EXPAND",approver:"Owner",rolloutLocationIds:["a"]},"Tester");
  }catch(e){blocked=e.message.includes("conditions");}
  assert(blocked);
  const rec=await svc.sign("org",["a","b"],{
    decision:"EXPAND",approver:"Owner",conditions:"Executive accepts staged expansion risk.",
    followUp:"Review in 14 days.",rolloutLocationIds:["a"]
  },"Tester");
  assert.equal(rec.decision,"EXPAND");
  assert.equal(rec.acknowledgment.humanDecision,true);
  assert.equal(rec.acknowledgment.systemDidNotApprove,true);
  assert.equal(rec.acknowledgment.recommendationWasOverridden,true);
  assert.deepEqual(rec.rolloutLocationIds,["a"]);
  snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.latestDecision.id,rec.id);
  assert.equal(snap.policy.automaticExpansion,false);
  assert.equal(audit.length,1);
  assert.equal(events[0][0],"pilot-decision:signed");
  console.log(JSON.stringify({ok:true,version:"48.20.0",overrideGuard:true,humanSignature:true,rolloutScope:true,history:true,automaticApproval:false,automaticExpansion:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
