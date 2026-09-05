(() => {
"use strict";
// V100.2.70 — Startup / Runtime Performance Hardening.
// Loads the newest domain intelligence only when its workspace is actually requested.
// No restaurant lifecycle state is mutated by this loader.
const GROUPS=Object.freeze({
  kitchen:[
    "js/kitchen-truth-v100.2.60.js?v=100.2.60",
    "js/kitchen-service-handoff-v100.2.61.js?v=100.2.61",
    "js/kitchen-priority-v100.2.62.js?v=100.2.62"
  ],
  staff:[
    "js/staff-truth-v100.2.64.js?v=100.3.14",
    "js/staff-role-coverage-v100.2.65.js?v=100.2.65",
    "js/staff-attendance-v100.2.66.js?v=100.2.66",
    "js/scheduling-truth-v100.2.73.js?v=100.2.73",
    "js/timeclock-truth-v100.2.76.js?v=100.3.15"
  ],
  manager:[
    "js/manager-operations-truth-v100.2.68.js?v=100.2.68",
    "js/manager-action-ownership-v100.2.69.js?v=100.2.69",
    "js/manager-action-followup-v100.2.71.js?v=100.2.71"
  ],
  inventory:[
    "js/inventory-truth-v100.2.80.js?v=100.2.80"
  ]
});
const loaded=new Set(),loading=new Map();
const report={version:"100.2.70",startedAt:Date.now(),groups:{},loads:[]};
window.BlueCurrentRuntimePerformanceV100_2_70=report;

function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[data-bc-runtime-loaded="${CSS.escape(src)}"]`))return resolve();
    const s=document.createElement("script");
    s.src=src;s.async=false;s.dataset.bcRuntimeLoaded=src;
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error(`Unable to load ${src}`));
    document.body.appendChild(s);
  });
}
async function loadGroup(name,reason="manual"){
  if(!GROUPS[name])return false;
  if(loaded.has(name))return true;
  if(loading.has(name))return loading.get(name);
  const promise=(async()=>{
    const started=performance.now();
    for(const src of GROUPS[name]){
      await loadScript(src);
      // Yield between modules so a workspace activation never becomes a long startup task.
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    loaded.add(name);
    const durationMs=Math.round(performance.now()-started);
    report.groups[name]={loaded:true,reason,durationMs,loadedAt:Date.now()};
    report.loads.push({name,reason,durationMs,at:Date.now()});
    window.dispatchEvent(new CustomEvent("bluecurrent:runtime-group-loaded",{detail:{name,reason,durationMs}}));
    return true;
  })().catch(error=>{
    report.groups[name]={loaded:false,reason,error:error.message,failedAt:Date.now()};
    console.error(`[Blue Current V100.2.70] ${name} runtime group failed`,error);
    return false;
  }).finally(()=>loading.delete(name));
  loading.set(name,promise);
  return promise;
}
function classify(value=""){
  const text=String(value).toLowerCase();
  if(/kitchen|expo/.test(text))return "kitchen";
  if(/staff|workforce|schedule|time[- ]?clock|labor/.test(text))return "staff";
  if(/manager|command/.test(text))return "manager";
  if(/inventory/.test(text))return "inventory";
  return null;
}
function loadFromLocation(reason){
  const group=classify(`${location.hash} ${location.search}`);
  if(group)loadGroup(group,reason);
}
function observeWorkspace(id,group){
  const el=document.getElementById(id);if(!el||!("IntersectionObserver" in window))return;
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting||entry.intersectionRatio>0)){
      observer.disconnect();loadGroup(group,"workspace-visible");
    }
  },{rootMargin:"500px 0px",threshold:0});
  observer.observe(el);
}
function init(){
  report.initializedAt=Date.now();
  document.addEventListener("click",event=>{
    const target=event.target.closest?.("a,button,[role='button']");if(!target)return;
    const signal=[target.getAttribute("href"),target.dataset?.workspace,target.dataset?.target,target.id,target.textContent].filter(Boolean).join(" ");
    const group=classify(signal);if(group)loadGroup(group,"operator-navigation");
  },true);
  window.addEventListener("hashchange",()=>loadFromLocation("hashchange"));
  observeWorkspace("kitchenThroughputCenter","kitchen");
  observeWorkspace("workforce-intelligence","staff");
  observeWorkspace("scheduling","staff");
  observeWorkspace("command-center","manager");
  observeWorkspace("inventory-intelligence","inventory");
  loadFromLocation("initial-route");
  if(new URLSearchParams(location.search).get("full")==="1"){
    ["kitchen","staff","manager","inventory"].reduce((p,name)=>p.then(()=>loadGroup(name,"full-startup")),Promise.resolve());
  }
  report.readyAt=Date.now();
  report.initialDeferredGroups=Object.keys(GROUPS).length;
  document.documentElement.dataset.runtimePerformance="100.2.70";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
report.loadGroup=loadGroup;
report.loadedGroups=()=>[...loaded];
})();
