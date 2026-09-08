"use strict";
const fs=require("fs"),path=require("path");
const file=path.join(process.cwd(),"client","js","floor-reservations-v62.0.js");
if(!fs.existsSync(file)) throw new Error("Host Stand controller not found");
const text=fs.readFileSync(file,"utf8");
const floorMarker="// V100.2.47 — Floor Layout Restoration";
const serviceMarker="// V100.2.56 — Service Exception / Recovery Intelligence";
const checks=[
 ["V100.2.55 first priority preserved",text.includes("V100.2.55 — Service First Priority")],
 ["V100.2.54 pacing preserved",text.includes("V100.2.54 — Service Priority & Pacing")],
 ["V100.2.56 recovery marker",text.includes(serviceMarker)],
 ["recovery threshold is distinct from attention threshold",text.includes("SERVICE_RECOVERY_MULTIPLIER=1.5")],
 ["stage-specific recovery guidance",text.includes("SERVICE_RECOVERY_GUIDANCE")],
 ["recovery uses stage age",text.includes("const ageMs=serviceStageAgeMs(p)")],
 ["recovery does not claim an unknown root cause",!text.includes("Kitchen caused the delay")&&!text.includes("Server caused the delay")],
 ["first priority can escalate to recovery",text.includes('firstRecovery?"Recovery needed"')],
 ["first priority explains why",text.includes("serviceRecoveryReason(first)")],
 ["first priority provides a recovery action",text.includes("firstRecovery.action")],
 ["recovery visual state is isolated to Service",text.includes('.bc-service-focus-v255[data-recovery="true"]')],
 ["floor restoration remains present",text.includes(floorMarker)],
 ["floor zone controller remains present",text.includes("bcActiveZone")],
 ["service lifecycle action handler preserved",text.includes('window.BlueCurrentServiceHandoff?.update?.(key,{status:stage.next})')]
];
const failed=checks.filter(([,ok])=>!ok);
checks.forEach(([name,ok])=>console.log(`${ok?"PASS":"FAIL"} ${name}`));
if(failed.length) process.exit(1);
console.log(`V100.2.56 validation ${checks.length}/${checks.length}`);
