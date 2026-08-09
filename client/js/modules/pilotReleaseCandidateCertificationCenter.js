(function(){"use strict";
function createBlueCurrentPilotReleaseCandidateCertificationCenterModule(eventBus,appState){
 const root=document.getElementById("v5700PilotReleaseCandidate");if(!root||!window.BlueCurrentPilotReleaseCandidateCertificationEngine)return null;
 const e=new window.BlueCurrentPilotReleaseCandidateCertificationEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
  $("v5700Status").textContent=s.status||"—";
  $("v5700Ready").textContent=s.rcReady?"READY":"OPEN";
  $("v5700Version").textContent=s.releaseCandidate?.releaseVersion||"—";
  $("v5700Headline").textContent=s.headline||"Pilot Release Candidate certification unavailable.";
  $("v5700Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
  $("v5700Certification").textContent=s.certification?`${s.certification.decision} · ${s.certification.certifiedAt}`:"No pilot release-candidate certification.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5700Headline").textContent=err.message;}}
 $("v5700Review")?.addEventListener("click",async()=>{try{await e.review({
  releaseVersion:$("v5700ReleaseVersion").value,buildHash:$("v5700BuildHash").value,
  changeFreeze:$("v5700Freeze").value,regressionEvidence:$("v5700Regression").value,
  securitySignoff:$("v5700Security").value,backupRestoreSignoff:$("v5700Backup").value,
  observabilitySignoff:$("v5700Observability").value,supportSignoff:$("v5700Support").value,
  rollbackSignoff:$("v5700Rollback").value,knownIssuesRegister:$("v5700KnownIssues").value,
  pilotSuccessCriteria:$("v5700Success").value,rcRecommendation:$("v5700Recommendation").value,
  note:$("v5700Note").value});await load();}catch(err){$("v5700Headline").textContent=err.message;}});
 $("v5700Approve")?.addEventListener("click",async()=>{try{await e.certify({decision:"RC_APPROVE",evidence:$("v5700Evidence").value,reason:$("v5700Reason").value});await load();}catch(err){$("v5700Headline").textContent=err.message;}});
 $("v5700Hold")?.addEventListener("click",async()=>{try{await e.certify({decision:"HOLD",evidence:$("v5700Evidence").value,reason:$("v5700Reason").value});await load();}catch(err){$("v5700Headline").textContent=err.message;}});
 $("v5700Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentPilotReleaseCandidateCertificationCenterModule=createBlueCurrentPilotReleaseCandidateCertificationCenterModule;})();