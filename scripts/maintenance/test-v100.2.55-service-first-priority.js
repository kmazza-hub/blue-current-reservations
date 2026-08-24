"use strict";
const fs=require("fs"),path=require("path");
const file=path.join(process.cwd(),"client","js","floor-reservations-v62.0.js");
if(!fs.existsSync(file)) throw new Error("Host Stand controller not found");
const text=fs.readFileSync(file,"utf8");
const checks=[
 ["floor restoration preserved",text.includes("V100.2.47 — Floor Layout Restoration")],
 ["service milestones preserved",text.includes("V100.2.52 — Service Milestones")],
 ["priority pacing present",text.includes("V100.2.54 — Service Priority & Pacing")],
 ["stage-aware pace thresholds",text.includes("SERVICE_PACE_MINUTES")],
 ["priority ordering",text.includes("servicePriorityScore(b)-servicePriorityScore(a)")],
 ["first priority marker",text.includes("V100.2.55 — Service First Priority")],
 ["first priority surface",text.includes("bc-service-focus-v255")],
 ["service on pace state",text.includes("Service on pace")],
 ["urgent state",text.includes('focus.dataset.urgent=String(firstUrgent)')],
 ["floor controller not replaced by test artifact",text.includes("bcActiveZone")]
];
const failed=checks.filter(([,ok])=>!ok);checks.forEach(([name,ok])=>console.log(`${ok?"PASS":"FAIL"} ${name}`));
if(failed.length) process.exit(1);
console.log(`V100.2.55 validation ${checks.length}/${checks.length}`);
