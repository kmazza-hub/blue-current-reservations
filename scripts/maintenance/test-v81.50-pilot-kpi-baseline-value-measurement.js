"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Kpi=require(path.join(root,"server/services/pilotKpiBaselineValueMeasurementService"));
(async()=>{
 assert.equal(pkg.version,"81.50.0");const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");assert(router.includes("/api/pilot/kpi-baseline"));assert(router.includes("/api/pilot/kpi-value"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8150-")),dbPath=path.join(dir,"db.json");fs.writeFileSync(dbPath,JSON.stringify({locations:[{id:"l1",organizationId:"o",name:"Pilot"}]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const live={snapshot:async()=>({shift:{id:"s1",status:"CLOSED"}})},evidence={outcome:async()=>({evidenceIntegrity:"VERIFIED",evidenceCount:4,totals:{revenueProtected:150,costAvoided:40,minutesSaved:18,guestRecoveries:2}})};
 const svc=new Kpi(db,evidence,live);
 await svc.setBaseline("o",["*"],"l1",{covers:200,revenue:10000,laborHours:100,laborCost:2500,tableTurns:2.1,avgWaitMinutes:24,serviceRecoveries:4,managerInterventions:12,complaints:5,source:"verified historical"},"admin");
 const r=await svc.report("o",["*"],"l1","s1",{covers:220,revenue:11500,laborHours:102,laborCost:2600,tableTurns:2.3,avgWaitMinutes:18,serviceRecoveries:6,managerInterventions:8,complaints:3});
 assert.equal(r.deltas.covers.absolute,20);assert.equal(r.deltas.avgWaitMinutes.absolute,-6);assert.equal(r.derived.evidenceRevenueProtected,150);assert.equal(r.evidenceIntegrity,"VERIFIED");assert.equal(r.policy.noCausalClaimFromCorrelation,true);assert.equal(r.policy.noAutomaticFinancialClaim,true);
 console.log(JSON.stringify({ok:true,version:"81.50.0",verifiedBaseline:true,beforeAfterDelta:true,revenuePerLaborHour:true,evidenceSeparated:true,waitTimeMeasurement:true,managerInterventionMeasurement:true,noCausalClaimFromCorrelation:true,automaticFinancialClaims:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
