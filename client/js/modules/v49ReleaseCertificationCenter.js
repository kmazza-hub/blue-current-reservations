(function(){"use strict";
function createBlueCurrentV49ReleaseCertificationCenterModule(eventBus,appState){
  const root=document.getElementById("v49ReleaseCertification");
  if(!root||!window.BlueCurrentV49ReleaseCertificationEngine)return null;
  const e=new window.BlueCurrentV49ReleaseCertificationEngine({appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("v49certStatus").textContent=s.status||"—";
    $("v49certArchitecture").textContent=`${s.architecturePassed||0}/${s.architectureTotal||0}`;
    $("v49certLive").textContent=`${s.liveStatePassed||0}/${s.liveStateTotal||0}`;
    $("v49certStable").textContent=s.totals?.stableDeclarations||0;
    $("v49certHeadline").textContent=s.headline||"V49 certification unavailable.";
    $("v49certChain").innerHTML=(s.chain||[]).map(x=>`<article><strong>${esc(x.stage)}</strong><span>${esc(x.state)}</span></article>`).join("");
    $("v49certArchitectureChecks").innerHTML=(s.architectureContracts||[]).map(x=>`<article><strong>${x.passed?"PASS":"FAIL"} · ${esc(x.label)}</strong></article>`).join("");
    $("v49certLiveChecks").innerHTML=(s.liveStateContracts||[]).map(x=>`<article><strong>${x.passed?"PASS":"OPEN"} · ${esc(x.label)}</strong><span>${esc(x.state)}</span></article>`).join("");
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("v49certHeadline").textContent=err.message;}}
  $("v49certRefresh")?.addEventListener("click",load);
  ["rollout-activation:approved","technical-activation:authorized","location-deployment:package-prepared","go-live-command:result-recorded","launch-stabilization:declared","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentV49ReleaseCertificationCenterModule=createBlueCurrentV49ReleaseCertificationCenterModule;
})();