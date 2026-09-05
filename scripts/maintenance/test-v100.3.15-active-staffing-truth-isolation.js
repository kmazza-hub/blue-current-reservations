"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");let passed=0;
function ok(name,value){if(!value)throw new Error(`FAIL: ${name}`);console.log(`PASS ${++passed}: ${name}`)}
const Service=require(path.join(root,"server/services/timeClockService.js"));
class MemoryDb{constructor(data){this.data=JSON.parse(JSON.stringify(data))}async read(){return JSON.parse(JSON.stringify(this.data))}}
const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);
const old=new Date(start.getTime()-86400000).toISOString(),current=new Date(Math.max(start.getTime()+60000,now.getTime()-3600000)).toISOString();
const data={employees:[{id:"old",organizationId:"org",locationId:"loc",status:"active",name:"Old",role:"Server"},{id:"now",organizationId:"org",locationId:"loc",status:"active",name:"Now",role:"Host"}],employeeTimecards:[{id:"old-card",organizationId:"org",locationId:"loc",employeeId:"old",clockIn:old,clockOut:null,status:"active"},{id:"now-card",organizationId:"org",locationId:"loc",employeeId:"now",clockIn:current,clockOut:null,status:"active"}],employeeBreaks:[],timeClockPolicies:[],timeClockCorrections:[]};
(async()=>{
 const service=fs.readFileSync(path.join(root,"server/services/timeClockService.js"),"utf8"),clockUi=fs.readFileSync(path.join(root,"client/js/timeclock-truth-v100.2.76.js"),"utf8"),index=fs.readFileSync(path.join(root,"client/index.html"),"utf8"),runtime=fs.readFileSync(path.join(root,"client/js/runtime-performance-v100.2.70.js"),"utf8");
 const snapshot=await new Service(new MemoryDb(data),{record:async()=>{}},{publish:()=>{}}).snapshot("org","loc");
 ok("Service declares active-truth isolation",service.includes("V100.3.15 — an unresolved prior-day punch"));
 ok("Current punch remains in working-now truth",snapshot.active.length===1&&snapshot.active[0].id==="now-card");
 ok("Prior-day open punch is excluded from working-now truth",!snapshot.active.some(x=>x.id==="old-card"));
 ok("Prior-day open punch remains in review collection",snapshot.review.length===1&&snapshot.review[0].id==="old-card");
 ok("Working summary excludes review punch",snapshot.summary.employeesWorking===1);
 ok("Review summary includes prior-day punch",snapshot.summary.missedPunches===1);
 ok("Labor totals exclude review punch",snapshot.summary.laborHours<=1.1);
 ok("Open review punch remains correctable in timecards",snapshot.timecards.some(x=>x.id==="old-card"&&x.requiresReview));
 ok("Time Clock names open review state",clockUi.includes("Open punch — not counted working"));
 ok("Time Clock review KPI uses service summary",clockUi.includes("state.summary?.missedPunches"));
 ok("Index advances Time Clock cache key",index.includes("timeclock-truth-v100.2.76.js?v=100.3.15"));
 ok("Runtime loader advances Time Clock cache key",runtime.includes("timeclock-truth-v100.2.76.js?v=100.3.15"));
 ok("Snapshot remains read-only",!service.includes("card.status = requiresReview"));
 console.log(`V100.3.15 validation ${passed}/13`);
})().catch(error=>{console.error(error);process.exit(1)});
