"use strict";
const assert=require("assert"),AutonomousOperationsService=require("../../server/services/autonomousOperationsService");
class MemoryDatabase{constructor(seed){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
 const org="org-test";
 const proposals=[
  {id:"P1",organizationId:org,cycleId:"C1",recommendationId:"R1",simulationId:"S1",locationId:"L1",domain:"staffing",proposalType:"contingency-coverage-plan",title:"Staffing",proposedAction:"Model coverage",agentType:"staffing-advisor",risk:"medium",confidence:88,policy:{policyId:"V45-POL-STAFFING",approvalRole:"manager",limits:{maxAdditionalStaff:3},prohibited:["publish-shift"]},evidence:[{metric:"need",value:2}],simulation:{modeled:{serviceCapacityPercentDelta:12},confidence:82,assumptions:["dry-run"]},approvalRequired:true,rehearsalRequired:true,liveExecutionAllowed:false,liveStateChanged:false},
  {id:"P2",organizationId:org,cycleId:"C1",recommendationId:"R2",simulationId:"S2",locationId:"L2",domain:"revenue-opportunity",proposalType:"revenue-recovery-plan",title:"Revenue",proposedAction:"Model demand option",agentType:"revenue-planner",risk:"high",confidence:81,policy:{policyId:"V45-POL-REVENUE",approvalRole:"general-manager",limits:{maxModeledDiscountPercent:10},prohibited:["publish-offer"]},evidence:[{metric:"trend",value:-7}],simulation:{modeled:{revenueOpportunity:"modeled-only"},confidence:76,assumptions:["dry-run"]},approvalRequired:true,rehearsalRequired:true,liveExecutionAllowed:false,liveStateChanged:false}
 ];
 const rehearsal={id:"REH1",organizationId:org,cycleId:"C1",proposalIds:["P1","P2"],status:"ready-for-approval-review",blockingConflicts:0,conflicts:[],locationPlans:[{locationId:"L1"},{locationId:"L2"}],governance:{approvalRequired:true,liveExecutionAllowed:false,liveStateChanged:false}};
 const db=new MemoryDatabase({v45InterventionProposals:{[org]:proposals},v45InterventionRehearsals:{[org]:[rehearsal]}}),audits=[],events=[];
 const svc=new AutonomousOperationsService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})},{snapshot:async()=>({})});
 const made=await svc.v45ApprovalPackets(org,"Tester",{rehearsalId:"REH1"}),packet=made.packet;
 assert.equal(packet.status,"pending");
 assert.equal(packet.scope,"command-draft-only");
 assert.equal(packet.requiredApprovalRole,"general-manager");
 assert.equal(packet.liveExecutionAllowed,false);
 assert.ok(packet.evidenceDigest);
 assert.ok(new Date(packet.expiresAt)>new Date(packet.createdAt));
 const rv=await svc.v45RevalidateApprovalPacket(org,packet.id);
 assert.equal(rv.valid,true);
 let lowRoleFailed=false;
 try{await svc.v45ApprovalDecision(org,"Tester",{packetId:packet.id,decision:"approve",actorRole:"manager"});}catch(e){lowRoleFailed=/requires role/.test(e.message);}
 assert.equal(lowRoleFailed,true);
 const approved=await svc.v45ApprovalDecision(org,"GM",{packetId:packet.id,decision:"approve",actorRole:"general-manager",note:"Reviewed"});
 assert.equal(approved.packet.status,"approved");
 assert.equal(approved.packet.liveExecutionAllowed,false);
 const drafted=await svc.v45CommandDrafts(org,"GM",{packetId:packet.id});
 assert.equal(drafted.draft.commands.length,2);
 assert.equal(drafted.draft.executionCertified,false);
 assert.equal(drafted.draft.liveExecutionAllowed,false);
 assert.ok(drafted.draft.commands.every(c=>c.status==="draft-only"&&c.executionEndpoint===null&&c.liveExecutionAllowed===false));
 const ready=await svc.v45AuthorizationReadiness(org);
 assert.equal(ready.score,100);
 assert.equal(ready.trusted,true);
 assert.equal(ready.status,"v45-authorization-ready");
 const revoked=await svc.v45ApprovalDecision(org,"GM",{packetId:packet.id,decision:"revoke",actorRole:"general-manager",note:"Conditions changed"});
 assert.equal(revoked.packet.status,"revoked");
 let revokedDraftFailed=false;
 try{await svc.v45CommandDrafts(org,"GM",{packetId:packet.id});}catch(e){revokedDraftFailed=/requires an approved packet/.test(e.message);}
 assert.equal(revokedDraftFailed,true);
 console.log(JSON.stringify({ok:true,version:ready.version,packetId:packet.id,requiredRole:packet.requiredApprovalRole,revalidation:rv.valid,lowRoleBlocked:lowRoleFailed,commands:drafted.draft.commands.length,executionEndpoint:drafted.draft.commands[0].executionEndpoint,readiness:ready.score,revoked:revoked.packet.status,liveExecutionAllowed:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
