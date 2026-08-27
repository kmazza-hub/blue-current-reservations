"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),htmlPath=path.join(root,"client","index.html"),floorPath=path.join(root,"client","js","floor-reservations-v62.0.js");
if(!fs.existsSync(htmlPath)||!fs.existsSync(floorPath)||!fs.existsSync(path.join(root,"client","js","completed-visit-turn-certification-v100.2.58.js")))throw new Error("V100.2.60 requires applied V100.2.58+ baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),floorBefore=hash(floorPath);
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","kitchen-truth-v100.2.60.js"),path.join(root,"client","js","kitchen-truth-v100.2.60.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.60-kitchen-truth-foundation.js"),path.join(root,"scripts","maintenance","test-v100.2.60-kitchen-truth-foundation.js"));
let html=fs.readFileSync(htmlPath,"utf8");
if(!html.includes("kitchen-truth-v100.2.60.js")){
 const anchor='<script src="js/staff-kitchen-service-v62.50.js?v=62.50.0"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.60 guard failed: operator kitchen load anchor missing.");
 html=html.replace(anchor,anchor+'\n<script src="js/kitchen-truth-v100.2.60.js?v=100.2.60"></script>');
 fs.writeFileSync(htmlPath,html);
}
if(hash(floorPath)!==floorBefore)throw new Error("Protected Floor controller changed during V100.2.60 apply.");
console.log(JSON.stringify({ok:true,version:"100.2.60",wave:"Kitchen Truth Foundation",architecture:"isolated Service-linked kitchen queue",truthBoundary:"no POS/KDS data is invented",protectedFloor:"unchanged"},null,2));