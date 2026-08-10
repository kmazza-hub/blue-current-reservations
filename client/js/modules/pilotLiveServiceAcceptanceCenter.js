(function(){"use strict";
function createBlueCurrentPilotLiveServiceAcceptanceCenterModule(eventBus,appState){
 const root=document.getElementById("v5750PilotLiveServiceAcceptance");if(!root||!window.BlueCurrentPilotLiveServiceAcceptanceEngine)return null;
 const e=new window.BlueCurrentPilotLiveServiceAcceptanceEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
   $("v5750Status").textContent=s.status||"—";
   $("v5750Ready").textContent=`${(s.locations||[]).filter(x=>x.acceptanceReady).length}/${(s.locations||[]).length}`;
   $("v5750Rc").textContent=s.releaseCandidate?.releaseVersion||"—";
   $("v5750Headline").textContent=s.headline||"Pilot live-service acceptance unavailable.";
   $("v5750Locations").innerHTML=(s.locations||[]).map(x=>`<article data-v5750-location="${esc(x.locationId)}"><strong>${esc(x.locationName)}</strong><span>${esc(x.state)} · ${x.passed}/${x.total} gates · execution ${esc(x.executionState)}</span><div class="v432-list">${x.checks.map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div><div class="v4316-actions"><button data-v5750-review>Record live-service review</button><button data-v5750-accept>ACCEPT</button><button data-v5750-extend>EXTEND</button><button data-v5750-hold>HOLD</button></div></article>`).join("");
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5750Headline").textContent=err.message;}}
 root.addEventListener("click",async ev=>{const card=ev.target.closest("[data-v5750-location]");if(!card)return;try{
  if(ev.target.closest("[data-v5750-review]"))await e.review(card.dataset.v5750Location,{operatorAcceptance:$("v5750Operator").value,managerAcceptance:$("v5750Manager").value,guestImpact:$("v5750Guest").value,workflowAcceptance:$("v5750Workflow").value,supportBurden:$("v5750Support").value,dataConfidence:$("v5750Data").value,kpiObservation:$("v5750Kpi").value,incidentSummary:$("v5750Incidents").value,liveServiceEvidence:$("v5750Evidence").value,note:$("v5750Note").value});
  else if(ev.target.closest("[data-v5750-accept]"))await e.decide(card.dataset.v5750Location,{decision:"ACCEPT",evidence:$("v5750DecisionEvidence").value,reason:$("v5750Reason").value});
  else if(ev.target.closest("[data-v5750-extend]"))await e.decide(card.dataset.v5750Location,{decision:"EXTEND",evidence:$("v5750DecisionEvidence").value,reason:$("v5750Reason").value});
  else if(ev.target.closest("[data-v5750-hold]"))await e.decide(card.dataset.v5750Location,{decision:"HOLD",evidence:$("v5750DecisionEvidence").value,reason:$("v5750Reason").value});
  await load();
 }catch(err){$("v5750Headline").textContent=err.message;}});
 $("v5750Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentPilotLiveServiceAcceptanceCenterModule=createBlueCurrentPilotLiveServiceAcceptanceCenterModule;})();