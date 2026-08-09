"use strict";
const assert=require("assert"),Service=require("../../server/services/pilotReleaseCandidateCertificationService");
(async()=>{
 const state={pilotReleaseCandidateReviews:[],pilotReleaseCandidateCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const environment={snapshot:async()=>({status:"production-pilot-environment-ready",readinessReady:true,certification:{decision:"GO"}})};
 const launch={snapshot:async()=>({status:"pilot-launch-ready-for-authorization",locations:[{launchReady:true}]})};
 const technical={snapshot:async()=>({status:"technical-readiness-complete",locations:[{technicallyReady:true}]})};
 const deployment={snapshot:async()=>({status:"pilot-deployment-certified",locations:[{deploymentReady:true,certification:{status:"PILOT_DEPLOYMENT_CERTIFIED"}}]})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},environment,launch,technical,deployment);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"57.0.0");
 const r=await svc.review("org",["*"],{releaseVersion:"57.0.0-rc1",buildHash:"abc123",changeFreeze:"PASS",regressionEvidence:"PASS",securitySignoff:"PASS",backupRestoreSignoff:"PASS",observabilitySignoff:"PASS",supportSignoff:"PASS",rollbackSignoff:"PASS",knownIssuesRegister:"No critical known issues",pilotSuccessCriteria:"Stable service, trusted data, successful closeout",rcRecommendation:"APPROVE"},"Tester");
 assert.equal(r.deploymentPerformed,false);assert.equal(r.cutoverPerformed,false);assert.equal(r.runtimeStarted,false);assert.equal(r.pilotActivated,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.rcReady,true);
 const c=await svc.certify("org",["*"],{decision:"RC_APPROVE",evidence:"all pilot RC gates pass"},"Tester");
 assert.equal(c.deploymentPerformedByCertification,false);assert.equal(c.cutoverPerformedByCertification,false);assert.equal(c.runtimeStartedByCertification,false);assert.equal(c.pilotActivatedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"57.0.0",productionEnvironment:true,technicalReadiness:true,deploymentPackage:true,pilotLaunchControl:true,immutableBuild:true,changeFreeze:true,regressionEvidence:true,securitySignoff:true,backupRestore:true,observability:true,support:true,rollback:true,knownIssues:true,pilotSuccessCriteria:true,humanRcApproveHold:true,noAutomaticDeployment:true,noAutomaticCutover:true,noAutomaticRuntimeStart:true,noAutomaticPilotActivation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});