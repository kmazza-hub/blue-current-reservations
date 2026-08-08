"use strict";
const assert=require("assert"),AutonomousOperationsService=require("../../server/services/autonomousOperationsService");
class MemoryDatabase{constructor(seed){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
 const org="org-test",cycle={
  id:"C1",organizationId:org,
  recommendations:[
   {id:"R1",locationId:"L1",locationName:"Harbor",domain:"kitchen-throughput",agentType:"kitchen-flow-advisor",title:"Kitchen response",recommendation:"Model fire pacing",risk:"medium",confidence:90,evidence:[{metric:"ticket",value:29}],approvalRequired:true,simulationRequired:true,liveExecutionAllowed:false,liveStateChanged:false},
   {id:"R2",locationId:"L1",locationName:"Harbor",domain:"reservation-pacing",agentType:"operations-optimizer",title:"Pacing response",recommendation:"Model seating buffer",risk:"medium",confidence:88,evidence:[{metric:"occupancy",value:92}],approvalRequired:true,simulationRequired:true,liveExecutionAllowed:false,liveStateChanged:false},
   {id:"R3",locationId:"L1",locationName:"Harbor",domain:"revenue-opportunity",agentType:"revenue-planner",title:"Revenue response",recommendation:"Model demand option",risk:"high",confidence:82,evidence:[{metric:"trend",value:-7}],approvalRequired:true,simulationRequired:true,liveExecutionAllowed:false,liveStateChanged:false},
   {id:"R4",locationId:"L2",locationName:"Market",domain:"staffing",agentType:"staffing-advisor",title:"Staffing response",recommendation:"Model contingency",risk:"medium",confidence:86,evidence:[{metric:"need",value:2}],approvalRequired:true,simulationRequired:true,liveExecutionAllowed:false,liveStateChanged:false},
   {id:"R5",locationId:"L2",locationName:"Market",domain:"guest-recovery",agentType:"guest-experience-advisor",title:"Guest response",recommendation:"Model manager touch",risk:"medium",confidence:84,evidence:[{metric:"health",value:70}],approvalRequired:true,simulationRequired:true,liveExecutionAllowed:false,liveStateChanged:false}
  ],
  simulations:[
   {id:"S1",recommendationId:"R1",modeled:{ticketMinutesDelta:-4},confidence:85,assumptions:["dry-run"],liveStateChanged:false},
   {id:"S2",recommendationId:"R2",modeled:{ticketMinutesDelta:-3},confidence:83,assumptions:["dry-run"],liveStateChanged:false},
   {id:"S3",recommendationId:"R3",modeled:{revenueOpportunity:"modeled-only"},confidence:77,assumptions:["dry-run"],liveStateChanged:false},
   {id:"S4",recommendationId:"R4",modeled:{serviceCapacityPercentDelta:12},confidence:81,assumptions:["dry-run"],liveStateChanged:false},
   {id:"S5",recommendationId:"R5",modeled:{guestRiskPercentDelta:-18},confidence:79,assumptions:["dry-run"],liveStateChanged:false}
  ],
  governance:{liveExecutionAllowed:false,liveStateChanged:false}
 };
 const db=new MemoryDatabase({v45AutonomousDecisionCycles:{[org]:[cycle]}}),audits=[],events=[];
 const svc=new AutonomousOperationsService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})},{snapshot:async()=>({})});
 const prepared=await svc.v45InterventionProposals(org,"Tester",{cycleId:"C1"});
 assert.equal(prepared.proposals.length,5);
 assert.ok(prepared.proposals.every(x=>x.approvalRequired&&x.rehearsalRequired&&x.liveExecutionAllowed===false));
 assert.ok(prepared.proposals.every(x=>x.policy?.approvalRole&&x.simulationId));
 assert.ok(prepared.conflicts.some(x=>x.type==="capacity-vs-demand"));
 assert.ok(prepared.conflicts.some(x=>x.type==="throughput-vs-demand"));
 const rehearsed=await svc.v45InterventionRehearsals(org,"Tester",{cycleId:"C1"});
 assert.equal(rehearsed.status,"blocked");
 assert.ok(rehearsed.blockingConflicts>=2);
 assert.equal(rehearsed.governance.liveExecutionAllowed,false);
 assert.equal(rehearsed.locationPlans.length,2);
 const safeIds=prepared.proposals.filter(x=>x.locationId==="L2").map(x=>x.id);
 const safeRehearsal=await svc.v45InterventionRehearsals(org,"Tester",{proposalIds:safeIds});
 assert.equal(safeRehearsal.status,"ready-for-approval-review");
 assert.equal(safeRehearsal.blockingConflicts,0);
 assert.equal(safeRehearsal.governance.liveExecutionAllowed,false);
 const ready=await svc.v45InterventionReadiness(org);
 assert.equal(ready.score,100);
 assert.equal(ready.trusted,true);
 assert.equal(ready.status,"v45-intervention-planning-ready");
 console.log(JSON.stringify({ok:true,version:ready.version,proposals:prepared.proposals.length,conflicts:prepared.conflicts.length,blocking:rehearsed.blockingConflicts,blockedRehearsal:rehearsed.status,safeRehearsal:safeRehearsal.status,locations:rehearsed.locationPlans.length,readiness:ready.score,liveExecutionAllowed:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
