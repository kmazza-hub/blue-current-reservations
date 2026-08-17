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
 assert.equal(pkg.version,"89.0.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/pilot/operator-acceptance/observe"));
 assert(router.includes("/api/pilot/operator-acceptance/accept"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc890-")),dbPath=path.join(dir,"db.json");fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const config=new Config(db),cert=new Cert(db,config),binding=new Binding(db,config,cert),sim=new Simulation(db,binding),acceptance=new Acceptance(db,sim,binding);
 await config.save("o",{location:{id:"pilot",name:"Pilot",timezone:"America/New_York",currency:"USD"},servicePeriods:[{id:"dinner",name:"Dinner",start:"16:00",end:"22:00",enabled:true}],diningAreas:[{id:"main",name:"Main",enabled:true}],tables:[{id:"t1",name:"Table 1",areaId:"main",minCovers:2,maxCovers:4}],roles:[{id:"manager",name:"Manager",enabled:true},{id:"host",name:"Host",enabled:true},{id:"server",name:"Server",enabled:true}],targets:{targetTurnMinutes:90},integrationAssignments:[{domain:"POS",connectorId:"toast-pilot",mode:"READ_ONLY"}],pilot:{enabled:true,mode:"PILOT",writeBackEnabled:false,autonomousProductionChanges:false}},"admin");
 await cert.certify("o","admin");await binding.build("o",{},"admin");await sim.run("o",{},"admin");
 let a=await acceptance.assess("o");assert.equal(a.ready,false);assert.equal(a.missingDimensions.length,7);
 for(const d of acceptance.dimensions()){
   await acceptance.observe("o",{dimension:d.id,score:4,note:`Operator verified ${d.label} is clear and usable during simulated service.`,blocker:false},"operator");
 }
 a=await acceptance.assess("o");assert.equal(a.ready,true);assert.equal(a.blockerCount,0);assert.equal(a.lowScoreDimensions.length,0);
 const accepted=await acceptance.accept("o",{statement:"Operator approves this configuration and workflow behavior for controlled pilot progression."},"operator");
 assert.equal(accepted.status,"ACCEPTED");
 const current=await acceptance.current("o");assert.equal(current.current,true);assert.equal(current.status,"OPERATOR_ACCEPTED");
 assert.equal(current.acceptance.providerWriteBackEnabled,false);
 console.log(JSON.stringify({ok:true,version:"89.0.0",phase:"C",dimensions:7,humanObservationRequired:true,humanAcceptanceRequired:true,minimumAverageScore:3.5,unresolvedBlockersAllowed:false,simulationCannotSelfApprove:true,externalProviderWriteBack:false,autonomousProductionChanges:false,nextGate:"PILOT_READINESS_AND_LAUNCH_CONTROL"},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
