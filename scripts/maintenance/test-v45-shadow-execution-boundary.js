"use strict";
const assert=require("assert"),AutonomousOperationsService=require("../../server/services/autonomousOperationsService");
class MemoryDatabase{constructor(seed){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
 const org="org-test";
 const draft={id:"D1",organizationId:org,packetId:"A1",status:"drafted",executionCertified:false,liveExecutionAllowed:false,liveStateChanged:false,commands:[
  {id:"C1",proposalId:"P1",locationId:"L1",domain:"kitchen-throughput",commandType:"fire-pacing-plan",description:"Model pacing",policyId:"V45-POL-KITCHEN",limits:{},status:"draft-only",executionEndpoint:null,liveExecutionAllowed:false,liveStateChanged:false},
  {id:"C2",proposalId:"P2",locationId:"L1",domain:"reservation-pacing",commandType:"temporary-seating-buffer",description:"Model buffer",policyId:"V45-POL-PACING",limits:{},status:"draft-only",executionEndpoint:null,liveExecutionAllowed:false,liveStateChanged:false},
  {id:"C3",proposalId:"P3",locationId:"L2",domain:"staffing",commandType:"contingency-coverage-plan",description:"Model staffing",policyId:"V45-POL-STAFFING",limits:{},status:"draft-only",executionEndpoint:null,liveExecutionAllowed:false,liveStateChanged:false}
 ]};
 const db=new MemoryDatabase({v45CommandDrafts:{[org]:[draft]}}),audits=[],events=[];
 const svc=new AutonomousOperationsService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})},{snapshot:async()=>({})});
 const boundary=await svc.v45ExecutionBoundary(org);
 assert.equal(boundary.registry.mode,"shadow-only");
 assert.equal(boundary.registry.liveExecutionEnabled,false);
 assert.equal(boundary.emergencyStop.engaged,true);
 const adapters=Object.values(boundary.registry.adapters);
 assert.ok(adapters.length>=6);
 assert.ok(adapters.every(a=>a.shadowHandler&&a.liveHandler===null&&a.compensation.supported));
 const first=await svc.v45ShadowExecutions(org,"Tester",{draftId:"D1",idempotencyKey:"shadow-key-1"});
 assert.equal(first.replayed,false);
 assert.equal(first.shadowExecution.status,"completed");
 assert.equal(first.shadowExecution.liveExecutionAllowed,false);
 assert.equal(first.shadowExecution.liveStateChanged,false);
 assert.equal(first.shadowExecution.canary.percentage,0);
 assert.equal(first.shadowExecution.canary.liveTraffic,false);
 assert.equal(first.shadowExecution.results.length,3);
 assert.ok(first.shadowExecution.results.every(x=>x.status==="shadow-simulated"&&x.liveHandlerPresent===false&&x.liveStateChanged===false));
 assert.equal(first.shadowExecution.preflight.pass,true);
 const replay=await svc.v45ShadowExecutions(org,"Tester",{draftId:"D1",idempotencyKey:"shadow-key-1"});
 assert.equal(replay.replayed,true);
 assert.equal(replay.shadowExecution.id,first.shadowExecution.id);
 const ready=await svc.v45ExecutionReadiness(org);
 assert.equal(ready.score,100);
 assert.equal(ready.trusted,true);
 assert.equal(ready.status,"v45-shadow-execution-boundary-ready");
 assert.equal(ready.safety.liveExecutionEnabled,false);
 assert.equal(ready.safety.canaryLivePercentage,0);
 const stop=await svc.v45ExecutionBoundary(org,"Tester",{action:"engage-stop",reason:"Test stop"});
 assert.equal(stop.emergencyStop.engaged,true);
 let unsupported=false;
 try{await svc.v45ExecutionBoundary(org,"Tester",{action:"release-stop"});}catch(e){unsupported=/Only engage-stop/.test(e.message);}
 assert.equal(unsupported,true);
 console.log(JSON.stringify({ok:true,version:ready.version,adapters:adapters.length,commands:first.shadowExecution.results.length,idempotentReplay:replay.replayed,preflight:first.shadowExecution.preflight.pass,canaryLivePercentage:ready.safety.canaryLivePercentage,emergencyStop:stop.emergencyStop.engaged,releaseBlocked:unsupported,readiness:ready.score,liveExecutionEnabled:false,liveExecutionAllowed:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
