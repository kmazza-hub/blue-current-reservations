"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=f=>fs.readFileSync(path.join(root,f),"utf8");
const focus=read("client/js/focused-operator-workspaces-v100.3.9.js"),shell=read("client/js/modules/hospitalityOsShell.js"),readiness=read("client/js/modules/productionReadiness.js"),css=read("client/styles.css"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`)}
check("Build advances to V100.3.77",pkg.version==="100.3.77"&&html.includes('content="100.3.77"'));
check("Focus runtime owns sidebar intent before focused-job fallback",/const workspaceButton=e\.target\.closest\?\.\("\.bc-os-nav \[data-bc-workspace\]"\)[\s\S]*const rush=e\.target\.closest/.test(focus));
check("Focused operator state exits without forcing Guest home",/if\(currentJob\)exitOperatorFocus\(\{returnHome:false\}\)/.test(focus));
check("Full-screen floor state exits without forcing Guest home",/bc-ipad-floor-focus[\s\S]*exitFloor\(\{returnHome:false\}\)/.test(focus));
check("Requested sidebar destination commits after focus cleanup",/queueMicrotask\(commit\)/.test(focus)&&/activate\?\.\(requested,\{scroll:true\}\)/.test(focus));
check("Focused runtime reasserts only when the requested destination was lost",/\[60,220\][\s\S]*current\?\.\(\)!==requested[\s\S]*commit\(\)/.test(focus));
check("Certified readiness persists in browser session state",/sessionStorage\.setItem\("bluecurrent\.certifiedPilotReadiness",JSON\.stringify\(certifiedReadiness\)\)/.test(shell));
check("System restores retained readiness when it loads after Command",/sessionStorage\.getItem\("bluecurrent\.certifiedPilotReadiness"\)/.test(readiness));
check("Dynamic manager actions meet the 44px target",/\.bc-manager-action button[\s\S]*min-height:44px/.test(css));
check("Changed focus and truth assets cross the V100.3.77 cache boundary",html.includes("focused-operator-workspaces-v100.3.9.js?v=100.3.77")&&html.includes("hospitalityOsShell.js?v=100.3.77")&&html.includes("productionReadiness.js?v=100.3.77")&&html.includes("styles.css?v=100.3.77"));
console.log(`V100.3.77 focus navigation and readiness state ${passed}/${passed}`);
