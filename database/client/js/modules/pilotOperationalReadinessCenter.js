(function(){"use strict";
function createBlueCurrentPilotOperationalReadinessCenterModule(eventBus,appState){
  const root=document.getElementById("pilotOperationalReadiness");
  if(!root||!window.BlueCurrentPilotOperationalReadinessEngine)return null;
  const e=new window.BlueCurrentPilotOperationalReadinessEngine({appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("porStatus").textContent=s.status||"—";
    $("porReadiness").textContent=`${s.readinessPercent||0}%`;
    $("porGates").textContent=`${s.requiredPassed||0}/${s.requiredTotal||0}`;
    $("porBlockers").textContent=s.blockerCount||0;
    $("porHeadline").textContent=s.headline||"Pilot readiness unavailable.";
    $("porDecision").textContent=s.goNoGo?.decision||"—";
    $("porUpstream").textContent=`V49 ${s.upstream?.v49Status||"—"} · V50 ${s.upstream?.v50Status||"—"} · Pilot ${s.upstream?.pilotProgramStatus||"—"} · Technical ${s.upstream?.technicalStatus||"—"}`;
    $("porLocations").innerHTML=(s.locations||[]).map(x=>`<article><div><strong>${esc(x.decision)} · ${esc(x.locationName)}</strong><span>${x.requiredPassed}/${x.requiredTotal} required gates · ${x.readinessPercent}%</span></div><p>${x.blockers.length?`<strong>Blockers:</strong> ${x.blockers.map(b=>esc(b.label)).join(" · ")}`:"All required baseline gates pass."}</p><p>Floor ${x.dependencies.tables} tables/${x.dependencies.sections} sections · Reservations ${x.dependencies.reservations} · People ${x.dependencies.activePeople} · Kitchen ${x.dependencies.kitchenStations} · Access ${x.dependencies.authorizedMemberships} · Connectors ${x.dependencies.connectedConnectors} live</p></article>`).join("")||"<article><strong>No in-scope restaurant locations.</strong></article>";
    $("porBlockerList").innerHTML=(s.blockers||[]).map(x=>`<article><strong>${esc(x.locationName)} · ${esc(x.category)}</strong><span>${esc(x.label)} · ${esc(x.actual)}</span></article>`).join("")||"<article><strong>No required pilot blockers.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("porHeadline").textContent=err.message;}}
  $("porRefresh")?.addEventListener("click",load);
  ["auth:restored","production-operations:accepted","technical-activation:authorized","pilot-proof:configured"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentPilotOperationalReadinessCenterModule=createBlueCurrentPilotOperationalReadinessCenterModule;
})();