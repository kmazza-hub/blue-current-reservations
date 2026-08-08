"use strict";
const assert=require("assert"),LiveIntegrationService=require("../../server/services/liveIntegrationService");
class MemoryDatabase{constructor(seed){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
  const org="org-test";
  const orch={id:"O1",organizationId:org,instruction:"Coordinate a governed three-agent service response",intent:"action",approvalRequired:true,approvalStatus:"approved",executionMode:"governed-dry-run",liveExecutionAllowed:false,liveStateChanged:false,tasks:[
    {id:"O1-T1",capabilityId:"executive.reasoning",mode:"read",risk:"medium",approvalRequired:false,agentType:"executive-analyst"},
    {id:"O1-T2",capabilityId:"operations.optimize",mode:"simulation",risk:"medium",approvalRequired:false,agentType:"operations-optimizer"},
    {id:"O1-T3",capabilityId:"executive.action-draft",mode:"write-draft",risk:"high",approvalRequired:true,agentType:"incident-coordinator"}
  ]};
  const seed={aipOrchestrations:{[org]:[orch]},aipAgentRuns:{[org]:[{id:"R1",liveExecutionAllowed:false,liveStateChanged:false}]},aipRunCheckpoints:{[org]:[{id:"RCP",liveStateChanged:false}]},aipAgentHandoffs:{[org]:[{id:"H1",liveStateChanged:false}]},aipOrchestrationCheckpoints:{[org]:[{id:"OCP",liveStateChanged:false}]},aipApprovals:{[org]:[{id:"A1",scope:"governed-dry-run-only",liveExecutionAllowed:false}]}};
  const db=new MemoryDatabase(seed),audits=[],events=[],svc=new LiveIntegrationService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})});
  svc.aipRuntimeReadiness=async()=>({score:100,status:"aip-runtime-ready"});
  svc.aipCoordinationReadiness=async()=>({score:100,status:"aip-coordination-ready"});

  const published=await svc.aipWorkflowDefinitions(org,"Tester",{orchestrationId:"O1"});
  const made=await svc.aipWorkflowInstances(org,"Tester",{definitionId:published.definition.id,maxAttempts:3});
  const id=made.instance.id;
  assert.equal(made.instance.tasks[0].status,"ready");
  assert.equal(made.instance.tasks[1].status,"blocked");
  assert.deepEqual(made.instance.tasks[1].dependsOnOrder,[1]);
  assert.equal(made.instance.tasks.every(t=>t.failurePolicy==="bounded-retry-then-escalate"),true);

  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"start",operationKey:"start-1"});
  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"checkpoint",operationKey:"cp-1"});

  let failure=await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"fail",reason:"simulated agent timeout",operationKey:"fail-1"});
  assert.equal(failure.instance.status,"retry-pending");
  assert.equal(failure.instance.tasks[0].status,"retry-wait");
  assert.ok(failure.instance.tasks[0].nextRetryAt);
  const replay=await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"fail",reason:"duplicate",operationKey:"fail-1"});
  assert.equal(replay.replayed,true);
  assert.equal(replay.instance.tasks[0].attempts,1);

  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"retry",force:true,operationKey:"retry-1"});
  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"fail",reason:"second timeout",operationKey:"fail-2"});
  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"retry",force:true,operationKey:"retry-2"});
  failure=await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"fail",reason:"third timeout",operationKey:"fail-3"});
  assert.equal(failure.instance.status,"attention-required");
  assert.equal(failure.instance.tasks[0].status,"escalated");
  assert.ok(failure.escalation);
  assert.equal(failure.escalation.liveExecutionAllowed,false);

  const supervision=await svc.aipWorkflowSupervision(org);
  assert.equal(supervision.attentionRequired,1);
  assert.equal(supervision.openEscalations,1);
  assert.equal(supervision.policies.retry,"bounded exponential backoff");

  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"recover",operationKey:"recover-1"});
  await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"start",operationKey:"restart-1"});
  const advanced=await svc.aipWorkflowControl(org,"Tester",{instanceId:id,action:"advance",operationKey:"advance-1"});
  assert.equal(advanced.instance.tasks[0].status,"completed");
  assert.equal(advanced.instance.tasks[1].status,"ready");
  assert.equal(advanced.instance.currentTaskIndex,1);

  const closure=await svc.aipV44ClosureReadiness(org);
  assert.equal(closure.score,100);
  assert.equal(closure.trusted,true);
  assert.equal(closure.status,"v44-architecture-closed");
  assert.equal(closure.safety.liveExecutionAllowed,false);
  console.log(JSON.stringify({ok:true,version:closure.version,instanceId:id,idempotentFailureReplay:replay.replayed,dependencyUnlocked:advanced.instance.tasks[1].status,escalations:supervision.openEscalations,closure:closure.score,status:closure.status,liveExecutionAllowed:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
