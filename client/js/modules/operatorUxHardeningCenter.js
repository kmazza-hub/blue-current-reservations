(function(){"use strict";
function createBlueCurrentOperatorUxHardeningCenterModule(eventBus,appState){
  const root=document.getElementById("operatorUxHardening");
  if(!root||!window.BlueCurrentOperatorUxHardeningEngine)return null;
  const e=new window.BlueCurrentOperatorUxHardeningEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    $("ouxStatus").textContent=s.status||"—";
    $("ouxChecks").textContent=`${(s.checks||[]).filter(x=>x.passed).length}/${(s.checks||[]).length}`;
    $("ouxOpen").textContent=s.totals?.open||0;
    $("ouxHigh").textContent=s.totals?.highCriticalOpen||0;
    $("ouxHeadline").textContent=s.headline||"Operator UX hardening unavailable.";
    $("ouxQuickActions").innerHTML=(s.workflows||[]).map(x=>`<button type="button" class="oux-quick-action" data-oux-jump="${esc(x.surfaceId)}"><strong>${esc(x.label)}</strong><small>${esc(x.shortcut)}</small></button>`).join("");
    $("ouxChecksList").innerHTML=(s.checks||[]).map(x=>`<article><strong>${x.passed?"PASS":"OPEN"} · ${esc(x.label)}</strong><span>${esc(x.actual)}</span></article>`).join("");
    $("ouxTerms").innerHTML=(s.terminology||[]).map(x=>`<article><strong>${esc(x.preferred)}</strong><span>Avoid: ${esc((x.avoid||[]).join(", "))}</span><p>${esc(x.reason)}</p></article>`).join("");
    $("ouxFindings").innerHTML=(s.findings||[]).map(x=>`<article data-oux-finding="${esc(x.id)}"><strong>${esc(x.status)} · ${esc(x.severity)} · ${esc(x.workflowId)}</strong><span>${esc(x.issue)}${x.observedClicks?` · ${x.observedClicks} observed clicks`:``}${x.expectedClicks?` · target ${x.expectedClicks}`:``}</span>${x.status!=="RESOLVED"?'<button type="button" data-oux-resolve="true">Resolve with evidence</button>':`<p>${esc(x.resolution||"Resolved")}</p>`}</article>`).join("")||"<article><strong>No operator-friction findings recorded.</strong></article>";
    e.installShortcuts(s.workflows||[]);
    document.documentElement.dataset.v51OperatorUx="hardened";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("ouxHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const jump=ev.target.closest("[data-oux-jump]");if(jump){e.jumpTo(jump.dataset.ouxJump);return;}
    const card=ev.target.closest("[data-oux-finding]");
    if(card&&ev.target.closest("[data-oux-resolve]")){
      try{await e.resolveFinding(card.dataset.ouxFinding,{resolution:$("ouxResolution").value});await load();}catch(err){$("ouxHeadline").textContent=err.message;}
    }
  });
  $("ouxRecord")?.addEventListener("click",async()=>{try{
    await e.createFinding({workflowId:$("ouxWorkflow").value,severity:$("ouxSeverity").value,issue:$("ouxIssue").value,observedClicks:Number($("ouxObservedClicks").value||0),expectedClicks:Number($("ouxExpectedClicks").value||0),terminologyIssue:$("ouxTerminologyIssue").value});
    await load();
  }catch(err){$("ouxHeadline").textContent=err.message;}});
  $("ouxCertify")?.addEventListener("click",async()=>{try{await e.certify({evidence:$("ouxEvidence").value,note:$("ouxNote").value});await load();}catch(err){$("ouxHeadline").textContent=err.message;}});
  $("ouxRefresh")?.addEventListener("click",load);
  ["operator-ux:finding-created","operator-ux:finding-resolved","operator-ux:certified","role-permission:certified","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentOperatorUxHardeningCenterModule=createBlueCurrentOperatorUxHardeningCenterModule;
})();