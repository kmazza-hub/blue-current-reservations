"use strict";
const assert=require("assert");
const Service=require("../../server/services/managerOperatingRhythmService");

(async()=>{
  const state={managerShiftPlans:[],shiftHandoffs:[],managerShiftCloseouts:[]},audit=[],events=[];
  const db={read:async()=>state,mutate:async fn=>fn(state)};
  const svc=new Service(
    db,
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({readiness:{score:86}})},
    {snapshot:async()=>({opportunities:[
      {id:"o1",title:"Recover kitchen",category:"kitchen",owner:"KM",severity:"high",estimatedImpactDollars:500,nextAction:"Rebalance expo"},
      {id:"o2",title:"Assign tables",category:"reservations",owner:"Host",severity:"medium",estimatedImpactDollars:200,nextAction:"Pre-assign"}
    ]})},
    {list:async()=>({summary:{measuredOutcomes:1,realizationRatePercent:75,realizedImpactDollars:450},workspaces:[
      {id:"a1",title:"Recover kitchen",status:"in_progress"},
      {id:"a2",title:"Fix cost",status:"completed",outcomeMeasurement:{outcomeStatus:"improved"}}
    ]})},
    {snapshot:async()=>({summary:{modeledControllableContributionDollars:9000,modeledControllableMarginPercent:52},constraints:[{label:"Food-cost variance"}]})},
    {snapshot:async()=>({summary:{timeToConstraintMinutes:30,firstConstraint:"kitchen"},interventions:[{id:"i1",type:"kitchen-throughput",etaMinutes:30}]})}
  );

  let snap=await svc.snapshot("org","loc");
  assert.equal(snap.version,"47.30.0");
  assert.equal(snap.summary.rhythmScore,40);
  assert.equal(snap.policy.automaticExecution,false);

  const plan=await svc.createPlan("org","loc",{shift:"dinner",manager:"Keith"},"Tester");
  assert.equal(plan.priorities.length,2);
  assert.equal(state.managerShiftPlans.length,1);

  const handoff=await svc.createHandoff("org","loc",{shift:"closing",manager:"Keith"},"Tester");
  assert.equal(state.shiftHandoffs.length,1);
  assert.ok(handoff.needsAttention.length>=1);

  const closeout=await svc.closeout("org","loc",{shift:"dinner",manager:"Keith",note:"Good shift"},"Tester");
  assert.equal(state.managerShiftCloseouts.length,1);
  assert.equal(closeout.resultStatus,"closed-with-carryover");
  assert.equal(closeout.realizedImpactDollars,450);

  snap=await svc.snapshot("org","loc");
  assert.equal(snap.summary.rhythmScore,100);
  assert.equal(snap.latestPlan.id,plan.id);
  assert.equal(snap.latestHandoff.id,handoff.id);
  assert.equal(snap.latestCloseout.id,closeout.id);
  assert.ok(audit.length>=3);
  assert.ok(events.some(x=>x[0]==="manager-rhythm:plan-created"));
  assert.ok(events.some(x=>x[0]==="manager-rhythm:handoff-created"));
  assert.ok(events.some(x=>x[0]==="manager-rhythm:closeout-created"));

  console.log(JSON.stringify({
    ok:true,version:"47.30.0",
    planCreated:true,
    handoffCreated:true,
    closeoutCreated:true,
    finalRhythmScore:snap.summary.rhythmScore,
    closeoutStatus:closeout.resultStatus,
    realizedImpactDollars:closeout.realizedImpactDollars,
    continuousShiftRecord:snap.policy.continuousShiftRecord,
    humanOwned:snap.policy.humanOwned,
    automaticExecution:snap.policy.automaticExecution
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
