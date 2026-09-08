"use strict";
const assert=require("assert");
const Service=require("../../server/services/locationDeploymentPackageService");

(async()=>{
  const state={locationDeploymentPackages:[]},audit=[],events=[];
  const technical={
    activationPlan:{id:"plan1"},
    locations:[
      {
        locationId:"a",locationName:"A",wave:1,technicallyReady:true,technicalReadinessPercent:100,
        goLiveAuthorization:{id:"auth1",status:"AUTHORIZED_FOR_GO_LIVE",approver:"CTO",launchWindow:"Monday 09:00",rollbackOwner:"Ops"},
        goLiveState:"AUTHORIZED_NOT_CUT_OVER",
        blockers:[],warnings:[{id:"external-connectivity"}],
        checks:[
          {id:"location-config",category:"configuration",label:"Config",required:true,passed:true,actual:"cfg_a"},
          {id:"auth-users",category:"identity",label:"Users",required:true,passed:true,actual:2},
          {id:"floor-model",category:"floor",label:"Floor",required:true,passed:true,actual:"10 tables"},
          {id:"reservation-model",category:"reservations",label:"Reservations",required:true,passed:true,actual:"local"},
          {id:"kitchen-model",category:"kitchen",label:"Kitchen",required:true,passed:true,actual:"3 stations"},
          {id:"workforce-model",category:"workforce",label:"Workforce",required:true,passed:true,actual:"8 people"},
          {id:"external-connectivity",category:"integrations",label:"Connectors",required:false,passed:false,actual:"none"}
        ]
      },
      {
        locationId:"b",locationName:"B",wave:2,technicallyReady:false,technicalReadinessPercent:50,
        goLiveAuthorization:null,goLiveState:"NOT_AUTHORIZED",blockers:[{id:"config"}],warnings:[],checks:[]
      }
    ]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>technical}
  );

  let snap=await svc.snapshot("org",["a","b"]);
  assert.equal(snap.version,"49.15.0");
  assert.equal(snap.status,"deployment-package-review");
  assert.equal(snap.locations[0].goLiveAuthorized,true);
  assert.equal(snap.policy.automaticDeployment,false);

  let blocked=false;
  try{await svc.prepare("org",["a","b"],"b",{deploymentOwner:"Ops",rollbackOwner:"Ops"},"Tester");}
  catch(e){blocked=/go-live authorization/i.test(e.message);}
  assert(blocked);

  const pkg=await svc.prepare("org",["a","b"],"a",{
    deploymentOwner:"Deployment Lead",
    rollbackOwner:"Rollback Lead",
    launchWindow:"Monday 09:00–10:00",
    rollbackTrigger:"Critical health failure",
    note:"Staged launch"
  },"Tester");

  assert.equal(pkg.status,"READY_FOR_DEPLOYMENT_EXECUTION");
  assert.equal(pkg.deploymentExecutionState,"NOT_STARTED");
  assert.equal(pkg.productionCutoverState,"NOT_PERFORMED");
  assert.equal(pkg.manifest.moduleEnablementMatrix.length,4);
  assert.ok(pkg.manifest.launchRunbook.length>=6);
  assert.ok(pkg.manifest.rollbackRunbook.actions.length>=4);
  assert.equal(audit.length,1);
  assert.equal(events[0][0],"location-deployment:package-prepared");

  snap=await svc.snapshot("org",["a","b"]);
  const a=snap.locations.find(x=>x.locationId==="a");
  assert.equal(a.packageState,"READY_FOR_DEPLOYMENT_EXECUTION");
  assert.equal(a.deploymentExecutionState,"NOT_STARTED");

  const packet=await svc.packet("org",["a","b"],"a");
  assert.equal(packet.package.productionCutoverState,"NOT_PERFORMED");
  assert.equal(packet.policy.packagePreparationDoesNotDeploy,true);

  console.log(JSON.stringify({
    ok:true,version:"49.15.0",
    goLiveAuthorizationRequired:true,
    deploymentManifest:true,
    moduleMatrix:true,
    rollbackRunbook:true,
    deploymentExecutionState:"NOT_STARTED",
    productionCutoverState:"NOT_PERFORMED",
    automaticProvisioning:false,
    automaticDeployment:false,
    automaticCutover:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
