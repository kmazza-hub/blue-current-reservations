"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const clientJs = path.join(root, "client", "js");
if (!fs.existsSync(clientJs)) { console.error("V100.2.19 apply failed: client/js not found. Run from repo root."); process.exit(1); }
function walk(dir,out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.isFile()&&e.name.endsWith(".js")) out.push(p);} return out; }
const files = walk(clientJs);
const candidates = files.filter((file) => { const s=fs.readFileSync(file,"utf8"); return s.includes("__bcArrivalPriorityQueueV100_2_17") && s.includes("__bcUnifiedSeatingFlowV100_2_18"); });
if (!candidates.length) { console.error("V100.2.19 apply failed: combined V100.2.17/V100.2.18 host runtime not found. Apply through V100.2.18 first."); process.exit(1); }
const oldSort = `  const sortReadyQueue = () => {\n    const rows = [...waitlist.querySelectorAll('.queue-item')];\n    rows.sort((a,b) => priorityScore(b)-priorityScore(a));\n    rows.forEach((row) => waitlist.appendChild(row));\n  };`;
const newSort = `  const sortReadyQueue = () => {\n    const current = [...waitlist.querySelectorAll('.queue-item')];\n    const sorted = [...current].sort((a,b) => priorityScore(b)-priorityScore(a));\n    const alreadySorted = current.length === sorted.length && current.every((row,index) => row === sorted[index]);\n    if (alreadySorted) return false;\n    const fragment = document.createDocumentFragment();\n    sorted.forEach((row) => fragment.appendChild(row));\n    waitlist.appendChild(fragment);\n    return true;\n  };`;
const oldObserver = `  let scheduled = false;\n  const observer = new MutationObserver(() => {\n    if (scheduled) return;\n    scheduled = true;\n    queueMicrotask(() => {\n      scheduled = false;\n      ensureMarkArrivedButtons();\n      decorateExistingReadyRows();\n      clearBlankGenericBanner();\n    });\n  });\n  observer.observe(hostWorkspace, {childList:true,subtree:true,characterData:true});`;
const newObserver = `  let scheduled = false;\n  let observer = null;\n  const observerOptions = { childList:true, subtree:true };\n  const runPriorityMaintenance = () => {\n    if (observer) observer.disconnect();\n    try {\n      ensureMarkArrivedButtons();\n      decorateExistingReadyRows();\n      clearBlankGenericBanner();\n    } finally {\n      if (observer) observer.observe(hostWorkspace, observerOptions);\n    }\n  };\n  observer = new MutationObserver((records) => {\n    if (scheduled) return;\n    const structuralChange = records.some((record) => record.type === 'childList' && (record.addedNodes.length || record.removedNodes.length));\n    if (!structuralChange) return;\n    scheduled = true;\n    queueMicrotask(() => {\n      scheduled = false;\n      runPriorityMaintenance();\n    });\n  });\n  observer.observe(hostWorkspace, observerOptions);`;
let changed=0;
for (const file of candidates) {
  let source=fs.readFileSync(file,"utf8");
  if (source.includes("V100.2.19 — Runtime Loop Guard")) { console.log(`Already patched: ${path.relative(root,file)}`); continue; }
  if (!source.includes(oldSort)) { console.error(`V100.2.19 refused ${path.relative(root,file)}: V100.2.17 sort block not found.`); process.exit(1); }
  if (!source.includes(oldObserver)) { console.error(`V100.2.19 refused ${path.relative(root,file)}: V100.2.17 observer block not found.`); process.exit(1); }
  source=source.replace(oldSort,newSort).replace(oldObserver,newObserver);
  source += `\n\n// V100.2.19 — Runtime Loop Guard\nwindow.__bcRuntimeLoopGuardV100_2_19 = { ok: true, mode: 'structural-mutations-only' };\n`;
  fs.writeFileSync(`${file}.v100.2.19.bak`, fs.readFileSync(file,"utf8"));
  fs.writeFileSync(file,source);
  changed++;
  console.log(`Patched: ${path.relative(root,file)}`);
}
console.log(JSON.stringify({ok:true,version:"100.2.19",repair:"Runtime Loop Guard",changedJsFiles:changed,matchedJsFiles:candidates.length,behavior:["priority queue sort is idempotent","observer ignores character-data churn","observer disconnects during its own maintenance pass","V100.2.18 unified seating ownership preserved","no rollback"]},null,2));
