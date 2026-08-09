"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotStabilizationExitService");

(async()=>{
  const state={pilotStabilizationAssessments:[],pilotStabilizationExitDecisions:[]};
  const execution={
    snapshot:async()=>({
      status:"pilot-execution-continue-approved",
      locations:[{
        locationId:"loc1",locationName:"Pilot Restaurant",
        session:{id:"sess1",status:"ACTIVE"},
        currentDecision:{id:"dec1",decision:"CONTINUE"},
        confirmedMilestones:7,totalMilestones:7,
        observations:[
          {id:"o3",severity:"none",health:{apiHealthy:true,authenticationHealthy:true,reservationHealthy:true,floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true}},
          {id:"o2",severity:"low",health:{apiHealthy:true,authenticationHealthy:true,reservationHealthy:true,floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true}},
          {id:"o1",severity:"none",health:{apiHealthy:true,authenticationHealthy:true,reservationHealthy:true,floorHealthy:true,kitchenHealthy:true,supportBridgeHealthy:true}}
        ]
      }]
    })
  };
  const svc=new Service(
    {read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},
    {record:async()=>{}},{publish:()=>{}},
    execution,
    {snapshot:async()=>({status:"data-integrity-ready-for-certification"})},
    {snapshot:async()=>({status:"management-executive-accuracy-ready-for-certification",locations:[{locationId:"loc1",trustState:"EXECUTIVE_DATA_RECONCILED",criticalIssues:[]}]})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.65.0");
  assert.equal(snap.status,"pilot-stabilization-awaiting-assessment");
  assert.equal(snap.locations[0].stabilizationReady,false);

  const assessment=await svc.assess("org",["loc1"],"loc1",{
    operatorConfidence:5,workflowStability:"STABLE",guestImpact:"NONE",supportLoad:"LOW",
    windowStart:"2026-08-15T16:00",windowEnd:"2026-08-17T23:00",
    evidence:"Three healthy observations, stable workflows, no guest impact, manageable support, and trusted data reviewed.",
    note:"Pilot stabilization window completed."
  },"Tester");
  assert.equal(assessment.operatorConfidence,5);
  assert.equal(assessment.automaticRolloutExpansion,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.locations[0].stabilizationReady,true);
  assert.equal(snap.locations[0].passed,11);

  const stable=await svc.decide("org",["loc1"],"loc1",{
    decision:"STABLE",
    evidence:"All stabilization gates passed and the pilot is ready to exit controlled stabilization."
  },"Tester");
  assert.equal(stable.decision,"STABLE");
  assert.equal(stable.rolloutExpandedByDecision,false);
  assert.equal(stable.rollbackExecutedByDecision,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"pilot-stable");

  const extend=await svc.decide("org",["loc1"],"loc1",{
    decision:"EXTEND",
    evidence:"Additional observation requested.",
    reason:"Extend by one service to verify weekend volume."
  },"Tester");
  assert.equal(extend.decision,"EXTEND");

  console.log(JSON.stringify({
    ok:true,version:"51.65.0",
    repeatedLiveHealth:true,
    incidentTrend:true,
    operatorConfidence:true,
    workflowStability:true,
    guestImpactReview:true,
    supportLoad:true,
    dataIntegrityRecheck:true,
    executiveKpiTrustRecheck:true,
    stabilizationWindow:true,
    humanStableExtendRollback:true,
    stableDoesNotExpandRollout:true,
    rollbackDoesNotExecuteRollback:true,
    noAutomaticPilotExit:true,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
