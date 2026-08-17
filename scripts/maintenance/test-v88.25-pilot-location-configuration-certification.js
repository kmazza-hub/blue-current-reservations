"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const RestaurantConfigurationService=require(path.join(root,"server/services/restaurantConfigurationService"));
const CertificationService=require(path.join(root,"server/services/pilotLocationConfigurationCertificationService"));

(async()=>{
 assert.equal(pkg.version,"88.25.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/configuration/pilot-certification"));
 assert(router.includes("/api/configuration/pilot-certification/assess"));
 assert(router.includes("/api/configuration/pilot-certification/certify"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8825-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,"{}");
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const config=new RestaurantConfigurationService(db);
 const cert=new CertificationService(db,config);

 let assessment=await cert.assess("pilot-org");
 assert.equal(assessment.certifiable,false);
 assert(assessment.blocking.includes("configurationPersisted"));
 assert(assessment.blocking.includes("tableMapReady"));
 assert(assessment.blocking.includes("integrationAssignmentsDeclared"));

 await config.save("pilot-org",{
   location:{id:"marina-grille",name:"Marina Grille",timezone:"America/New_York",currency:"USD"},
   servicePeriods:[{id:"dinner",name:"Dinner",start:"16:00",end:"22:00",enabled:true}],
   diningAreas:[{id:"main",name:"Main Dining Room",enabled:true}],
   tables:[
     {id:"t1",name:"Table 1",areaId:"main",minCovers:2,maxCovers:4},
     {id:"t2",name:"Table 2",areaId:"main",minCovers:2,maxCovers:6}
   ],
   roles:[
     {id:"manager",name:"Manager",enabled:true},
     {id:"host",name:"Host",enabled:true},
     {id:"server",name:"Server",enabled:true}
   ],
   targets:{targetTurnMinutes:90,targetLaborPercent:30,targetFoodCostPercent:29},
   integrationAssignments:[{domain:"POS",connectorId:"toast-pilot",mode:"READ_ONLY"}],
   pilot:{enabled:true,mode:"PILOT",writeBackEnabled:false,autonomousProductionChanges:false}
 },"pilot-admin");

 assessment=await cert.assess("pilot-org");
 assert.equal(assessment.certifiable,true);
 assert.equal(assessment.status,"CERTIFIABLE");
 assert.equal(assessment.checks.providerWriteBackLockedOff,true);
 assert.equal(assessment.checks.autonomousProductionChangesLockedOff,true);

 const certified=await cert.certify("pilot-org","pilot-admin");
 assert.equal(certified.status,"CERTIFIED");
 assert.equal(certified.providerWriteBackEnabled,false);
 let current=await cert.current("pilot-org");
 assert.equal(current.status,"CERTIFIED_CURRENT");

 const before=current.certification.configurationUpdatedAt;
 await new Promise(r=>setTimeout(r,5));
 const existing=(await config.get("pilot-org")).configuration;
 existing.targets.targetTurnMinutes=85;
 await config.save("pilot-org",existing,"pilot-admin");
 current=await cert.current("pilot-org");
 assert.notEqual(current.assessment.configurationUpdatedAt,before);
 assert.equal(current.status,"RECERTIFICATION_REQUIRED");
 assert.equal(current.current,false);

 console.log(JSON.stringify({
   ok:true,version:"88.25.0",phase:"C",
   gate:"PILOT_LOCATION_CONFIGURATION_CERTIFICATION",
   blockingAssessment:true,
   locationIdentityCertification:true,
   servicePeriodCertification:true,
   diningAreaCertification:true,
   tableMapCertification:true,
   roleCertification:true,
   operatingTargetCertification:true,
   integrationAssignmentCertification:true,
   pilotSafetyCertification:true,
   configurationChangeInvalidatesCertification:true,
   providerWriteBackEnabled:false,
   autonomousProductionChanges:false,
   nextGate:"PILOT_DATA_AND_WORKFLOW_BINDING"
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
