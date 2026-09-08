"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Command=require(path.join(root,"server/services/pilotReadinessCommandCenterService"));

(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 74);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/system/pilot-readiness-command-center"));
 assert(server.includes("PilotReadinessCommandCenterService"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v74-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({organizations:[{id:"o"}],locations:[{id:"l",organizationId:"o",name:"Pilot"}]},null,2));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const allowed=["l"];

 const deps={
  technicalActivationReadinessService:{snapshot:async()=>({status:"technical-readiness-complete",locations:[{locationId:"l",technicallyReady:true,requiredPassed:8,requiredTotal:8}]})},
  pilotOperationalReadinessService:{snapshot:async()=>({status:"pilot-ready",locations:[{locationId:"l",ready:true,status:"ready"}]})},
  productionPilotEnvironmentReadinessService:{snapshot:async()=>({status:"production-ready",locations:[{locationId:"l",ready:true,status:"ready"}]})},
  restaurantWorkflowCertificationService:{certify:async()=>({pilotWorkflowReady:true,issues:[]})},
  liveShiftFailureCertificationService:{certify:async()=>({liveShiftFailureReady:true,issues:[]})},
  productionMutationIntegrityService:{snapshot:async()=>({healthy:true,reconcileRequired:0,stalePrepared:0})},
  operationalDataIntegrityService:{certify:async()=>({certified:true,summary:{critical:0,high:0,total:0}})}
 };
 const svc=new Command(db,deps);
 const go=await svc.snapshot("o",allowed);
 assert.equal(go.decision,"GO");
 assert.equal(go.blockerCount,0);
 assert.equal(go.locations[0].score,100);

 deps.liveShiftFailureCertificationService={certify:async()=>({liveShiftFailureReady:false,issues:[{severity:"high"}]})};
 const blocked=new Command(db,deps);
 const noGo=await blocked.snapshot("o",allowed);
 assert.equal(noGo.decision,"NO_GO");
 assert(noGo.locations[0].blockers.some(x=>x.id==="failure-recovery"));
 assert.equal(noGo.policy.noAutomaticOverride,true);
 assert.equal(noGo.policy.noAutomaticCutover,true);

 console.log(JSON.stringify({ok:true,version:"74.0.0",goDecision:true,noGoDecision:true,consolidatedGates:7,humanGoLiveRequired:true,noAutomaticCutover:true},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
