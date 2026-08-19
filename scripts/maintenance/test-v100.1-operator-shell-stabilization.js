"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");

const pkg=require(path.join(root,"package.json"));
assert.equal(pkg.version,"100.0.0","V100 commercial baseline version must remain intact");

const shell=read("client/js/modules/hospitalityOsShell.js");
assert(shell.includes('kitchen:["kitchenThroughputCenter"]'),"Kitchen workspace must map to Kitchen Throughput");
assert(!shell.includes('kitchen:["service-coordination"]'),"Kitchen must not map back to Service");
for(const marker of[
  "function authSessionSnapshot()",
  "window.BlueCurrentAuthSession?.snapshot?.()",
  "function syncAppStateFromSession(snapshot)",
  'window.addEventListener("bluecurrent:auth-session-state",handleCoordinatorState)',
  "coordinator?.whenReady?.().then",
  "window.BlueCurrentHospitalityShell={",
  'version:"100.1.3"'
])assert(shell.includes(marker),`Missing shell stabilization marker: ${marker}`);

const workflow=read("client/js/workflow-reduction-v64.50.js");
for(const marker of[
  'kitchen:{target:"kitchenThroughputCenter",workspace:"kitchen",label:"Kitchen pressure"}',
  'service:{target:"service-coordination",workspace:"service",label:"Service coordination"}',
  "function isActuallyVisible(target)",
  "function reportActivation(route,target,silent)",
  "window.BlueCurrentHospitalityShell?.activate?.(route.workspace,{scroll:false})",
  "could not be opened."
])assert(workflow.includes(marker),`Missing workflow stabilization marker: ${marker}`);
assert(!workflow.includes('if(!silent)window.BlueCurrentFeedback?.toast?.(`${route.label} opened.`'),"Workflow must not emit unconditional success toast");

const html=read("client/index.html");
assert(/id="kitchenThroughputCenter"[^>]*data-operator-workspace="kitchen"|data-operator-workspace="kitchen"[^>]*id="kitchenThroughputCenter"/.test(html),"Kitchen Throughput must be marked as an operator workspace");
assert(/kitchen-throughput-center[^\"]*bc-operator-workspace/.test(html),"Kitchen Throughput must carry operator workspace class");

const css=read("client/styles.css");
assert(css.includes(".bc-legacy-development-surface:not(.bc-operator-workspace)"),"Legacy hiding must exempt explicit operator workspaces only");
assert(css.includes("body.bc-consolidated-product-surface.bc-show-advanced .bc-legacy-development-surface"),"Advanced-mode legacy access must remain intact");

console.log(JSON.stringify({
  ok:true,
  repair:"V100.1.x Operator Shell Stabilization",
  baselineVersion:pkg.version,
  checks:[
    "authoritative auth coordinator",
    "appState session synchronization",
    "Kitchen canonical routing",
    "operator-workspace visibility exception",
    "workspace-aware quick jobs",
    "verified success feedback",
    "advanced legacy protection preserved"
  ]
},null,2));
