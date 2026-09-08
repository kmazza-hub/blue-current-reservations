"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),htmlPath=path.join(root,"client","index.html"),floorPath=path.join(root,"client","js","floor-reservations-v62.0.js"),kitchenPath=path.join(root,"client","js","kitchen-truth-v100.2.60.js");
if(!fs.existsSync(htmlPath)||!fs.existsSync(floorPath)||!fs.existsSync(kitchenPath))throw new Error("V100.2.61 requires applied V100.2.60 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),floorBefore=hash(floorPath),kitchenBefore=hash(kitchenPath);
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","kitchen-service-handoff-v100.2.61.js"),path.join(root,"client","js","kitchen-service-handoff-v100.2.61.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.61-kitchen-service-handoff.js"),path.join(root,"scripts","maintenance","test-v100.2.61-kitchen-service-handoff.js"));
let html=fs.readFileSync(htmlPath,"utf8");
if(!html.includes("kitchen-service-handoff-v100.2.61.js")){
 const anchor='<script src="js/kitchen-truth-v100.2.60.js?v=100.2.60"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.61 guard failed: V100.2.60 script anchor missing.");
 html=html.replace(anchor,anchor+'\n<script src="js/kitchen-service-handoff-v100.2.61.js?v=100.2.61"></script>');
 fs.writeFileSync(htmlPath,html);
}
if(hash(floorPath)!==floorBefore)throw new Error("Protected Floor controller changed during V100.2.61 apply.");
if(hash(kitchenPath)!==kitchenBefore)throw new Error("V100.2.60 Kitchen Truth module changed during V100.2.61 apply.");
console.log(JSON.stringify({ok:true,version:"100.2.61",wave:"Kitchen Ready → Service / Expo Handoff",architecture:"isolated event-driven bridge",ready:"promoted into existing Service workspace",delivery:"human-confirmed Food delivered clears ready signal",protectedFloor:"unchanged"},null,2));