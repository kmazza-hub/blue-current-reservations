"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd();
const paths={
 html:path.join(root,"client","index.html"),
 floor:path.join(root,"client","js","floor-reservations-v62.0.js"),
 truth:path.join(root,"client","js","manager-operations-truth-v100.2.68.js"),
 ownership:path.join(root,"client","js","manager-action-ownership-v100.2.69.js"),
 runtime:path.join(root,"client","js","runtime-performance-v100.2.70.js")
};
if(!Object.values(paths).every(fs.existsSync))throw new Error("V100.2.71 requires the applied V100.2.70 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const floorBefore=hash(paths.floor),ownershipBefore=hash(paths.ownership);
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","manager-action-followup-v100.2.71.js"),path.join(root,"client","js","manager-action-followup-v100.2.71.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.71-manager-action-followup.js"),path.join(root,"scripts","maintenance","test-v100.2.71-manager-action-followup.js"));

let truth=fs.readFileSync(paths.truth,"utf8");
if(!truth.includes('bluecurrent:manager-operations-rendered')){
 const anchor=' view.querySelectorAll("[data-bc-mgr-complete]").forEach(button=>button.addEventListener("click",()=>complete(button.dataset.bcMgrComplete,button)));';
 if(!truth.includes(anchor))throw new Error("V100.2.71 guard failed: Manager Truth render anchor missing.");
 truth=truth.replace(anchor,anchor+'\n window.dispatchEvent(new CustomEvent("bluecurrent:manager-operations-rendered",{detail:{version:"100.2.68",openActions:open.length}}));');
 fs.writeFileSync(paths.truth,truth);
}

let runtime=fs.readFileSync(paths.runtime,"utf8");
const followupSource='js/manager-action-followup-v100.2.71.js?v=100.2.71';
if(!runtime.includes(followupSource)){
 const anchor='    "js/manager-action-ownership-v100.2.69.js?v=100.2.69"';
 if(!runtime.includes(anchor))throw new Error("V100.2.71 guard failed: V100.2.69 manager runtime anchor missing.");
 runtime=runtime.replace(anchor,anchor+',\n    "'+followupSource+'"');
 fs.writeFileSync(paths.runtime,runtime);
}

let html=fs.readFileSync(paths.html,"utf8");
if(!html.includes(followupSource)){
 const anchor='<script type="text/bluecurrent-runtime-lazy" data-src="js/manager-action-ownership-v100.2.69.js?v=100.2.69" data-bc-runtime-group="manager"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.71 guard failed: V100.2.69 lazy placeholder missing.");
 html=html.replace(anchor,anchor+'\n<script type="text/bluecurrent-runtime-lazy" data-src="'+followupSource+'" data-bc-runtime-group="manager"></script>');
 fs.writeFileSync(paths.html,html);
}

if(hash(paths.floor)!==floorBefore)throw new Error("Protected Floor changed during V100.2.71 apply.");
if(hash(paths.ownership)!==ownershipBefore)throw new Error("V100.2.69 ownership module changed during V100.2.71 apply.");
if(!fs.readFileSync(paths.truth,"utf8").includes('bluecurrent:manager-operations-rendered'))throw new Error("Manager render event was not installed.");
if(!fs.readFileSync(paths.runtime,"utf8").includes(followupSource))throw new Error("Manager runtime group did not receive V100.2.71.");
if(!fs.readFileSync(paths.html,"utf8").includes(followupSource))throw new Error("V100.2.71 lazy placeholder was not installed.");
console.log(JSON.stringify({ok:true,version:"100.2.71",wave:"Manager Action Follow-Up Intelligence",followUpRule:"created >= 30 minutes ago and still open",managerRenderInterface:"installed",runtimeLoading:"manager workspace lazy",protectedFloor:"unchanged",v100269:"unchanged"},null,2));
