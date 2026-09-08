"use strict";
const assert=require("assert"),Service=require("../../server/services/finalProductReleaseCandidateService");
(async()=>{
 const state={finalProductReleaseReviews:[],finalProductReleaseCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const live={snapshot:async()=>({status:"pilot-live-service-accepted",locations:[{locationId:"loc1",decision:{decision:"ACCEPT"}}]})};
 const closeout={snapshot:async()=>({status:"pilot-closeout-in-review",locations:[{locationId:"loc1",review:{id:"r1"}}]})};
 const rc={snapshot:async()=>({status:"pilot-release-candidate-certified",certification:{decision:"RC_APPROVE"}})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},live,closeout,rc);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"58.0.0");
 const r=await svc.review("org",["*"],{releaseVersion:"58.0.0-rc1",buildHash:"abc123",productScopeFreeze:"PASS",criticalDefectGate:"PASS",securityPrivacyGate:"PASS",dataIntegrityGate:"PASS",performanceReliabilityGate:"PASS",recoverySupportGate:"PASS",operatorUsabilityGate:"PASS",commercialReadinessGate:"PASS",releaseNotes:"final RC release notes",knownLimitations:"documented limitations",finalSuccessCriteria:"stable, usable, measurable pilot-ready product",recommendation:"APPROVE"},"Tester");
 assert.equal(r.deploymentPerformed,false);assert.equal(r.customerActivated,false);assert.equal(r.locationExpansionPerformed,false);assert.equal(r.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.finalRcReady,true);
 const c=await svc.certify("org",["*"],{decision:"FINAL_RC_APPROVE",evidence:"all final product RC gates pass"},"Tester");
 assert.equal(c.deploymentPerformedByCertification,false);assert.equal(c.customerActivatedByCertification,false);assert.equal(c.locationExpansionPerformedByCertification,false);assert.equal(c.restaurantStateMutatedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"58.0.0",pilotRc:true,liveServiceAcceptance:true,pilotCloseoutEvidence:true,productScopeFreeze:true,criticalDefectGate:true,securityPrivacy:true,dataIntegrity:true,performanceReliability:true,recoverySupport:true,operatorUsability:true,commercialReadiness:true,releaseNotes:true,knownLimitations:true,finalSuccessCriteria:true,humanFinalRcApproveHold:true,noAutomaticDeployment:true,noAutomaticCustomerActivation:true,noAutomaticLocationExpansion:true,noRestaurantMutation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});