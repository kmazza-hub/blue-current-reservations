(function(){"use strict";
function createBlueCurrentDataIntegrityRecoveryCenterModule(eventBus,appState){
  const root=document.getElementById("dataIntegrityRecovery");
  if(!root||!window.BlueCurrentDataIntegrityRecoveryEngine)return null;
  const e=new window.BlueCurrentDataIntegrityRecoveryEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("dirStatus").textContent=s.status||"—";
    $("dirReady").textContent=`${locs.filter(x=>x.integrityReady).length}/${locs.length}`;
    $("dirCertified").textContent=locs.filter(x=>x.certification?.status==="DATA_INTEGRITY_RECOVERY_CERTIFIED").length;
    $("dirChecks").textContent=`${locs.reduce((n,x)=>n+x.passed,0)}/${locs.reduce((n,x)=>n+x.total,0)}`;
    $("dirHeadline").textContent=s.headline||"Data integrity recovery unavailable.";
    $("dirLocations").innerHTML=locs.map(x=>`<article data-dir-location="${esc(x.locationId)}"><div><strong>${esc(x.locationName)}</strong><span>${x.integrityReady?"READY":"BLOCKED"} · ${x.passed}/${x.total} checks${x.certification?` · ${esc(x.certification.status)}`:""}</span></div><div class="v432-list">${x.integrity.map(i=>`<article><strong>${i.passed?"PASS":"FAIL"} · ${esc(i.label)}</strong><span>${i.count} records · ${i.duplicateIds.length} duplicate IDs · ${i.malformedIds.length} malformed</span></article>`).join("")}</div><div class="v4316-actions"><button type="button" data-dir-verify="true">Run integrity verification</button><button type="button" data-dir-certify="true">Certify integrity & recovery</button></div></article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("dirHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-dir-location]");if(!card)return;
    try{
      if(ev.target.closest("[data-dir-verify]"))await e.verify(card.dataset.dirLocation,{evidence:$("dirEvidence").value});
      if(ev.target.closest("[data-dir-certify]"))await e.certify(card.dataset.dirLocation,{evidence:$("dirEvidence").value,certificationNote:$("dirCertificationNote").value});
      await load();
    }catch(err){$("dirHeadline").textContent=err.message;}
  });
  $("dirRefresh")?.addEventListener("click",load);
  ["data-integrity:verified","data-integrity:certified","peak-service-stress:result","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentDataIntegrityRecoveryCenterModule=createBlueCurrentDataIntegrityRecoveryCenterModule;
})();