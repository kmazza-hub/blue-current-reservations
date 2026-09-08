"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const cssFragPath = path.join(root,"patches","host-adaptive-labels-v100.2.25.cssfrag");
for (const p of [jsPath,cssPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.25 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("__bcHostServiceFunnelV100_2_24")) { console.error("V100.2.25 requires V100.2.24 first."); process.exit(1); }
if (css.includes("V100.2.25 — Host Stand Adaptive Labels")) { console.log("V100.2.25 already applied."); process.exit(0); }
const cssFrag = fs.readFileSync(cssFragPath,"utf8").trim();
fs.writeFileSync(cssPath+".v100.2.25.bak",css);
fs.writeFileSync(cssPath,css+"\n\n"+cssFrag+"\n");
const marker = "  window.__bcHostServiceFunnelV100_2_24 = { ok:true, motto:'aim small miss small', waitlist:'name-party-wait-need-action', arrivals:'near-term-action-queue', scale:'bounded-scroll' };";
if (js.includes(marker) && !js.includes("__bcHostAdaptiveLabelsV100_2_25")) {
  js = js.replace(marker, marker + "\n  window.__bcHostAdaptiveLabelsV100_2_25 = { ok:true, motto:'aim small miss small', labels:'adaptive-centered', floor:'fit-content-status' };");
  fs.writeFileSync(jsPath+".v100.2.25.bak",fs.readFileSync(jsPath,"utf8"));
  fs.writeFileSync(jsPath,js);
}
console.log(JSON.stringify({
  ok:true,version:"100.2.25",repair:"Host Stand Adaptive Labels",
  fixes:[
    "floor status markers expand to fit CHECK, OPEN SOON, CLEANING, times, and future labels",
    "all table text is centered horizontally and vertically",
    "round table markers become adaptive capsules instead of clipping long words",
    "special occasion and priority pills size to their content and stay centered",
    "hidden reservation/walk-in provenance remains hidden"
  ]
},null,2));
