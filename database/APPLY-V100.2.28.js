"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const cssFragPath = path.join(root,"patches","host-action-card-readability-v100.2.28.cssfrag");
for (const p of [jsPath,cssPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.28 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
const js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostWaitQuoteV100_2_26")) { console.error("V100.2.28 requires V100.2.26+ host tools first."); process.exit(1); }
if (!css.includes("V100.2.27 — Host Stand Special Note Pill Polish")) { console.error("V100.2.28 requires V100.2.27 first."); process.exit(1); }
if (css.includes("V100.2.28 — Host Action Card Readability + Seat Button Contrast")) { console.log("V100.2.28 already applied."); process.exit(0); }
const frag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(cssPath+".v100.2.28.bak",css);
fs.writeFileSync(cssPath,css+"\n\n"+frag+"\n");
console.log(JSON.stringify({
  ok:true,
  version:"100.2.28",
  repair:"Host Action Card Readability + Seat Button Contrast",
  fixes:[
    "reserved-table card uses strong dark-on-light text hierarchy",
    "No guest linked and helper copy are fully readable",
    "guest selector remains high-contrast and touch-friendly",
    "all host Seat buttons use explicit white text on saturated teal",
    "disabled controls remain readable instead of washing out",
    "Release table is clearly secondary but legible",
    "visual-only patch; seating, queue, wait, and table lifecycle logic unchanged"
  ]
},null,2));
