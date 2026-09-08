"use strict";
const assert=require("assert"),Service=require("../../server/services/productionLaunchCertificationService");
(async()=>{
 const state={productionLaunchReviews:[],productionLaunchCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const hardening={snapshot:async()=>({status:"final-hardening-ship-ready",hardeningReady:true,certification:{decision:"SHIP"}})};
 const handoff={snapshot:async()=>({status:"production-handoff-complete",locations:[{productionReady:true,acceptance:{status:"ACCEPTED_INTO_PRODUCTION_OPERATIONS"}}]})};
 const launch={snapshot:async()=>({status:"pilot-launch-authorized",locations:[{launchReady:true,authorization:{status:"PILOT_LAUNCH_AUTHORIZED"}}]})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},hardening,handoff,launch);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"59.0.0");
 const r=await svc.review("org",["*"],{
  releaseVersion:"59.0.0",buildHash:"abc123",
  deploymentPlan:"deploy immutable release package",
  cutoverPlan:"human controlled cutover with verification checkpoints",
  rollbackAuthority:"Executive launch owner",
  launchOwner:"Launch Lead",supportOwner:"Support Lead",escalationOwner:"Executive Sponsor",
  customerActivationControl:"PASS",changeFreeze:"PASS",
  monitoringWindow:"first 4 hours heightened monitoring",
  launchSuccessCriteria:"health, workflow, data, and support gates remain stable",
  launchAbortCriteria:"critical defect, data-integrity failure, or unrecoverable service degradation",
  releaseDocumentation:"PASS",recommendation:"RELEASE"
 },"Tester");
 assert.equal(r.deploymentPerformed,false);assert.equal(r.cutoverPerformed,false);assert.equal(r.runtimeStarted,false);
 assert.equal(r.customerActivated,false);assert.equal(r.locationExpansionPerformed,false);assert.equal(r.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.launchReady,true);
 const c=await svc.certify("org",["*"],{decision:"RELEASE",evidence:"all finished-product launch gates pass"},"Tester");
 assert.equal(c.deploymentPerformedByCertification,false);assert.equal(c.cutoverPerformedByCertification,false);
 assert.equal(c.runtimeStartedByCertification,false);assert.equal(c.customerActivatedByCertification,false);
 assert.equal(c.locationExpansionPerformedByCertification,false);assert.equal(c.restaurantStateMutatedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"59.0.0",finalHardening:true,productionHandoff:true,launchControl:true,releaseArtifactIdentity:true,deploymentPlan:true,cutoverPlan:true,rollbackAuthority:true,launchOwner:true,supportOwner:true,escalationOwner:true,customerActivationControl:true,changeFreeze:true,monitoringWindow:true,launchSuccessCriteria:true,launchAbortCriteria:true,releaseDocumentation:true,humanReleaseReviseHold:true,noAutomaticDeployment:true,noAutomaticCutover:true,noAutomaticRuntimeStart:true,noAutomaticCustomerActivation:true,noAutomaticLocationExpansion:true,noRestaurantMutation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});