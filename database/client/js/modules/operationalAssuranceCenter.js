(function(){"use strict";
function createBlueCurrentOperationalAssuranceCenterModule(eventBus){
 const root=document.getElementById("operationalAssuranceCenter");if(!root||!window.BlueCurrentOperationalAssuranceEngine)return null;
 const engine=new window.BlueCurrentOperationalAssuranceEngine(),$=id=>document.getElementById(id);
 function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
 function render(){const s=engine.snapshot();[["oaScore",`${s.evidenceScore}%`],["oaCoverage",`${s.rootCoverage}%`],["oaClosure",`${s.actionClosure}%`],["oaTraining",`${s.trainingCompletion}%`],["oaStatus",s.status]].forEach(([id,v])=>{$(id)&&($(id).textContent=v);});
  $("oaRows")&&($("oaRows").innerHTML=[
   ["Root-cause coverage",s.rootCoverage,"Confirmed causes linked to standard work"],
   ["Corrective-action closure",s.actionClosure,"Prevention actions completed"],
   ["Training completion",s.trainingCompletion,"Assigned coaching completed"],
   ["Prevention effectiveness",s.preventionEffectiveness,"Verified actions that prevented recurrence"]
  ].map(([name,value,note])=>`<article><div><strong>${esc(name)}</strong><span>${esc(note)}</span></div><b>${value}%</b></article>`).join(""));
  $("oaBlockers")&&($("oaBlockers").innerHTML=s.blockers.length?s.blockers.map(x=>`<li>${esc(x)}</li>`).join(""):"<li>No material assurance blockers.</li>");return s;}
 $("oaRefresh")?.addEventListener("click",render);
 ["incident-root-cause:updated","corrective-action:updated","standard-work:updated","training-assignment:updated","prevention-verification:recorded"].forEach(name=>eventBus.on(name,render));
 render();return{engine,refresh:render};
}
window.createBlueCurrentOperationalAssuranceCenterModule=createBlueCurrentOperationalAssuranceCenterModule;})();
