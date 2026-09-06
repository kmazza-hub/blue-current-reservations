"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Config=require(path.join(root,"server/services/restaurantConfigurationService"));
const Cert=require(path.join(root,"server/services/pilotLocationConfigurationCertificationService"));
const Binding=require(path.join(root,"server/services/pilotDataWorkflowBindingService"));
const Simulation=require(path.join(root,"server/services/pilotScenarioServiceSimulationService"));
const Acceptance=require(path.join(root,"server/services/pilotOperatorAcceptanceService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 89);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/pilot/operator-acceptance/observe"));
 assert(router.includes("/api/pilot/operator-acceptance/accept"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc890-")),dbPath=path.join(dir,"db.json");fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const binding={current:async()=>({ready:true,binding:{id:"binding-1",locationId:"loc-pilot"}})};
 const sim={status:async()=>({current:true,latest:{id:"simulation-1"}})};
 const acceptance=new Acceptance(db,sim,binding);
 let a=await acceptance.assess("o");assert.equal(a.ready,false);assert.equal(a.missingDimensions.length,7);
 const dimensions=acceptance.dimensions();
 for(const [index,step] of acceptance.workflowSteps().entries()){
   const d=dimensions[index%dimensions.length];
   await acceptance.observe("o",{dimension:d.id,workflowStep:step,evidenceType:"PHYSICAL_IPAD",environment:"HOSTED_PILOT",deviceId:"ipad-1",deviceModel:"iPad",osVersion:"iPadOS",network:"pilot-wifi",operatorName:"Test Operator",locationId:"loc-pilot",outcome:"CLEAR",capturedAt:new Date().toISOString(),score:4,note:`Operator physically verified ${step} on the hosted pilot iPad.`,blocker:false},"operator");
 }
 a=await acceptance.assess("o");assert.equal(a.ready,true);assert.equal(a.blockerCount,0);assert.equal(a.lowScoreDimensions.length,0);
 const accepted=await acceptance.accept("o",{statement:"Operator approves this physical hosted iPad workflow for controlled pilot progression.",physicalDeviceConfirmed:true,hostedEnvironmentConfirmed:true},"operator");
 assert.equal(accepted.status,"ACCEPTED");
 const current=await acceptance.current("o");assert.equal(current.current,true);assert.equal(current.status,"OPERATOR_ACCEPTED");
 assert.equal(current.acceptance.providerWriteBackEnabled,false);
 console.log(JSON.stringify({ok:true,version:"89.0.0",phase:"C",dimensions:7,humanObservationRequired:true,humanAcceptanceRequired:true,minimumAverageScore:3.5,unresolvedBlockersAllowed:false,simulationCannotSelfApprove:true,externalProviderWriteBack:false,autonomousProductionChanges:false,nextGate:"PILOT_READINESS_AND_LAUNCH_CONTROL"},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
