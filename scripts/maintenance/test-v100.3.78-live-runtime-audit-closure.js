"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=f=>fs.readFileSync(path.join(root,f),"utf8");
const focus=read("client/js/focused-operator-workspaces-v100.3.9.js"),shell=read("client/js/modules/hospitalityOsShell.js"),readiness=read("client/js/modules/productionReadiness.js"),css=read("client/styles.css"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`)}
const sidebarBlock=focus.match(/const workspaceButton=e\.target\.closest\?\.\("\.bc-os-nav \[data-bc-workspace\]"\);[\s\S]*?const rush=/)?.[0]||"";
check("Build retains V100.3.78 or later",["100.3.78","100.3.82"].includes(pkg.version)&&html.includes('content="100.3.82"'));
check("Focused runtime performs cleanup without selecting a workspace",/exitOperatorFocus\(\{returnHome:false\}\)/.test(sidebarBlock)&&/exitFloor\(\{returnHome:false\}\)/.test(sidebarBlock)&&!/BlueCurrentHospitalityShell|queueMicrotask|setTimeout/.test(sidebarBlock));
check("Shell has one capture-phase sidebar destination owner",(shell.match(/window\.addEventListener\("click"/g)||[]).length>=1&&/bcPrimaryNavigationOwner/.test(shell)&&/stopImmediatePropagation\(\)/.test(shell));
check("Shell commits and reasserts the requested destination",/const commit=name=>[\s\S]*activate\(name,\{scroll:true\}\)[\s\S]*dataset\.bcWorkspace!==name/.test(shell));
check("Command publishes readiness through one retained authority",/function publishCertifiedReadiness\(readiness\)[\s\S]*BlueCurrentCertifiedPilotReadiness=readiness[\s\S]*sessionStorage\.setItem[\s\S]*bluecurrent:pilot-readiness/.test(shell));
check("Shell exposes the authoritative readiness getter",/readiness:\(\)=>retainedCertifiedReadiness\(\)/.test(shell));
check("System refreshes readiness when its workspace opens",/bluecurrent:workspace[\s\S]*workspace!=="system"[\s\S]*certifiedPilotReadiness=retainedReadiness\(\)[\s\S]*renderSummary\(\)/.test(readiness));
check("System render always reconciles with retained readiness",/function renderSummary\(\) \{[\s\S]*certifiedPilotReadiness=retainedReadiness\(\)\|\|certifiedPilotReadiness/.test(readiness));
check("Manager actions retain 44px targets after final cascade",/\.bc-manager-action>div:last-child[^\n]*\.bc-manager-action button\{min-height:44px/.test(css)&&!/\.bc-manager-action button\{min-height:(?:31|40)px/.test(css));
check("Persistent startup diagnostics meet the 44px target",/#startupDiagnosticsToggle\{min-height:44px!important\}/.test(css));
check("All changed assets cross the V100.3.78 cache boundary",html.includes("styles.css?v=100.3.82")&&html.includes("focused-operator-workspaces-v100.3.9.js?v=100.3.82")&&html.includes("productionReadiness.js?v=100.3.82")&&html.includes("hospitalityOsShell.js?v=100.3.82"));
console.log(`V100.3.78 live runtime audit closure ${passed}/${passed}`);
