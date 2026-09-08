"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotValueScorecardService");

(async()=>{
  const state={pilotValuePrograms:[]},audit=[],events=[];
  let portfolio={
    portfolio:{locations:2,totalControllableContributionDollars:20000,totalModeledLeakageDollars:4000,totalRealizedImpactDollars:0,activeActions:3,urgentPredictiveInterventions:2,averageReadiness:80,averageRhythmScore:50},
    locations:[{locationId:"a",locationName:"A"},{locationId:"b",locationName:"B"}]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>portfolio}
  );
  let snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.status,"baseline-required");
  assert.equal(snap.policy.automaticAttribution,false);

  const program=await svc.start("org",["*"],{name:"Pilot",sponsor:"Owner",pilotDays:30,readinessLiftPoints:5,rhythmLiftPoints:20,leakageReductionPercent:10,realizationRatePercent:60},"Tester");
  assert.equal(program.baseline.metrics.averageReadiness,80);
  assert.equal(state.pilotValuePrograms.length,1);

  portfolio={
    portfolio:{locations:2,totalControllableContributionDollars:21500,totalModeledLeakageDollars:3200,totalRealizedImpactDollars:900,activeActions:2,urgentPredictiveInterventions:1,averageReadiness:86,averageRhythmScore:72},
    locations:[{locationId:"a",locationName:"A"},{locationId:"b",locationName:"B"}]
  };
  snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.status,"pilot-active");
  assert.equal(snap.evidence.readinessDeltaPoints,6);
  assert.equal(snap.evidence.rhythmDeltaPoints,22);
  assert.equal(snap.evidence.modeledLeakageReductionDollars,800);
  assert.equal(snap.evidence.modeledLeakageReductionPercent,20);
  assert.equal(snap.evidence.controllableContributionDeltaDollars,1500);
  assert.equal(snap.evidence.verifiedRealizedImpactDollars,900);
  assert.equal(snap.evidence.attribution.observedButNotAttributed.includes("controllable contribution delta"),true);
  assert.equal(snap.policy.counterfactualClaims,false);

  const cp=await svc.checkpoint("org",["*"],{note:"Mid-pilot"},"Tester");
  assert.equal(cp.evidence.verifiedRealizedImpactDollars,900);
  assert.equal(state.pilotValuePrograms[0].checkpoints.length,1);
  assert.equal(audit.length,2);
  assert.ok(events.some(x=>x[0]==="pilot-value:started"));
  assert.ok(events.some(x=>x[0]==="pilot-value:checkpoint"));

  console.log(JSON.stringify({
    ok:true,version:"48.5.0",
    baselineCaptured:true,
    readinessLift:snap.evidence.readinessDeltaPoints,
    rhythmLift:snap.evidence.rhythmDeltaPoints,
    modeledLeakageReductionDollars:snap.evidence.modeledLeakageReductionDollars,
    verifiedRealizedImpactDollars:snap.evidence.verifiedRealizedImpactDollars,
    automaticAttribution:snap.policy.automaticAttribution,
    counterfactualClaims:snap.policy.counterfactualClaims,
    checkpointPersisted:true
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
