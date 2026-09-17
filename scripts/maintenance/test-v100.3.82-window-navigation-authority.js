"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),root=path.resolve(__dirname,"../.."),read=file=>fs.readFileSync(path.join(root,file),"utf8");
const shell=read("client/js/modules/hospitalityOsShell.js"),focus=read("client/js/focused-operator-workspaces-v100.3.9.js"),html=read("client/index.html"),pkg=require(path.join(root,"package.json"));
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log(`PASS: ${name}`);}
const navigation=shell.match(/function installPrimaryNavigation\(\)[\s\S]*?\n\}/)?.[0]||"";
check("Build advances to V100.3.82",pkg.version==="100.3.82"&&html.includes('content="100.3.82"'));
check("Shell captures pointer intent at the window boundary",/window\.addEventListener\("pointerdown"/.test(navigation));
check("Shell captures keyboard click at the window boundary",/window\.addEventListener\("click"/.test(navigation));
check("Window pointer ownership stops downstream document work",/pointerdown[\s\S]*stopImmediatePropagation\(\)[\s\S]*commit\(name\)/.test(navigation));
check("Window click ownership stops downstream document work",/click[\s\S]*preventDefault\(\)[\s\S]*stopImmediatePropagation\(\)/.test(navigation));
check("Focused workspace still limits itself to cleanup",/document\.addEventListener\("click"[\s\S]*workspaceButton[\s\S]*return;/.test(focus));
check("Shell owns focused cleanup after immediate intent",/requestAnimationFrame[\s\S]*activate\(name/.test(navigation)&&/function activate\(name,[\s\S]*prepareWorkspaceTransition\(name\)/.test(shell));
check("Immediate intent remains ahead of deferred cleanup",/claimWorkspaceIntent\(name\);[\s\S]*requestAnimationFrame/.test(navigation));
check("Visible-section cleanup remains bounded",/#main > section\.bc-workspace-visible/.test(shell));
check("Settlement lease remains active",/\[80,320,900,1800\][\s\S]*setTimeout\(settle,delay\)/.test(navigation));
check("System readiness authority remains intact",/renderSystemReadinessAuthority\(\)/.test(shell)&&/held\?"Readiness hold"/.test(shell));
check("Shell crosses the V100.3.82 cache boundary",html.includes("hospitalityOsShell.js?v=100.3.82"));
console.log(`V100.3.82 window navigation authority ${passed}/${passed}`);
