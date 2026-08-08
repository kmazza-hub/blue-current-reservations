"use strict";
const assert=require("assert");
const HospitalityPerformanceService=require("../../server/services/hospitalityPerformanceService");

(async()=>{
  const now=Date.now(),dbState={
    reservations:[
      {id:"r1",organizationId:"org",locationId:"loc",partySize:4,status:"confirmed",tableId:null},
      {id:"r2",organizationId:"org",locationId:"loc",partySize:2,status:"confirmed",tableId:null}
    ],
    waitlist:[{id:"w1",organizationId:"org",locationId:"loc",partySize:3,quotedMinutes:30,status:"waiting"}],
    kitchenTickets:[{id:"k1",organizationId:"org",locationId:"loc",status:"open",createdAt:new Date(now-35*60000).toISOString(),targetMinutes:18}],
    hospitalityPerformanceDecisions:[]
  };
  const database={
    read:async()=>dbState,
    mutate:async fn=>fn(dbState)
  };
  const audit=[];
  const service=new HospitalityPerformanceService(
    database,
    {record:async x=>audit.push(x)},
    {publish:()=>{}},
    {snapshot:async()=>({readiness:{score:88},business:{forecastRevenue:20000}})},
    {snapshot:async()=>({summary:{laborPercent:20},recommendations:[{id:"wf_trim_labor",severity:"medium",title:"Trim late labor",action:"Release one closer",reason:"Projected labor is above target.",impact:"Save $210"}]})},
    {snapshot:async()=>({recommendations:[{id:"inv_food_cost_gap",severity:"high",type:"margin",title:"Close the food-cost variance",reason:"Food cost is above target.",impact:"Recover about $448 per $22.4k sales day."}]})},
    {snapshot:async()=>({summary:{atRiskGuests:3,recoverableRevenue:900}})},
    {snapshot:async()=>({portfolio:{revenueTrend:-2.4},locations:[{locationId:"loc",occupancy:62,revenueTrend:-6,yesterdayRevenue:12000,revenue:11200}]})}
  );

  const snap=await service.snapshot("org","loc");
  assert.equal(snap.version,"47.5.0");
  assert.equal(snap.policy.humanDecisionRequired,true);
  assert.equal(snap.policy.automaticExecution,false);
  assert.ok(snap.opportunities.length>=6);
  assert.equal(snap.opportunities[0].rank,1);
  assert.ok(snap.opportunities.every((x,i)=>x.rank===i+1));
  assert.ok(snap.opportunities.some(x=>x.category==="kitchen"));
  assert.ok(snap.opportunities.some(x=>x.category==="reservations"));
  assert.ok(snap.opportunities.some(x=>x.category==="labor"));
  assert.ok(snap.opportunities.some(x=>x.category==="inventory"));
  assert.ok(snap.opportunities.some(x=>x.category==="guests"));
  assert.ok(snap.opportunities.some(x=>x.category==="revenue"));
  assert.ok(snap.summary.totalEstimatedImpactDollars>0);

  const chosen=snap.opportunities[0];
  const decision=await service.decide("org","loc",chosen.id,{decision:"accepted",owner:"GM","note":"Own before service"},"Tester");
  assert.equal(decision.decision,"accepted");
  assert.equal(decision.owner,"GM");
  assert.equal(dbState.hospitalityPerformanceDecisions.length,1);
  assert.equal(audit.length,1);

  const after=await service.snapshot("org","loc");
  assert.equal(after.opportunities.find(x=>x.id===chosen.id).lastDecision.decision,"accepted");

  console.log(JSON.stringify({
    ok:true,version:snap.version,
    opportunities:snap.opportunities.length,
    categories:[...new Set(snap.opportunities.map(x=>x.category))],
    topOpportunity:snap.opportunities[0].title,
    totalEstimatedImpactDollars:snap.summary.totalEstimatedImpactDollars,
    decisionTrailPersisted:after.opportunities.find(x=>x.id===chosen.id).lastDecision.decision,
    humanDecisionRequired:snap.policy.humanDecisionRequired,
    automaticExecution:snap.policy.automaticExecution
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
