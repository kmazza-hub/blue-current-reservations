"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const fragmentPath = path.join(root, "patches", "host-stand-readability-guided-seating.jsfrag");
if (!fs.existsSync(clientJs)) { console.error("V100.2.15 apply failed: client/js not found. Run from repo root."); process.exit(1); }
if (!fs.existsSync(fragmentPath)) { console.error("V100.2.15 apply failed: patch fragment missing."); process.exit(1); }
const addition = fs.readFileSync(fragmentPath, "utf8").trim();
function walk(dir, out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.isFile()&&e.name.endsWith(".js")) out.push(p);} return out; }
const files = walk(clientJs);
const candidates = files.filter((file) => fs.readFileSync(file,"utf8").includes("__bcHostWorkspaceSimplificationV100_2_14"));
if (!candidates.length) { console.error("V100.2.15 apply failed: V100.2.14 workspace block not found. Apply V100.2.14 first."); process.exit(1); }
let changed=0;
for (const file of candidates) {
  const original=fs.readFileSync(file,"utf8");
  if (original.includes("__bcWaitlistSeatFlowV100_2_15")) { console.log(`Already patched: ${path.relative(root,file)}`); continue; }
  const marker="// V100.2.14 — Host Stand Workspace Simplification";
  const start=original.indexOf(marker);
  if(start<0){ console.error(`V100.2.15 refused ${path.relative(root,file)}: V100.2.14 marker missing.`); process.exit(1); }
  const endMarker="\n})();";
  const end=original.indexOf(endMarker,start);
  if(end<0){ console.error(`V100.2.15 refused ${path.relative(root,file)}: V100.2.14 end marker missing.`); process.exit(1); }
  const insertAt=end+endMarker.length;
  const updated=original.slice(0,insertAt)+"\n\n"+addition+original.slice(insertAt);
  fs.writeFileSync(`${file}.v100.2.15.bak`, original);
  fs.writeFileSync(file, updated);
  changed++; console.log(`Patched: ${path.relative(root,file)}`);
}
console.log(JSON.stringify({ok:true,version:"100.2.15",repair:"Host Stand Readability + Guided Waitlist Seating",changedJsFiles:changed,matchedJsFiles:candidates.length,behavior:["larger high-contrast waitlist/arrival typography","larger obvious host actions","waitlist Seat no longer changes state without a table","Seat → choose available table → confirm","waitlist and table counts update together","completed reservation hold auto-collapses detail","underlying V100.2.13 reservation lifecycle preserved"]},null,2));
