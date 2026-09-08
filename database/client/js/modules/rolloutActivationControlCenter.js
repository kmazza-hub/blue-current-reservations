(function(){"use strict";
function createBlueCurrentRolloutActivationControlCenterModule(eventBus,appState){
  const root=document.getElementById("rolloutActivationControl");
  if(!root||!window.BlueCurrentRolloutActivationControlEngine)return null;
  const e=new window.BlueCurrentRolloutActivationControlEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("racStatus").textContent=s.status||"—";
    $("racPlan").textContent=s.plan?.id||"NONE";
    $("racPassed").textContent=`${(s.locations||[]).filter(x=>x.preflightPassed).length}/${(s.locations||[]).length}`;
    $("racApproved").textContent=(s.locations||[]).filter(x=>x.approval?.status==="APPROVED_FOR_ACTIVATION").length;
    $("racHeadline").textContent=s.headline||"Rollout activation review unavailable.";
    $("racLocations").innerHTML=(s.locations||[]).map(x=>`<article data-rac-location="${esc(x.locationId)}"><div><strong>Wave ${x.wave} · ${esc(x.locationName)}</strong><span>${esc(x.activationControlState)} · readiness ${x.readinessScore} · ${esc(x.attentionLevel)}</span></div><div class="v432-list">${(x.gates||[]).map(g=>`<article><strong>${g.passed?"PASS":"OPEN"} · ${esc(g.label)}</strong>${g.actual!==undefined?`<span>Current: ${esc(g.actual)}</span>`:""}</article>`).join("")}</div>${x.approval?`<p><strong>Approved by ${esc(x.approval.approver)}</strong> · deployment state ${esc(x.approval.deploymentState)}${x.approval.overrideUsed?" · EXECUTIVE OVERRIDE":""}</p>`:`<div class="v4316-actions"><button type="button" data-rac-approve="true">Approve for activation</button></div>`}</article>`).join("")||"<article><strong>No rollout locations are awaiting activation review.</strong></article>";
    $("racHistory").innerHTML=(s.approvalHistory||[]).map(x=>`<article><strong>${esc(x.locationName)} · ${esc(x.status)}</strong><span>${esc(x.approver)} · ${new Date(x.approvedAt).toLocaleString()} · ${esc(x.deploymentState)}${x.overrideUsed?" · override used":""}</span></article>`).join("")||"<article><strong>No activation approvals recorded.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("racHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const btn=ev.target.closest("[data-rac-approve]"),card=ev.target.closest("[data-rac-location]");
    if(!btn||!card)return;
    try{
      btn.disabled=true;
      await e.approve(card.dataset.racLocation,{approver:$("racApprover").value,overrideReason:$("racOverride").value,note:$("racNote").value});
      await load();
    }catch(err){$("racHeadline").textContent=err.message;}finally{btn.disabled=false;}
  });
  $("racRefresh")?.addEventListener("click",load);
  ["expansion-readiness:drafted","pilot-decision:signed","rollout-activation:approved","multi-location-performance:updated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentRolloutActivationControlCenterModule=createBlueCurrentRolloutActivationControlCenterModule;
})();