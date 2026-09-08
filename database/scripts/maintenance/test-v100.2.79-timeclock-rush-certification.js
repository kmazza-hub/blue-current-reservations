"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=path.resolve(__dirname,"../..");let p=0;const checks=[];
function ok(name,condition){checks.push(name);if(!condition)throw new Error(`FAIL: ${name}`);p++;console.log(`PASS ${p}: ${name}`)}
const Service=require(path.join(root,"server/services/timeClockService.js"));
class MemoryDb{
  constructor(seed){this.data=JSON.parse(JSON.stringify(seed));}
  async read(){return JSON.parse(JSON.stringify(this.data));}
  async mutate(fn){const draft=JSON.parse(JSON.stringify(this.data));const result=await fn(draft);this.data=draft;return result;}
}
const auditEvents=[],rtEvents=[];
const audit={record:async event=>auditEvents.push(event)};
const realtime={publish:(name,payload)=>rtEvents.push({name,payload:JSON.parse(JSON.stringify(payload))})};
const base={
 employees:[
  {id:"emp_1",organizationId:"org_1",locationId:"loc_1",status:"active",name:"Alex",role:"Server",pin:"1111"},
  {id:"emp_2",organizationId:"org_1",locationId:"loc_1",status:"active",name:"Jordan",role:"Bartender",pin:"2222"},
  {id:"emp_3",organizationId:"org_1",locationId:"loc_1",status:"active",name:"Sam",role:"Host",pin:"3333"},
  {id:"emp_4",organizationId:"org_1",locationId:"loc_2",status:"active",name:"Taylor",role:"Server",pin:"4444"},
  {id:"emp_x",organizationId:"org_2",locationId:"loc_x",status:"active",name:"Other",role:"Server",pin:"9999"}
 ],employeeTimecards:[],employeeBreaks:[],timeClockCorrections:[],timeClockPolicies:[]
};
const serviceHash=()=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"server/services/timeClockService.js"))).digest("hex");
(async()=>{
 const beforeHash=serviceHash();
 const db=new MemoryDb(base),svc=new Service(db,audit,realtime);
 const a=await svc.clockIn({employeeId:"emp_1",pin:"1111",locationId:"loc_1"},"Host","org_1");
 const b=await svc.clockIn({employeeId:"emp_2",pin:"2222",locationId:"loc_1"},"Host","org_1");
 const c=await svc.clockIn({employeeId:"emp_3",pin:"3333",locationId:"loc_1"},"Host","org_1");
 ok("Three rapid clock-ins persist independently",(await db.read()).employeeTimecards.length===3);
 ok("Rapid timecard identities remain unique",new Set([a.id,b.id,c.id]).size===3);
 let duplicateRejected=false;try{await svc.clockIn({employeeId:"emp_1",pin:"1111",locationId:"loc_1"},"Host","org_1");}catch(e){duplicateRejected=/already clocked in/.test(e.message)}
 ok("Duplicate active clock-in is rejected",duplicateRejected);

 const ba=await svc.startBreak({employeeId:"emp_1",paid:false},"Alex","org_1");
 const bb=await svc.startBreak({employeeId:"emp_2",paid:true},"Jordan","org_1");
 ok("Simultaneous employee breaks remain isolated",ba.timecardId===a.id&&bb.timecardId===b.id&&ba.id!==bb.id);
 let secondBreakRejected=false;try{await svc.startBreak({employeeId:"emp_1",paid:false},"Alex","org_1");}catch(e){secondBreakRejected=/already active/.test(e.message)}
 ok("Second active break for same timecard is rejected",secondBreakRejected);
 let snap=await svc.snapshot("org_1","loc_1");
 ok("Snapshot shows all three active employees",snap.active.length===3);
 ok("Snapshot shows exactly two employees on break",snap.active.filter(x=>x.onBreak).length===2);
 ok("Break state stays attached to correct employees",snap.active.find(x=>x.employeeId==="emp_1").onBreak&&snap.active.find(x=>x.employeeId==="emp_2").onBreak&&!snap.active.find(x=>x.employeeId==="emp_3").onBreak);

 await svc.endBreak({employeeId:"emp_1"},"Alex","org_1");
 snap=await svc.snapshot("org_1","loc_1");
 ok("Ending one break does not end another",!snap.active.find(x=>x.employeeId==="emp_1").onBreak&&snap.active.find(x=>x.employeeId==="emp_2").onBreak);
 await svc.clockOut({employeeId:"emp_2"},"Jordan","org_1");
 let state=await db.read();
 const emp2Break=state.employeeBreaks.find(x=>x.id===bb.id);
 ok("Clock-out safely closes that employee's active break",emp2Break.status==="completed"&&Boolean(emp2Break.end));
 snap=await svc.snapshot("org_1","loc_1");
 ok("Clocked-out employee is removed from active truth",!snap.active.some(x=>x.employeeId==="emp_2"));
 ok("Other active employees remain active after peer clock-out",snap.active.some(x=>x.employeeId==="emp_1")&&snap.active.some(x=>x.employeeId==="emp_3"));

 const corr=await svc.correct(c.id,{clockOut:new Date(Date.now()+60000).toISOString(),status:"active",reason:"Manager verified punch"},"Manager","org_1");
 ok("Correction with recorded clock-out resolves to completed",corr.after.status==="completed"&&Boolean(corr.after.clockOut));
 snap=await svc.snapshot("org_1","loc_1");
 ok("Corrected completed employee is not counted active",!snap.active.some(x=>x.employeeId==="emp_3"));
 const review=await svc.correct(c.id,{clockOut:null,status:"completed",reason:"Clock-out requires review"},"Manager","org_1");
 ok("Removing corrected clock-out produces needs_review",review.after.status==="needs_review"&&!review.after.clockOut);
 snap=await svc.snapshot("org_1","loc_1");
 ok("Needs-review record does not masquerade as working",!snap.active.some(x=>x.employeeId==="emp_3"));
 ok("Needs-review record appears in missed-punch truth",snap.summary.missedPunches===1);

 const d=await svc.clockIn({employeeId:"emp_4",pin:"4444",locationId:"loc_2"},"Host","org_1");
 const loc1=await svc.snapshot("org_1","loc_1"),loc2=await svc.snapshot("org_1","loc_2");
 ok("Location snapshots remain isolated",!loc1.active.some(x=>x.id===d.id)&&loc2.active.some(x=>x.id===d.id));
 let foreignRejected=false;try{await svc.clockIn({employeeId:"emp_x",pin:"9999",locationId:"loc_x"},"Other","org_1");}catch(e){foreignRejected=/not found/.test(e.message)}
 ok("Organization boundary rejects foreign employee",foreignRejected);

 state=await db.read();
 const allIds=[...state.employeeTimecards.map(x=>x.id),...state.employeeBreaks.map(x=>x.id),...state.timeClockCorrections.map(x=>x.id)];
 ok("All rush-created Time Clock identities are globally unique",new Set(allIds).size===allIds.length);
 ok("Every correction remains attached to one timecard",state.timeClockCorrections.every(x=>state.employeeTimecards.some(card=>card.id===x.timecardId&&card.employeeId===x.employeeId)));
 ok("Every break remains attached to one timecard",state.employeeBreaks.every(x=>state.employeeTimecards.some(card=>card.id===x.timecardId&&card.employeeId===x.employeeId)));
 ok("Realtime events were emitted for rush transitions",["timeclock:clocked-in","timeclock:break-started","timeclock:break-ended","timeclock:clocked-out","timeclock:timecard-corrected"].every(name=>rtEvents.some(e=>e.name===name)));
 ok("Audit records exist for rush mutations",auditEvents.length>=10&&auditEvents.every(e=>e.category==="timeclock"));

 const coverageSource=fs.readFileSync(path.join(root,"client/js/staff-role-coverage-v100.2.65.js"),"utf8");
 const attendanceSource=fs.readFileSync(path.join(root,"client/js/staff-attendance-v100.2.66.js"),"utf8");
 ok("Staffing coverage consumes Time Clock active truth",coverageSource.includes('Array.isArray(clock?.active)?clock.active:[]'));
 ok("Staffing coverage excludes employees currently on break",coverageSource.includes('active.filter(item=>!item.onBreak)'));
 ok("Attendance exceptions consume active clock-in identity only",attendanceSource.includes('(clock?.active||[]).map(card=>String(card.employeeId))'));
 ok("Staffing still requires published Scheduling truth",coverageSource.includes('schedule.publication.status!=="published"')&&attendanceSource.includes('schedule.publication.status!=="published"'));

 ok("V100.2.78 identity-integrity gate remains present",fs.existsSync(path.join(root,"scripts/maintenance/test-v100.2.78-timeclock-identity-integrity.js")));
 ok("V100.2.77 record-integrity gate remains present",fs.existsSync(path.join(root,"scripts/maintenance/test-v100.2.77-timeclock-record-integrity.js")));
 ok("V100.2.76 Time Clock truth surface remains present",fs.existsSync(path.join(root,"client/js/timeclock-truth-v100.2.76.js")));
 ok("Certification does not modify Time Clock service at runtime",serviceHash()===beforeHash);
 console.log(`V100.2.79 validation ${p}/${checks.length}`);
})().catch(error=>{console.error(error);process.exit(1)});
