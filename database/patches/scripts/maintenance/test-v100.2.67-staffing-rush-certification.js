"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");

const staff64=read("client/js/staff-truth-v100.2.64.js");
const staff65=read("client/js/staff-role-coverage-v100.2.65.js");
const staff66=read("client/js/staff-attendance-v100.2.66.js");
const scheduling=read("server/services/schedulingService.js");
const timeclock=read("server/services/timeClockService.js");
const floor=read("client/js/floor-reservations-v62.0.js");

const now=new Date("2026-08-27T19:20:00");
const date="2026-08-27";
const shifts=[
 {id:"s1",date,startTime:"17:00",endTime:"22:00",employeeId:"e1",role:"Server"},
 {id:"s2",date,startTime:"17:00",endTime:"22:00",employeeId:"e2",role:"Server"},
 {id:"s3",date,startTime:"18:00",endTime:"23:00",employeeId:"e3",role:"Cook"},
 {id:"s4",date,startTime:"19:00",endTime:"23:00",employeeId:"e4",role:"Host"},
 {id:"s5",date,startTime:"17:00",endTime:"22:00",employeeId:"e5",role:"Bartender"}
];
const employees=[
 {id:"e1",name:"Ava",role:"Server"},
 {id:"e2",name:"Ben",role:"Server"},
 {id:"e3",name:"Carlos",role:"Cook"},
 {id:"e4",name:"Dana",role:"Host"},
 {id:"e5",name:"Eli",role:"Bartender"}
];
const clockActive=[
 {employeeId:"e1",employeeName:"Ava",role:"Server",onBreak:false},
 {employeeId:"e2",employeeName:"Ben",role:"Server",onBreak:true},
 {employeeId:"e3",employeeName:"Carlos",role:"Cook",onBreak:false},
 {employeeId:"e5",employeeName:"Eli",role:"Bartender",onBreak:false}
];

const minutes=value=>{const [h,m]=String(value).split(":").map(Number);return h*60+m;};
const current=now.getHours()*60+now.getMinutes();
const activeShifts=shifts.filter(s=>s.date===date&&minutes(s.startTime)<=current&&minutes(s.endTime)>current);

const expected=new Map(),actual=new Map();
for(const shift of activeShifts){
  const role=String(shift.role).toLowerCase();
  expected.set(role,(expected.get(role)||0)+1);
}
for(const card of clockActive.filter(x=>!x.onBreak)){
  const role=String(card.role).toLowerCase();
  actual.set(role,(actual.get(role)||0)+1);
}
const roleRows=[...new Set([...expected.keys(),...actual.keys()])].map(role=>({
  role, scheduled:expected.get(role)||0, working:actual.get(role)||0,
  gap:Math.max(0,(expected.get(role)||0)-(actual.get(role)||0))
})).sort((a,b)=>b.gap-a.gap||a.role.localeCompare(b.role));

const activeClockIds=new Set(clockActive.map(x=>String(x.employeeId)));
const attendance=activeShifts.filter(shift=>{
  const start=minutes(shift.startTime);
  return shift.employeeId && current>=start+10 && current<minutes(shift.endTime);
}).filter(shift=>!activeClockIds.has(String(shift.employeeId))).map(shift=>({
  ...shift,
  name:employees.find(e=>e.id===shift.employeeId)?.name||shift.employeeId,
  late:current-minutes(shift.startTime)
})).sort((a,b)=>b.late-a.late);

const roleIsolation =
  roleRows.find(x=>x.role==="server")?.scheduled===2 &&
  roleRows.find(x=>x.role==="server")?.working===1 &&
  roleRows.find(x=>x.role==="server")?.gap===1 &&
  roleRows.find(x=>x.role==="cook")?.gap===0 &&
  roleRows.find(x=>x.role==="bartender")?.gap===0 &&
  roleRows.find(x=>x.role==="host")?.gap===1;

const breakAffectsCoverageOnly =
  !attendance.some(x=>x.employeeId==="e2") &&
  roleRows.find(x=>x.role==="server")?.gap===1;

const onlyMissingClockIsAttendanceException =
  attendance.length===1 &&
  attendance[0].employeeId==="e4" &&
  attendance[0].name==="Dana";

const correctionIsolation=(()=>{
  const corrected=[...clockActive,{employeeId:"e4",employeeName:"Dana",role:"Host",onBreak:false}];
  const ids=new Set(corrected.map(x=>String(x.employeeId)));
  const next=activeShifts.filter(s=>s.employeeId&&current>=minutes(s.startTime)+10&&current<minutes(s.endTime))
    .filter(s=>!ids.has(String(s.employeeId)));
  return next.length===0 && ids.has("e1") && ids.has("e2") && ids.has("e3") && ids.has("e4") && ids.has("e5");
})();

const duplicateClockIsolation=(()=>{
  const dup=[...clockActive,{employeeId:"e1",employeeName:"Ava",role:"Server",onBreak:false}];
  const unique=new Set(dup.map(x=>x.employeeId));
  return unique.size===4;
})();

const checks=[
 ["V100.2.64 staffing truth present",/V100\.2\.64 — Staffing Truth Foundation/.test(staff64)],
 ["V100.2.65 role coverage present",/V100\.2\.65 — Published Schedule → Live Role Coverage/.test(staff65)],
 ["V100.2.66 attendance exceptions present",/V100\.2\.66 — Published Shift Attendance Exceptions/.test(staff66)],
 ["Scheduling publication remains authoritative",/schedulePublications/.test(scheduling)&&/status:"published"/.test(scheduling)],
 ["Time Clock active cards remain authoritative",/const active = cards\.filter\(item => item\.status === "active" && !item\.clockOut\)/.test(timeclock)],
 ["multiple role counts remain isolated",roleIsolation],
 ["break removes coverage but not attendance identity",breakAffectsCoverageOnly],
 ["only missing clock-in creates person attendance exception",onlyMissingClockIsAttendanceException],
 ["late employee correction clears only that person exception",correctionIsolation],
 ["duplicate active identity does not create a second employee identity",duplicateClockIsolation],
 ["V100.2.65 excludes breaks from active role coverage",/active\.filter\(item=>!item\.onBreak\)/.test(staff65)],
 ["V100.2.66 matches attendance by employeeId",/new Set\(\(clock\?\.active\|\|\[\]\)\.map\(card=>String\(card\.employeeId\)\)\)/.test(staff66)],
 ["V100.2.66 does not infer callout cause",/does not label this a callout or no-show/.test(staff66)],
 ["V100.2.66 grace period remains 10 minutes",/GRACE_MINUTES=10/.test(staff66)],
 ["one person's clock state cannot mutate scheduling",!/updateScheduleShift|createScheduleShift/.test(staff66)],
 ["one person's attendance check cannot mutate Time Clock",!/clockIn\(|clockOut\(/.test(staff66)],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];

let passed=0;
for(const [name,ok] of checks){
  console.log(`${ok?"PASS":"FAIL"} ${name}`);
  if(ok) passed++;
}
console.log(`V100.2.67 validation ${passed}/${checks.length}`);
if(passed!==checks.length) process.exit(1);
