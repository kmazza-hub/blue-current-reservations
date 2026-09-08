(function(){"use strict";
function createBlueCurrentLocationDeploymentPackageCenterModule(eventBus,appState){
  const root=document.getElementById("locationDeploymentPackage");
  if(!root||!window.BlueCurrentLocationDeploymentPackageEngine)return null;
  const e=new window.BlueCurrentLocationDeploymentPackageEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("ldpStatus").textContent=s.status||"—";
    $("ldpAuthorized").textContent=locs.filter(x=>x.goLiveAuthorized).length;
    $("ldpPrepared").textContent=locs.filter(x=>x.packageState==="READY_FOR_DEPLOYMENT_EXECUTION").length;
    $("ldpExecution").textContent=locs.filter(x=>x.deploymentExecutionState!=="NOT_STARTED").length;
    $("ldpHeadline").textContent=s.headline||"Deployment package unavailable.";
    $("ldpLocations").innerHTML=locs.map(x=>`<article data-ldp-location="${esc(x.locationId)}"><div><strong>Wave ${x.wave} · ${esc(x.locationName)}</strong><span>${esc(x.packageState)} · execution ${esc(x.deploymentExecutionState)}</span></div><p>Go-live authorized: <strong>${x.goLiveAuthorized?"YES":"NO"}</strong>${x.blockers?.length?` · ${x.blockers.length} technical blocker(s)`:""}</p>${x.deploymentPackage?`<p><strong>Owner:</strong> ${esc(x.deploymentPackage.deploymentOwner)} · <strong>Rollback:</strong> ${esc(x.deploymentPackage.rollbackOwner)} · <strong>Cutover:</strong> ${esc(x.deploymentPackage.productionCutoverState)}</p>`:""}<div class="v4316-actions"><button type="button" data-ldp-packet="true">Review deployment packet</button>${!x.deploymentPackage?'<button type="button" data-ldp-prepare="true">Prepare deployment package</button>':""}</div></article>`).join("")||"<article><strong>No locations are currently in deployment-package review.</strong></article>";
    $("ldpHistory").innerHTML=(s.packageHistory||[]).map(x=>`<article><strong>${esc(x.locationName)} · ${esc(x.status)}</strong><span>${esc(x.deploymentOwner)} · ${new Date(x.createdAt).toLocaleString()} · execution ${esc(x.deploymentExecutionState)} · cutover ${esc(x.productionCutoverState)}</span></article>`).join("")||"<article><strong>No deployment packages prepared.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("ldpHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-ldp-location]"); if(!card)return;
    const id=card.dataset.ldpLocation;
    if(ev.target.closest("[data-ldp-packet]")){try{$("ldpPacket").textContent=JSON.stringify(await e.packet(id),null,2);}catch(err){$("ldpHeadline").textContent=err.message;}return;}
    const btn=ev.target.closest("[data-ldp-prepare]"); if(!btn)return;
    try{
      btn.disabled=true;
      await e.prepare(id,{deploymentOwner:$("ldpOwner").value,rollbackOwner:$("ldpRollbackOwner").value,launchWindow:$("ldpWindow").value,rollbackTrigger:$("ldpRollbackTrigger").value,note:$("ldpNote").value});
      await load();
    }catch(err){$("ldpHeadline").textContent=err.message;}finally{btn.disabled=false;}
  });
  $("ldpRefresh")?.addEventListener("click",load);
  ["technical-activation:authorized","location-deployment:package-prepared","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentLocationDeploymentPackageCenterModule=createBlueCurrentLocationDeploymentPackageCenterModule;
})();