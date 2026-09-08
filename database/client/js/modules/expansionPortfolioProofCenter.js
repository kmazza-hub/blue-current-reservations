(function(){"use strict";
function createBlueCurrentExpansionPortfolioProofCenterModule(eventBus,appState){
 const root=document.getElementById("v5230ExpansionPortfolioProof");if(!root||!window.BlueCurrentExpansionPortfolioProofEngine)return null;
 const e=new window.BlueCurrentExpansionPortfolioProofEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
   $("v5230Status").textContent=s.status||"—";
   $("v5230Locations").textContent=s.expandedLocationIds?.length||0;
   $("v5230Cohorts").textContent=`${s.cohorts?.continued||0}/${s.cohorts?.activated||0}`;
   $("v5230Headline").textContent=s.headline||"Expansion portfolio proof unavailable.";
   $("v5230Dependencies").textContent=`Cohorts ${s.dependencyStatus?.cohortObservation||"—"} · Integrity ${s.dependencyStatus?.dataIntegrity||"—"} · Executive accuracy ${s.dependencyStatus?.executiveAccuracy||"—"}`;
   $("v5230Checks").innerHTML=(s.checks||[]).map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("");
   $("v5230Decision").textContent=s.decision?`${s.decision.decision} · ${s.decision.decidedAt}`:"No portfolio decision recorded.";
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5230Headline").textContent=err.message;}}
 $("v5230Assess")?.addEventListener("click",async()=>{try{await e.assess({operatorConfidence:Number($("v5230Confidence").value),portfolioOutcomeEvidence:$("v5230Outcome").value,supportBurdenReview:$("v5230Support").value,replicationLessons:$("v5230Lessons").value,windowStart:$("v5230WindowStart").value,windowEnd:$("v5230WindowEnd").value,note:$("v5230Note").value});await load();}catch(err){$("v5230Headline").textContent=err.message;}});
 root.addEventListener("click",async ev=>{const b=ev.target.closest("[data-v5230-decision]");if(!b)return;try{await e.decide({decision:b.dataset.v5230Decision,evidence:$("v5230DecisionEvidence").value,reason:$("v5230DecisionReason").value});await load();}catch(err){$("v5230Headline").textContent=err.message;}});
 $("v5230Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentExpansionPortfolioProofCenterModule=createBlueCurrentExpansionPortfolioProofCenterModule;
})();