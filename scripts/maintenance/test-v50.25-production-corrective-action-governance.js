"use strict";
const assert=require("assert");
const Service=require("../../server/services/productionCorrectiveActionGovernanceService");

(async()=>{
  const state={productionCorrectiveActionEvidence:[]},audit=[],events=[];
  const recovery={
    reviewHistory:[{
      id:"r1",incidentId:"i1",incidentTitle:"Reservation outage",repeatRisk:"high",createdAt:"2026-08-01T10:00:00.000Z",
      correctiveActions:[
        {id:"ca_1",action:"Recalibrate connector saturation alert",owner:"Platform Lead",dueDate:"2026-08-05",executionState:"NOT_EXECUTED_BY_BLUE_CURRENT"},
        {id:"ca_2",action:"Run dinner failover drill",owner:"Ops Lead",dueDate:"2099-01-01",executionState:"NOT_EXECUTED_BY_BLUE_CURRENT"}
      ]
    }]
  };
  const incident={
    commandHistory:[
      {id:"i1",title:"Reservation outage",severity:"critical",createdAt:"2026-08-01T09:00:00.000Z",affectedDomains:["reservations","api"]},
      {id:"i2",title:"Reservation latency repeat",severity:"warning",createdAt:"2026-08-08T09:00:00.000Z",affectedDomains:["reservations"]}
    ]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>recovery},
    {snapshot:async()=>incident}
  );

  let snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.version,"50.25.0");
  assert.equal(snap.actions.length,2);
  assert.equal(snap.actions[0].highRisk,true);
  assert.equal(snap.actions[0].repeatIncidentLinks.length,1);
  assert.equal(snap.policy.automaticCorrectiveActionExecution,false);

  let blocked=false;
  try{await svc.verify("org",["*"],"r1","ca_1",{evidence:"",verification:"reviewed"},"Tester");}
  catch(e){blocked=/evidence is required/i.test(e.message);}
  assert(blocked);

  const verification=await svc.verify("org",["*"],"r1","ca_1",{
    evidence:"Alert threshold was recalibrated by the platform team and validated during peak-load replay.",
    verification:"Peak-load replay no longer breached the saturation threshold."
  },"Tester");
  assert.equal(verification.status,"RISK_REDUCTION_VERIFIED");
  assert.equal(verification.correctiveActionExecutedBySystem,false);

  snap=await svc.snapshot("org",["*"]);
  const verified=snap.actions.find(x=>x.actionId==="ca_1");
  assert.equal(verified.status,"RISK_REDUCTION_VERIFIED");

  const completed=await svc.acceptCompletion("org",["*"],"r1","ca_1",{
    approver:"VP Operations",
    note:"Evidence accepted; corrective action is complete."
  },"Tester");
  assert.equal(completed.status,"COMPLETION_ACCEPTED");
  assert.equal(completed.runtimeMutationPerformed,false);

  snap=await svc.snapshot("org",["*"]);
  const done=snap.actions.find(x=>x.actionId==="ca_1");
  assert.equal(done.status,"COMPLETED_ACCEPTED");
  assert.equal(done.executionState,"NOT_EXECUTED_BY_BLUE_CURRENT");
  assert.equal(snap.totals.completedAccepted,1);
  assert.equal(snap.ownerAccountability.find(x=>x.owner==="Platform Lead").completed,1);
  assert.equal(audit.length,2);
  assert.equal(events.length,2);

  console.log(JSON.stringify({
    ok:true,version:"50.25.0",
    crossIncidentRegister:true,
    ownerDueDateAging:true,
    overdueAndHighRisk:true,
    repeatIncidentLinkage:true,
    riskReductionEvidence:true,
    executiveAccountability:true,
    humanVerification:true,
    humanCompletionAcceptance:true,
    executionState:"NOT_EXECUTED_BY_BLUE_CURRENT",
    automaticCorrectiveActionExecution:false,
    automaticCompletion:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
