"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd();
const htmlPath=path.join(root,"client","index.html");
const protectedPaths=[
 path.join(root,"client","js","floor-reservations-v62.0.js"),
 path.join(root,"client","js","kitchen-truth-v100.2.60.js"),
 path.join(root,"client","js","kitchen-service-handoff-v100.2.61.js")
];
if(!fs.existsSync(htmlPath)||protectedPaths.some(p=>!fs.existsSync(p)))throw new Error("V100.2.62 requires applied V100.2.61 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const before=new Map(protectedPaths.map(p=>[p,hash(p)]));
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","kitchen-priority-v100.2.62.js"),path.join(root,"client","js","kitchen-priority-v100.2.62.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.62-kitchen-priority-exceptions.js"),path.join(root,"scripts","maintenance","test-v100.2.62-kitchen-priority-exceptions.js"));
let html=fs.readFileSync(htmlPath,"utf8");
if(!html.includes("kitchen-priority-v100.2.62.js")){
 const anchor='<script src="js/kitchen-service-handoff-v100.2.61.js?v=100.2.61"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.62 guard failed: V100.2.61 script anchor missing.");
 html=html.replace(anchor,anchor+'\n<script src="js/kitchen-priority-v100.2.62.js?v=100.2.62"></script>');
 fs.writeFileSync(htmlPath,html);
}
for(const p of protectedPaths)if(hash(p)!==before.get(p))throw new Error(`Protected runtime file changed during V100.2.62 apply: ${path.relative(root,p)}`);
console.log(JSON.stringify({ok:true,version:"100.2.62",wave:"Kitchen First Priority / Exception Intelligence",architecture:"additive Kitchen decorator",priority:"Ready → Recovery → Needs check → On pace",thresholds:{attentionMinutes:15,recoveryMinutes:23},truthBoundary:"no cause diagnosis or synthetic kitchen telemetry",protectedRuntime:"unchanged"},null,2));