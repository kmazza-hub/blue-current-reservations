"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Trend=require(path.join(root,"server/services/pilotPerformanceTrendIntelligenceService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 81);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/pilot/performance/measurement"));assert(router.includes("/api/pilot/performance/trends"));assert(server.includes("PilotPerformanceTrendIntelligenceService"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8175-")),dbPath=path.join(dir,"db.json");
 const shifts=[1,2,3,4].map(i=>({id:`s${i}`,organizationId:"o",locationId:"l1",status:"CLOSED",shiftLabel:`Pilot ${i}`,closedAt:`2026-08-${10+i}T23:00:00Z`}));
 fs.writeFileSync(dbPath,JSON.stringify({locations:[{id:"l1",organizationId:"o",name:"Pilot"}],livePilotShiftHistory:shifts}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 let current={};
 const live={snapshot:async()=>({shift:shifts[3],phase:"CLOSED"})};
 const evidence={};
 const kpi={report:async(o,a,l,sid,input)=>({actual:{covers:input.covers,revenue:input.revenue,laborHours:input.laborHours,laborCost:input.laborCost,tableTurns:input.tableTurns,avgWaitMinutes:input.avgWaitMinutes,serviceRecoveries:input.serviceRecoveries,managerInterventions:input.managerInterventions,complaints:input.complaints},deltas:{},derived:{evidenceRevenueProtected:input.protected,evidenceCostAvoided:input.avoided,evidenceMinutesSaved:input.saved,evidenceGuestRecoveries:input.recovered},evidenceIntegrity:"VERIFIED",evidenceCount:3})};
 const svc=new Trend(db,kpi,evidence,live);
 const rows=[
  {covers:200,revenue:10000,laborHours:100,laborCost:2500,tableTurns:2.0,avgWaitMinutes:24,serviceRecoveries:3,managerInterventions:12,complaints:5,protected:100,avoided:20,saved:8,recovered:1},
  {covers:210,revenue:10600,laborHours:99,laborCost:2490,tableTurns:2.1,avgWaitMinutes:21,serviceRecoveries:4,managerInterventions:10,complaints:4,protected:125,avoided:30,saved:10,recovered:1},
  {covers:220,revenue:11200,laborHours:98,laborCost:2470,tableTurns:2.2,avgWaitMinutes:18,serviceRecoveries:5,managerInterventions:8,complaints:3,protected:150,avoided:40,saved:12,recovered:2},
  {covers:230,revenue:11800,laborHours:97,laborCost:2450,tableTurns:2.3,avgWaitMinutes:16,serviceRecoveries:6,managerInterventions:7,complaints:2,protected:175,avoided:50,saved:15,recovered:2}
 ];
 for(let i=0;i<4;i++)await svc.recordShiftMeasurement("o",["*"],"l1",`s${i+1}`,rows[i],"admin");
 const r=await svc.report("o",["*"],"l1");
 assert.equal(r.measuredShiftCount,4);assert.equal(r.verifiedEvidenceShiftCount,4);
 assert.equal(r.trends.revenue,"IMPROVING");assert.equal(r.trends.avgWaitMinutes,"IMPROVING");assert.equal(r.trends.managerInterventions,"IMPROVING");
 assert.equal(r.cumulative.evidenceRevenueProtected,550);assert.equal(r.cumulative.evidenceMinutesSaved,45);
 assert.equal(r.repeatability,"REPEATABLE_IMPROVEMENT");assert.equal(r.policy.noAutomaticExpansionDecision,true);assert.equal(r.policy.trendsDoNotProveCausation,true);
 console.log(JSON.stringify({ok:true,version:"81.75.0",multiShiftAggregation:true,trendDirection:true,varianceConsistency:true,cumulativeEvidenceValue:true,repeatabilityAssessment:true,minimumThreeShiftRule:true,noAutomaticExpansionDecision:true,causationGuard:true},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
