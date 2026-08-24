"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const jsPath = path.join(root,"client","js","app-v15.1.3.js");
const cssPath = path.join(root,"client","styles.css");
const jsFrag = path.join(root,"patches","host-zoned-floor-plans-v100.2.34.jsfrag");
const cssFrag = path.join(root,"patches","host-zoned-floor-plans-v100.2.34.cssfrag");
for (const p of [jsPath,cssPath,jsFrag,cssFrag]) {
  if (!fs.existsSync(p)) { console.error(`V100.2.34 apply failed: missing ${path.relative(root,p)}`); process.exit(1); }
}
let js = fs.readFileSync(jsPath,"utf8");
let css = fs.readFileSync(cssPath,"utf8");
if (!js.includes("V100.2.33 — Neutral Table Detail Dismiss")) {
  console.error("V100.2.34 requires V100.2.33 to be applied first."); process.exit(1);
}
if (js.includes("V100.2.34 — Zoned Host Floor Plans")) {
  console.log("V100.2.34 already applied."); process.exit(0);
}
fs.writeFileSync(jsPath+".v100.2.34.bak",js);
fs.writeFileSync(cssPath+".v100.2.34.bak",css);
fs.writeFileSync(jsPath,js+"\n\n"+fs.readFileSync(jsFrag,"utf8").trim()+"\n");
fs.writeFileSync(cssPath,css+"\n\n"+fs.readFileSync(cssFrag,"utf8").trim()+"\n");
console.log(JSON.stringify({ok:true,version:"100.2.34",feature:"Zoned Host Floor Plans",zones:{main:[2,4,6],waterfront:[8,14,16],private:[18,20,22]},fixes:["Main floor, Waterfront, and Private dining now render as distinct floor plans","only tables in the active room remain visible","table targets are recentered for each room","switching rooms clears stale neutral table details","seating choice state remains intact while changing rooms","overall status bar remains restaurant-wide"]},null,2));
