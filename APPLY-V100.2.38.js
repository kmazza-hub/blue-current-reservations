"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const cssPath=path.join(root,"client","styles.css");
const fragPath=path.join(root,"patches","host-floor-detail-center-v100.2.38.cssfrag");
for(const p of [cssPath,fragPath]){
  if(!fs.existsSync(p)){console.error(`V100.2.38 apply failed: missing ${path.relative(root,p)}`);process.exit(1);}
}
let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("V100.2.37 — World-Class Floor Map Design System")){
  console.error("V100.2.38 requires V100.2.37 first.");process.exit(1);
}
if(css.includes("V100.2.38 — Centered Table Detail + Floor Collision Polish")){
  console.log("V100.2.38 already applied.");process.exit(0);
}
fs.writeFileSync(cssPath+".v100.2.38.bak",css);
css += "\n\n" + fs.readFileSync(fragPath,"utf8").trim() + "\n";
fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({ok:true,version:"100.2.38",repair:"Centered Table Detail + Floor Collision Polish",fixes:["centers neutral Selected Table detail in the active floor","keeps the detail clear of top-left chrome","restores dark readable text on the white detail card","preserves V100.2.33 close/Escape/empty-floor dismiss behavior","removes nonessential construction-line annotations from the premium floor","keeps only quiet room landmarks","no seating, waitlist, arrival, reservation, table-state, or persistence logic changes"]},null,2));
