"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),htmlPath=path.join(root,"client","index.html");
const protectedPaths=[
 "client/js/floor-reservations-v62.0.js",
 "client/js/staff-truth-v100.2.64.js",
 "client/js/modules/scheduling.js",
 "server/services/schedulingService.js",
 "client/js/modules/timeClock.js",
 "client/js/cloud/cloudApi.js",
 "client/js/kitchen-truth-v100.2.60.js",
 "client/js/kitchen-service-handoff-v100.2.61.js",
 "client/js/kitchen-priority-v100.2.62.js"
].map(p=>path.join(root,p));
if(!fs.existsSync(htmlPath)||protectedPaths.some(p=>!fs.existsSync(p)))throw new Error("V100.2.65 requires applied V100.2.64 baseline with Scheduling and Time Clock.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),before=new Map(protectedPaths.map(p=>[p,hash(p)]));
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","staff-role-coverage-v100.2.65.js"),path.join(root,"client","js","staff-role-coverage-v100.2.65.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.65-staff-role-coverage.js"),path.join(root,"scripts","maintenance","test-v100.2.65-staff-role-coverage.js"));
let html=fs.readFileSync(htmlPath,"utf8");
if(!html.includes("staff-role-coverage-v100.2.65.js")){
 const anchor='<script src="js/staff-truth-v100.2.64.js?v=100.2.64"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.65 guard failed: V100.2.64 script anchor missing.");
 html=html.replace(anchor,anchor+'\n<script src="js/staff-role-coverage-v100.2.65.js?v=100.2.65"></script>');
 fs.writeFileSync(htmlPath,html);
}
for(const p of protectedPaths)if(hash(p)!==before.get(p))throw new Error(`Protected runtime changed during V100.2.65 apply: ${path.relative(root,p)}`);
console.log(JSON.stringify({
 ok:true,
 version:"100.2.65",
 wave:"Published Schedule → Live Role Coverage",
 architecture:"isolated Scheduling + Time Clock comparison",
 certificationGate:"current week must be published",
 expectedSource:"active published shifts",
 actualSource:"clocked-in employees not on break",
 syntheticDemand:"disabled",
 protectedRuntime:"unchanged"
},null,2));