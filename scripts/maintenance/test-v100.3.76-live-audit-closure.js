"use strict";

const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const shell=read("client/js/modules/hospitalityOsShell.js"),readiness=read("client/js/modules/productionReadiness.js"),css=read("client/styles.css"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;function check(name,condition){assert.ok(condition,name);passed++;console.log(`PASS: ${name}`)}

check("Build advances to V100.3.76",pkg.version==="100.3.76"&&html.includes('content="100.3.76"'));
check("Sidebar navigation retains one delegated event owner",/function installPrimaryNavigation\(\)[\s\S]*navigation\.addEventListener\("click"[\s\S]*stopImmediatePropagation/.test(shell));
check("A navigation sequence reasserts the requested destination after focus cleanup",/let navigationSequence=0[\s\S]*requestAnimationFrame[\s\S]*dataset\.bcWorkspace!==name[\s\S]*setTimeout[\s\S]*180/.test(shell));
check("Stale navigation work cannot override a newer operator request",(shell.match(/sequence!==navigationSequence/g)||[]).length>=2);
check("Loaded Command data always renders authoritative source truth",/function renderCommand\(data\)[\s\S]*renderLocations\(data\);[\s\S]*renderSourceTruth\(data\);/.test(shell));
check("Historical data explicitly settles to Demo snapshot",/data\.dataMode==="historical-demo"[\s\S]*label\.textContent="Demo snapshot"/.test(shell));
check("Pilot readiness is retained for late-loading consumers",/window\.BlueCurrentCertifiedPilotReadiness=certifiedReadiness/.test(shell));
check("System initializes from the retained certified readiness",/let certifiedPilotReadiness = window\.BlueCurrentCertifiedPilotReadiness \|\| null/.test(readiness));
check("System continues to consume later readiness updates",/addEventListener\("bluecurrent:pilot-readiness"/.test(readiness));
check("Private walkthrough meets the 44px touch target",/\.bc-conversion-float a\{min-height:44px/.test(css));
check("Changed runtime assets cross the V100.3.76 cache boundary",html.includes("styles.css?v=100.3.76")&&html.includes("hospitalityOsShell.js?v=100.3.76")&&html.includes("productionReadiness.js?v=100.3.76"));

console.log(`V100.3.76 live audit closure ${passed}/${passed}`);
