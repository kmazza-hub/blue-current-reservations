(function(){"use strict";
function createBlueCurrentProductionOperationsHandoffCenterModule(eventBus,appState){
  const root=document.getElementById("productionOperationsHandoff");
  if(!root||!window.BlueCurrentProductionOperationsHandoffEngine)return null;
  const e=new window.BlueCurrentProductionOperationsHandoffEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("pohStatus").textContent=s.status||"—";
    $("pohReady").textContent=`${locs.filter(x=>x.productionReady).length}/${locs.length}`;
    $("pohAccepted").textContent=locs.filter(x=>x.acceptance?.status==="ACCEPTED_INTO_PRODUCTION_OPERATIONS").length;
    $("pohReliability").textContent=`${s.platformReliability?.score??"—"} · ${s.platformReliability?.status||"unknown"}`;
    $("pohHeadline").textContent=s.headline||"Production operations handoff unavailable.";
    $("pohLocations").innerHTML=locs.map(x=>`<article data-poh-location="${esc(x.locationId)}"><div><strong>Wave ${x.wave} · ${esc(x.locationName)}</strong><span>${esc(x.productionState)} · readiness ${x.readinessScore} · reliability ${x.platformReliability.score}</span></div><div class="v432-list">${(x.gates||[]).map(g=>`<article><strong>${g.passed?"PASS":"OPEN"} · ${esc(g.label)}</strong><span>${esc(g.actual)}</span></article>`).join("")}</div>${x.acceptance?`<p><strong>Support owner:</strong> ${esc(x.acceptance.supportOwner)} · <strong>Escalation:</strong> ${esc(x.acceptance.escalationOwner)} · runtime mutation ${x.acceptance.runtimeMutationPerformed?"YES":"NO"}</p>`:`<div class="v4316-actions"><button type="button" data-poh-accept="true">Accept into production operations</button></div>`}</article>`).join("")||"<article><strong>No STABLE locations are ready for production handoff.</strong></article>";
    $("pohHistory").innerHTML=(s.acceptanceHistory||[]).map(x=>`<article><strong>${esc(x.locationName)} · ${esc(x.status)}</strong><span>${esc(x.supportOwner)} · ${new Date(x.acceptedAt).toLocaleString()}${x.overrideUsed?" · override used":""}</span></article>`).join("")||"<article><strong>No production-operations acceptances recorded.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("pohHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const btn=ev.target.closest("[data-poh-accept]"),card=ev.target.closest("[data-poh-location]");
    if(!btn||!card)return;
    try{
      btn.disabled=true;
      await e.accept(card.dataset.pohLocation,{supportOwner:$("pohSupportOwner").value,escalationOwner:$("pohEscalationOwner").value,supportHours:$("pohSupportHours").value,maintenanceWindow:$("pohMaintenanceWindow").value,overrideReason:$("pohOverride").value,note:$("pohNote").value});
      await load();
    }catch(err){$("pohHeadline").textContent=err.message;}finally{btn.disabled=false;}
  });
  $("pohRefresh")?.addEventListener("click",load);
  ["launch-stabilization:declared","production-operations:accepted","reliability:slo-evaluated","multi-location-performance:updated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentProductionOperationsHandoffCenterModule=createBlueCurrentProductionOperationsHandoffCenterModule;
})();