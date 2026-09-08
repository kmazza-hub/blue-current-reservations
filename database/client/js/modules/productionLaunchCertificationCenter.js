(function(){"use strict";
function createBlueCurrentProductionLaunchCertificationCenterModule(eventBus,appState){
 const root=document.getElementById("v5900ProductionLaunchCertification");if(!root||!window.BlueCurrentProductionLaunchCertificationEngine)return null;
 const e=new window.BlueCurrentProductionLaunchCertificationEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
  $("v5900Status").textContent=s.status||"—";
  $("v5900Ready").textContent=s.launchReady?"READY":"OPEN";
  $("v5900Version").textContent=s.review?.releaseVersion||"—";
  $("v5900Headline").textContent=s.headline||"Production launch certification unavailable.";
  $("v5900Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
  $("v5900Certification").textContent=s.certification?`${s.certification.decision} · ${s.certification.certifiedAt}`:"No finished-product release certification.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5900Headline").textContent=err.message;}}
 $("v5900Review")?.addEventListener("click",async()=>{try{await e.review({
  releaseVersion:$("v5900ReleaseVersion").value,buildHash:$("v5900BuildHash").value,
  deploymentPlan:$("v5900Deployment").value,cutoverPlan:$("v5900Cutover").value,
  rollbackAuthority:$("v5900RollbackAuthority").value,launchOwner:$("v5900LaunchOwner").value,
  supportOwner:$("v5900SupportOwner").value,escalationOwner:$("v5900EscalationOwner").value,
  customerActivationControl:$("v5900Activation").value,changeFreeze:$("v5900Freeze").value,
  monitoringWindow:$("v5900Monitoring").value,launchSuccessCriteria:$("v5900Success").value,
  launchAbortCriteria:$("v5900Abort").value,releaseDocumentation:$("v5900Documentation").value,
  recommendation:$("v5900Recommendation").value,note:$("v5900Note").value});await load();}catch(err){$("v5900Headline").textContent=err.message;}});
 for(const [id,decision] of [["v5900Release","RELEASE"],["v5900Revise","REVISE"],["v5900Hold","HOLD"]]){
  $(id)?.addEventListener("click",async()=>{try{await e.certify({decision,evidence:$("v5900Evidence").value,reason:$("v5900Reason").value});await load();}catch(err){$("v5900Headline").textContent=err.message;}});
 }
 $("v5900Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentProductionLaunchCertificationCenterModule=createBlueCurrentProductionLaunchCertificationCenterModule;})();