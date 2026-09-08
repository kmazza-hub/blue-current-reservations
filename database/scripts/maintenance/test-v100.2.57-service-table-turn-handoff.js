"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const floor=fs.readFileSync(path.join(root,"client","js","floor-reservations-v62.0.js"),"utf8");
const html=fs.readFileSync(path.join(root,"client","index.html"),"utf8");
const bridgePath=path.join(root,"client","js","service-table-lifecycle-v100.2.57.js");
if(!fs.existsSync(bridgePath)) throw new Error("V100.2.57 bridge module missing");
const bridge=fs.readFileSync(bridgePath,"utf8");
const floorMarker="// V100.2.47 — Floor Layout Restoration";
const checks=[
 ["V100.2.56 recovery preserved",floor.includes("V100.2.56 — Service Exception / Recovery Intelligence")],
 ["V100.2.56 recovery explanation interpolation repaired",floor.includes('return x?`${x.reason} · ${x.minutes}m in this stage`:"";')],
 ["Service handoff accepts authoritative table intake",floor.includes("accept:(detail)=>acceptServiceHandoff(detail)")],
 ["Service completion uses lifecycle bridge",floor.includes("BlueCurrentServiceTableLifecycle?.completeTable?.(row)")],
 ["Service does not clear until table transition succeeds",floor.includes("if(!result?.ok)return result||{ok:false,reason:\"table-lifecycle-bridge-unavailable\"};")],
 ["Completion event is published",floor.includes('new CustomEvent("bc:service-party-completed"')],
 ["Service action routes final step through complete",floor.includes("BlueCurrentServiceHandoff?.complete?.(key)")],
 ["Protected Floor restoration remains present",floor.includes(floorMarker)],
 ["Dedicated lifecycle bridge is loaded after Service controller",html.indexOf("floor-reservations-v62.0.js")<html.indexOf("service-table-lifecycle-v100.2.57.js")],
 ["Bridge observes authoritative table state",bridge.includes('attributeFilter:["class","data-bc-guest-name","data-bc-party-size","data-bc-seated-at"]')],
 ["Bridge intake carries table identity",bridge.includes("tableId," )],
 ["Bridge refuses missing table identity",bridge.includes('reason:"missing-table-identity"')],
 ["Bridge refuses guest/table mismatch",bridge.includes('reason:"guest-table-mismatch"')],
 ["Completion transitions seated to cleaning",bridge.includes('table.classList.add("cleaning")')],
 ["Completion never marks table open",!bridge.includes('classList.add("available")')],
 ["Human reset remains required",bridge.includes("Mark open when ready")],
 ["Bridge refreshes existing trust renderer",bridge.includes("__bcHostTableTrustV100_2_22?.renderAll?.()")]
];
const failed=checks.filter(([,ok])=>!ok);
checks.forEach(([name,ok])=>console.log(`${ok?"PASS":"FAIL"} ${name}`));
if(failed.length)process.exit(1);
console.log(`V100.2.57 validation ${checks.length}/${checks.length}`);
