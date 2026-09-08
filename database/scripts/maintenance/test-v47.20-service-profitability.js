"use strict";
const assert=require("assert");
const Service=require("../../server/services/serviceProfitabilityIntelligenceService");

(async()=>{
  const now=Date.now(),state={
    tables:[
      {organizationId:"org",locationId:"loc",status:"seated",seats:4},
      {organizationId:"org",locationId:"loc",status:"cleaning",seats:4},
      {organizationId:"org",locationId:"loc",status:"blocked",seats:2}
    ],
    serviceFlows:[{organizationId:"org",locationId:"loc",ticketId:"t1",partySize:4}],
    kitchenTickets:[{id:"t1",organizationId:"org",locationId:"loc",status:"cooking",createdAt:new Date(now-35*60000).toISOString(),targetMinutes:18}],
    waitlist:[{organizationId:"org",locationId:"loc",status:"waiting",partySize:4,quotedMinutes:30}],
    reservations:[{organizationId:"org",locationId:"loc",status:"confirmed",partySize:6,tableId:null}],
    configurations:[{locationId:"loc",waitThreshold:20,revenueTarget:12000}],
    profitSnapshots:[]
  };
  const audit=[],events=[];
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({business:{forecastRevenue:10000,averageCheck:40},operation:{covers:250,projectedLabor:2100}})},
    {snapshot:async()=>({summary:{projectedLabor:2100,targetLaborPercent:18,salesForecast:10000}})},
    {snapshot:async()=>({summary:{actualFoodCost:34,targetFoodCostPercent:29,wasteCost:80}})},
    {snapshot:async()=>({summary:{atRiskGuests:2,recoverableRevenue:500}})},
    {snapshot:async()=>({locations:[{locationId:"loc",revenueTrend:-5}]})}
  );
  const snap=await svc.snapshot("org","loc");
  assert.equal(snap.version,"47.20.0");
  assert.equal(snap.summary.salesForecast,10000);
  assert.equal(snap.summary.modeledFoodCostDollars,3400);
  assert.equal(snap.summary.projectedLaborDollars,2100);
  assert.equal(snap.summary.modeledControllableContributionDollars,4420);
  assert.equal(snap.summary.modeledControllableMarginPercent,44.2);
  assert.ok(snap.summary.modeledLeakageDollars>0);
  assert.equal(snap.constraints[0].label,"Revenue target gap");
  assert.ok(snap.constraints.some(x=>x.id==="profit_food_cost"&&x.modeledLeakageDollars===500));
  assert.ok(snap.constraints.some(x=>x.id==="profit_labor"&&x.modeledLeakageDollars===300));
  assert.ok(snap.constraints.some(x=>x.id==="profit_kitchen"));
  assert.ok(snap.constraints.some(x=>x.id==="profit_waitlist"));
  assert.equal(snap.methodology.caveat.includes("not GAAP"),true);
  const record=await svc.capture("org","loc","Tester");
  assert.equal(state.profitSnapshots.length,1);
  assert.equal(record.summary.salesForecast,10000);
  assert.equal(audit.length,1);
  assert.equal(events[0][0],"service-profitability:snapshot");
  console.log(JSON.stringify({
    ok:true,version:snap.version,
    salesForecast:snap.summary.salesForecast,
    controllableContribution:snap.summary.modeledControllableContributionDollars,
    controllableMarginPercent:snap.summary.modeledControllableMarginPercent,
    modeledLeakage:snap.summary.modeledLeakageDollars,
    topConstraint:snap.constraints[0].label,
    constraintCount:snap.constraints.length,
    snapshotPersisted:state.profitSnapshots.length===1,
    gaapClaimed:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
