"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const fragmentPath = path.join(root, "patches", "host-stand-workspace-simplification.jsfrag");
if (!fs.existsSync(clientJs)) { console.error("V100.2.14 apply failed: client/js not found. Run from repo root."); process.exit(1); }
if (!fs.existsSync(fragmentPath)) { console.error("V100.2.14 apply failed: patch fragment missing."); process.exit(1); }
const addition = fs.readFileSync(fragmentPath, "utf8").trim();
function walk(dir, out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.isFile()&&e.name.endsWith(".js")) out.push(p);} return out; }
const files = walk(clientJs);
const candidates = files.filter((file) => fs.readFileSync(file,"utf8").includes("__bcDynamicTableSelectionV100_2_13"));
if (!candidates.length) { console.error("V100.2.14 apply failed: V100.2.13 lifecycle block not found. Apply V100.2.13 first."); process.exit(1); }
let changed=0;
for (const file of candidates) {
  const original=fs.readFileSync(file,"utf8");
  if (original.includes("__bcHostWorkspaceSimplificationV100_2_14")) { console.log(`Already patched: ${path.relative(root,file)}`); continue; }
  const marker="// V100.2.13 — Reservation Arrival & One-Tap Seating Flow";
  const start=original.indexOf(marker);
  if(start<0){ console.error(`V100.2.14 refused ${path.relative(root,file)}: V100.2.13 marker missing.`); process.exit(1); }
  const endMarker="\n})();";
  const end=original.indexOf(endMarker,start);
  if(end<0){ console.error(`V100.2.14 refused ${path.relative(root,file)}: V100.2.13 end marker missing.`); process.exit(1); }
  const insertAt=end+endMarker.length;
  const updated=original.slice(0,insertAt)+"\n\n"+addition+original.slice(insertAt);
  fs.writeFileSync(`${file}.v100.2.14.bak`, original);
  fs.writeFileSync(file, updated);
  changed++; console.log(`Patched: ${path.relative(root,file)}`);
}
console.log(JSON.stringify({ok:true,version:"100.2.14",repair:"Host Stand Workspace Simplification",changedJsFiles:changed,matchedJsFiles:candidates.length,behavior:["one job, one screen, one obvious next action","Floor owns dining-room map","Reservations owns arrivals","Waitlist owns waiting parties","Guests owns guest search","leaving Floor clears transient selected-table UI","returning to Floor preserves live state without reopening stale detail"]},null,2));
