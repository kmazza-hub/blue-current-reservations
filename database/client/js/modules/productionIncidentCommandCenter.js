(function(){"use strict";
function createBlueCurrentProductionIncidentCommandCenterModule(eventBus,appState){
  const root=document.getElementById("productionIncidentCommand");
  if(!root||!window.BlueCurrentProductionIncidentCommandEngine)return null;
  const e=new window.BlueCurrentProductionIncidentCommandEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("picStatus").textContent=s.status||"—";
    $("picActive").textContent=(s.activeCommands||[]).length;
    $("picSignals").textContent=(s.sourceSignals||[]).length;
    $("picReliability").textContent=`${s.platform?.reliabilityScore??"—"} · ${s.platform?.reliabilityStatus||"unknown"}`;
    $("picHeadline").textContent=s.headline||"Production incident command unavailable.";
    $("picSignalsList").innerHTML=(s.sourceSignals||[]).map(x=>`<article><strong>${esc(x.type)} · ${esc(x.severity)} · ${esc(x.title)}</strong><span>${esc(x.status)}${x.locationName?` · ${esc(x.locationName)}`:""}</span></article>`).join("")||"<article><strong>No open production incident signals.</strong></article>";
    $("picCommands").innerHTML=(s.commandHistory||[]).map(x=>`<article data-pic-id="${esc(x.id)}"><div><strong>${esc(x.severity)} · ${esc(x.title)}</strong><span>${esc(x.status)} · commander ${esc(x.commander)} · containment ${esc(x.containmentStatus)}</span></div><p>${esc(x.businessImpact||"No business impact recorded.")}</p><div class="v4316-actions"><button type="button" data-pic-action="acknowledge">Acknowledge</button><button type="button" data-pic-action="contain">Record containment</button><button type="button" data-pic-action="communicate">Communication checkpoint</button><button type="button" data-pic-action="recover">Record recovery evidence</button><button type="button" data-pic-action="resolve">Resolve</button></div></article>`).join("")||"<article><strong>No production incident commands.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("picHeadline").textContent=err.message;}}
  $("picCreate")?.addEventListener("click",async()=>{try{
    const affectedLocationIds=$("picLocations").value.split(",").map(x=>x.trim()).filter(Boolean);
    const affectedDomains=$("picDomains").value.split(",").map(x=>x.trim()).filter(Boolean);
    const linkedSupportEventIds=$("picSupportLinks").value.split(",").map(x=>x.trim()).filter(Boolean);
    const linkedObservabilityIncidentIds=$("picIncidentLinks").value.split(",").map(x=>x.trim()).filter(Boolean);
    await e.create({title:$("picTitle").value,severity:$("picSeverity").value,commander:$("picCommander").value,affectedLocationIds,affectedDomains,businessImpact:$("picBusinessImpact").value,serviceImpact:$("picServiceImpact").value,linkedSupportEventIds,linkedObservabilityIncidentIds,runbook:$("picRunbook").value,note:$("picNote").value});await load();
  }catch(err){$("picHeadline").textContent=err.message;}});
  root.addEventListener("click",async ev=>{
    const action=ev.target.closest("[data-pic-action]"),card=ev.target.closest("[data-pic-id]");
    if(!action||!card)return;
    try{await e.update(card.dataset.picId,{action:action.dataset.picAction,note:$("picActionNote").value});await load();}catch(err){$("picHeadline").textContent=err.message;}
  });
  $("picRefresh")?.addEventListener("click",load);
  ["production-support:event-created","production-support:event-updated","observability:incident-created","observability:incident-updated","production-incident:created","production-incident:updated","reliability:slo-evaluated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentProductionIncidentCommandCenterModule=createBlueCurrentProductionIncidentCommandCenterModule;
})();