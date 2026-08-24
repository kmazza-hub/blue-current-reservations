"use strict";
const fs=require("fs"),path=require("path");
const f=path.join(process.cwd(),"client","js","floor-reservations-v62.0.js");
const s=fs.readFileSync(f,"utf8");
const checks=[
 ["wave marker",s.includes("V100.2.54 — Service Priority & Pacing")],
 ["floor isolation preserved",s.includes("bc-floor-zone-isolation-v100-2-47")],
 ["pace thresholds",s.includes("SERVICE_PACE_MINUTES={seated:3,greeted:7,ordering:15,dining:45,check:10}")],
 ["stage age",s.includes("function serviceStageAgeMs")],
 ["attention function",s.includes("function serviceNeedsAttention")],
 ["attention label",s.includes("function serviceAttentionLabel")],
 ["priority score",s.includes("function servicePriorityScore")],
 ["priority sort",s.includes("sort((a,b)=>servicePriorityScore(b)-servicePriorityScore(a)")],
 ["summary",s.includes("<span>Needs attention</span>")],
 ["service milestones preserved",s.includes("V100.2.52 — Service Milestones")],
 ["room fixture logic preserved",s.includes("bc-water-only-v100-2-35")]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)pass++;}
console.log(`${pass}/${checks.length} checks passed`);if(pass!==checks.length)process.exit(1);
