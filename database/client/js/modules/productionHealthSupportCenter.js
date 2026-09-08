(function(){"use strict";
function createBlueCurrentProductionHealthSupportCenterModule(eventBus,appState){
  const root=document.getElementById("productionHealthSupport");
  if(!root||!window.BlueCurrentProductionHealthSupportEngine)return null;
  const e=new window.BlueCurrentProductionHealthSupportEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("phsStatus").textContent=s.status||"—";
    $("phsHealthy").textContent=`${locs.filter(x=>x.healthState==="healthy").length}/${locs.length}`;
    $("phsOpen").textContent=locs.reduce((n,x)=>n+x.openSupportEvents,0);
    $("phsReliability").textContent=`${s.platform?.reliabilityScore??"—"} · ${s.platform?.reliabilityStatus||"unknown"}`;
    $("phsHeadline").textContent=s.headline||"Production support unavailable.";
    $("phsLocations").innerHTML=locs.map(x=>`<article data-phs-location="${esc(x.locationId)}"><div><strong>${esc(x.locationName)}</strong><span>${esc(x.healthState)} · readiness ${x.readinessScore} · support ${esc(x.supportOwner)}</span></div><div class="v432-list">${(x.healthChecks||[]).map(g=>`<article><strong>${g.passed?"PASS":"OPEN"} · ${esc(g.label)}</strong><span>${esc(g.actual)}</span></article>`).join("")}</div><p><strong>Escalation:</strong> ${esc(x.escalationOwner)} · <strong>Maintenance:</strong> ${esc(x.maintenanceWindow||"not set")}${x.maintenanceWindowActive?" · ACTIVE":""}</p><div class="v4316-actions"><button type="button" data-phs-create="true">Create support event</button></div></article>`).join("")||"<article><strong>No accepted production locations are available.</strong></article>";
    $("phsHistory").innerHTML=(s.eventHistory||[]).map(x=>`<article data-phs-event="${esc(x.id)}"><strong>${esc(x.locationName)} · ${esc(x.severity)} · ${esc(x.status)}</strong><span>${esc(x.title)} · owner ${esc(x.supportOwner)}</span><div class="v4316-actions"><button type="button" data-phs-action="acknowledge">Acknowledge</button><button type="button" data-phs-action="escalate">Escalate</button><button type="button" data-phs-action="resolve">Resolve</button></div></article>`).join("")||"<article><strong>No production support events.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("phsHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const loc=ev.target.closest("[data-phs-location]");
    if(ev.target.closest("[data-phs-create]")&&loc){
      try{await e.create(loc.dataset.phsLocation,{severity:$("phsSeverity").value,title:$("phsTitle").value,description:$("phsDescription").value,linkedIncidentId:$("phsIncident").value});await load();}catch(err){$("phsHeadline").textContent=err.message;}return;
    }
    const eventCard=ev.target.closest("[data-phs-event]"),action=ev.target.closest("[data-phs-action]");
    if(eventCard&&action){try{await e.update(eventCard.dataset.phsEvent,{action:action.dataset.phsAction,note:$("phsNote").value});await load();}catch(err){$("phsHeadline").textContent=err.message;}}
  });
  $("phsRefresh")?.addEventListener("click",load);
  ["production-operations:accepted","production-support:event-created","production-support:event-updated","reliability:slo-evaluated","observability:incident-created","observability:incident-updated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentProductionHealthSupportCenterModule=createBlueCurrentProductionHealthSupportCenterModule;
})();