"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const clientJs = path.join(root, "client", "js");
const fragmentPath = path.join(root, "patches", "host-stand-reservation-arrival-one-tap-seating.jsfrag");
if (!fs.existsSync(clientJs)) { console.error("V100.2.13 apply failed: client/js not found. Run from repo root."); process.exit(1); }
if (!fs.existsSync(fragmentPath)) { console.error("V100.2.13 apply failed: patch fragment missing."); process.exit(1); }
const replacement = fs.readFileSync(fragmentPath, "utf8").trim();
function walk(dir, out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.isFile()&&e.name.endsWith(".js")) out.push(p);} return out; }
const files = walk(clientJs);
const candidates = files.filter((file) => fs.readFileSync(file,"utf8").includes("__bcDynamicTableSelectionV100_2_12"));
if (!candidates.length) { console.error("V100.2.13 apply failed: V100.2.12 lifecycle block not found. Apply V100.2.12 first."); process.exit(1); }
let changed=0;
for (const file of candidates) {
  const original=fs.readFileSync(file,"utf8");
  if (original.includes("__bcDynamicTableSelectionV100_2_13")) { console.log(`Already patched: ${path.relative(root,file)}`); continue; }
  const start=original.indexOf("// V100.2.12 — Dynamic Table Selection & Assignment Ownership");
  if(start<0){ console.error(`V100.2.13 refused ${path.relative(root,file)}: start marker missing.`); process.exit(1); }
  const endMarker="\n})();";
  const end=original.indexOf(endMarker,start);
  if(end<0){ console.error(`V100.2.13 refused ${path.relative(root,file)}: end marker missing.`); process.exit(1); }
  const updated=original.slice(0,start)+replacement+original.slice(end+endMarker.length);
  fs.writeFileSync(`${file}.v100.2.13.bak`, original);
  fs.writeFileSync(file, updated);
  changed++; console.log(`Patched: ${path.relative(root,file)}`);
}
console.log(JSON.stringify({ok:true,version:"100.2.13",repair:"Reservation Arrival & One-Tap Seating Flow",changedJsFiles:changed,matchedJsFiles:candidates.length,behavior:["Expected reservation remains in Arrivals, not Waitlist","Expected reservation can reserve/hold a selected table","Arrivals exposes explicit Mark arrived action","Arrived reservation seats to selected available table in one tap","Expected → Arrived → Seated · Table X stays visible in Arrivals","dynamic table ownership and auto-collapse preserved"]},null,2));
