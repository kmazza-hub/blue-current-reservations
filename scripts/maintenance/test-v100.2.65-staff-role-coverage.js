"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/staff-role-coverage-v100.2.65.js");
const staff=read("client/js/staff-truth-v100.2.64.js");
const scheduling=read("client/js/modules/scheduling.js");
const scheduleService=read("server/services/schedulingService.js");
const time=read("client/js/modules/timeClock.js");
const api=read("client/js/cloud/cloudApi.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");

const checks=[
 ["version marker",/V100\.2\.65 — Published Schedule → Live Role Coverage/.test(mod)],
 ["loads Scheduling and Time Clock together",/Promise\.all\(\[api\.scheduling\(LOCATION_ID,""\),api\.timeClock\(LOCATION_ID\)\]\)/.test(mod)],
 ["requires published schedule",/schedule\.publication\.status!=="published"/.test(mod)],
 ["draft schedule refuses certification",/Coverage not certified/.test(mod)&&/will not guess required staffing/.test(mod)],
 ["only shifts active at current local time count",/shift\.date===date/.test(mod)&&/minutes\(shift\.startTime\)<=current/.test(mod)&&/minutes\(shift\.endTime\)>current/.test(mod)],
 ["expected coverage derives from scheduled shift roles",/normalizeRole\(shift\.role\)/.test(mod)],
 ["actual coverage derives from Time Clock active roles",/normalizeRole\(item\.role\)/.test(mod)],
 ["employees on break do not count as active coverage",/active\.filter\(item=>!item\.onBreak\)/.test(mod)],
 ["gap is explicit arithmetic only",/Math\.max\(0,scheduled-working\)/.test(mod)],
 ["no reservation or demand staffing formula",!/reservation|demandIndex|covers\/24|salesForecast/i.test(mod)],
 ["coverage gap gives one operational instruction",/Confirm the shift or deploy coverage/.test(mod)],
 ["coverage-met state exists",/Published role coverage is met/.test(mod)],
 ["source copy distinguishes expected vs actual",/Expected: current active shifts from published Scheduling/.test(mod)&&/Actual: clocked-in, not-on-break Time Clock roles/.test(mod)],
 ["Cloud API exposes scheduling",/scheduling\(locationId="loc_marina",weekStart=""\)/.test(api)],
 ["Cloud API exposes time clock",/timeClock\(locationId="loc_marina"\)/.test(api)],
 ["Scheduling service publication is authoritative",/status:"published"/.test(scheduleService)&&/schedulePublications/.test(scheduleService)],
 ["Scheduling client still uses scheduling API",/api\.scheduling\("loc_marina",weekStart\)/.test(scheduling)],
 ["Time Clock client remains intact",/api\.timeClock\(\)/.test(time)],
 ["V100.2.64 staffing truth remains intact",/V100\.2\.64 — Staffing Truth Foundation/.test(staff)],
 ["module loads after V100.2.64",html.indexOf("staff-role-coverage-v100.2.65.js")>html.indexOf("staff-truth-v100.2.64.js")],
 ["Kitchen V100.2.62 remains loaded",html.includes("kitchen-priority-v100.2.62.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.65 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);