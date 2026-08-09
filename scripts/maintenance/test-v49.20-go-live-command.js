"use strict";
const assert=require("assert");
const Service=require("../../server/services/goLiveCommandService");

(async()=>{
  const state={
    goLiveCommands:[],
    goLiveCutoverResults:[],
    locationDeploymentPackages:[{
      id:"pkg1",organizationId:"org",locationId:"a",status:"READY_FOR_DEPLOYMENT_EXECUTION",
      deploymentExecutionState:"NOT_STARTED",productionCutoverState:"NOT_PERFORMED",
      deploymentOwner:"Deploy Lead",rollbackOwner:"Rollback Lead",launchWindow:"Friday 09:00"
    }]
  };
  const audit=[],events=[];
  const deployment={
    locations:[{
      locationId:"a",locationName:"A",wave:1,goLiveAuthorized:true,
      packageState:"READY_FOR_DEPLOYMENT_EXECUTION",
      deploymentPackage:state.locationDeploymentPackages[0]
    }]
  };
  const technical={
    locations:[{
      locationId:"a",locationName:"A",wave:1,technicallyReady:true,
      goLiveAuthorization:{status:"AUTHORIZED_FOR_GO_LIVE",overrideUsed:false}
    }]
  };
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>deployment},
    {snapshot:async()=>technical}
  );

  let snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.version,"49.20.0");
  assert.equal(snap.locations[0].finalPreCutoverPassed,true);
  assert.equal(snap.policy.autonomousProductionDeployment,false);

  const cmd=await svc.authorizeExecution("org",["a"],"a",{
    deploymentOperator:"Deploy Lead",
    rollbackOperator:"Rollback Lead",
    launchWindow:"Friday 09:00"
  },"Tester");

  assert.equal(cmd.status,"AUTHORIZED_FOR_MANUAL_CUTOVER");
  assert.equal(cmd.deploymentExecutionState,"AUTHORIZED_NOT_EXECUTED");
  assert.equal(cmd.productionCutoverState,"NOT_PERFORMED");

  let badSuccess=false;
  try{
    await svc.recordResult("org",["a"],"a",{status:"CUTOVER_SUCCEEDED",deploymentOperator:"Deploy Lead",apiHealthy:true},"Tester");
  }catch(e){badSuccess=/all post-cutover health checks/i.test(e.message);}
  assert(badSuccess);

  const result=await svc.recordResult("org",["a"],"a",{
    status:"CUTOVER_SUCCEEDED",
    deploymentOperator:"Deploy Lead",
    rollbackOperator:"Rollback Lead",
    apiHealthy:true,
    authenticationHealthy:true,
    reservationIntegrity:true,
    floorIntegrity:true,
    kitchenIntegrity:true,
    workforceIntegrity:true,
    note:"Manual cutover completed by deployment operator."
  },"Tester");

  assert.equal(result.status,"CUTOVER_SUCCEEDED");
  assert.equal(result.resultSource,"HUMAN_RECORDED");
  assert.equal(result.systemExecutionClaim,false);
  assert.equal(result.postCutoverHealth.passed,6);
  assert.equal(state.locationDeploymentPackages[0].deploymentExecutionState,"MANUAL_CUTOVER_RECORDED");
  assert.equal(state.locationDeploymentPackages[0].productionCutoverState,"CUTOVER_SUCCEEDED");

  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.locations[0].productionState,"CUTOVER_RECORDED_SUCCESS");
  assert.equal(snap.status,"cutover-results-complete");
  assert.equal(audit.length,2);
  assert.equal(events.length,2);

  console.log(JSON.stringify({
    ok:true,version:"49.20.0",
    finalPreCutoverChecks:true,
    manualExecutionAuthorization:true,
    incompleteHealthBlocked:true,
    manualCutoverResult:true,
    postCutoverHealth:true,
    systemExecutionClaim:false,
    automatedCutover:false,
    autonomousProductionDeployment:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
