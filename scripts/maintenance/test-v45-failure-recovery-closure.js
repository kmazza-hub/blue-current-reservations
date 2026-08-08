"use strict";
const assert=require("assert"),AutonomousOperationsService=require("../../server/services/autonomousOperationsService");
class MemoryDatabase{constructor(seed){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
 const org="org-test";
 const cert={id:"CERT1",organizationId:org,draftId:"D1",commandTypes:["fire-pacing-plan","contingency-coverage-plan"],status:"certified-shadow-boundary",promotion:{eligible:true,blockers:[]},canary:{currentPercent:0,liveTraffic:false,promotionLocked:true},liveExecutionEnabled:false,liveExecutionAllowed:false,liveStateChanged:false};
 const seed={
  v45AutonomousDecisionCycles:{[org]:[{id:"CYCLE1",governance:{liveExecutionAllowed:false},liveStateChanged:false}]},
  v45InterventionProposals:{[org]:[{id:"P1",liveExecutionAllowed:false,liveStateChanged:false}]},
  v45InterventionRehearsals:{[org]:[{id:"REH1",status:"ready-for-approval-review",liveStateChanged:false}]},
  v45ApprovalPackets:{[org]:[{id:"AP1",scope:"command-draft-only",liveExecutionAllowed:false,liveStateChanged:false}]},
  v45CommandDrafts:{[org]:[{id:"D1",executionCertified:false,liveExecutionAllowed:false,liveStateChanged:false}]},
  v45ShadowExecutions:{[org]:[
   {id:"S1",draftId:"D1",mode:"shadow-only",status:"completed",preflight:{pass:true},idempotencyKey:"K1",liveExecutionAllowed:false,liveStateChanged:false},
   {id:"S2",draftId:"D1",mode:"shadow-only",status:"completed",preflight:{pass:true},idempotencyKey:"K2",liveExecutionAllowed:false,liveStateChanged:false},
   {id:"S3",draftId:"D1",mode:"shadow-only",status:"completed",preflight:{pass:true},idempotencyKey:"K3",liveExecutionAllowed:false,liveStateChanged:false}
  ]},
  v45ExecutionCertifications:{[org]:[cert]}
 };
 const db=new MemoryDatabase(seed),audits=[],events=[];
 const svc=new AutonomousOperationsService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})},{snapshot:async()=>({})});
 const scenarios=["adapter-timeout","partial-command-failure","evidence-drift","compensation-failure","emergency-stop"];
 const verified=[];
 for(const scenarioKey of scenarios){
   const made=await svc.v45FailureRecoveryRehearsals(org,"Tester",{certificationId:"CERT1",scenarioKey});
   const id=made.rehearsal.id;
   let x=await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:id,action:"inject"});
   assert.equal(x.rehearsal.detected,true);
   assert.equal(x.rehearsal.liveStateChanged,false);
   if(x.rehearsal.rollback.required){
     x=await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:id,action:"rollback"});
     assert.equal(x.rehearsal.rollback.status,"completed");
   }
   x=await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:id,action:"recover"});
   assert.equal(x.rehearsal.recovery.status,"completed");
   x=await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:id,action:"verify"});
   assert.equal(x.rehearsal.status,"verified");
   assert.equal(x.rehearsal.verification.pass,true);
   verified.push(scenarioKey);
 }
 const failure=await svc.v45FailureRecoveryReadiness(org);
 assert.equal(failure.score,100);
 assert.equal(failure.trusted,true);
 assert.equal(failure.verifiedScenarios.length,5);
 const closure=await svc.v45ClosureReadiness(org);
 assert.equal(closure.score,100);
 assert.equal(closure.trusted,true);
 assert.equal(closure.status,"v45-architecture-closed");
 assert.equal(closure.safety.liveExecutionEnabled,false);
 assert.equal(closure.safety.liveHandlers,0);
 assert.equal(closure.safety.canaryLivePercentage,0);

 // Negative rollback drill: compensation failure must block recovery if rollback fails.
 const bad=await svc.v45FailureRecoveryRehearsals(org,"Tester",{certificationId:"CERT1",scenarioKey:"partial-command-failure"});
 await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:bad.rehearsal.id,action:"inject"});
 const failedRollback=await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:bad.rehearsal.id,action:"rollback",failDrill:true});
 assert.equal(failedRollback.rehearsal.status,"rollback-failed");
 assert.equal(failedRollback.rehearsal.circuitBreakerTripped,true);
 let recoveryBlocked=false;
 try{await svc.v45FailureRecoveryControl(org,"Tester",{rehearsalId:bad.rehearsal.id,action:"recover"});}catch(e){recoveryBlocked=/rollback must complete/.test(e.message);}
 assert.equal(recoveryBlocked,true);

 console.log(JSON.stringify({ok:true,version:closure.version,verifiedScenarios:verified,failureReadiness:failure.score,closure:closure.score,status:closure.status,failedRollbackBlockedRecovery:recoveryBlocked,liveHandlers:closure.safety.liveHandlers,canaryLivePercentage:closure.safety.canaryLivePercentage,liveExecutionEnabled:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
