"use strict";
const assert=require("assert");
const Service=require("../../server/services/hospitalityActionWorkspaceService");

(async()=>{
  const state={hospitalityActionWorkspaces:[]},audit=[],events=[];
  let opportunity={id:"perf_test",category:"revenue",title:"Close revenue gap",why:"Gap",nextAction:"Act",owner:"GM",severity:"high",score:90,estimatedImpactDollars:1000,impactLabel:"$1,000 gap",confidence:90,metadata:{gap:1000}};
  const performance={snapshot:async()=>({opportunities:opportunity?[opportunity]:[]})};
  const svc=new Service({read:async()=>state,mutate:async fn=>fn(state)},{record:async x=>audit.push(x)},{publish:(n,p)=>events.push([n,p])},performance);
  const ws=await svc.createFromOpportunity("org","loc",opportunity,{owner:"Keith"},"Tester");
  await svc.update("org","loc",ws.id,{status:"in_progress",note:"Started"},"Tester");
  opportunity={...opportunity,estimatedImpactDollars:400};
  const partial=await svc.update("org","loc",ws.id,{status:"completed",note:"Done"},"Tester");
  assert.equal(partial.outcomeMeasurement.outcomeStatus,"partial");
  assert.equal(partial.outcomeMeasurement.realizedImpactDollars,600);
  assert.equal(partial.outcomeMeasurement.realizationRatePercent,60);
  assert.equal(partial.outcomeMeasurement.targetMet,false);

  opportunity=null;
  const improved=await svc.remeasure("org","loc",ws.id,"Tester");
  assert.equal(improved.outcomeMeasurement.outcomeStatus,"improved");
  assert.equal(improved.outcomeMeasurement.realizedImpactDollars,1000);
  assert.equal(improved.outcomeMeasurement.realizationRatePercent,100);
  assert.equal(improved.outcomeMeasurement.targetMet,true);

  const list=await svc.list("org","loc");
  assert.equal(list.summary.measuredOutcomes,1);
  assert.equal(list.summary.realizedImpactDollars,1000);
  assert.equal(list.summary.realizationRatePercent,100);
  assert.equal(list.policy.completionDoesNotImplySuccess,true);
  console.log(JSON.stringify({ok:true,version:"47.15.0",partialOutcomeMeasured:true,partialRealizedImpact:600,remeasuredOutcome:improved.outcomeMeasurement.outcomeStatus,realizedImpactDollars:list.summary.realizedImpactDollars,realizationRatePercent:list.summary.realizationRatePercent,completionDoesNotImplySuccess:list.policy.completionDoesNotImplySuccess,auditEvents:audit.length,realtimeEvents:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
