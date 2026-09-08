"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const jsFragPath = path.join(root,"patches","neutral-table-detail-dismiss-v100.2.33.jsfrag");
const cssFragPath = path.join(root,"patches","neutral-table-detail-dismiss-v100.2.33.cssfrag");
for (const p of [jsPath,cssPath,jsFragPath,cssFragPath]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.33 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("V100.2.32 — Arrived -> Seating Queue Handoff") && !js.includes("V100.2.32")) {
  console.error("V100.2.33 requires V100.2.32 to be applied first."); process.exit(1);
}
if (js.includes("V100.2.33 — Neutral Table Detail Dismiss")) {
  console.log("V100.2.33 already applied."); process.exit(0);
}
fs.writeFileSync(jsPath+".v100.2.33.bak",js);
fs.writeFileSync(cssPath+".v100.2.33.bak",css);
js += "\n\n" + fs.readFileSync(jsFragPath,"utf8").trim() + "\n";
css += "\n\n" + fs.readFileSync(cssFragPath,"utf8").trim() + "\n";
fs.writeFileSync(jsPath,js);
fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({ok:true,version:"100.2.33",repair:"Dismissible Neutral Table Detail",fixes:["adds an explicit close control to neutral table details","clicking the empty floor closes neutral table details","Escape closes neutral table details","workspace navigation clears stale neutral table details","does not change seating, arrival, waitlist, reservation, or persistence logic"]},null,2));
