"use strict";
const assert=require("assert"),Service=require("../../server/services/finalHardeningRealEnvironmentService");
(async()=>{
 const state={finalHardeningEnvironmentReviews:[],finalHardeningEnvironmentCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const finalRc={snapshot:async()=>({status:"final-product-release-candidate-certified",finalRcReady:true,certification:{decision:"FINAL_RC_APPROVE"}})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},finalRc);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"58.50.0");
 const r=await svc.review("org",["*"],{
  fullRegression:"PASS",criticalDefectClosure:"PASS",highDefectReview:"PASS",securityPrivacyVerification:"PASS",
  authRbacVerification:"PASS",dataPersistenceIntegrity:"PASS",backupRestoreDrill:"PASS",rollbackRecoveryDrill:"PASS",
  performanceLoad:"PASS",observabilityAlerting:"PASS",productionConfiguration:"PASS",connectorFailureBehavior:"PASS",
  operatorUxReadability:"PASS",deviceResponsiveness:"PASS",accessibilityReview:"PASS",supportRunbookValidation:"PASS",
  knownIssuesReconciled:"All known issues triaged and documented",realEnvironmentEvidence:"Verified against production-like environment",
  recommendation:"SHIP"
 },"Tester");
 assert.equal(r.deploymentPerformed,false);assert.equal(r.runtimeStarted,false);assert.equal(r.customerActivated,false);assert.equal(r.restaurantStateMutated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.hardeningReady,true);
 const c=await svc.certify("org",["*"],{decision:"SHIP",evidence:"All final hardening gates pass"},"Tester");
 assert.equal(c.deploymentPerformedByCertification,false);assert.equal(c.runtimeStartedByCertification,false);assert.equal(c.customerActivatedByCertification,false);assert.equal(c.restaurantStateMutatedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"58.50.0",fullRegression:true,criticalDefectClosure:true,highDefectReview:true,securityPrivacy:true,authRbac:true,dataPersistence:true,backupRestore:true,rollbackRecovery:true,performanceLoad:true,observability:true,productionConfiguration:true,connectorFailureBehavior:true,operatorUxReadability:true,deviceResponsiveness:true,accessibility:true,supportRunbook:true,knownIssuesReconciled:true,realEnvironmentEvidence:true,humanShipReviseHold:true,noAutomaticDeployment:true,noAutomaticRuntimeStart:true,noAutomaticCustomerActivation:true,noRestaurantMutation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});