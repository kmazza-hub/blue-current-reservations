"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const jsPath=path.join(root,"client","js","app-v15.1.3.js");
const cssPath=path.join(root,"client","styles.css");
const jsFrag=path.join(root,"patches","host-production-scale-floor-v100.2.36.jsfrag");
const cssFrag=path.join(root,"patches","host-production-scale-floor-v100.2.36.cssfrag");
for (const p of [jsPath,cssPath,jsFrag,cssFrag]) { if(!fs.existsSync(p)){ console.error(`V100.2.36 apply failed: missing ${path.relative(root,p)}`); process.exit(1); } }
let js=fs.readFileSync(jsPath,"utf8"), css=fs.readFileSync(cssPath,"utf8");
if(!js.includes("V100.2.35 — Premium Restaurant Floor Map")){ console.error("V100.2.36 requires V100.2.35 first."); process.exit(1); }
if(js.includes("V100.2.36 — Production-Scale Restaurant Floor Plans")){ console.log("V100.2.36 already applied."); process.exit(0); }
fs.writeFileSync(jsPath+".v100.2.36.bak",js); fs.writeFileSync(cssPath+".v100.2.36.bak",css);
fs.writeFileSync(jsPath,js+"\n\n"+fs.readFileSync(jsFrag,"utf8").trim()+"\n");
fs.writeFileSync(cssPath,css+"\n\n"+fs.readFileSync(cssFrag,"utf8").trim()+"\n");
console.log(JSON.stringify({ok:true,version:"100.2.36",feature:"Production-Scale Restaurant Floor Plans",tables:{main:16,waterfront:12,private:8,total:36},fixes:["expands the sample restaurant from 9 to 36 functional tables","keeps each physical room separate","adds realistic mixed 2-, 4-, 6-, and 8-top inventory","preserves existing seating/table lifecycle logic via standard host-table contracts","recalculates top-level table counts from the expanded floor"]},null,2));
