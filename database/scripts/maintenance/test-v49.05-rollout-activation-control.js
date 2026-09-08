"use strict";
const assert=require("assert");
const Service=require("../../server/services/rolloutActivationControlService");

(async()=>{
  const state={
    expansionReadinessPlans:[{
      id:"plan1",organizationId:"org",status:"DRAFT",activationState:"NOT_ACTIVATED",waveSize:1,cadenceDays:7,readinessFloor:75,owner:"VP Ops",
      locations:[
        {locationId:"a",locationName:"A",wave:1,state:"PLANNED",activationApproved:false},
        {locationId:"b",locationName:"B",wave:2,state:"PLANNED",activationApproved:false}
      ]
    }],
    rolloutActivationApprovals:[]
  };
  const audit=[],events=[];
  const expansion={
    signedDecision:{decision:"EXPAND",rolloutLocationIds:["a","b"]},
    activePlan:state.expansionReadinessPlans[0]
  };
  let portfolio={
    locations:[
      {locationId:"a",locationName:"A",readinessScore:82,attentionLevel:"healthy",urgentPredictiveInterventions:0},
      {locationId:"b",locationName:"B",readinessScore:70,attentionLevel:"watch",urgentPredictiveInterventions:1}
    ]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>expansion},
    {snapshot:async()=>portfolio}
  );
  let snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.version,"49.5.0");
  assert.equal(snap.locations[0].preflightPassed,true);
  assert.equal(snap.locations[1].preflightPassed,false);
  assert.equal(snap.policy.automaticActivation,false);
  assert.equal(snap.policy.approvalDoesNotDeploy,true);

  const a=await svc.approve("org",["a","b"],"a",{approver:"Executive"},"Tester");
  assert.equal(a.status,"APPROVED_FOR_ACTIVATION");
  assert.equal(a.deploymentState,"NOT_DEPLOYED");
  assert.equal(a.overrideUsed,false);

  let blocked=false;
  try{await svc.approve("org",["a","b"],"b",{approver:"Executive"},"Tester");}
  catch(e){blocked=/override reason/i.test(e.message);}
  assert(blocked);

  const b=await svc.approve("org",["a","b"],"b",{approver:"Executive",overrideReason:"Leadership accepts one urgent intervention before launch."},"Tester");
  assert.equal(b.overrideUsed,true);
  assert.equal(b.deploymentState,"NOT_DEPLOYED");
  assert.equal(state.expansionReadinessPlans[0].locations[0].state,"APPROVED_FOR_ACTIVATION");
  assert.equal(state.expansionReadinessPlans[0].locations[1].state,"APPROVED_FOR_ACTIVATION");
  assert.equal(audit.length,2);
  assert.equal(events.length,2);

  snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.status,"activation-approvals-complete");

  console.log(JSON.stringify({
    ok:true,version:"49.5.0",
    livePreflight:true,
    openGateBlockedWithoutOverride:true,
    documentedOverride:true,
    approvalState:"APPROVED_FOR_ACTIVATION",
    deploymentState:"NOT_DEPLOYED",
    automaticApproval:false,
    automaticDeployment:false,
    automaticActivation:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
