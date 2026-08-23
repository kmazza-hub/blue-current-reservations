"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const cssPath = path.join(root,"client","styles.css");
const fragPath = path.join(root,"patches","surgical-host-action-repair-v100.2.29.cssfrag");
for (const p of [cssPath,fragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.29 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let css = fs.readFileSync(cssPath,"utf8");
if (!css.includes("V100.2.28 — Host Action Card Readability + Seat Button Contrast")) {
  console.error("V100.2.29 is a repair for V100.2.28 and requires V100.2.28 to be applied first.");
  process.exit(1);
}
if (css.includes("V100.2.29 — Surgical Host Action Repair")) {
  console.log("V100.2.29 already applied.");
  process.exit(0);
}
const frag = fs.readFileSync(fragPath,"utf8").trim();
fs.writeFileSync(cssPath+".v100.2.29.bak",css);
fs.writeFileSync(cssPath,css+"\n\n"+frag+"\n");
console.log(JSON.stringify({
  ok:true,
  version:"100.2.29",
  repair:"Surgical Host Action Repair",
  fixes:[
    "restores unified seating confirmation card after V100.2.28 over-scoping",
    "styles the actual confirm button rather than the card container",
    "restores readable cream Cancel buttons",
    "keeps Waitlist/Arrivals Seat buttons inside their action column",
    "preserves V100.2.24/V100.2.27 queue geometry and special-note pills",
    "keeps reserved-table readability scoped to the reserved-table tool only",
    "visual-only repair; no host workflow or persistence logic changed"
  ]
},null,2));
