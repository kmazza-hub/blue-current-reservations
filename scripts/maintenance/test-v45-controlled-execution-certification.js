"use strict";
const assert=require("assert"),AutonomousOperationsService=require("../../server/services/autonomousOperationsService");
class MemoryDatabase{constructor(seed){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
 const org="org-test";
 const draft={id:"D1",organizationId:org,status:"drafted",executionCertified:false,liveExecutionAllowed:false,liveStateChanged:false,commands:[
  {id:"C1",locationId:"L1",domain:"kitchen-throughput",commandType:"fire-pacing-plan",status:"draft-only",executionEndpoint:null,liveExecutionAllowed:false,liveStateChanged:false},
  {id:"C2",locationId:"L2",domain:"staffing",commandType:"contingency-coverage-plan",status:"draft-only",executionEndpoint:null,liveExecutionAllowed:false,liveStateChanged:false}
 ]};
 const db=new MemoryDatabase({v45CommandDrafts:{[org]:[draft]}}),audits=[],events=[];
 const svc=new AutonomousOperationsService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})},{snapshot:async()=>({})});
 const policy=svc.v45ControlledExecutionPolicy();
 assert.equal(policy.immutable,true);
 assert.ok(policy.contentHash);
 assert.equal(policy.liveExecutionEnabled,false);
 assert.equal(policy.maximumCanaryPercent,0);
 assert.equal(Object.values(policy.adapters).every(x=>x.liveHandlerPresent===false),true);
 for(let i=1;i<=3;i++){
   const s=await svc.v45ShadowExecutions(org,"Tester",{draftId:"D1",idempotencyKey:`shadow-${i}`});
   assert.equal(s.shadowExecution.preflight.pass,true);
   assert.equal(s.shadowExecution.liveStateChanged,false);
 }
 const created=await svc.v45ExecutionCertifications(org,"Tester",{draftId:"D1"}),id=created.certification.id;
 assert.equal(created.certification.status,"pending-dual-authorization");
 let duplicateBlocked=false;
 await svc.v45ExecutionCertificationControl(org,"Approver A",{certificationId:id,action:"authorize",approverId:"A",actorRole:"general-manager"});
 try{await svc.v45ExecutionCertificationControl(org,"Approver A",{certificationId:id,action:"authorize",approverId:"A",actorRole:"executive"});}catch(e){duplicateBlocked=/distinct approvers/.test(e.message);}
 assert.equal(duplicateBlocked,true);
 let lowRoleBlocked=false;
 try{await svc.v45ExecutionCertificationControl(org,"Approver B",{certificationId:id,action:"authorize",approverId:"B",actorRole:"manager"});}catch(e){lowRoleBlocked=/General Manager/.test(e.message);}
 assert.equal(lowRoleBlocked,true);
 let c=await svc.v45ExecutionCertificationControl(org,"Approver B",{certificationId:id,action:"authorize",approverId:"B",actorRole:"regional-operator"});
 assert.equal(c.certification.dualAuthorizationSatisfied,true);
 c=await svc.v45ExecutionCertificationControl(org,"Tester",{certificationId:id,action:"start-observation"});
 assert.equal(c.certification.observation.status,"running");
 c=await svc.v45ExecutionCertificationControl(org,"Tester",{certificationId:id,action:"complete-observation",forceForTest:true});
 assert.equal(c.certification.observation.status,"completed");
 c=await svc.v45ExecutionCertificationControl(org,"Tester",{certificationId:id,action:"compensation-drill",commandType:"fire-pacing-plan"});
 assert.equal(c.certification.compensation.status,"passed");
 c=await svc.v45ExecutionCertificationControl(org,"Tester",{certificationId:id,action:"evaluate"});
 assert.equal(c.certification.promotion.eligible,true);
 assert.equal(c.certification.status,"certified-shadow-boundary");
 assert.equal(c.certification.liveExecutionEnabled,false);
 assert.equal(c.certification.canary.currentPercent,0);
 const ready=await svc.v45ControlledExecutionReadiness(org);
 assert.equal(ready.score,100);
 assert.equal(ready.trusted,true);
 assert.equal(ready.status,"v45-controlled-execution-certification-ready");
 assert.equal(ready.safety.liveHandlers,0);
 c=await svc.v45ExecutionCertificationControl(org,"Tester",{certificationId:id,action:"trip-breaker",reason:"Drill"});
 assert.equal(c.certification.circuitBreaker.tripped,true);
 assert.equal(c.certification.promotion.eligible,false);
 c=await svc.v45ExecutionCertificationControl(org,"Tester",{certificationId:id,action:"reset-review"});
 assert.equal(c.certification.circuitBreaker.tripped,false);
 assert.equal(c.certification.liveExecutionEnabled,false);
 console.log(JSON.stringify({ok:true,version:ready.version,policyHash:ready.policyHash.slice(0,12),shadowRuns:3,dualAuthorization:true,duplicateApproverBlocked:duplicateBlocked,lowRoleBlocked,observation:"completed",compensation:"passed",promotionEligible:true,circuitBreakerDrill:"passed",readiness:ready.score,canaryLivePercentage:0,liveHandlers:0,liveExecutionEnabled:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
