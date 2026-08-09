"use strict";
const fs=require("fs"),assert=require("assert");
const Service=require("../../server/services/v49ReleaseCertificationService");

(async()=>{
  const activation={
    status:"activation-approvals-complete",
    locations:[{locationId:"a",approval:{status:"APPROVED_FOR_ACTIVATION"}}],
    policy:{explicitHumanApprovalRequired:true,automaticApproval:false,automaticActivation:false,automaticDeployment:false}
  };
  const technical={
    status:"technical-readiness-complete",
    locations:[{locationId:"a",technicallyReady:true}],
    policy:{humanGoLiveAuthorizationRequired:true,authorizationDoesNotDeploy:true,automaticProvisioning:false,automaticCutover:false,automaticGoLive:false}
  };
  const deployment={
    status:"deployment-package-review",
    locations:[{locationId:"a",packageState:"READY_FOR_DEPLOYMENT_EXECUTION"}],
    policy:{packagePreparationDoesNotDeploy:true,deploymentExecutionSeparate:true,automaticProvisioning:false,automaticDeployment:false,automaticCutover:false}
  };
  const command={
    status:"cutover-results-complete",
    locations:[{locationId:"a",result:{status:"CUTOVER_SUCCEEDED"}}],
    policy:{explicitExecutionAuthorizationRequired:true,authorizationDoesNotExecuteDeployment:true,resultRecordingIsManual:true,automatedCutover:false,autonomousProductionDeployment:false}
  };
  const stabilization={
    status:"stabilization-complete",
    locations:[{locationId:"a",declaration:{decision:"STABLE"}}],
    policy:{observationIsHumanRecorded:true,rollbackRecommendationIsAdvisory:true,humanStabilizationDeclarationRequired:true,autonomousRollback:false,automaticStableDeclaration:false}
  };

  const svc=new Service(
    {},
    {snapshot:async()=>activation},
    {snapshot:async()=>technical},
    {snapshot:async()=>deployment},
    {snapshot:async()=>command},
    {snapshot:async()=>stabilization}
  );
  const snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.version,"49.30.0");
  assert.equal(snap.status,"V49-CERTIFIED-LIVE");
  assert.equal(snap.architecturePassed,5);
  assert.equal(snap.architectureTotal,5);
  assert.equal(snap.liveStatePassed,5);
  assert.equal(snap.policy.automaticApproval,false);
  assert.equal(snap.policy.automaticProvisioning,false);
  assert.equal(snap.policy.automaticDeployment,false);
  assert.equal(snap.policy.automaticCutover,false);
  assert.equal(snap.policy.automaticGoLive,false);
  assert.equal(snap.policy.autonomousRollback,false);
  assert.equal(snap.policy.humanRolloutControl,true);

  const router=fs.readFileSync("server/api/router.js","utf8");
  [
    "/api/rollout-activation-control",
    "/api/technical-activation-readiness",
    "/api/location-deployment-package",
    "/api/go-live-command",
    "/api/launch-stabilization",
    "/api/v49-release-certification"
  ].forEach(x=>assert(router.includes(x),`missing ${x}`));

  assert(router.includes('authService.can(auth,"admin")'),"admin permission boundaries missing");
  assert(router.includes('error:"Location is outside your authorized scope."'),"location authorization boundary missing");

  const html=fs.readFileSync("client/index.html","utf8");
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,"duplicate HTML ids");
  [
    "rolloutActivationControl",
    "technicalActivationReadiness",
    "locationDeploymentPackage",
    "goLiveCommand",
    "launchStabilization",
    "v49ReleaseCertification"
  ].forEach(x=>assert(html.includes(`id="${x}"`),`missing center ${x}`));

  const app=fs.readFileSync("client/js/app-v15.1.3.js","utf8");
  [
    "rolloutActivationControlModule",
    "technicalActivationReadinessModule",
    "locationDeploymentPackageModule",
    "goLiveCommandModule",
    "launchStabilizationModule",
    "v49ReleaseCertificationModule"
  ].forEach(x=>assert(app.includes(`const ${x} =`),`missing startup module ${x}`));

  console.log(JSON.stringify({
    ok:true,
    version:"49.30.0",
    status:snap.status,
    architectureContracts:"5/5",
    liveStateContracts:"5/5",
    routesCertified:6,
    duplicateHtmlIds:0,
    humanRolloutControl:true,
    automaticApproval:false,
    automaticProvisioning:false,
    automaticDeployment:false,
    automaticCutover:false,
    automaticGoLive:false,
    autonomousRollback:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
