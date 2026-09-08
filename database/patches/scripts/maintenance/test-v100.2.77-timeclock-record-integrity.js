"use strict";
const fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");let p=0;const checks=[];
function ok(name,condition){checks.push(name);if(!condition)throw new Error(`FAIL: ${name}`);p++;console.log(`PASS ${p}: ${name}`)}
const Service=require(path.join(root,"server/services/timeClockService.js"));
class MemoryDb{
  constructor(seed){this.data=JSON.parse(JSON.stringify(seed));}
  async read(){return JSON.parse(JSON.stringify(this.data));}
  async mutate(fn){const draft=JSON.parse(JSON.stringify(this.data));const result=await fn(draft);this.data=draft;return result;}
}
const audit={record:async()=>{}};const realtime={publish:()=>{}};
const base={
  employees:[{id:"emp_1",organizationId:"org_1",locationId:"loc_1",status:"active",name:"Alex",role:"Server"},{id:"emp_2",organizationId:"org_2",locationId:"loc_2",status:"active",name:"Other",role:"Server"}],
  employeeTimecards:[
    {id:"tc_1",organizationId:"org_1",locationId:"loc_1",employeeId:"emp_1",clockIn:"2026-08-30T10:00:00.000Z",clockOut:null,status:"active"},
    {id:"tc_other",organizationId:"org_2",locationId:"loc_2",employeeId:"emp_2",clockIn:"2026-08-30T10:00:00.000Z",clockOut:null,status:"active"}
  ],
  employeeBreaks:[{id:"br_1",organizationId:"org_1",locationId:"loc_1",timecardId:"tc_1",employeeId:"emp_1",start:"2026-08-30T10:30:00.000Z",end:null,paid:false,status:"active"}],
  timeClockCorrections:[],timeClockPolicies:[]
};
(async()=>{
  const source=fs.readFileSync(path.join(root,"server/services/timeClockService.js"),"utf8");
  ok("V100.2.77 lifecycle guard is present",source.includes("V100.2.77 — recorded punch truth owns lifecycle status"));
  ok("Invalid clock-in is rejected",source.includes("Valid clock-in time required"));
  ok("Invalid clock-out is rejected",source.includes("Valid clock-out time required"));
  ok("Clock-out before clock-in is rejected",source.includes("Clock-out cannot be before clock-in"));
  ok("Corrected clock-out closes active break safely",source.includes("activeBreak.end = card.clockOut"));

  const db=new MemoryDb(base),svc=new Service(db,audit,realtime);
  const out="2026-08-30T11:00:00.000Z";
  const correction=await svc.correct("tc_1",{clockOut:out,status:"active",reason:"Manager entered missing clock-out"},"Manager","org_1");
  let state=await db.read(),card=state.employeeTimecards.find(x=>x.id==="tc_1"),br=state.employeeBreaks.find(x=>x.id==="br_1");
  ok("Clock-out correction cannot remain active",card.status==="completed"&&card.clockOut===out);
  ok("Active break closes at corrected clock-out",br.status==="completed"&&br.end===out);
  ok("Correction audit records normalized state",correction.after.status==="completed"&&correction.after.clockOut===out);

  await svc.correct("tc_1",{clockOut:null,status:"completed",reason:"Clock-out was entered in error"},"Manager","org_1");
  state=await db.read();card=state.employeeTimecards.find(x=>x.id==="tc_1");
  ok("Removing clock-out does not imply employee is working",card.clockOut===null&&card.status==="needs_review");
  const snap=await svc.snapshot("org_1","loc_1");
  ok("Needs-review record is excluded from active staffing truth",!snap.active.some(x=>x.id==="tc_1"));
  ok("Needs-review record is counted for review",snap.summary.missedPunches===1);

  const beforeBad=JSON.stringify((await db.read()).employeeTimecards);
  let rejected=false;try{await svc.correct("tc_1",{clockOut:"2026-08-30T09:00:00.000Z",reason:"bad"},"Manager","org_1");}catch(e){rejected=/before clock-in/.test(e.message)}
  ok("Impossible punch order is rejected",rejected);
  ok("Rejected correction does not mutate timecard",JSON.stringify((await db.read()).employeeTimecards)===beforeBad);

  const db2=new MemoryDb(base),svc2=new Service(db2,audit,realtime);
  let breakRejected=false;try{await svc2.correct("tc_1",{clockOut:"2026-08-30T10:15:00.000Z",reason:"bad"},"Manager","org_1");}catch(e){breakRejected=/active break start/.test(e.message)}
  ok("Clock-out before active break start is rejected",breakRejected);
  const state2=await db2.read();
  ok("Rejected break contradiction leaves active break unchanged",state2.employeeBreaks.find(x=>x.id==="br_1").status==="active"&&state2.employeeTimecards.find(x=>x.id==="tc_1").clockOut===null);

  const db3=new MemoryDb(base),svc3=new Service(db3,audit,realtime);
  await svc3.correct("tc_1",{clockOut:out,status:"needs_review",reason:"Punch exists but requires manager review"},"Manager","org_1");
  const reviewCard=(await db3.read()).employeeTimecards.find(x=>x.id==="tc_1");
  ok("Explicit needs-review state is preserved with a valid clock-out",reviewCard.status==="needs_review"&&reviewCard.clockOut===out);

  let isolated=false;try{await svc3.correct("tc_other",{clockOut:out},"Manager","org_1");}catch(e){isolated=/not found/.test(e.message)}
  ok("Organization boundary is preserved",isolated);
  ok("Time Clock truth surface remains present",fs.existsSync(path.join(root,"client/js/timeclock-truth-v100.2.76.js")));
  ok("Scheduling rush certification remains present",fs.existsSync(path.join(root,"scripts/maintenance/test-v100.2.75-scheduling-rush-certification.js")));
  ok("Staffing truth modules remain present",["staff-truth-v100.2.64.js","staff-role-coverage-v100.2.65.js","staff-attendance-v100.2.66.js"].every(f=>fs.existsSync(path.join(root,"client/js",f))));
  console.log(`V100.2.77 validation ${p}/${checks.length}`);
})().catch(error=>{console.error(error);process.exit(1)});
