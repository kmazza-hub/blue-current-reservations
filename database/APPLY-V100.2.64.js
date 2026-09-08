"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),htmlPath=path.join(root,"client","index.html");
const protectedPaths=[
 "client/js/floor-reservations-v62.0.js",
 "client/js/kitchen-truth-v100.2.60.js",
 "client/js/kitchen-service-handoff-v100.2.61.js",
 "client/js/kitchen-priority-v100.2.62.js",
 "client/js/modules/timeClock.js",
 "client/js/modules/workforceIntelligence.js",
 "client/js/cloud/cloudApi.js"
].map(p=>path.join(root,p));
if(!fs.existsSync(htmlPath)||protectedPaths.some(p=>!fs.existsSync(p)))throw new Error("V100.2.64 requires applied V100.2.63 baseline with Time Clock API.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),before=new Map(protectedPaths.map(p=>[p,hash(p)]));
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","staff-truth-v100.2.64.js"),path.join(root,"client","js","staff-truth-v100.2.64.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.64-staffing-truth-foundation.js"),path.join(root,"scripts","maintenance","test-v100.2.64-staffing-truth-foundation.js"));
let html=fs.readFileSync(htmlPath,"utf8");
if(!html.includes("staff-truth-v100.2.64.js")){
 const anchor='<script src="js/staff-kitchen-service-v62.50.js?v=62.50.0"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.64 guard failed: staffing script anchor missing.");
 html=html.replace(anchor,anchor+'\n<script src="js/staff-truth-v100.2.64.js?v=100.2.64"></script>');
 fs.writeFileSync(htmlPath,html);
}
for(const p of protectedPaths)if(hash(p)!==before.get(p))throw new Error(`Protected runtime changed during V100.2.64 apply: ${path.relative(root,p)}`);
console.log(JSON.stringify({ok:true,version:"100.2.64",wave:"Staffing Truth Foundation",architecture:"isolated Time Clock-backed operator surface",truthBoundary:"no synthetic demand, scheduled coverage, or callout risk",fallback:"explicit unavailable state",protectedRuntime:"unchanged"},null,2));