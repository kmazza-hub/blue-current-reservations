"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const mod=read("client/js/kitchen-truth-v100.2.60.js"),html=read("client/index.html"),floor=read("client/js/floor-reservations-v62.0.js");
const checks=[
 ["version marker",/V100\.2\.60 — Kitchen Truth Foundation/.test(mod)],
 ["uses authoritative Service store",/blueCurrent\.service\.activeParties\.v100/.test(mod)],
 ["only Ordering enters kitchen queue",/p\.status==="ordering"/.test(mod)],
 ["does not fabricate item data",/Ticket items, station load, and cook times stay hidden/.test(mod)],
 ["does not use predictive overlay",!/predictiveOverlay|operationalDigitalTwin/.test(mod)],
 ["does not use synthetic kitchen percentage",!/kitchenLoad|throughput score|projected ticket/i.test(mod)],
 ["provides one manual ready action",/Mark ready/.test(mod)&&/bc:kitchen-order-ready/.test(mod)],
 ["ready state persists independently",/blueCurrent\.kitchen\.truth\.ready\.v100\.2\.60/.test(mod)],
 ["stale readiness is pruned",/function prune\(\)/.test(mod)],
 ["queue exposes table identity",/p\.tableId\|\|p\.table/.test(mod)],
 ["queue exposes guest identity",/p\.guest\|\|"Guest"/.test(mod)],
 ["15 minute attention is explicit",/\.age\s*>=\s*15/.test(mod)],
 ["module loads after legacy kitchen modules",html.indexOf("kitchen-truth-v100.2.60.js")>html.indexOf("kitchenThroughputCenter.js")],
 ["module loads after Service/Floor controller",html.indexOf("kitchen-truth-v100.2.60.js")>html.indexOf("floor-reservations-v62.0.js")],
 ["Service lifecycle remains intact",/const SERVICE_STAGES=/.test(floor)&&/ordering:\{label:"Ordering"/.test(floor)],
 ["Floor restoration remains intact",/V100\.2\.47 — Floor Layout Restoration/.test(floor)]
];
let n=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)n++;}
console.log(`V100.2.60 validation ${n}/${checks.length}`);if(n!==checks.length)process.exit(1);