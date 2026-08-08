"use strict";
const assert=require("assert");
const Service=require("../../server/services/predictiveShiftControlService");

(async()=>{
  const now=Date.now(),state={
    tables:[
      {organizationId:"org",locationId:"loc",status:"seated",seats:4,partySize:4},
      {organizationId:"org",locationId:"loc",status:"seated",seats:4,partySize:4},
      {organizationId:"org",locationId:"loc",status:"available",seats:2},
      {organizationId:"org",locationId:"loc",status:"cleaning",seats:6},
      {organizationId:"org",locationId:"loc",status:"blocked",seats:4}
    ],
    reservations:[
      {organizationId:"org",locationId:"loc",status:"confirmed",partySize:8,tableId:null},
      {organizationId:"org",locationId:"loc",status:"confirmed",partySize:6,tableId:null},
      {organizationId:"org",locationId:"loc",status:"arrived",partySize:4,tableId:null}
    ],
    waitlist:[
      {organizationId:"org",locationId:"loc",status:"waiting",partySize:6,quotedMinutes:35},
      {organizationId:"org",locationId:"loc",status:"waiting",partySize:4,quotedMinutes:30}
    ],
    kitchenTickets:[
      {id:"t1",organizationId:"org",locationId:"loc",status:"cooking",createdAt:new Date(now-45*60000).toISOString(),targetMinutes:18,items:[{qty:5},{qty:4}]},
      {id:"t2",organizationId:"org",locationId:"loc",status:"ready",createdAt:new Date(now-38*60000).toISOString(),targetMinutes:16,items:[{qty:6}]},
      {id:"t3",organizationId:"org",locationId:"loc",status:"plating",createdAt:new Date(now-32*60000).toISOString(),targetMinutes:17,items:[{qty:5}]},
      {id:"t4",organizationId:"org",locationId:"loc",status:"received",createdAt:new Date(now-29*60000).toISOString(),targetMinutes:15,items:[{qty:4}]}
    ],
    kitchenStations:[
      {organizationId:"org",locationId:"loc",status:"active"},
      {organizationId:"org",locationId:"loc",status:"offline"}
    ],
    predictiveShiftDecisions:[]
  };
  const audit=[],events=[];
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({business:{averageCheck:42},operation:{}})},
    {snapshot:async()=>({summary:{laborPercent:19,targetLaborPercent:18,calloutRisk:1},roleCoverage:[
      {role:"server",scheduled:1,required:4},
      {role:"cook",scheduled:1,required:3},
      {role:"host",scheduled:0,required:2}
    ]})},
    {snapshot:async()=>({summary:{revenueTrend:-6,modeledLeakageDollars:1800,averageCheck:42}})}
  );

  const snap=await svc.snapshot("org","loc");
  assert.equal(snap.version,"47.25.0");
  assert.equal(snap.methodology.machineLearning,false);
  assert.equal(snap.policy.humanApprovalRequired,true);
  assert.equal(snap.policy.automaticExecution,false);
  assert.deepEqual(snap.forecast.map(x=>x.minutes),[0,15,30,45,60,90]);
  assert.ok(snap.summary.timeToConstraintMinutes!==null);
  assert.ok(snap.interventions.some(x=>x.type==="host-table-capacity"));
  assert.ok(snap.interventions.some(x=>x.type==="kitchen-throughput"));
  assert.ok(snap.interventions.some(x=>x.type==="labor-capacity"));
  assert.ok(snap.interventions.every(x=>x.requiresApproval===true&&x.automaticExecution===false));

  const first=snap.interventions[0];
  const decision=await svc.decide("org","loc",first.id,{decision:"accepted",owner:"GM",note:"Pre-position now"},"Tester");
  assert.equal(decision.decision,"accepted");
  assert.equal(state.predictiveShiftDecisions.length,1);
  assert.equal(audit.length,1);
  assert.equal(events[0][0],"predictive-shift:decision");

  const after=await svc.snapshot("org","loc");
  assert.equal(after.interventions.find(x=>x.id===first.id).lastDecision.decision,"accepted");

  console.log(JSON.stringify({
    ok:true,version:snap.version,
    forecastHorizons:snap.forecast.map(x=>x.minutes),
    firstConstraint:snap.summary.firstConstraint,
    timeToConstraintMinutes:snap.summary.timeToConstraintMinutes,
    peakOverallPressure:snap.summary.peakOverallPressure,
    interventions:snap.interventions.map(x=>x.type),
    decisionPersisted:true,
    transparentHeuristic:true,
    humanApprovalRequired:true,
    automaticExecution:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
