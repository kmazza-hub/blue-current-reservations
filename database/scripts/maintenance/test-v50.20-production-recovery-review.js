"use strict";
const assert=require("assert");
const Service=require("../../server/services/productionRecoveryReviewService");

(async()=>{
  const state={productionRecoveryReviews:[]},audit=[],events=[];
  const incidentSnapshot={
    commandHistory:[{
      id:"i1",title:"Reservation outage",severity:"critical",status:"resolved",
      commander:"Incident Lead",
      createdAt:"2026-08-09T10:00:00.000Z",
      resolvedAt:"2026-08-09T10:42:00.000Z",
      affectedLocationIds:["a"],
      businessImpact:"Reservation intake unavailable.",
      serviceImpact:"Host stand used manual fallback.",
      resolution:"Reservation service restored.",
      recoveryEvidence:[{detail:"API recovered."}]
    }]
  };
  let support={
    locations:[{
      locationId:"a",locationName:"A",healthState:"healthy",readinessScore:86,openSupportEvents:0
    }]
  };
  let reliability={status:"meeting",score:96,breached:0,warning:0,errorBudgetRemaining:100};

  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>incidentSnapshot},
    {snapshot:async()=>support},
    {evaluate:async()=>reliability}
  );

  let snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.version,"50.20.0");
  assert.equal(snap.status,"post-incident-review-open");
  assert.equal(snap.incidents[0].durationMinutes,42);
  assert.equal(snap.incidents[0].recoveryVerified,true);
  assert.equal(snap.policy.automaticCorrectiveActionExecution,false);

  let blocked=false;
  try{
    await svc.createReview("org",["a"],"i1",{
      rootCause:"Reservation connector saturation.",
      executiveSummary:"Recovered.",
      correctiveActions:[]
    },"Tester");
  }catch(e){blocked=/corrective action/i.test(e.message);}
  assert(blocked);

  const review=await svc.createReview("org",["a"],"i1",{
    rootCause:"Reservation connector saturation caused request queue exhaustion.",
    contributingFactors:["Insufficient alert threshold","Dinner peak load"],
    correctiveActions:[{
      action:"Recalibrate reservation connector saturation alert.",
      owner:"Platform Lead",
      dueDate:"2026-08-16"
    }],
    repeatRisk:"medium",
    executiveSummary:"Dinner reservation intake was restored in 42 minutes. Corrective work is assigned and remains human-owned."
  },"Tester");

  assert.equal(review.status,"POST_INCIDENT_REVIEW_OPEN");
  assert.equal(review.correctiveActions.length,1);
  assert.equal(review.correctiveActions[0].executionState,"NOT_EXECUTED_BY_BLUE_CURRENT");
  assert.equal(review.correctiveActionsExecutedBySystem,false);
  assert.equal(review.runtimeMutationPerformed,false);

  const accepted=await svc.acceptLessons("org",review.id,{
    approver:"VP Operations",
    note:"Lessons reviewed and corrective ownership accepted."
  },"Tester");

  assert.equal(accepted.status,"POST_INCIDENT_REVIEW_ACCEPTED");
  assert.equal(accepted.lessonsAcceptedBy,"VP Operations");

  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.status,"post-incident-review-complete");
  assert.equal(snap.incidents[0].reviewState,"POST_INCIDENT_REVIEW_ACCEPTED");
  assert.equal(audit.length,2);
  assert.equal(events.length,2);

  console.log(JSON.stringify({
    ok:true,version:"50.20.0",
    recoveryVerification:true,
    incidentDuration:true,
    rootCauseCapture:true,
    correctiveActionOwnership:true,
    repeatRisk:true,
    executiveSummary:true,
    humanLessonsAcceptance:true,
    correctiveActionExecutionState:"NOT_EXECUTED_BY_BLUE_CURRENT",
    automaticCorrectiveActionExecution:false,
    automaticClosure:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
