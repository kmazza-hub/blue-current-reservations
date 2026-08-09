(function(){"use strict";
function createBlueCurrentV50ReleaseCertificationCenterModule(eventBus,appState){
  const root=document.getElementById("v50ReleaseCertification");
  if(!root||!window.BlueCurrentV50ReleaseCertificationEngine)return null;
  const e=new window.BlueCurrentV50ReleaseCertificationEngine({appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("v50certStatus").textContent=s.status||"—";
    $("v50certArchitecture").textContent=`${s.architecturePassed||0}/${s.architectureTotal||0}`;
    $("v50certLive").textContent=`${s.liveStatePassed||0}/${s.liveStateTotal||0}`;
    $("v50certCorrective").textContent=`${s.totals?.correctiveActionsCompleted||0}/${s.totals?.correctiveActions||0}`;
    $("v50certHeadline").textContent=s.headline||"V50 certification unavailable.";
    $("v50certChain").innerHTML=(s.chain||[]).map(x=>`<article><strong>${esc(x.stage)}</strong><span>${esc(x.state)}</span></article>`).join("");
    $("v50certArchitectureChecks").innerHTML=(s.architectureContracts||[]).map(x=>`<article><strong>${x.passed?"PASS":"FAIL"} · ${esc(x.label)}</strong></article>`).join("");
    $("v50certLiveChecks").innerHTML=(s.liveStateContracts||[]).map(x=>`<article><strong>${x.passed?"PASS":"OPEN"} · ${esc(x.label)}</strong><span>${esc(x.state)}</span></article>`).join("");
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("v50certHeadline").textContent=err.message;}}
  $("v50certRefresh")?.addEventListener("click",load);
  ["production-operations:accepted","production-support:event-updated","production-incident:updated","production-recovery:lessons-accepted","production-learning:action-completed","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentV50ReleaseCertificationCenterModule=createBlueCurrentV50ReleaseCertificationCenterModule;
})();