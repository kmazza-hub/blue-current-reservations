(function(){"use strict";
function createBlueCurrentProductionCorrectiveActionGovernanceCenterModule(eventBus,appState){
  const root=document.getElementById("productionCorrectiveActionGovernance");
  if(!root||!window.BlueCurrentProductionCorrectiveActionGovernanceEngine)return null;
  const e=new window.BlueCurrentProductionCorrectiveActionGovernanceEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("pcagStatus").textContent=s.status||"—";
    $("pcagOpen").textContent=s.totals?.open||0;
    $("pcagOverdue").textContent=s.totals?.overdue||0;
    $("pcagHighRisk").textContent=s.totals?.highRiskOpen||0;
    $("pcagHeadline").textContent=s.headline||"Corrective action governance unavailable.";
    $("pcagOwners").innerHTML=(s.ownerAccountability||[]).map(x=>`<article><strong>${esc(x.owner)}</strong><span>${x.open} open · ${x.overdue} overdue · ${x.highRisk} high-risk · ${x.completed} completed</span></article>`).join("")||"<article><strong>No corrective-action owners yet.</strong></article>";
    $("pcagActions").innerHTML=(s.actions||[]).map(x=>`<article data-pcag-review="${esc(x.reviewId)}" data-pcag-action="${esc(x.actionId)}"><div><strong>${esc(x.status)} · ${esc(x.action)}</strong><span>${esc(x.owner)}${x.dueDate?` · due ${esc(x.dueDate)}`:""}${x.overdue?` · ${x.ageDaysPastDue} day(s) overdue`:""} · repeat risk ${esc(x.repeatRisk)}</span></div><p>Incident: ${esc(x.incidentTitle)}${x.repeatIncidentLinks.length?` · repeat links ${x.repeatIncidentLinks.length}`:""}</p><p>Execution: <strong>${esc(x.executionState)}</strong></p>${x.latestEvidence?`<p><strong>Latest evidence:</strong> ${esc(x.latestEvidence.evidence||x.latestEvidence.note||"completion accepted")}</p>`:""}<div class="v4316-actions">${x.status==="OPEN"?'<button type="button" data-pcag-verify="true">Verify risk reduction</button>':""}${x.status==="RISK_REDUCTION_VERIFIED"?'<button type="button" data-pcag-complete="true">Accept completion</button>':""}</div></article>`).join("")||"<article><strong>No corrective actions available.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("pcagHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-pcag-review]"); if(!card)return;
    const reviewId=card.dataset.pcagReview,actionId=card.dataset.pcagAction;
    if(ev.target.closest("[data-pcag-verify]")){
      try{await e.verify(reviewId,actionId,{evidence:$("pcagEvidence").value,verification:$("pcagVerification").value});await load();}catch(err){$("pcagHeadline").textContent=err.message;}return;
    }
    if(ev.target.closest("[data-pcag-complete]")){
      try{await e.acceptCompletion(reviewId,actionId,{approver:$("pcagApprover").value,note:$("pcagCompletionNote").value});await load();}catch(err){$("pcagHeadline").textContent=err.message;}
    }
  });
  $("pcagRefresh")?.addEventListener("click",load);
  ["production-recovery:review-created","production-recovery:lessons-accepted","production-learning:action-verified","production-learning:action-completed","production-incident:created","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentProductionCorrectiveActionGovernanceCenterModule=createBlueCurrentProductionCorrectiveActionGovernanceCenterModule;
})();