"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const appPath = path.join(root,"client","js","app-v15.1.3.js");
const fragPath = path.join(root,"patches","arrival-to-seating-queue-v100.2.32.jsfrag");
for (const p of [appPath,fragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.32 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let app = fs.readFileSync(appPath,"utf8");
if (!app.includes("V100.2.17 — Arrival Check-In + Priority Seating Queue")) {
  console.error("V100.2.32 requires the V100.2.17 arrival priority queue runtime."); process.exit(1);
}
if (!app.includes("V100.2.26")) {
  console.error("V100.2.32 requires the current V100.2.26+ host wait-time runtime."); process.exit(1);
}
if (app.includes("V100.2.32 — Authoritative Arrived -> Seating Queue Handoff")) {
  console.log("V100.2.32 already applied."); process.exit(0);
}
const frag = fs.readFileSync(fragPath,"utf8").trim();
fs.writeFileSync(appPath+".v100.2.32.bak",app);
fs.writeFileSync(appPath,app+"\n\n"+frag+"\n");
console.log(JSON.stringify({ok:true,version:"100.2.32",repair:"Arrived -> Seating Queue Handoff",fixes:[
  "Mark arrived now hands the reservation into the active seating queue",
  "the guest leaves Arrivals immediately",
  "queue insertion is de-duplicated",
  "wait starts at 0m using the existing queue builder",
  "special notes and priority decoration are preserved",
  "waitlist counts, ordering, and current-wait quote refresh",
  "no Host Stand visual redesign"
]},null,2));
