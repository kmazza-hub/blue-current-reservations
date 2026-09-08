(function(){"use strict";
function createBlueCurrentProductionRecoveryReviewCenterModule(eventBus,appState){
  const root=document.getElementById("productionRecoveryReview");
  if(!root||!window.BlueCurrentProductionRecoveryReviewEngine)return null;
  const e=new window.BlueCurrentProductionRecoveryReviewEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function actionPayload(){
    const action=$("prrAction").value.trim(),owner=$("prrActionOwner").value.trim(),dueDate=$("prrActionDue").value.trim();
    return action&&owner?[{action,owner,dueDate}]:[];
  }
  function render(s){
    const incidents=s.incidents||[];
    $("prrStatus").textContent=s.status||"—";
    $("prrRecovered").textContent=`${incidents.filter(x=>x.recoveryVerified).length}/${incidents.length}`;
    $("prrOpen").textContent=incidents.filter(x=>!x.review||x.review.status!=="POST_INCIDENT_REVIEW_ACCEPTED").length;
    $("prrAccepted").textContent=incidents.filter(x=>x.review?.status==="POST_INCIDENT_REVIEW_ACCEPTED").length;
    $("prrHeadline").textContent=s.headline||"Production recovery review unavailable.";
    $("prrIncidents").innerHTML=incidents.map(x=>`<article data-prr-incident="${esc(x.incidentId)}"${x.review?` data-prr-review="${esc(x.review.id)}"`:""}><div><strong>${esc(x.severity)} · ${esc(x.title)}</strong><span>${x.durationMinutes===null?"duration unavailable":`${x.durationMinutes} min`} · recovery ${x.recoveryVerified?"VERIFIED":"OPEN"} · review ${esc(x.reviewState)}</span></div><p><strong>Impact:</strong> ${esc(x.businessImpact||"Not recorded.")}</p><p><strong>Resolution:</strong> ${esc(x.resolution||"Not recorded.")}</p><div class="v432-list">${(x.affectedLocations||[]).map(l=>`<article><strong>${l.recovered?"PASS":"OPEN"} · ${esc(l.locationName)}</strong><span>recovery ${l.passed}/${l.total}</span></article>`).join("")||"<article><strong>No location-specific recovery state.</strong></article>"}</div>${x.review?`<p><strong>Root cause:</strong> ${esc(x.review.rootCause)} · repeat risk ${esc(x.review.repeatRisk)}</p><p><strong>Corrective actions:</strong> ${(x.review.correctiveActions||[]).map(a=>`${esc(a.action)} — ${esc(a.owner)}${a.dueDate?` by ${esc(a.dueDate)}`:""} · ${esc(a.executionState)}`).join(" | ")}</p><div class="v4316-actions">${x.review.status!=="POST_INCIDENT_REVIEW_ACCEPTED"?'<button type="button" data-prr-accept="true">Accept lessons & close review</button>':""}</div>`:'<div class="v4316-actions"><button type="button" data-prr-create="true">Create post-incident review</button></div>'}</article>`).join("")||"<article><strong>No resolved incidents are ready for recovery review.</strong></article>";
    $("prrHistory").innerHTML=(s.reviewHistory||[]).map(x=>`<article><strong>${esc(x.incidentTitle)} · ${esc(x.status)}</strong><span>repeat risk ${esc(x.repeatRisk)} · ${new Date(x.createdAt).toLocaleString()}${x.lessonsAcceptedBy?` · accepted by ${esc(x.lessonsAcceptedBy)}`:""}</span></article>`).join("")||"<article><strong>No post-incident reviews recorded.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("prrHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const card=ev.target.closest("[data-prr-incident]"); if(!card)return;
    if(ev.target.closest("[data-prr-create]")){
      try{
        await e.createReview(card.dataset.prrIncident,{
          rootCause:$("prrRootCause").value,
          contributingFactors:$("prrFactors").value.split(",").map(x=>x.trim()).filter(Boolean),
          correctiveActions:actionPayload(),
          repeatRisk:$("prrRisk").value,
          executiveSummary:$("prrExecutiveSummary").value
        });
        await load();
      }catch(err){$("prrHeadline").textContent=err.message;}
      return;
    }
    if(ev.target.closest("[data-prr-accept]")){
      try{
        await e.acceptLessons(card.dataset.prrReview,{approver:$("prrApprover").value,note:$("prrClosure").value});
        await load();
      }catch(err){$("prrHeadline").textContent=err.message;}
    }
  });
  $("prrRefresh")?.addEventListener("click",load);
  ["production-incident:updated","production-recovery:review-created","production-recovery:lessons-accepted","production-support:event-updated","reliability:slo-evaluated","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentProductionRecoveryReviewCenterModule=createBlueCurrentProductionRecoveryReviewCenterModule;
})();