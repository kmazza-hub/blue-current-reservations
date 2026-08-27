"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/kitchen-service-handoff-v100.2.61.js");
const kitchen=read("client/js/kitchen-truth-v100.2.60.js");
const floor=read("client/js/floor-reservations-v62.0.js");
const html=read("client/index.html");
const checks=[
 ["version marker",/V100\.2\.61 — Kitchen Ready → Service \/ Expo Handoff/.test(mod)],
 ["uses V100.2.60 readiness store",/blueCurrent\.kitchen\.truth\.ready\.v100\.2\.60/.test(mod)],
 ["listens for real kitchen ready event",/bc:kitchen-order-ready/.test(mod)],
 ["ready must belong to Ordering service",/p\?\.status==="ordering"/.test(mod)],
 ["persists ready timestamp into service party",/kitchenReadyAt/.test(mod)&&/api\.update/.test(mod)],
 ["does not create second service queue",!/appendChild\(.*service.*queue|createElement\(["']section["']\)/i.test(mod)],
 ["decorates existing Service rows",/bc-service-party-v251/.test(mod)],
 ["promotes ready food to First priority",/First priority/.test(mod)&&/Food ready/.test(mod)],
 ["gives one existing delivery instruction",/mark Food delivered/.test(mod)],
 ["does not advance Service automatically",!/status\s*:\s*["']dining["']/.test(mod)],
 ["does not modify Floor table state",!/classList\.add\(["']cleaning|host-table|dataset\.status/.test(mod)],
 ["clears ready signal after leaving Ordering",/row\.status!=="ordering"&&map\[key\]/.test(mod)],
 ["records delivery handoff timestamp",/kitchenDeliveredAt/.test(mod)],
 ["removes orphaned ready signals",/Remove orphaned ready signals/.test(mod)],
 ["V100.2.60 still emits ready event",/bc:kitchen-order-ready/.test(kitchen)],
 ["Service existing delivery action preserved",/ordering:\{label:"Ordering",action:"Food delivered",next:"dining"\}/.test(floor)],
 ["Service update remains human action",/data-service-action="advance"/.test(floor)],
 ["module loads after V100.2.60",html.indexOf("kitchen-service-handoff-v100.2.61.js")>html.indexOf("kitchen-truth-v100.2.60.js")],
 ["protected Floor restoration remains present",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.61 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);