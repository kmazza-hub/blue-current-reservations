"use strict";
const fs=require("fs"),path=require("path");
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("client/index.html"),loader=read("client/js/runtime-performance-v100.2.70.js"),floor=read("client/js/floor-reservations-v62.0.js"),startup=read("client/js/startup-loader.js"),mgr=read("client/js/manager-action-ownership-v100.2.69.js");
const legacy=["idlePackWarmupEngine","idlePackWarmupCenter","eventStormGuardEngine","eventStormGuardCenter","renderBudgetEngine","renderBudgetCenter","adaptivePackEngine","adaptivePackCenter","memoryPressureEngine","memoryPressureCenter","centerSuspensionEngine","centerSuspensionCenter","networkRequestEngine","networkRequestCenter","stateChurnEngine","stateChurnCenter","runtimeCircuitBreakerEngine","runtimeCircuitBreakerCenter","subscriptionLifecycleEngine","subscriptionLifecycleCenter","storageFootprintEngine","storageFootprintCenter","runtimeReadinessEngine","runtimeReadinessCenter","performanceBaselineEngine","performanceBaselineCenter","performanceRegressionEngine","performanceRegressionCenter","productionRuntimeEngine","productionRuntimeCenter","releaseCandidateEngine","releaseCandidateCenter","rollbackCheckpointEngine","rollbackCheckpointCenter","productionSmokeTestEngine","productionSmokeTestCenter","deploymentRehearsalEngine","deploymentRehearsalCenter","environmentGateEngine","environmentGateCenter","acceptanceSignoffEngine","acceptanceSignoffCenter","v37CertificationEngine","v37CertificationCenter"];
const runtime=[
 "js/kitchen-truth-v100.2.60.js?v=100.2.60","js/kitchen-service-handoff-v100.2.61.js?v=100.2.61","js/kitchen-priority-v100.2.62.js?v=100.2.62",
 "js/staff-truth-v100.2.64.js?v=100.2.64","js/staff-role-coverage-v100.2.65.js?v=100.2.65","js/staff-attendance-v100.2.66.js?v=100.2.66",
 "js/manager-operations-truth-v100.2.68.js?v=100.2.68","js/manager-action-ownership-v100.2.69.js?v=100.2.69"
];
const activeRuntime=runtime.filter(src=>html.includes(`<script src="${src}"></script>`));
const deferredLegacy=legacy.filter(name=>new RegExp(`type="text/bluecurrent-deferred" data-src="js/modules/${name}\\.js\\?v=[^"]+" data-pack="diagnostics"`).test(html));
const checks=[
 ["V100.2.70 loader marker",/V100\.2\.70 — Startup \/ Runtime Performance Hardening/.test(loader)],
 ["all 44 nonessential V37 diagnostics deferred",deferredLegacy.length===44],
 ["all 8 recent domain modules removed from immediate startup",activeRuntime.length===0],
 ["8 recent domain modules preserved as lazy placeholders",runtime.every(src=>html.includes(`type="text/bluecurrent-runtime-lazy" data-src="${src}"`))],
 ["new runtime loader is active",html.includes('<script src="js/runtime-performance-v100.2.70.js?v=100.2.70"></script>')],
 ["runtime loader follows existing startup loader",html.indexOf("runtime-performance-v100.2.70.js")>html.indexOf("startup-loader.js?v=67.0.0")],
 ["Kitchen group preserves .60→.61→.62 order",loader.indexOf("kitchen-truth-v100.2.60.js")<loader.indexOf("kitchen-service-handoff-v100.2.61.js")&&loader.indexOf("kitchen-service-handoff-v100.2.61.js")<loader.indexOf("kitchen-priority-v100.2.62.js")],
 ["Staff group preserves .64→.65→.66 order",loader.indexOf("staff-truth-v100.2.64.js")<loader.indexOf("staff-role-coverage-v100.2.65.js")&&loader.indexOf("staff-role-coverage-v100.2.65.js")<loader.indexOf("staff-attendance-v100.2.66.js")],
 ["Manager group preserves .68→.69 order",loader.indexOf("manager-operations-truth-v100.2.68.js")<loader.indexOf("manager-action-ownership-v100.2.69.js")],
 ["operator navigation triggers on-demand loading",/operator-navigation/.test(loader)&&/closest\?\.\("a,button/.test(loader)],
 ["workspace visibility triggers on-demand loading",/IntersectionObserver/.test(loader)&&/workspace-visible/.test(loader)],
 ["full mode still loads all current runtime groups",/get\("full"\)===\"1\"/.test(loader)&&/full-startup/.test(loader)],
 ["loader yields between domain modules",/setTimeout\(resolve,0\)/.test(loader)],
 ["existing focused startup system preserved",/const mode = fullStartup \? "full" : requestedPacks\.size \? "progressive" : "focused"/.test(startup)],
 ["protected Floor restoration remains",/V100\.2\.47 — Floor Layout Restoration/.test(floor)],
 ["V100.2.69 ownership remains present",/V100\.2\.69 — Manager Action Ownership \/ Accountability/.test(mgr)],
 ["no restaurant lifecycle mutation in performance loader",!/bc:host-table-cleaning|bc:service-party-completed|classList\.add\("cleaning"\)|updateManagerAction\(/.test(loader)]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(ok)passed++;}
console.log(`V100.2.70 validation ${passed}/${checks.length}`);if(passed!==checks.length)process.exit(1);