(function(){"use strict";
function createBlueCurrentGoLiveCommandCenterModule(eventBus,appState){
  const root=document.getElementById("goLiveCommand");
  if(!root||!window.BlueCurrentGoLiveCommandEngine)return null;
  const e=new window.BlueCurrentGoLiveCommandEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("glcStatus").textContent=s.status||"—";
    $("glcReady").textContent=`${locs.filter(x=>x.finalPreCutoverPassed).length}/${locs.length}`;
    $("glcAuthorized").textContent=locs.filter(x=>x.command?.status==="AUTHORIZED_FOR_MANUAL_CUTOVER").length;
    $("glcResults").textContent=locs.filter(x=>x.result).length;
    $("glcHeadline").textContent=s.headline||"Go-Live Command unavailable.";
    $("glcLocations").innerHTML=locs.map(x=>`<article data-glc-location="${esc(x.locationId)}"><div><strong>Wave ${x.wave} · ${esc(x.locationName)}</strong><span>${esc(x.commandState)} · result ${esc(x.cutoverResultState)} · production ${esc(x.productionState)}</span></div><div class="v432-list">${(x.finalChecks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.label)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div>${x.command?`<p><strong>Operator:</strong> ${esc(x.command.deploymentOperator)} · <strong>Rollback:</strong> ${esc(x.command.rollbackOperator)} · execution ${esc(x.command.deploymentExecutionState)}</p>`:""}${x.result?`<p><strong>Human-recorded result:</strong> ${esc(x.result.status)} · health ${x.result.postCutoverHealth?.passed||0}/${x.result.postCutoverHealth?.total||0}</p>`:""}<div class="v4316-actions">${!x.command?'<button type="button" data-glc-authorize="true">Authorize manual cutover</button>':""}${x.command&&!x.result?'<button type="button" data-glc-record="true">Record cutover result</button>':""}</div></article>`).join("")||"<article><strong>No prepared deployment packages are in Go-Live Command.</strong></article>";
    $("glcHistory").innerHTML=[...(s.commandHistory||[]).map(x=>`<article><strong>AUTH · ${esc(x.locationName)}</strong><span>${esc(x.deploymentOperator)} · ${new Date(x.authorizedAt).toLocaleString()} · ${esc(x.deploymentExecutionState)}</span></article>`),...(s.resultHistory||[]).map(x=>`<article><strong>RESULT · ${esc(x.locationName)} · ${esc(x.status)}</strong><span>${new Date(x.recordedAt).toLocaleString()} · source ${esc(x.resultSource)}</span></article>`)].join("")||"<article><strong>No go-live command history.</strong></article>";
  }
  function healthPayload(){
    return {
      apiHealthy:$("glcApi").checked,
      authenticationHealthy:$("glcAuth").checked,
      reservationIntegrity:$("glcReservations").checked,
      floorIntegrity:$("glcFloor").checked,
      kitchenIntegrity:$("glcKitchen").checked,
      workforceIntegrity:$("glcWorkforce").checked
    };
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("glcHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-glc-location]"); if(!card)return;
    const id=card.dataset.glcLocation;
    if(ev.target.closest("[data-glc-authorize]")){
      try{await e.authorize(id,{deploymentOperator:$("glcOperator").value,rollbackOperator:$("glcRollbackOperator").value,launchWindow:$("glcWindow").value,overrideReason:$("glcOverride").value,note:$("glcNote").value});await load();}catch(err){$("glcHeadline").textContent=err.message;}
      return;
    }
    if(ev.target.closest("[data-glc-record]")){
      try{await e.record(id,{status:$("glcResultStatus").value,deploymentOperator:$("glcOperator").value,rollbackOperator:$("glcRollbackOperator").value,incident:$("glcIncident").value,note:$("glcNote").value,...healthPayload()});await load();}catch(err){$("glcHeadline").textContent=err.message;}
    }
  });
  $("glcRefresh")?.addEventListener("click",load);
  ["location-deployment:package-prepared","go-live-command:authorized","go-live-command:result-recorded","technical-activation:authorized","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentGoLiveCommandCenterModule=createBlueCurrentGoLiveCommandCenterModule;
})();