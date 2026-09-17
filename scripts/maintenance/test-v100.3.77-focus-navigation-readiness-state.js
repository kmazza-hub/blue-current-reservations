"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=f=>fs.readFileSync(path.join(root,f),"utf8");
const focus=read("client/js/focused-operator-workspaces-v100.3.9.js"),shell=read("client/js/modules/hospitalityOsShell.js"),readiness=read("client/js/modules/productionReadiness.js"),css=read("client/styles.css"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`)}
const sidebarBlock=focus.match(/const workspaceButton=e\.target\.closest\?\.\("\.bc-os-nav \[data-bc-workspace\]"\);[\s\S]*?const rush=/)?.[0]||"";
check("Build retains V100.3.77 or later",["100.3.77","100.3.78","100.3.82"].includes(pkg.version)&&html.includes('content="100.3.82"'));
check("Focus runtime owns sidebar intent before focused-job fallback",/const workspaceButton=e\.target\.closest\?\.\("\.bc-os-nav \[data-bc-workspace\]"\)[\s\S]*const rush=e\.target\.closest/.test(focus));
check("Focused operator state exits without forcing Guest home",/if\(currentJob\)exitOperatorFocus\(\{returnHome:false\}\)/.test(focus));
check("Full-screen floor state exits without forcing Guest home",/bc-ipad-floor-focus[\s\S]*exitFloor\(\{returnHome:false\}\)/.test(focus));
check("Shell remains the exclusive sidebar destination owner",/installPrimaryNavigation\(\)[\s\S]*window\.addEventListener\("click"/.test(shell)&&!/queueMicrotask\(commit\)/.test(focus));
check("Focused runtime cleanup no longer issues a competing workspace commit",!/BlueCurrentHospitalityShell|queueMicrotask|setTimeout/.test(sidebarBlock));
check("Certified readiness persists in browser session state",/sessionStorage\.setItem\("bluecurrent\.certifiedPilotReadiness",JSON\.stringify\(readiness\)\)/.test(shell));
check("System restores retained readiness when it loads after Command",/sessionStorage\.getItem\("bluecurrent\.certifiedPilotReadiness"\)/.test(readiness));
check("Dynamic manager actions meet the 44px target",/\.bc-manager-action button[\s\S]*min-height:44px/.test(css));
check("Changed focus and truth assets cross a fresh cache boundary",html.includes("focused-operator-workspaces-v100.3.9.js?v=100.3.82")&&html.includes("hospitalityOsShell.js?v=100.3.82")&&html.includes("productionReadiness.js?v=100.3.82")&&html.includes("styles.css?v=100.3.82"));
console.log(`V100.3.77 focus navigation and readiness state ${passed}/${passed}`);
