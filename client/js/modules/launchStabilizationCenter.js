(function(){"use strict";
function createBlueCurrentLaunchStabilizationCenterModule(eventBus,appState){
  const root=document.getElementById("launchStabilization");
  if(!root||!window.BlueCurrentLaunchStabilizationEngine)return null;
  const e=new window.BlueCurrentLaunchStabilizationEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("lsStatus").textContent=s.status||"—";
    $("lsReady").textContent=`${locs.filter(x=>x.stabilizationReady).length}/${locs.length}`;
    $("lsIncidents").textContent=locs.reduce((n,x)=>n+(x.healthTimeline||[]).filter(o=>["high","critical"].includes(o.severity)).length,0);
    $("lsStable").textContent=locs.filter(x=>x.declaration?.decision==="STABLE").length;
    $("lsHeadline").textContent=s.headline||"Launch stabilization unavailable.";
    $("lsLocations").innerHTML=locs.map(x=>`<article data-ls-location="${esc(x.locationId)}"><div><strong>Wave ${x.wave} · ${esc(x.locationName)}</strong><span>${esc(x.stabilizationState)} · exit ${x.exitPassed}/${x.exitTotal} · rollback signal ${esc(x.rollbackRecommendation)}</span></div><div class="v432-list">${(x.exitChecks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.label)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div><p>Observations ${x.observationCount} · first service ${x.firstServiceVerified?"VERIFIED":"OPEN"} · readiness ${x.currentReadiness} · attention ${esc(x.attentionLevel)}</p>${x.latestObservation?`<p><strong>Latest:</strong> health ${x.latestObservation.healthPassed}/${x.latestObservation.healthTotal} · severity ${esc(x.latestObservation.severity)} · ${new Date(x.latestObservation.observedAt).toLocaleString()}</p>`:""}${x.declaration?`<p><strong>Human declaration:</strong> ${esc(x.declaration.decision)} by ${esc(x.declaration.approver)} · ${esc(x.declaration.executionState)}</p>`:""}<div class="v4316-actions"><button type="button" data-ls-observe="true">Record observation</button><button type="button" data-ls-declare="true">Record stabilization decision</button></div></article>`).join("")||"<article><strong>No launched locations are in stabilization.</strong></article>";
    $("lsHistory").innerHTML=[...(s.observationHistory||[]).map(x=>`<article><strong>OBSERVE · ${esc(x.locationName)} · ${esc(x.severity)}</strong><span>${new Date(x.observedAt).toLocaleString()} · health ${x.healthPassed}/${x.healthTotal} · first service ${x.firstServiceVerified?"yes":"no"}</span></article>`),...(s.declarationHistory||[]).map(x=>`<article><strong>DECISION · ${esc(x.locationName)} · ${esc(x.decision)}</strong><span>${esc(x.approver)} · ${new Date(x.declaredAt).toLocaleString()} · ${esc(x.executionState)}</span></article>`)].join("")||"<article><strong>No stabilization history.</strong></article>";
  }
  function healthPayload(){return {apiHealthy:$("lsApi").checked,authenticationHealthy:$("lsAuth").checked,reservationIntegrity:$("lsReservations").checked,floorIntegrity:$("lsFloor").checked,kitchenIntegrity:$("lsKitchen").checked,workforceIntegrity:$("lsWorkforce").checked};}
  async function load(){try{render(await e.snapshot());}catch(err){$("lsHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-ls-location]"); if(!card)return;
    const id=card.dataset.lsLocation;
    if(ev.target.closest("[data-ls-observe]")){
      try{await e.observe(id,{observationWindowHours:Number($("lsWindow").value||4),firstServiceVerified:$("lsFirstService").checked,severity:$("lsSeverity").value,incident:$("lsIncident").value,note:$("lsNote").value,...healthPayload()});await load();}catch(err){$("lsHeadline").textContent=err.message;}return;
    }
    if(ev.target.closest("[data-ls-declare]")){
      try{await e.declare(id,{decision:$("lsDecision").value,approver:$("lsApprover").value,reason:$("lsReason").value});await load();}catch(err){$("lsHeadline").textContent=err.message;}
    }
  });
  $("lsRefresh")?.addEventListener("click",load);
  ["go-live-command:result-recorded","launch-stabilization:observed","launch-stabilization:declared","multi-location-performance:updated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentLaunchStabilizationCenterModule=createBlueCurrentLaunchStabilizationCenterModule;
})();