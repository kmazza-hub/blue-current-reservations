"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd();
const cssPath=path.join(root,"client","styles.css");
const fragPath=path.join(root,"patches","host-floor-zero-overlap-v100.2.42.cssfrag");
for(const p of [cssPath,fragPath]){
  if(!fs.existsSync(p)){console.error(`V100.2.42 apply failed: missing ${path.relative(root,p)}`);process.exit(1);}
}
let css=fs.readFileSync(cssPath,"utf8");
if(!css.includes("V100.2.39 — Collision-Safe Premium Floor Layout")){
  console.error("V100.2.42 requires V100.2.39 or later floor-map baseline first.");process.exit(1);
}
if(css.includes("V100.2.42 — Zero-Overlap Restaurant Floor Spacing")){
  console.log("V100.2.42 already applied.");process.exit(0);
}
fs.writeFileSync(cssPath+".v100.2.42.bak",css);
css += "\n\n" + fs.readFileSync(fragPath,"utf8").trim() + "\n";
fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({
  ok:true,
  version:"100.2.42",
  repair:"Zero-Overlap Restaurant Floor Spacing",
  fixes:[
    "uses direct left/top coordinates so legacy variables cannot pull tables back into each other",
    "separates all main-floor tables into a true four-by-four field",
    "separates waterfront tables into three clean rows away from the window rail",
    "separates private-dining tables into two generous rows",
    "reduces selected-table growth so focus never collides with a neighbor",
    "keeps larger six- and eight-top footprints bounded",
    "preserves seating, reservations, waitlist, arrivals, lifecycle, and persistence behavior"
  ]
},null,2));
