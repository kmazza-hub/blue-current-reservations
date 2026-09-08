(function(){"use strict";
function createBlueCurrentOperationalExpansionOrchestrationCenterModule(eventBus,appState){
 const root=document.getElementById("v5275OperationalExpansionOrchestration");if(!root||!window.BlueCurrentOperationalExpansionOrchestrationEngine)return null;
 const e=new window.BlueCurrentOperationalExpansionOrchestrationEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 const ids=raw=>String(raw||"").split(/[\n,]/).map(x=>x.trim()).filter(Boolean);
 function render(s){
  $("v5275Status").textContent=s.status||"—";
  $("v5275Targets").textContent=(s.approvedTargets||[]).length;
  $("v5275Stages").textContent=(s.plan?.stages||[]).length;
  $("v5275Headline").textContent=s.headline||"Operational orchestration unavailable.";
  $("v5275Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
  $("v5275Plan").textContent=s.plan?`${s.plan.name} · max ${s.plan.capacity.maxConcurrentLocations} location(s) · support ${esc(s.plan.owners.support)}`:"No orchestration plan.";
  $("v5275Decision").textContent=s.decision?`${s.decision.decision} · ${s.decision.decidedAt}`:"No orchestration decision.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5275Headline").textContent=err.message;}}
 $("v5275Create")?.addEventListener("click",async()=>{try{
  await e.createPlan({
    name:$("v5275Name").value,executiveOwner:$("v5275Executive").value,operationsOwner:$("v5275Operations").value,technicalOwner:$("v5275Technical").value,supportOwner:$("v5275SupportOwner").value,
    maxConcurrentLocations:Number($("v5275MaxLocations").value||1),maxConcurrentIncidents:Number($("v5275MaxIncidents").value||0),
    configurationDependency:$("v5275Config").value,connectorDependency:$("v5275Connectors").value,trainingDependency:$("v5275Training").value,supportDependency:$("v5275SupportDep").value,rollbackDependency:$("v5275Rollback").value,
    operatingHandoff:$("v5275Handoff").value,escalationModel:$("v5275Escalation").value,observationModel:$("v5275Observation").value,changeFreezeRule:$("v5275Freeze").value,evidence:$("v5275Evidence").value,note:$("v5275Note").value,
    stages:[{name:"Stage 1",locationIds:ids($("v5275LocationIds").value),entryCriteria:$("v5275Entry").value,exitCriteria:$("v5275Exit").value,observationWindow:$("v5275Window").value}]
  });await load();
 }catch(err){$("v5275Headline").textContent=err.message;}});
 root.addEventListener("click",async ev=>{const b=ev.target.closest("[data-v5275-decision]");if(!b)return;try{const s=await e.snapshot();await e.decide(s.plan.id,{decision:b.dataset.v5275Decision,evidence:$("v5275DecisionEvidence").value,reason:$("v5275DecisionReason").value});await load();}catch(err){$("v5275Headline").textContent=err.message;}});
 $("v5275Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentOperationalExpansionOrchestrationCenterModule=createBlueCurrentOperationalExpansionOrchestrationCenterModule;})();