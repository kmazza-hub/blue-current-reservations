"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const closure=read("client/js/pilot-readiness-closure-v100.3.83.js"),shell=read("client/js/modules/hospitalityOsShell.js"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`);}
const required=["restaurantConfigurationReady","locationCertificationCurrent","workflowBindingCurrent","serviceSimulationCurrent","operatorAcceptanceCurrent"];
check("Build advances to V100.3.83",pkg.version==="100.3.83"&&html.includes('content="100.3.83"'));
check("Readiness closure workbench is loaded before the shell",html.indexOf("pilot-readiness-closure-v100.3.83.js?v=100.3.83")<html.indexOf("hospitalityOsShell.js?v=100.3.83"));
check("All five expected pilot evidence gates are named",required.every(key=>closure.includes(key)));
check("Human-readable gate titles are present",["Restaurant configuration","Location certification","Workflow binding","Service simulation","Physical-iPad acceptance"].every(label=>closure.includes(label)));
check("Readiness blockers are rendered from certified server truth",/Array\.isArray\(readiness\.blocking\)/.test(closure)&&/data-bc-readiness-key/.test(closure));
check("Shell preserves blocker identities in certified state",/blocking:Array\.isArray\(data\.readiness\?\.blocking\)/.test(shell));
check("Shell publishes detailed readiness without changing it",/bluecurrent:pilot-readiness-detail/.test(shell)&&/BlueCurrentPilotReadinessClosure\?\.render/.test(shell));
check("Workbench explicitly preserves human-controlled evidence",/will not manufacture readiness/.test(closure)&&/human decision/.test(closure));
check("Workbench contains no mutating network request",!/(fetch\s*\(|XMLHttpRequest|method\s*:\s*["'](?:POST|PUT|PATCH|DELETE))/.test(closure));
check("Every readiness action meets the 44px target",/\.bc-readiness-gate button\{min-height:44px/.test(closure));
check("Requirement disclosure is accessible",/aria-expanded/.test(closure)&&/Show requirement/.test(closure));
check("Safety gates remain visible in the mapping",closure.includes("providerWriteBackLockedOff")&&closure.includes("autonomousProductionChangesLockedOff"));
console.log(`V100.3.83 pilot readiness closure ${passed}/${passed}`);
