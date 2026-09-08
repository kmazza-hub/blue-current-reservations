"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),htmlPath=path.join(root,"client","index.html");
const protectedPaths=[
 "client/js/floor-reservations-v62.0.js","client/js/command-live-v61.50.js",
 "server/services/actionListService.js","server/services/operationsFeedService.js",
 "server/services/commandCenterService.js","client/js/cloud/cloudApi.js",
 "client/js/staff-truth-v100.2.64.js","client/js/staff-role-coverage-v100.2.65.js","client/js/staff-attendance-v100.2.66.js",
 "client/js/kitchen-truth-v100.2.60.js","client/js/kitchen-service-handoff-v100.2.61.js","client/js/kitchen-priority-v100.2.62.js"
].map(p=>path.join(root,p));
if(!fs.existsSync(htmlPath)||protectedPaths.some(p=>!fs.existsSync(p)))throw new Error("V100.2.68 requires applied V100.2.67 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),before=new Map(protectedPaths.map(p=>[p,hash(p)]));
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","manager-operations-truth-v100.2.68.js"),path.join(root,"client","js","manager-operations-truth-v100.2.68.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.68-manager-operations-truth.js"),path.join(root,"scripts","maintenance","test-v100.2.68-manager-operations-truth.js"));
let html=fs.readFileSync(htmlPath,"utf8");
if(!html.includes("manager-operations-truth-v100.2.68.js")){
 const anchor='<script src="js/command-live-v61.50.js?v=61.50.0"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.68 guard failed: command-live anchor missing.");
 html=html.replace(anchor,anchor+'\n<script src="js/manager-operations-truth-v100.2.68.js?v=100.2.68"></script>');
 fs.writeFileSync(htmlPath,html);
}
for(const p of protectedPaths)if(hash(p)!==before.get(p))throw new Error(`Protected runtime changed during V100.2.68 apply: ${path.relative(root,p)}`);
console.log(JSON.stringify({ok:true,version:"100.2.68",wave:"Manager Operations Truth Foundation",architecture:"isolated Manager Actions + Operations Feed surface",legacyCommandForecast:"bypassed in primary manager view",managerMutation:"human completion only",protectedRuntime:"unchanged"},null,2));