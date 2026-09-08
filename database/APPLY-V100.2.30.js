"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const cssPath = path.join(root,"client","styles.css");
const fragPath = path.join(root,"patches","waitlist-seat-button-fit-v100.2.30.cssfrag");
for (const p of [cssPath,fragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.30 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let css = fs.readFileSync(cssPath,"utf8");
if (!css.includes("V100.2.29 — Surgical Host Action Repair")) {
  console.error("V100.2.30 requires V100.2.29 to be applied first.");
  process.exit(1);
}
if (css.includes("V100.2.30 — Waitlist Seat Button Fit")) {
  console.log("V100.2.30 already applied.");
  process.exit(0);
}
const frag = fs.readFileSync(fragPath,"utf8").trim();
fs.writeFileSync(cssPath+".v100.2.30.bak",css);
fs.writeFileSync(cssPath,css+"\n\n"+frag+"\n");
console.log(JSON.stringify({
  ok:true,
  version:"100.2.30",
  repair:"Waitlist Seat Button Fit",
  fixes:[
    "removes the forced 118px waitlist information-column minimum that pushed Seat off the rail",
    "gives Seat a dedicated 72-76px action column",
    "keeps Seat fully visible and centered at desktop and iPad widths",
    "adds scrollbar gutter inside the queue",
    "preserves special-note pills without allowing them to widen the grid",
    "visual-only; no seating, wait-time, queue, reservation, or persistence logic changed"
  ]
},null,2));
