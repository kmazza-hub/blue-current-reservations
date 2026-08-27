"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/kitchen-priority-v100.2.62.js");
const kitchen=read("client/js/kitchen-truth-v100.2.60.js");
const bridge=read("client/js/kitchen-service-handoff-v100.2.61.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");
const checks=[
 ["version marker",/V100\.2\.62 — Kitchen First Priority \/ Exception Intelligence/.test(mod)],
 ["uses authoritative Service store",/blueCurrent\.service\.activeParties\.v100/.test(mod)],
 ["uses authoritative Ready store",/blueCurrent\.kitchen\.truth\.ready\.v100\.2\.60/.test(mod)],
 ["only evaluates Ordering handoffs",/filter\(p=>p\?\.status==="ordering"\)/.test(mod)],
 ["attention threshold is 15 minutes",/ATTENTION_MINUTES=15/.test(mod)],
 ["recovery threshold is restrained 23 minutes",/RECOVERY_MINUTES=23/.test(mod)],
 ["ready outranks recovery and attention",/const rank=\{ready:0,recovery:1,attention:2,pace:3\}/.test(mod)],
 ["oldest unready handoff wins within tone",/b\.age-a\.age/.test(mod)],
 ["oldest ready signal wins within ready tone",/a\.readyAt-b\.readyAt/.test(mod)],
 ["first priority surface exists",/First priority/.test(mod)],
 ["ready action says run now",/Run ready food/.test(mod)&&/Ready is confirmed/.test(mod)],
 ["attention wording does not diagnose cause",/without a Ready confirmation/.test(mod)],
 ["recovery gives one concrete action",/Check progress now/.test(mod)],
 ["does not claim station or ticket telemetry",!/station load|cook time|ticket time|bottleneck/i.test(mod)],
 ["does not auto-mark Ready",!/bc:kitchen-order-ready.*dispatchEvent/s.test(mod)],
 ["does not advance Service automatically",!/status\s*:\s*["']dining["']/.test(mod)],
 ["does not modify Floor state",!/dataset\.status|classList\.add\(["']cleaning/.test(mod)],
 ["decorates existing Kitchen rows",/bc-kt-row/.test(mod)],
 ["V100.2.60 truth boundary preserved",/No synthetic kitchen metrics/.test(kitchen)],
 ["V100.2.61 Service ready handoff preserved",/Food ready · run now/.test(bridge)],
 ["module loads after V100.2.61",html.indexOf("kitchen-priority-v100.2.62.js")>html.indexOf("kitchen-service-handoff-v100.2.61.js")],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.62 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);