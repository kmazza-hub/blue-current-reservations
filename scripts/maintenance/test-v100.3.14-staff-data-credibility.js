"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");let passed=0;
function ok(name,value){if(!value)throw new Error(`FAIL: ${name}`);console.log(`PASS ${++passed}: ${name}`)}
const Service=require(path.join(root,"server/services/timeClockService.js"));
class MemoryDb{constructor(seed){this.data=JSON.parse(JSON.stringify(seed))}async read(){return JSON.parse(JSON.stringify(this.data))}}
const now=new Date(),todayStart=new Date(now);todayStart.setHours(0,0,0,0);
const old=new Date(todayStart.getTime()-36*3600000).toISOString();
const recent=new Date(now.getTime()-2*3600000).toISOString();
const seed={employees:[
 {id:"old",organizationId:"org",locationId:"loc",status:"active",name:"Old Punch",weeklyHours:12,hourlyRate:20},
 {id:"current",organizationId:"org",locationId:"loc",status:"active",name:"Current Punch",weeklyHours:12,hourlyRate:20}
],employeeTimecards:[
 {id:"tc_old",organizationId:"org",locationId:"loc",employeeId:"old",clockIn:old,clockOut:null,status:"active"},
 {id:"tc_current",organizationId:"org",locationId:"loc",employeeId:"current",clockIn:recent,clockOut:null,status:"active"}
],employeeBreaks:[],timeClockPolicies:[],timeClockCorrections:[]};
(async()=>{
 const source=fs.readFileSync(path.join(root,"server/services/timeClockService.js"),"utf8");
 const staff=fs.readFileSync(path.join(root,"client/js/staff-truth-v100.2.64.js"),"utf8");
 const index=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
 const runtime=fs.readFileSync(path.join(root,"client/js/runtime-performance-v100.2.70.js"),"utf8");
 ok("Service documents current-day overlap semantics",source.includes('V100.3.14 — "Today" is the overlap'));
 const snapshot=await new Service(new MemoryDb(seed),{record:async()=>{}},{publish:()=>{}}).snapshot("org","loc");
 const stale=[...(snapshot.active||[]),...(snapshot.review||[])].find(item=>item.id==="tc_old"),current=snapshot.active.find(item=>item.id==="tc_current");
 ok("Old open punch remains visible for review",Boolean(stale));
 ok("Old open punch is explicitly marked for review",stale.requiresReview&&stale.reviewReason==="Open punch began before today");
 ok("Old open punch cannot exceed one service day",stale.workedHours>=0&&stale.workedHours<=24);
 ok("Old open punch does not create overtime risk",stale.overtimeRisk===false);
 ok("Current punch keeps credible elapsed hours",current.workedHours>=1.9&&current.workedHours<=2.1&&!current.requiresReview);
 ok("Review summary includes stale open punch",snapshot.summary.missedPunches===1);
 ok("Labor totals use bounded today hours",snapshot.summary.laborHours<=26);
 ok("Staff view surfaces review summary as first priority",staff.includes('summary.missedPunches')&&staff.includes("Review missed punches"));
 ok("Staff view labels punch review truthfully",staff.includes("Needs punch review")&&staff.includes('item.requiresReview?" · review"'));
 ok("Staff runtime cache key advances",index.includes('staff-truth-v100.2.64.js?v=100.3.14'));
 ok("Runtime loader uses advanced Staff cache key",runtime.includes('staff-truth-v100.2.64.js?v=100.3.14'));
 ok("No runtime database mutation is introduced",!source.includes("card.status = requiresReview"));
 console.log(`V100.3.14 validation ${passed}/13`);
})().catch(error=>{console.error(error);process.exit(1)});
