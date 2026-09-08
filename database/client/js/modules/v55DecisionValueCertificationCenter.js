(function(){"use strict";
function createBlueCurrentV55DecisionValueCertificationCenterModule(eventBus,appState){
 const root=document.getElementById("v5600DecisionValueCertification");if(!root||!window.BlueCurrentV55DecisionValueCertificationEngine)return null;
 const e=new window.BlueCurrentV55DecisionValueCertificationEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
   $("v5600Status").textContent=s.status||"—";
   $("v5600Ready").textContent=s.closureReady?"READY":"OPEN";
   $("v5600Realized").textContent=`$${Number(s.portfolio?.modeledRealizedValueDollars||0).toLocaleString()}`;
   $("v5600Headline").textContent=s.headline||"V55 decision-value certification unavailable.";
   $("v5600Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
   $("v5600Certification").textContent=s.certification?`${s.certification.status} · ${s.certification.certifiedAt}`:"V55 has not been decision-value certified.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5600Headline").textContent=err.message;}}
 $("v5600Review")?.addEventListener("click",async()=>{try{await e.review({signalTrust:$("v5600Trust").value,actionability:$("v5600Actionability").value,valueTraceability:$("v5600Traceability").value,modeledValueDisclosure:$("v5600Disclosure").value,operatorAcceptance:$("v5600Operator").value,managerAcceptance:$("v5600Manager").value,executiveReporting:$("v5600Executive").value,v56Entry:$("v5600Entry").value,note:$("v5600Note").value});await load();}catch(err){$("v5600Headline").textContent=err.message;}});
 $("v5600Certify")?.addEventListener("click",async()=>{try{await e.certify({evidence:$("v5600Evidence").value,acceptance:$("v5600Acceptance").value});await load();}catch(err){$("v5600Headline").textContent=err.message;}});
 $("v5600Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentV55DecisionValueCertificationCenterModule=createBlueCurrentV55DecisionValueCertificationCenterModule;})();