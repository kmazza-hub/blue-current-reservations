"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=f=>fs.readFileSync(path.join(root,f),"utf8");
const focus=read("client/js/focused-operator-workspaces-v100.3.9.js"),shell=read("client/js/modules/hospitalityOsShell.js"),readiness=read("client/js/modules/productionReadiness.js"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`)}
const install=shell.match(/function installPrimaryNavigation\(\)[\s\S]*?\n\}/)?.[0]||"";
check("Build advances to V100.3.83",pkg.version==="100.3.83"&&html.includes('content="100.3.83"'));
check("Focused runtime remains cleanup-only for sidebar navigation",!/BlueCurrentHospitalityShell|queueMicrotask/.test((focus.match(/const workspaceButton=[\s\S]*?const rush=/)||[])[0]||""));
check("Shell owns both pointer and click navigation",/addEventListener\("pointerdown"/.test(install)&&/addEventListener\("click"/.test(install));
check("Pointer navigation commits before expensive click work",/pointerCommit=\{name,at:Date\.now\(\)\};[\s\S]*commit\(name\)/.test(install));
check("Matching click does not duplicate a successful pointer commit",/pointerCommit\.name===name[\s\S]*dataset\.bcWorkspace===name[\s\S]*return/.test(install));
check("Navigation intent is retained during the settlement lease",/claimWorkspaceIntent\(name\)/.test(install)&&/function claimWorkspaceIntent\(name\)[\s\S]*dataset\.bcWorkspaceIntent=name/.test(shell));
check("Late workspace reclamation is corrected through 1.8 seconds",/\[80,320,900,1800\][\s\S]*setTimeout\(settle,delay\)/.test(install));
check("Command writes certified readiness into shared DOM state",/dataset\.bcCertifiedReadiness=JSON\.stringify\(readiness\)/.test(shell));
check("Shell reads shared DOM readiness before other fallbacks",/function retainedCertifiedReadiness\(\)[\s\S]*dataset\.bcCertifiedReadiness[\s\S]*BlueCurrentCertifiedPilotReadiness/.test(shell));
check("System reads the same shared DOM readiness authority",/const retainedReadiness=\(\)=>\{[\s\S]*dataset\.bcCertifiedReadiness[\s\S]*JSON\.parse\(retained\)/.test(readiness));
check("System observes later DOM readiness publications",/new MutationObserver[\s\S]*data-bc-certified-readiness[\s\S]*renderSummary\(\)/.test(readiness));
check("Changed assets cross the V100.3.83 cache boundary",html.includes("focused-operator-workspaces-v100.3.9.js?v=100.3.83")&&html.includes("hospitalityOsShell.js?v=100.3.83")&&html.includes("productionReadiness.js?v=100.3.83"));
console.log(`V100.3.83 navigation and readiness authority ${passed}/${passed}`);
