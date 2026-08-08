"use strict";
const assert = require("assert");
const LiveIntegrationService = require("../../server/services/liveIntegrationService");

class MemoryDatabase {
  constructor(seed){ this.data=structuredClone(seed); }
  async read(){ return structuredClone(this.data); }
  async mutate(fn){ const result=fn(this.data); return structuredClone(result); }
}

(async()=>{
  const organizationId="org-test";
  const draft={id:"AIP-DRAFT-1",organizationId,instruction:"Review guest wait",intent:"brief",approvalRequired:false,capabilityIds:["executive.live-brief"],steps:[{order:1,capabilityId:"executive.live-brief",mode:"read",risk:"low",approvalRequired:false}]};
  const database=new MemoryDatabase({aipAutomationDrafts:{[organizationId]:[draft]},aipSandboxRuns:{[organizationId]:[{id:"SBX-1",draftId:draft.id,status:"simulated",blockedSteps:0,liveStateChanged:false}]}});
  const audits=[]; const events=[];
  const service=new LiveIntegrationService(database,{record:async x=>audits.push(x)},{publish:(type,payload)=>events.push({type,payload})});
  const created=await service.aipAgentRuns(organizationId,"Tester",{agentType:"operations-optimizer"});
  assert.equal(created.run.status,"ready"); assert.equal(created.run.executionMode,"governed-dry-run"); assert.equal(created.run.liveStateChanged,false);
  const context=await service.aipExecutionContext(organizationId,created.run.id);
  assert.equal(context.context.runId,created.run.id); assert.equal(context.context.governance.liveExecutionAllowed,false); assert.equal(context.context.planSteps.length,1);
  await service.aipAgentRunControl(organizationId,"Tester",{runId:created.run.id,action:"start"});
  await service.aipAgentRunControl(organizationId,"Tester",{runId:created.run.id,action:"checkpoint"});
  await service.aipAgentRunControl(organizationId,"Tester",{runId:created.run.id,action:"pause"});
  await service.aipAgentRunControl(organizationId,"Tester",{runId:created.run.id,action:"resume"});
  await service.aipAgentRunControl(organizationId,"Tester",{runId:created.run.id,action:"pause"});
  const recovered=await service.aipAgentRunControl(organizationId,"Tester",{runId:created.run.id,action:"recover"});
  assert.equal(recovered.run.status,"recovered"); assert.equal(recovered.run.liveStateChanged,false); assert.ok(recovered.checkpoints.length>=1);
  const lifecycle=await service.aipRuntimeLifecycle(organizationId,created.run.id);
  assert.equal(lifecycle.safety.liveExecutionAllowed,false); assert.equal(lifecycle.safety.allCheckpointsIsolated,true);
  const gatedDraft={...draft,id:"AIP-DRAFT-2",approvalRequired:true,capabilityIds:["executive.action-draft"],steps:[{order:1,capabilityId:"executive.action-draft",mode:"write-draft",risk:"high",approvalRequired:true}]};
  database.data.aipAutomationDrafts[organizationId].unshift(gatedDraft);
  const gated=await service.aipAgentRuns(organizationId,"Tester",{agentType:"operations-optimizer"});
  assert.equal(gated.run.status,"approval-pending");
  await assert.rejects(()=>service.aipAgentRunControl(organizationId,"Tester",{runId:gated.run.id,action:"start"}),/approval-gated/);
  assert.ok(audits.length>=7); assert.ok(events.length>=7);
  console.log(JSON.stringify({ok:true,runId:created.run.id,checkpointCount:lifecycle.checkpointCount,gatedStatus:gated.run.status,audits:audits.length,events:events.length},null,2));
})().catch(error=>{console.error(error);process.exit(1);});
