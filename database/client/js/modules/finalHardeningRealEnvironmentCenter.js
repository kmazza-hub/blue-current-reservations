(function(){"use strict";
function createBlueCurrentFinalHardeningRealEnvironmentCenterModule(eventBus,appState){
 const root=document.getElementById("v5850FinalHardening");if(!root||!window.BlueCurrentFinalHardeningRealEnvironmentEngine)return null;
 const e=new window.BlueCurrentFinalHardeningRealEnvironmentEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
  $("v5850Status").textContent=s.status||"—";
  $("v5850Ready").textContent=s.hardeningReady?"READY":"OPEN";
  $("v5850Headline").textContent=s.headline||"Final hardening unavailable.";
  $("v5850Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
  $("v5850Certification").textContent=s.certification?`${s.certification.decision} · ${s.certification.certifiedAt}`:"No final hardening certification.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5850Headline").textContent=err.message;}}
 $("v5850Review")?.addEventListener("click",async()=>{try{await e.review({
   fullRegression:$("v5850Regression").value,criticalDefectClosure:$("v5850Critical").value,highDefectReview:$("v5850High").value,
   securityPrivacyVerification:$("v5850Security").value,authRbacVerification:$("v5850Auth").value,dataPersistenceIntegrity:$("v5850Data").value,
   backupRestoreDrill:$("v5850Backup").value,rollbackRecoveryDrill:$("v5850Rollback").value,performanceLoad:$("v5850Performance").value,
   observabilityAlerting:$("v5850Observability").value,productionConfiguration:$("v5850Config").value,connectorFailureBehavior:$("v5850Connectors").value,
   operatorUxReadability:$("v5850Ux").value,deviceResponsiveness:$("v5850Device").value,accessibilityReview:$("v5850Accessibility").value,
   supportRunbookValidation:$("v5850Support").value,knownIssuesReconciled:$("v5850Issues").value,realEnvironmentEvidence:$("v5850Environment").value,
   recommendation:$("v5850Recommendation").value,note:$("v5850Note").value});await load();}catch(err){$("v5850Headline").textContent=err.message;}});
 for(const [id,decision] of [["v5850Ship","SHIP"],["v5850Revise","REVISE"],["v5850Hold","HOLD"]]){
   $(id)?.addEventListener("click",async()=>{try{await e.certify({decision,evidence:$("v5850Evidence").value,reason:$("v5850Reason").value});await load();}catch(err){$("v5850Headline").textContent=err.message;}});
 }
 $("v5850Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentFinalHardeningRealEnvironmentCenterModule=createBlueCurrentFinalHardeningRealEnvironmentCenterModule;})();