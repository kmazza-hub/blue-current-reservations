"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const cssPath = path.join(root,"client","styles.css");
const fragPath = path.join(root,"patches","arrival-mark-arrived-fit-v100.2.31.cssfrag");
for (const p of [cssPath,fragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.31 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let css = fs.readFileSync(cssPath,"utf8");
if (!css.includes("V100.2.30 — Waitlist Seat Button Fit")) {
  console.error("V100.2.31 requires V100.2.30 to be applied first.");
  process.exit(1);
}
if (css.includes("V100.2.31 — Arrival Mark Arrived Fit")) {
  console.log("V100.2.31 already applied.");
  process.exit(0);
}
const frag = fs.readFileSync(fragPath,"utf8").trim();
fs.writeFileSync(cssPath+".v100.2.31.bak",css);
fs.writeFileSync(cssPath,css+"\n\n"+frag+"\n");
console.log(JSON.stringify({
  ok:true,
  version:"100.2.31",
  repair:"Arrival Mark Arrived Fit",
  fixes:[
    "removes the redundant Expected pill while Mark arrived is the active reservation action",
    "gives Mark arrived a dedicated third-column action slot",
    "keeps the full Mark arrived label visible and centered",
    "preserves guest/time readability by allowing the information column to flex",
    "adds scrollbar gutter so the action stays inside the rail",
    "also protects Mark arrived in the full Reservations workspace",
    "visual-only; no reservation, arrival, waitlist, seating, or persistence logic changed"
  ]
},null,2));
