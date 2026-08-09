(function(){"use strict";
function createBlueCurrentProductionPilotEnvironmentReadinessCenterModule(eventBus,appState){
 const root=document.getElementById("v5650ProductionPilotReadiness");if(!root||!window.BlueCurrentProductionPilotEnvironmentReadinessEngine)return null;
 const e=new window.BlueCurrentProductionPilotEnvironmentReadinessEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
  $("v5650Status").textContent=s.status||"—";
  $("v5650Ready").textContent=s.readinessReady?"READY":"OPEN";
  $("v5650Locations").textContent=(s.locations||[]).length;
  $("v5650Headline").textContent=s.headline||"Production/pilot readiness unavailable.";
  $("v5650Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
  $("v5650Certification").textContent=s.certification?`${s.certification.decision} · ${s.certification.certifiedAt}`:"No production/pilot environment certification.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5650Headline").textContent=err.message;}}
 $("v5650Review")?.addEventListener("click",async()=>{try{await e.review({
  environmentConfiguration:$("v5650Environment").value,secretsConfiguration:$("v5650Secrets").value,authSecurity:$("v5650Auth").value,
  persistenceBackup:$("v5650Persistence").value,observabilityAlerting:$("v5650Observability").value,connectorReadiness:$("v5650Connectors").value,
  supportEscalation:$("v5650Support").value,rollbackRecovery:$("v5650Rollback").value,pilotRunbook:$("v5650Runbook").value,
  goNoGo:$("v5650GoNoGo").value,note:$("v5650Note").value});await load();}catch(err){$("v5650Headline").textContent=err.message;}});
 $("v5650Go")?.addEventListener("click",async()=>{try{await e.certify({decision:"GO",evidence:$("v5650Evidence").value,reason:$("v5650Reason").value});await load();}catch(err){$("v5650Headline").textContent=err.message;}});
 $("v5650Hold")?.addEventListener("click",async()=>{try{await e.certify({decision:"HOLD",evidence:$("v5650Evidence").value,reason:$("v5650Reason").value});await load();}catch(err){$("v5650Headline").textContent=err.message;}});
 $("v5650Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentProductionPilotEnvironmentReadinessCenterModule=createBlueCurrentProductionPilotEnvironmentReadinessCenterModule;})();