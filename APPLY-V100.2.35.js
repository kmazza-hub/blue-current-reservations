"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const jsFrag = path.join(root,"patches","host-premium-floor-map-v100.2.35.jsfrag");
const cssFrag = path.join(root,"patches","host-premium-floor-map-v100.2.35.cssfrag");
for (const p of [jsPath,cssPath,jsFrag,cssFrag]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.35 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("V100.2.34 — Zoned Host Floor Plans")) {
  console.error("V100.2.35 requires V100.2.34 to be applied first."); process.exit(1);
}
if (js.includes("V100.2.35 — Premium Restaurant Floor Map")) {
  console.log("V100.2.35 already applied."); process.exit(0);
}
fs.writeFileSync(jsPath+".v100.2.35.bak",js);
fs.writeFileSync(cssPath+".v100.2.35.bak",css);
fs.writeFileSync(jsPath,js+"\n\n"+fs.readFileSync(jsFrag,"utf8").trim()+"\n");
fs.writeFileSync(cssPath,css+"\n\n"+fs.readFileSync(cssFrag,"utf8").trim()+"\n");
console.log(JSON.stringify({ok:true,version:"100.2.35",feature:"Premium Restaurant Floor Map",fixes:["adds real room architecture cues without changing table logic","gives Main floor a host entry, bar edge, and service aisle","gives Waterfront a window wall and service station","gives Private dining an enclosed-room and credenza treatment","repositions tables into natural restaurant layouts per room","preserves all existing table states, seating logic, waitlist, arrivals, and persistence"]},null,2));
