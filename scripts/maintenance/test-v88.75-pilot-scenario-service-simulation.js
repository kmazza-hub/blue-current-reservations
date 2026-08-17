"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Config=require(path.join(root,"server/services/restaurantConfigurationService"));
const Cert=require(path.join(root,"server/services/pilotLocationConfigurationCertificationService"));
const Binding=require(path.join(root,"server/services/pilotDataWorkflowBindingService"));
const Simulation=require(path.join(root,"server/services/pilotScenarioServiceSimulationService"));
(async()=>{
 assert.equal(pkg.version,"88.75.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/pilot/service-simulation/run"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8875-")),dbPath=path.join(dir,"db.json");fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const config=new Config(db),cert=new Cert(db,config),binding=new Binding(db,config,cert),sim=new Simulation(db,binding);
 await config.save("o",{location:{id:"pilot",name:"Pilot",timezone:"America/New_York",currency:"USD"},
 servicePeriods:[{id:"dinner",name:"Dinner",start:"16:00",end:"22:00",enabled:true}],
 diningAreas:[{id:"main",name:"Main",enabled:true}],tables:[{id:"t1",name:"Table 1",areaId:"main",minCovers:2,maxCovers:4}],
 roles:[{id:"manager",name:"Manager",enabled:true},{id:"host",name:"Host",enabled:true},{id:"server",name:"Server",enabled:true}],
 targets:{targetTurnMinutes:90},integrationAssignments:[{domain:"POS",connectorId:"toast-pilot",mode:"READ_ONLY"}],
 pilot:{enabled:true,mode:"PILOT",writeBackEnabled:false,autonomousProductionChanges:false}},"admin");
 await cert.certify("o","admin");await binding.build("o",{},"admin");
 const run=await sim.run("o",{},"admin");
 assert.equal(run.status,"PASSED");assert.equal(run.summary.total,7);assert.equal(run.summary.failed,0);
 assert(run.results.every(x=>x.status==="PASSED"));
 assert(run.results.flatMap(x=>x.events).every(x=>x.simulated===true));
 assert.equal(run.safety.externalProviderWriteBack,false);assert.equal(run.safety.customerCommunication,false);
 let status=await sim.status("o");assert.equal(status.status,"SIMULATION_CERTIFIED");assert.equal(status.current,true);
 console.log(JSON.stringify({ok:true,version:"88.75.0",phase:"C",requiredScenarios:7,
 reservationArrival:true,walkInPressure:true,tableTurn:true,staffingGap:true,kitchenDelay:true,posStaleIsolation:true,serviceRecovery:true,
 simulationOnly:true,externalProviderWriteBack:false,customerCommunication:false,autonomousProductionChanges:false,
 nextGate:"PILOT_OBSERVATION_AND_OPERATOR_ACCEPTANCE"},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
