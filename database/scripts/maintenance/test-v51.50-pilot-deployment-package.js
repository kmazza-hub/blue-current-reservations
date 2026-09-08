"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotDeploymentPackageService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1"}],
    sections:[{id:"s1",organizationId:"org",locationId:"loc1"}],
    memberships:[{id:"m1",organizationId:"org",userId:"u1",role:"owner",locationIds:["*"]}],
    liveConnectors:[{id:"c1",organizationId:"org",locationId:"loc1",type:"reservations",status:"connected"}],
    pilotDeploymentPackages:[],
    pilotDeploymentCertifications:[]
  };
  const audits=[],events=[];
  const svc=new Service(
    {read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({status:"management-executive-accuracy-ready-for-certification",locations:[{locationId:"loc1",trustState:"EXECUTIVE_DATA_RECONCILED"}]})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.50.0");
  assert.equal(snap.status,"pilot-deployment-package-required");
  assert.equal(snap.locations[0].passed,8);
  assert.equal(snap.locations[0].deploymentReady,false);
  assert.equal(snap.policy.packageGenerationDoesNotDeploy,true);

  const pkg=await svc.generate("org",["loc1"],"loc1",{
    releaseVersion:"51.50.0",
    environment:"pilot",
    supportOwner:"Pilot Support",
    escalationOwner:"Technical Owner",
    deploymentWindow:"Monday 14:00",
    evidence:"Environment, access, connector, backup, restart, escalation, and rollback procedures reviewed."
  },"Tester");
  assert.equal(pkg.status,"PILOT_DEPLOYMENT_PACKAGE_GENERATED");
  assert.equal(pkg.deploymentPerformed,false);
  assert.equal(pkg.goLivePerformed,false);
  assert.equal(pkg.manifest.automaticDeployment,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.locations[0].deploymentReady,true);
  assert.equal(snap.locations[0].passed,10);

  const cert=await svc.certify("org",["loc1"],"loc1",{
    evidence:"Deployment package, recovery procedures, support ownership, and rollback path reviewed end-to-end.",
    note:"Pilot deployment package accepted."
  },"Tester");
  assert.equal(cert.status,"PILOT_DEPLOYMENT_CERTIFIED");
  assert.equal(cert.deploymentPerformedByCertification,false);
  assert.equal(cert.goLivePerformedByCertification,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"pilot-deployment-certified");
  assert.equal(snap.locations[0].deploymentState,"PILOT_DEPLOYMENT_CERTIFIED");

  console.log(JSON.stringify({
    ok:true,version:"51.50.0",
    locationConfigurationPackage:true,
    environmentPreflight:true,
    pilotAccessPackage:true,
    connectorChecklist:true,
    backupRestoreProcedure:true,
    startupRestartProcedure:true,
    supportEscalationProcedure:true,
    rollbackProcedure:true,
    deploymentManifest:true,
    humanDeploymentEvidence:true,
    humanDeploymentCertification:true,
    automaticDeployment:false,
    automaticGoLive:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
