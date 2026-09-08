"use strict";
const assert=require("assert");
const ActionService=require("../../server/services/hospitalityActionWorkspaceService");

(async()=>{
  const state={hospitalityActionWorkspaces:[]},audit=[],events=[];
  const database={read:async()=>state,mutate:async fn=>fn(state)};
  const svc=new ActionService(database,{record:async x=>audit.push(x)},{publish:(n,p)=>events.push([n,p])},{});
  const opportunity={id:"perf_kitchen_loc",category:"kitchen",title:"Recover 4 delayed kitchen tickets",why:"Four tickets are beyond target.",nextAction:"Rebalance station load.",owner:"Kitchen Manager",severity:"critical",score:92,estimatedImpactDollars:180,impactLabel:"Protect 4 guest experiences",confidence:94,metadata:{agedTickets:4,oldestMinutes:35}};
  const created=await svc.createFromOpportunity("org","loc",opportunity,{owner:"Alex",note:"Taking expo","targetMinutes":30},"Tester");
  assert.equal(created.owner,"Alex");
  assert.equal(created.status,"accepted");
  assert.equal(created.expectedImpactDollars,180);
  assert.equal(created.baseline.metadata.oldestMinutes,35);
  assert.equal(state.hospitalityActionWorkspaces.length,1);

  // Duplicate acceptance must not create a second active workspace.
  const duplicate=await svc.createFromOpportunity("org","loc",opportunity,{owner:"Other"},"Tester");
  assert.equal(duplicate.id,created.id);
  assert.equal(state.hospitalityActionWorkspaces.length,1);

  let list=await svc.list("org","loc");
  assert.equal(list.summary.active,1);
  assert.equal(list.summary.expectedImpactDollars,180);
  assert.equal(list.policy.automaticExecution,false);

  const blocked=await svc.update("org","loc",created.id,{status:"blocked",note:"Waiting on line reset"},"Tester");
  assert.equal(blocked.status,"blocked");
  list=await svc.list("org","loc");
  assert.equal(list.summary.blocked,1);

  const completed=await svc.update("org","loc",created.id,{status:"completed",note:"Tickets recovered"},"Tester");
  assert.equal(completed.status,"completed");
  assert.ok(completed.completedAt);
  list=await svc.list("org","loc");
  assert.equal(list.summary.active,0);
  assert.equal(list.summary.completed,1);
  assert.equal(list.summary.expectedImpactDollars,0);
  assert.ok(audit.length>=3);
  assert.ok(events.some(x=>x[0]==="hospitality-action:created"));
  assert.ok(events.some(x=>x[0]==="hospitality-action:updated"));

  console.log(JSON.stringify({ok:true,version:"47.10.0",workspaceCreated:true,duplicateProtected:true,baselineCaptured:true,ownershipPersisted:true,blockedStateTracked:true,completionTracked:true,expectedImpactDollars:180,auditEvents:audit.length,realtimeEvents:events.length,humanOwned:list.policy.humanOwned,automaticExecution:list.policy.automaticExecution},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
