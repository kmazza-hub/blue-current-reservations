"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/staff-truth-v100.2.64.js");
const api=read("client/js/cloud/cloudApi.js");
const time=read("client/js/modules/timeClock.js");
const legacy=read("client/js/modules/workforceIntelligence.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");
const checks=[
 ["version marker",/V100\.2\.64 — Staffing Truth Foundation/.test(mod)],
 ["uses Time Clock API",/api\.timeClock\(LOCATION_ID\)/.test(mod)],
 ["Cloud API exposes timeClock",/timeClock\(locationId="loc_marina"\)/.test(api)],
 ["shows working now from authoritative summary",/summary\.employeesWorking/.test(mod)],
 ["shows on break from authoritative summary",/summary\.onBreak/.test(mod)],
 ["shows overtime risk from authoritative summary",/summary\.overtimeRisk/.test(mod)],
 ["shows missed punches from authoritative summary",/summary\.missedPunches/.test(mod)],
 ["active employee names come from Time Clock snapshot",/item\.employeeName/.test(mod)],
 ["missed punches outrank overtime",/missedPunches[\s\S]*overtimeRisk/.test(mod)],
 ["does not calculate demand index",!/demandIndex|reservations\.length|waitlist\.length|tickets\.length/.test(mod)],
 ["does not fabricate scheduled coverage",!/requiredEmployees|salesForecast|targetLaborPercent/.test(mod)],
 ["does not expose legacy recommendations as live truth",!/decideWorkforceRecommendation|workforceRecommendations/.test(mod)],
 ["explicitly refuses synthetic fallback",/Synthetic fallback disabled/.test(mod)],
 ["legacy workforce module remains untouched and detectable",/workforceIntelligence\(\)/.test(legacy)],
 ["existing Time Clock module remains intact",/api\.timeClock\(\)/.test(time)],
 ["primary old workforce container is hidden only when truth view active",/bc-staff-truth-active-v264>.container/.test(mod)],
 ["operator can open Time Clock for action",/Open time clock/.test(mod)&&/scrollIntoView/.test(mod)],
 ["module loads after staff usability script",html.indexOf("staff-truth-v100.2.64.js")>html.indexOf("staff-kitchen-service-v62.50.js")],
 ["Kitchen V100.2.62 remains loaded",html.includes("kitchen-priority-v100.2.62.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.64 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);