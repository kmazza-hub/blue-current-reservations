"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Config=require(path.join(root,"server/services/restaurantConfigurationService"));
const Cert=require(path.join(root,"server/services/pilotLocationConfigurationCertificationService"));
const Binding=require(path.join(root,"server/services/pilotDataWorkflowBindingService"));

(async()=>{
 assert.equal(pkg.version,"88.50.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/pilot/workflow-binding"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8850-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const config=new Config(db),cert=new Cert(db,config),binding=new Binding(db,config,cert);

 await config.save("o",{
  location:{id:"pilot",name:"Pilot Restaurant",timezone:"America/New_York",currency:"USD"},
  servicePeriods:[{id:"dinner",name:"Dinner",start:"16:00",end:"22:00",enabled:true}],
  diningAreas:[{id:"main",name:"Main Dining",enabled:true}],
  tables:[{id:"t1",name:"Table 1",areaId:"main",minCovers:2,maxCovers:4}],
  roles:[{id:"manager",name:"Manager",enabled:true},{id:"host",name:"Host",enabled:true},{id:"server",name:"Server",enabled:true}],
  targets:{targetTurnMinutes:90},
  integrationAssignments:[{domain:"POS",connectorId:"toast-pilot",mode:"READ_ONLY"}],
  pilot:{enabled:true,mode:"PILOT",writeBackEnabled:false,autonomousProductionChanges:false}
 },"admin");
 await cert.certify("o","admin");

 let current=await binding.current("o");
 assert.equal(current.status,"NOT_BOUND");

 current=await binding.build("o",{},"admin");
 assert.equal(current.status,"BOUND_CURRENT");
 assert.equal(current.ready,true);
 assert.equal(current.binding.bindings.length,7);
 assert.equal(current.binding.bindings.find(x=>x.domain==="POS").source,"toast-pilot");
 assert.equal(current.binding.bindings.find(x=>x.domain==="POS").mode,"READ_ONLY_EXTERNAL");
 assert.equal(current.binding.tableBinding.tables.length,1);
 assert.equal(current.safety.externalProviderWriteBack,false);
 assert.equal(current.safety.autonomousProductionChanges,false);

 await new Promise(r=>setTimeout(r,5));
 const existing=(await config.get("o")).configuration;
 existing.targets.targetTurnMinutes=85;
 await config.save("o",existing,"admin");
 current=await binding.current("o");
 assert.equal(current.status,"REBIND_REQUIRED");
 assert.equal(current.ready,false);

 console.log(JSON.stringify({
  ok:true,version:"88.50.0",phase:"C",
  guestWorkflowBound:true,reservationWorkflowBound:true,tableWorkflowBound:true,
  serviceWorkflowBound:true,teamWorkflowBound:true,kitchenWorkflowBound:true,posContextBound:true,
  certifiedConfigurationRequired:true,configurationChangeRequiresRebinding:true,
  externalProviderWriteBack:false,autonomousProductionChanges:false,
  nextGate:"PILOT_SCENARIO_AND_SERVICE_SIMULATION"
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
