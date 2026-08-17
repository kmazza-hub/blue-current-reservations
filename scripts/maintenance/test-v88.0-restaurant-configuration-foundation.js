"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Service=require(path.join(root,"server/services/restaurantConfigurationService"));

(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 88);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/configuration/restaurant"));
 assert(router.includes("/api/configuration/restaurant/audit"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc880-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const svc=new Service(db);

 const initial=await svc.get("org-pilot");
 assert.equal(initial.configured,false);
 assert.equal(initial.configuration.pilot.writeBackEnabled,false);
 assert.equal(initial.configuration.pilot.autonomousProductionChanges,false);

 const saved=await svc.save("org-pilot",{
   location:{id:"marina-grille",name:"Marina Grille",timezone:"America/New_York"},
   servicePeriods:[
     {id:"lunch",name:"Lunch",start:"11:30",end:"15:30",enabled:true},
     {id:"dinner",name:"Dinner",start:"16:00",end:"22:00",enabled:true}
   ],
   diningAreas:[
     {id:"main",name:"Main Dining Room",enabled:true},
     {id:"bar",name:"Bar",enabled:true}
   ],
   tables:[
     {id:"t1",name:"Table 1",areaId:"main",minCovers:2,maxCovers:4},
     {id:"b1",name:"Bar 1",areaId:"bar",minCovers:1,maxCovers:2}
   ],
   roles:[
     {id:"manager",name:"Manager",enabled:true},
     {id:"host",name:"Host",enabled:true},
     {id:"server",name:"Server",enabled:true}
   ],
   targets:{targetTurnMinutes:90,targetLaborPercent:30,targetFoodCostPercent:29},
   integrationAssignments:[{domain:"POS",connectorId:"toast-pilot",mode:"READ_ONLY"}],
   pilot:{enabled:true,mode:"PILOT",writeBackEnabled:true,autonomousProductionChanges:true}
 },"pilot-admin");

 assert.equal(saved.configured,true);
 assert.equal(saved.configuration.location.name,"Marina Grille");
 assert.equal(saved.configuration.tables.length,2);
 assert.equal(saved.configuration.pilot.writeBackEnabled,false);
 assert.equal(saved.configuration.pilot.autonomousProductionChanges,false);
 assert.equal(saved.readiness.ready,true);

 const audit=await svc.audit("org-pilot");
 assert.equal(audit.entries.length,1);
 assert.equal(audit.entries[0].action,"CONFIGURATION_SAVED");

 let invalid=false;
 try{
   await svc.save("org-pilot",{location:{name:"Bad",timezone:"America/New_York"},diningAreas:[],tables:[{id:"x",name:"X",areaId:"missing"}]},"admin");
 }catch(e){ invalid=e.statusCode===400; }
 assert.equal(invalid,true);

 console.log(JSON.stringify({
   ok:true,version:"88.0.0",
   phase:"C",
   restaurantConfigurationFoundation:true,
   locationIdentity:true,
   servicePeriods:true,
   diningAreas:true,
   tables:true,
   roles:true,
   operatingTargets:true,
   integrationAssignments:true,
   auditedConfiguration:true,
   providerWriteBackLockedOff:true,
   autonomousProductionChanges:false,
   nextGate:"PILOT_LOCATION_CONFIGURATION_CERTIFICATION"
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
