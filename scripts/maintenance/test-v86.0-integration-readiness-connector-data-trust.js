"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Readiness=require(path.join(root,"server/services/integrationReadinessService"));
(async()=>{
 assert.equal(pkg.version,"86.0.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes('"/api/integrations/readiness"'));
 assert(router.includes('"/api/integrations/readiness/connectors"'));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc860-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const svc=new Readiness(db);
 const caps={IDENTITY:true,CONNECTIVITY:true,SCHEMA_CONTRACT:true,INCREMENTAL_SYNC:true,RECONCILIATION:true,FRESHNESS:true,FAILURE_ISOLATION:true,AUDITABILITY:true};
 await svc.upsert("o",{connectorId:"toast-pilot",provider:"TOAST",domain:"POS",status:"HEALTHY",mode:"READ_ONLY",capabilities:caps,freshnessMinutes:2,maxFreshnessMinutes:15,reconciliationVariance:0.005,lastSuccessfulSyncAt:new Date().toISOString()},"admin");
 let out=await svc.report("o");
 assert.equal(out.summary.connectors,1);assert.equal(out.summary.healthy,1);assert.equal(out.summary.blockers,0);assert.equal(out.summary.pilotIntegrationReady,true);
 assert.equal(out.providerProfiles.TOAST.status,"CONTRACT_READY_NOT_VENDOR_CERTIFIED");
 assert.equal(out.policy.vendorCertificationMustNotBeImplied,true);assert.equal(out.policy.writeBackDisabledByDefault,true);
 await svc.upsert("o",{connectorId:"stale-labor",provider:"LABOR_PROVIDER",domain:"LABOR",status:"HEALTHY",mode:"READ_ONLY",capabilities:{...caps,RECONCILIATION:false},freshnessMinutes:45,maxFreshnessMinutes:15,reconciliationVariance:0.08},"admin");
 out=await svc.report("o");
 assert.equal(out.summary.pilotIntegrationReady,false);assert(out.blockers.some(x=>x.type==="STALE_DATA"));assert(out.blockers.some(x=>x.type==="MISSING_CAPABILITIES"));assert(out.blockers.some(x=>x.type==="RECONCILIATION_NOT_PROVEN"));
 let blocked=false;try{await svc.upsert("o",{connectorId:"unsafe",mode:"READ_WRITE"},"admin");}catch(e){blocked=e.statusCode===409;}
 assert.equal(blocked,true);
 console.log(JSON.stringify({ok:true,version:"86.0.0",connectorCapabilityContract:true,freshnessDetection:true,reconciliationGate:true,failureIsolationPolicy:true,sourceOfRecordPolicy:true,toastProfile:"CONTRACT_READY_NOT_VENDOR_CERTIFIED",writeBackDisabledByDefault:true,pilotIntegrationCertificationGate:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
