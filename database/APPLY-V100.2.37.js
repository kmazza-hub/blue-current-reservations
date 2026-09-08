"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const jsPath=path.join(root,"client","js","app-v15.1.3.js");
const cssPath=path.join(root,"client","styles.css");
const jsFrag=path.join(root,"patches","host-world-class-floor-v100.2.37.jsfrag");
const cssFrag=path.join(root,"patches","host-world-class-floor-v100.2.37.cssfrag");
for(const p of [jsPath,cssPath,jsFrag,cssFrag]){if(!fs.existsSync(p)){console.error(`V100.2.37 apply failed: missing ${path.relative(root,p)}`);process.exit(1);}}
let js=fs.readFileSync(jsPath,"utf8"),css=fs.readFileSync(cssPath,"utf8");
if(!js.includes("V100.2.36 — Production-Scale Restaurant Floor Plans")){console.error("V100.2.37 requires V100.2.36 first.");process.exit(1);}
if(js.includes("V100.2.37 — World-Class Floor Map Design System")){console.log("V100.2.37 already applied.");process.exit(0);}
fs.writeFileSync(jsPath+".v100.2.37.bak",js);fs.writeFileSync(cssPath+".v100.2.37.bak",css);
fs.writeFileSync(jsPath,js+"\n\n"+fs.readFileSync(jsFrag,"utf8").trim()+"\n");
fs.writeFileSync(cssPath,css+"\n\n"+fs.readFileSync(cssFrag,"utf8").trim()+"\n");
console.log(JSON.stringify({ok:true,version:"100.2.37",feature:"World-Class Floor Map Design System",principles:["stable table geometry","capacity encoded by physical shape","status layered on top","quiet architectural anchors","section-specific spatial identity","no seating lifecycle changes"]},null,2));
