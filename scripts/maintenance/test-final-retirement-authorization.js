"use strict";
const assert=require("assert"),path=require("path");
global.structuredClone=global.structuredClone||((x)=>JSON.parse(JSON.stringify(x)));
const Impact=require("../../server/services/repositoryImpactService");
const Rehearsal=require("../../server/services/repositoryRetirementRehearsalService");
const FinalAuth=require("../../client/js/modules/finalRetirementAuthorizationEngine");

(async()=>{
  const root=path.resolve(__dirname,"../..");
const retiredModule=path.join(root,"client/js/modules/enterpriseValuePlanCenter.js");
if(!require("fs").existsSync(retiredModule)){console.log(JSON.stringify({ok:true,skipped:true,reason:"enterpriseValuePlanCenter retired in V46.50.0"},null,2));process.exit(0);}
  const impact=new Impact(root),rehearsalService=new Rehearsal(root,impact);
  const rehearsal=rehearsalService.rehearse("enterpriseValuePlanCenter");
  assert.equal(rehearsal.validation.passed,true);
  assert.ok(rehearsal.rollback.digest);
  assert.ok(rehearsal.changeSet.digest);
  assert.equal(rehearsal.safety.authoritativeSafe,true);

  const state={
    operatorDeletionPlans:[{
      id:"ODP-1",surfaceId:"enterpriseValuePlanCenter",status:"human-authorized-plan",
      retirementCertificationId:"RC-1",
      humanDeletionAuthorization:{authorizedBy:"GM One",authorizedAt:new Date().toISOString(),scope:"deletion-plan-only"},
      codeDeletionAllowed:false,deletionExecuted:false
    }],
    operatorRetirementRehearsals:[rehearsal],
    operatorFinalRetirementPackets:[]
  };
  const appState={getState:()=>state,update:o=>Object.assign(state,o)},eventBus={emit:()=>{}};
  const engine=new FinalAuth({eventBus,appState});

  let packet=await engine.create("enterpriseValuePlanCenter","Operator");
  assert.equal(packet.status,"awaiting-second-human-authorization");
  assert.equal(packet.binding.rollbackDigest,rehearsal.rollback.digest);
  assert.equal(packet.binding.changeSetDigest,rehearsal.changeSet.digest);
  assert.equal(packet.binding.authoritativeSourceDigest,rehearsal.safety.authoritativeAfter.sha256);
  assert.equal(packet.bindingDigest.length,64);
  assert.equal(packet.codeDeletionAllowed,false);

  let sameApproverBlocked=false;
  try{await engine.authorize(packet.id,"GM One","same approver");}catch(e){sameApproverBlocked=/distinct human/.test(e.message);}
  assert.equal(sameApproverBlocked,true);

  packet=await engine.authorize(packet.id,"GM Two","Independent final review");
  assert.equal(packet.status,"final-authorization-granted-checkpoint-required");
  assert.equal(packet.secondAuthorization.authorizedBy,"GM Two");
  assert.equal(packet.secondAuthorization.bindingDigest,packet.bindingDigest);

  let preCheckpoint=await engine.readiness(packet);
  assert.ok(preCheckpoint.score<100);
  assert.equal(preCheckpoint.checks.find(x=>x.id==="checkpoint-verified").pass,false);

  packet=await engine.markCheckpoint(packet.id,"GM Two");
  assert.equal(packet.status,"ready-for-separate-authoritative-retirement-decision");
  assert.equal(packet.checkpoint.checkpointVerified,true);
  const ready=await engine.readiness(packet);
  assert.equal(ready.score,100);
  assert.equal(ready.status,"final-retirement-gate-ready");
  assert.equal(ready.codeDeletionAllowed,false);
  assert.equal(ready.deletionExecuted,false);

  const drifted=structuredClone(packet);
  drifted.binding.changeSetDigest="0".repeat(64);
  const drift=await engine.revalidate(drifted);
  assert.equal(drift.pass,false);
  assert.equal(drift.checks.find(x=>x.id==="change-set-digest").pass,false);

  const expired=structuredClone(packet);
  expired.expiresAt=new Date(Date.now()-1000).toISOString();
  const exp=await engine.revalidate(expired);
  assert.equal(exp.pass,false);
  assert.equal(exp.checks.find(x=>x.id==="not-expired").pass,false);

  assert.ok(packet.checkpoint.commands.some(x=>x.includes("git tag -a pre-retirement-enterpriseValuePlanCenter")));
  assert.ok(packet.checkpoint.commands.some(x=>x.includes("git push origin pre-retirement-enterpriseValuePlanCenter")));

  console.log(JSON.stringify({
    ok:true,version:"46.45.0",candidate:packet.surfaceId,
    rollbackDigest:packet.binding.rollbackDigest.slice(0,12),
    changeSetDigest:packet.binding.changeSetDigest.slice(0,12),
    bindingDigest:packet.bindingDigest.slice(0,12),
    sameApproverBlocked,expiryMinutes:15,digestDriftBlocked:!drift.pass,expiredPacketBlocked:!exp.pass,
    checkpointCommands:packet.checkpoint.commands.length,checkpointVerified:packet.checkpoint.checkpointVerified,
    readiness:ready.score,status:ready.status,codeDeletionAllowed:false,deletionExecuted:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
