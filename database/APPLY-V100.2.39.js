"use strict";
const fs=require("fs");
const path=require("path");
const root=process.cwd();
const cssPath=path.join(root,"client","styles.css");
const fragPath=path.join(root,"patches","host-floor-collision-safe-v100.2.39.cssfrag");
for(const p of [cssPath,fragPath]){
  if(!fs.existsSync(p)){console.error(`V100.2.39 apply failed: missing ${path.relative(root,p)}`);process.exit(1);}
}
let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("V100.2.38 — Centered Table Detail + Floor Collision Polish")){
  console.error("V100.2.39 requires V100.2.38 first.");process.exit(1);
}
if(css.includes("V100.2.39 — Collision-Safe Premium Floor Layout")){
  console.log("V100.2.39 already applied.");process.exit(0);
}
fs.writeFileSync(cssPath+".v100.2.39.bak",css);
css += "\n\n" + fs.readFileSync(fragPath,"utf8").trim() + "\n";
fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({
  ok:true,
  version:"100.2.39",
  repair:"Collision-Safe Premium Floor Layout",
  fixes:[
    "assigns every table a distinct non-overlapping slot",
    "main floor uses a clean 4x4 operational layout",
    "waterfront uses three clear rows away from window/service landmarks",
    "private dining uses two deliberate rows inside the room",
    "reduces selected-table scale so emphasis cannot touch neighbors",
    "preserves table states, seating, waitlist, reservations, counts, and centered detail behavior"
  ]
},null,2));
