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
const audit={record:async()=>{}};const events=[];const realtime={publish:(name,payload)=>events.push({name,payload})};
const base={
  employees:[
    {id:"emp_1",organizationId:"org_1",locationId:"loc_1",status:"active",name:"Alex",role:"Server",pin:"1111"},
    {id:"emp_2",organizationId:"org_1",locationId:"loc_1",status:"active",name:"Jordan",role:"Server",pin:"2222"},
    {id:"emp_3",organizationId:"org_2",locationId:"loc_2",status:"active",name:"Other",role:"Server",pin:"3333"}
  ],employeeTimecards:[],employeeBreaks:[],timeClockCorrections:[],timeClockPolicies:[]
};
(async()=>{
  const source=fs.readFileSync(path.join(root,"server/services/timeClockService.js"),"utf8");
  ok("V100.2.78 uses cryptographic record identity",source.includes('crypto.randomUUID()'));
  ok("Timecard ids use shared identity helper",source.includes('id: this.recordId("tc")'));
  ok("Break ids use shared identity helper",source.includes('id: this.recordId("break")'));
  ok("Correction ids use shared identity helper",source.includes('id: this.recordId("tcc")'));
  ok("Timestamp-only timecard ids are retired",!source.includes('id: `tc_${Date.now()}`'));
  ok("Timestamp-only break ids are retired",!source.includes('id: `break_${Date.now()}`'));
  ok("Timestamp-only correction ids are retired",!source.includes('id: `tcc_${Date.now()}`'));

  const db=new MemoryDb(base),svc=new Service(db,audit,realtime);
  const realNow=Date.now; Date.now=()=>1788087600000;
  try{
    const one=await svc.clockIn({employeeId:"emp_1",pin:"1111",locationId:"loc_1"},"Host","org_1");
    const two=await svc.clockIn({employeeId:"emp_2",pin:"2222",locationId:"loc_1"},"Host","org_1");
    ok("Same-millisecond clock-ins receive different ids",one.id!==two.id);
    ok("Timecard ids retain tc prefix",one.id.startsWith("tc_")&&two.id.startsWith("tc_"));
    ok("Both same-millisecond timecards persist",(await db.read()).employeeTimecards.length===2);

    const b1=await svc.startBreak({employeeId:"emp_1",paid:false},"Alex","org_1");
    const b2=await svc.startBreak({employeeId:"emp_2",paid:true},"Jordan","org_1");
    ok("Same-millisecond breaks receive different ids",b1.id!==b2.id);
    ok("Break ids retain break prefix",b1.id.startsWith("break_")&&b2.id.startsWith("break_"));
    ok("Break ownership remains tied to the correct timecard",b1.timecardId===one.id&&b2.timecardId===two.id&&b1.timecardId!==b2.timecardId);

    await svc.endBreak({employeeId:"emp_1"},"Alex","org_1");
    await svc.endBreak({employeeId:"emp_2"},"Jordan","org_1");
    const c1=await svc.correct(one.id,{status:"active",reason:"Verified punch"},"Manager","org_1");
    const c2=await svc.correct(two.id,{status:"active",reason:"Verified punch"},"Manager","org_1");
    ok("Same-millisecond corrections receive different ids",c1.id!==c2.id);
    ok("Correction ids retain tcc prefix",c1.id.startsWith("tcc_")&&c2.id.startsWith("tcc_"));
    ok("Correction ownership remains isolated",c1.timecardId===one.id&&c2.timecardId===two.id);

    const state=await db.read();
    const allIds=[...state.employeeTimecards.map(x=>x.id),...state.employeeBreaks.map(x=>x.id),...state.timeClockCorrections.map(x=>x.id)];
    ok("All generated Time Clock record ids are unique",new Set(allIds).size===allIds.length);
    ok("Two employees remain independently active",state.employeeTimecards.filter(x=>x.status==="active"&&!x.clockOut).length===2);
    const snap=await svc.snapshot("org_1","loc_1");
    ok("Snapshot preserves both active employees",snap.active.length===2&&new Set(snap.active.map(x=>x.employeeId)).size===2);

    let orgRejected=false;try{await svc.clockIn({employeeId:"emp_3",pin:"3333",locationId:"loc_2"},"Other","org_1");}catch(e){orgRejected=/not found/.test(e.message)}
    ok("Organization boundary remains enforced",orgRejected);
    const createdEvents=events.filter(e=>["timeclock:clocked-in","timeclock:break-started","timeclock:timecard-corrected"].includes(e.name));
    ok("Creation events retain unique generated identities",new Set(createdEvents.map(e=>e.payload.id)).size===createdEvents.length);
  } finally { Date.now=realNow; }

  ok("V100.2.77 record-integrity gate remains present",fs.existsSync(path.join(root,"scripts/maintenance/test-v100.2.77-timeclock-record-integrity.js")));
  ok("V100.2.76 Time Clock truth surface remains present",fs.existsSync(path.join(root,"client/js/timeclock-truth-v100.2.76.js")));
  ok("Scheduling rush certification remains present",fs.existsSync(path.join(root,"scripts/maintenance/test-v100.2.75-scheduling-rush-certification.js")));
  ok("Staffing truth modules remain present",["staff-truth-v100.2.64.js","staff-role-coverage-v100.2.65.js","staff-attendance-v100.2.66.js"].every(f=>fs.existsSync(path.join(root,"client/js",f))));
  console.log(`V100.2.78 validation ${p}/${checks.length}`);
})().catch(error=>{console.error(error);process.exit(1)});
