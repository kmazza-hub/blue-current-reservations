"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const fragmentPath = path.join(root, "patches", "arrival-checkin-priority-seating-queue.jsfrag");
if (!fs.existsSync(clientJs)) { console.error("V100.2.17 apply failed: client/js not found. Run from repo root."); process.exit(1); }
if (!fs.existsSync(fragmentPath)) { console.error("V100.2.17 apply failed: patch fragment missing."); process.exit(1); }
const addition = fs.readFileSync(fragmentPath, "utf8").trim();
function walk(dir,out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.isFile()&&e.name.endsWith(".js")) out.push(p);} return out; }
const files = walk(clientJs);
const candidates = files.filter((file) => fs.readFileSync(file,"utf8").includes("__bcGenericGuestContextV100_2_16"));
if (!candidates.length) { console.error("V100.2.17 apply failed: V100.2.16 generic guest context block not found. Apply V100.2.16 first."); process.exit(1); }
let changed=0;
for (const file of candidates) {
  const original=fs.readFileSync(file,"utf8");
  if (original.includes("__bcArrivalPriorityQueueV100_2_17")) { console.log(`Already patched: ${path.relative(root,file)}`); continue; }
  const marker="// V100.2.16 — Generic Guest Action Context + Host Stand Contrast Polish";
  const start=original.indexOf(marker);
  if(start<0){ console.error(`V100.2.17 refused ${path.relative(root,file)}: V100.2.16 marker missing.`); process.exit(1); }
  const endMarker="\n})();";
  const end=original.indexOf(endMarker,start);
  if(end<0){ console.error(`V100.2.17 refused ${path.relative(root,file)}: V100.2.16 end marker missing.`); process.exit(1); }
  const insertAt=end+endMarker.length;
  const updated=original.slice(0,insertAt)+"\n\n"+addition+original.slice(insertAt);
  fs.writeFileSync(`${file}.v100.2.17.bak`, original);
  fs.writeFileSync(file, updated);
  changed++; console.log(`Patched: ${path.relative(root,file)}`);
}
console.log(JSON.stringify({ok:true,version:"100.2.17",repair:"Arrival Check-In + Priority Seating Queue",changedJsFiles:changed,matchedJsFiles:candidates.length,behavior:["blank duplicate guest banner suppressed","every expected reservation receives Mark arrived","arrived reservations leave Arrivals and enter ready-to-seat queue","special occasions receive visual and sort priority","reservation/walk-in source remains visible","waitlist guided table selection remains authoritative","arrivals and ready-to-seat counts reconcile after transitions"]},null,2));
