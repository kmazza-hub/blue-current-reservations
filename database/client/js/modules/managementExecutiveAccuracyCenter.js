(function(){"use strict";
function createBlueCurrentManagementExecutiveAccuracyCenterModule(eventBus,appState){
  const root=document.getElementById("managementExecutiveAccuracy");
  if(!root||!window.BlueCurrentManagementExecutiveAccuracyEngine)return null;
  const e=new window.BlueCurrentManagementExecutiveAccuracyEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("meaStatus").textContent=s.status||"—";
    $("meaMatched").textContent=`${s.totals?.matched||0}/${s.totals?.comparisons||0}`;
    $("meaDiscrepancies").textContent=s.totals?.discrepancies||0;
    $("meaCritical").textContent=s.totals?.criticalIssues||0;
    $("meaHeadline").textContent=s.headline||"Executive accuracy unavailable.";
    $("meaLocations").innerHTML=(s.locations||[]).map(x=>`<article><div><strong>${esc(x.trustState)} · ${esc(x.locationName)}</strong><span>${x.matched}/${x.comparisons.length} match · ${x.discrepancies} discrepancies · ${x.unverified} unverified</span></div><div class="v432-list">${x.comparisons.map(c=>`<article><strong>${esc(c.status)} · ${esc(c.metric)}</strong><span>authoritative ${esc(c.authoritative)} · executive ${esc(c.displayed)}${c.delta!==null?` · delta ${esc(c.delta)}`:""}</span><p>${esc(c.reason)}</p></article>`).join("")}</div></article>`).join("");
    $("meaPortfolio").innerHTML=(s.portfolio?.comparisons||[]).map(c=>`<article><strong>${esc(c.status)} · Portfolio ${esc(c.metric)}</strong><span>authoritative ${esc(c.authoritative)} · executive ${esc(c.displayed)}${c.delta!==null?` · delta ${esc(c.delta)}`:""}</span><p>${esc(c.reason)}</p></article>`).join("");
    $("meaCriticalList").innerHTML=(s.criticalIssues||[]).map(c=>`<article><strong>${esc(c.locationName)} · ${esc(c.metric)} · ${esc(c.status)}</strong><span>${esc(c.reason)}</span></article>`).join("")||"<article><strong>No critical executive-data trust issues.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("meaHeadline").textContent=err.message;}}
  $("meaCertify")?.addEventListener("click",async()=>{try{await e.certify({evidence:$("meaEvidence").value,note:$("meaNote").value});await load();}catch(err){$("meaHeadline").textContent=err.message;}});
  $("meaRefresh")?.addEventListener("click",load);
  ["management-executive-accuracy:certified","live-floor-service:certified","executive:goal-updated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentManagementExecutiveAccuracyCenterModule=createBlueCurrentManagementExecutiveAccuracyCenterModule;
})();