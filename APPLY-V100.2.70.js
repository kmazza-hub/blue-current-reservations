"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const root=process.cwd(),htmlPath=path.join(root,"client","index.html");
const floorPath=path.join(root,"client","js","floor-reservations-v62.0.js");
const startupPath=path.join(root,"client","js","startup-loader.js");
const ownershipPath=path.join(root,"client","js","manager-action-ownership-v100.2.69.js");
if(![htmlPath,floorPath,startupPath,ownershipPath].every(fs.existsSync))throw new Error("V100.2.70 requires the applied V100.2.69 baseline.");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const floorBefore=hash(floorPath),startupBefore=hash(startupPath),ownershipBefore=hash(ownershipPath);
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(__dirname,"patches","client","js","runtime-performance-v100.2.70.js"),path.join(root,"client","js","runtime-performance-v100.2.70.js"));
copy(path.join(__dirname,"patches","scripts","maintenance","test-v100.2.70-startup-runtime-performance.js"),path.join(root,"scripts","maintenance","test-v100.2.70-startup-runtime-performance.js"));
let html=fs.readFileSync(htmlPath,"utf8"),changed=0;
const legacy=["idlePackWarmupEngine", "idlePackWarmupCenter", "eventStormGuardEngine", "eventStormGuardCenter", "renderBudgetEngine", "renderBudgetCenter", "adaptivePackEngine", "adaptivePackCenter", "memoryPressureEngine", "memoryPressureCenter", "centerSuspensionEngine", "centerSuspensionCenter", "networkRequestEngine", "networkRequestCenter", "stateChurnEngine", "stateChurnCenter", "runtimeCircuitBreakerEngine", "runtimeCircuitBreakerCenter", "subscriptionLifecycleEngine", "subscriptionLifecycleCenter", "storageFootprintEngine", "storageFootprintCenter", "runtimeReadinessEngine", "runtimeReadinessCenter", "performanceBaselineEngine", "performanceBaselineCenter", "performanceRegressionEngine", "performanceRegressionCenter", "productionRuntimeEngine", "productionRuntimeCenter", "releaseCandidateEngine", "releaseCandidateCenter", "rollbackCheckpointEngine", "rollbackCheckpointCenter", "productionSmokeTestEngine", "productionSmokeTestCenter", "deploymentRehearsalEngine", "deploymentRehearsalCenter", "environmentGateEngine", "environmentGateCenter", "acceptanceSignoffEngine", "acceptanceSignoffCenter", "v37CertificationEngine", "v37CertificationCenter"];
for(const name of legacy){
 const re=new RegExp(`<script\\s+src="(js/modules/${name}\\.js\\?v=[^"]+)"\\s*><\\/script>`,`g`);
 html=html.replace(re,(_,src)=>{changed++;return `<script type="text/bluecurrent-deferred" data-src="${src}" data-pack="diagnostics"></script>`;});
}
const runtimeGroups={"kitchen": ["js/kitchen-truth-v100.2.60.js?v=100.2.60", "js/kitchen-service-handoff-v100.2.61.js?v=100.2.61", "js/kitchen-priority-v100.2.62.js?v=100.2.62"], "staff": ["js/staff-truth-v100.2.64.js?v=100.2.64", "js/staff-role-coverage-v100.2.65.js?v=100.2.65", "js/staff-attendance-v100.2.66.js?v=100.2.66"], "manager": ["js/manager-operations-truth-v100.2.68.js?v=100.2.68", "js/manager-action-ownership-v100.2.69.js?v=100.2.69"]};
for(const [group,sources] of Object.entries(runtimeGroups)){
 for(const source of sources){
  const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const re=new RegExp(`<script\\s+src="${escaped}"\\s*><\\/script>`,`g`);
  html=html.replace(re,()=>{changed++;return `<script type="text/bluecurrent-runtime-lazy" data-src="${source}" data-bc-runtime-group="${group}"></script>`;});
 }
}
if(!html.includes("runtime-performance-v100.2.70.js")){
 const anchor='<script src="js/startup-loader.js?v=67.0.0"></script>';
 if(!html.includes(anchor))throw new Error("V100.2.70 guard failed: startup-loader anchor missing.");
 html=html.replace(anchor,anchor+'\\n<script src="js/runtime-performance-v100.2.70.js?v=100.2.70"></script>');
}
// Require the important recent modules to have been converted. This avoids a half-applied performance wave.
for(const [group,sources] of Object.entries(runtimeGroups))for(const source of sources){
 if(!html.includes(`type="text/bluecurrent-runtime-lazy" data-src="${source}" data-bc-runtime-group="${group}"`))throw new Error(`V100.2.70 could not defer ${source}.`);
}
fs.writeFileSync(htmlPath,html);
if(hash(floorPath)!==floorBefore)throw new Error("Protected Floor changed during V100.2.70 apply.");
if(hash(startupPath)!==startupBefore)throw new Error("Existing startup-loader changed during V100.2.70 apply.");
if(hash(ownershipPath)!==ownershipBefore)throw new Error("V100.2.69 ownership module changed during V100.2.70 apply.");
const active=(html.match(/<script\s+src="/g)||[]).length;
const diagnosticDeferred=html.split('data-pack="diagnostics"').length-1;
const runtimeLazy=html.split('type="text/bluecurrent-runtime-lazy"').length-1;
console.log(JSON.stringify({ok:true,version:"100.2.70",wave:"Startup / Runtime Performance Hardening",changedScriptTags:changed,activeScriptTags:active,diagnosticScriptsDeferred:diagnosticDeferred,runtimeDomainScriptsLazy:runtimeLazy,protectedFloor:"unchanged",startupLoader:"unchanged",v100269:"unchanged"},null,2));
