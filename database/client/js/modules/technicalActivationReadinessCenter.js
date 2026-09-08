(function(){"use strict";
function createBlueCurrentTechnicalActivationReadinessCenterModule(eventBus,appState){
  const root=document.getElementById("technicalActivationReadiness");
  if(!root||!window.BlueCurrentTechnicalActivationReadinessEngine)return null;
  const e=new window.BlueCurrentTechnicalActivationReadinessEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("tarStatus").textContent=s.status||"—";
    $("tarReady").textContent=`${locs.filter(x=>x.technicallyReady).length}/${locs.length}`;
    $("tarBlockers").textContent=s.blockerCount||0;
    $("tarAuthorized").textContent=locs.filter(x=>x.goLiveAuthorization?.status==="AUTHORIZED_FOR_GO_LIVE").length;
    $("tarHeadline").textContent=s.headline||"Technical activation readiness unavailable.";
    $("tarLocations").innerHTML=locs.map(x=>`<article data-tar-location="${esc(x.locationId)}"><div><strong>Wave ${x.wave} · ${esc(x.locationName)}</strong><span>${x.technicalReadinessPercent}% ready · ${esc(x.goLiveState)} · cutover ${esc(x.productionCutoverState)}</span></div><div class="v432-list">${(x.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.label)}</strong><span>${esc(c.category)}${c.required?" · required":" · advisory"}${c.actual!==undefined?` · ${esc(c.actual)}`:""}</span></article>`).join("")}</div>${x.blockers?.length?`<p><strong>Launch blockers:</strong> ${x.blockers.map(b=>esc(b.label)).join(" · ")}</p>`:"<p><strong>No required technical blockers.</strong></p>"}${x.goLiveAuthorization?`<p><strong>Authorized by ${esc(x.goLiveAuthorization.approver)}</strong> · cutover remains ${esc(x.goLiveAuthorization.productionCutoverState)}</p>`:`<div class="v4316-actions"><button type="button" data-tar-packet="true">Review technical packet</button><button type="button" data-tar-authorize="true">Authorize go-live</button></div>`}</article>`).join("")||"<article><strong>No rollout locations are in technical activation review.</strong></article>";
    $("tarHistory").innerHTML=(s.authorizationHistory||[]).map(x=>`<article><strong>${esc(x.locationName)} · ${esc(x.status)}</strong><span>${esc(x.approver)} · ${new Date(x.authorizedAt).toLocaleString()} · cutover ${esc(x.productionCutoverState)}${x.overrideUsed?" · override used":""}</span></article>`).join("")||"<article><strong>No technical go-live authorizations recorded.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("tarHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-tar-location]"); if(!card)return;
    const locationId=card.dataset.tarLocation;
    if(ev.target.closest("[data-tar-packet]")){
      try{const p=await e.packet(locationId);$("tarPacket").textContent=JSON.stringify(p,null,2);}catch(err){$("tarHeadline").textContent=err.message;}
      return;
    }
    const btn=ev.target.closest("[data-tar-authorize]"); if(!btn)return;
    try{
      btn.disabled=true;
      await e.authorize(locationId,{approver:$("tarApprover").value,overrideReason:$("tarOverride").value,launchWindow:$("tarWindow").value,rollbackOwner:$("tarRollbackOwner").value,note:$("tarNote").value});
      await load();
    }catch(err){$("tarHeadline").textContent=err.message;}finally{btn.disabled=false;}
  });
  $("tarRefresh")?.addEventListener("click",load);
  ["rollout-activation:approved","technical-activation:authorized","expansion-readiness:drafted","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentTechnicalActivationReadinessCenterModule=createBlueCurrentTechnicalActivationReadinessCenterModule;
})();