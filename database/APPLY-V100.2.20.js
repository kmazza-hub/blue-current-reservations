"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const target = path.join(root,"client","js","app-v15.1.3.js");
const fragPath = path.join(root,"patches","unified-seating-flow-ownership-v100.2.20.jsfrag");
if(!fs.existsSync(target)){ console.error("V100.2.20 apply failed: client/js/app-v15.1.3.js not found."); process.exit(1); }
if(!fs.existsSync(fragPath)){ console.error("V100.2.20 apply failed: patch fragment missing."); process.exit(1); }
let s=fs.readFileSync(target,"utf8");
if(!s.includes("__bcArrivalPriorityQueueV100_2_17")){ console.error("V100.2.20 apply failed: V100.2.17 priority queue runtime not found."); process.exit(1); }
if(s.includes("__bcHostRuntimeRecoveryV100_2_20")){ console.log("V100.2.20 already applied."); process.exit(0); }
const oldSort=`  const sortReadyQueue = () => {\n    const rows = [...waitlist.querySelectorAll('.queue-item')];\n    rows.sort((a,b) => priorityScore(b)-priorityScore(a));\n    rows.forEach((row) => waitlist.appendChild(row));\n  };`;
const newSort=`  const sortReadyQueue = () => {\n    const rows = [...waitlist.querySelectorAll('.queue-item')];\n    const sorted = [...rows].sort((a,b) => priorityScore(b)-priorityScore(a));\n    const changed = sorted.some((row,index) => row !== rows[index]);\n    if (!changed) return false;\n    const fragment = document.createDocumentFragment();\n    sorted.forEach((row) => fragment.appendChild(row));\n    waitlist.appendChild(fragment);\n    return true;\n  };`;
const oldObs=`  let scheduled = false;\n  const observer = new MutationObserver(() => {\n    if (scheduled) return;\n    scheduled = true;\n    queueMicrotask(() => {\n      scheduled = false;\n      ensureMarkArrivedButtons();\n      decorateExistingReadyRows();\n      clearBlankGenericBanner();\n    });\n  });\n  observer.observe(hostWorkspace, {childList:true,subtree:true,characterData:true});`;
const newObs=`  let scheduled = false;\n  let observer = null;\n  const observerOptions = { childList:true, subtree:true };\n  const runPriorityMaintenance = () => {\n    if (observer) observer.disconnect();\n    try {\n      ensureMarkArrivedButtons();\n      decorateExistingReadyRows();\n      clearBlankGenericBanner();\n    } finally {\n      if (observer) observer.observe(hostWorkspace, observerOptions);\n    }\n  };\n  observer = new MutationObserver((records) => {\n    if (scheduled) return;\n    const structural = records.some((record) => record.type === 'childList' && (record.addedNodes.length || record.removedNodes.length));\n    if (!structural) return;\n    scheduled = true;\n    queueMicrotask(() => { scheduled = false; runPriorityMaintenance(); });\n  });\n  observer.observe(hostWorkspace, observerOptions);`;
if(!s.includes(oldSort)){ console.error("V100.2.20 refused: expected V100.2.17 sort block not found; source differs from uploaded baseline."); process.exit(1); }
if(!s.includes(oldObs)){ console.error("V100.2.20 refused: expected V100.2.17 observer block not found; source differs from uploaded baseline."); process.exit(1); }
s=s.replace(oldSort,newSort).replace(oldObs,newObs);
// Remove an earlier V100.2.18 block if one was partially/appended before this recovery.
const legacyMarker="// V100.2.18 — Unified Seating Flow Ownership";
const lm=s.indexOf(legacyMarker);
if(lm>=0){
  const end=s.indexOf("\n})();",lm);
  if(end>=0) s=s.slice(0,lm)+s.slice(end+6);
}
const marker="// V100.2.17 — Arrival Check-In + Priority Seating Queue";
const start=s.indexOf(marker);
const end=s.indexOf("\n})();",start);
if(start<0||end<0){ console.error("V100.2.20 failed locating V100.2.17 block."); process.exit(1); }
const insertAt=end+6;
const frag=fs.readFileSync(fragPath,"utf8").trim();
s=s.slice(0,insertAt)+"\n\n"+frag+"\n\nwindow.__bcHostRuntimeRecoveryV100_2_20 = { ok:true, observer:'guarded', seatingOwner:'unified' };\n"+s.slice(insertAt);
fs.writeFileSync(target+".v100.2.20.bak",fs.readFileSync(target,"utf8"));
fs.writeFileSync(target,s);
console.log(JSON.stringify({ok:true,version:"100.2.20",repair:"Consolidated Host Runtime Recovery",target:"client/js/app-v15.1.3.js",fixes:["stops V100.2.17 self-triggering mutation loop","makes priority sort idempotent","disconnects observer during queue maintenance","installs one unified seating transaction owner","removes partial older unified owner if present","keeps V100.2.17 priority queue behavior"]},null,2));
