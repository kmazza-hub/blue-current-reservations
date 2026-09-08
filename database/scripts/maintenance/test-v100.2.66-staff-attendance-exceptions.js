"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/staff-attendance-v100.2.66.js");
const cov=read("client/js/staff-role-coverage-v100.2.65.js");
const staff=read("client/js/staff-truth-v100.2.64.js");
const scheduling=read("server/services/schedulingService.js");
const time=read("server/services/timeClockService.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");
const checks=[
 ["version marker",/V100\.2\.66 — Published Shift Attendance Exceptions/.test(mod)],
 ["requires published schedule",/schedule\.publication\.status!=="published"/.test(mod)],
 ["uses 10 minute grace",/GRACE_MINUTES=10/.test(mod)],
 ["only assigned shifts can create person exception",/!shift\.employeeId/.test(mod)],
 ["only today's active shifts are evaluated",/shift\.date!==date/.test(mod)&&/current>=start\+GRACE_MINUTES/.test(mod)&&/current<end/.test(mod)],
 ["active Time Clock employee IDs suppress exceptions",/new Set\(\(clock\?\.active\|\|\[\]\)\.map\(card=>String\(card\.employeeId\)\)\)/.test(mod)],
 ["person name comes from schedule employee identity",/schedule\?\.employees\?\.find\(e=>e\.id===employeeId\)\?\.name/.test(mod)],
 ["oldest missed start becomes first priority",/b\.minutesPastStart-a\.minutesPastStart/.test(mod)],
 ["exception wording states only no active clock-in",/no active clock-in is recorded/.test(mod)],
 ["does not diagnose callout or no-show",/does not label this a callout or no-show/.test(mod)],
 ["does not mutate shift or timecard state",!/createScheduleShift|updateScheduleShift|clockIn\(|clockOut\(/.test(mod)],
 ["only action opens existing Time Clock",/Open time clock/.test(mod)&&/scrollIntoView/.test(mod)],
 ["published schedule service remains authoritative",/schedulePublications/.test(scheduling)&&/status:"published"/.test(scheduling)],
 ["Time Clock active records remain authoritative",/const active = cards\.filter\(item => item\.status === "active" && !item\.clockOut\)/.test(time)],
 ["V100.2.65 role coverage remains intact",/V100\.2\.65 — Published Schedule → Live Role Coverage/.test(cov)],
 ["V100.2.64 staff truth remains intact",/V100\.2\.64 — Staffing Truth Foundation/.test(staff)],
 ["module loads after V100.2.65",html.indexOf("staff-attendance-v100.2.66.js")>html.indexOf("staff-role-coverage-v100.2.65.js")],
 ["Kitchen remains loaded",html.includes("kitchen-priority-v100.2.62.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.66 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);