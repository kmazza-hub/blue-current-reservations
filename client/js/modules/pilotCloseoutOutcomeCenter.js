(function(){"use strict";
function createBlueCurrentPilotCloseoutOutcomeCenterModule(eventBus,appState){
 const root=document.getElementById("v5210PilotCloseoutOutcome");if(!root||!window.BlueCurrentPilotCloseoutOutcomeEngine)return null;
 const e=new window.BlueCurrentPilotCloseoutOutcomeEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 const lines=raw=>String(raw||"").split(/\n/).map(x=>x.trim()).filter(Boolean);
 function render(s){const locs=s.locations||[];$("v5210Status").textContent=s.status||"—";$("v5210Ready").textContent=`${locs.filter(x=>x.expansionReady).length}/${locs.length}`;$("v5210Reviews").textContent=locs.filter(x=>x.review).length;$("v5210Decisions").textContent=locs.filter(x=>x.decision).length;$("v5210Headline").textContent=s.headline||"Pilot closeout unavailable.";$("v5210Locations").innerHTML=locs.map(x=>`<article data-v5210-location="${esc(x.locationId)}"><strong>${esc(x.locationName)}</strong><span>${esc(x.closeoutState)} · ${x.passed}/${x.total} closeout gates · debt ${x.unresolvedDebt.length} · open incidents ${x.openIncidents.length}</span><div class="v432-list">${x.checks.map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div><div class="v4316-actions">${x.stabilizationDecision?.decision==="STABLE"?'<button type="button" data-v5210-review="true">Record pilot closeout</button>':""}${x.review?'<button type="button" data-v5210-expand="true">EXPAND</button><button type="button" data-v5210-hold="true">HOLD</button><button type="button" data-v5210-retire="true">RETIRE</button>':""}</div></article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";}
 async function load(){try{render(await e.snapshot());}catch(err){$("v5210Headline").textContent=err.message;}}
 root.addEventListener("click",async ev=>{const loc=ev.target.closest("[data-v5210-location]");if(!loc)return;try{
  if(ev.target.closest("[data-v5210-review]")){
   const incidents=lines($("v5210Incidents").value).map((summary,i)=>({id:`incident_${i+1}`,summary,status:"CLOSED"}));
   const debt=lines($("v5210Debt").value).map((summary,i)=>({id:`debt_${i+1}`,summary,severity:"medium",status:"OPEN"}));
   const prereq=lines($("v5210Prereqs").value).map((summary,i)=>({id:`prereq_${i+1}`,summary,status:"MET"}));
   await e.review(loc.dataset.v5210Location,{objectiveOutcomeSummary:$("v5210Objectives").value,operatorFeedback:$("v5210Operators").value,guestImpactSummary:$("v5210Guests").value,supportBurdenSummary:$("v5210Support").value,dataKpiConfidenceSummary:$("v5210Data").value,lessonsLearned:$("v5210Lessons").value,incidentCloseout:incidents,unresolvedDebt:debt,expansionPrerequisites:prereq});
  }else if(ev.target.closest("[data-v5210-expand]"))await e.decide(loc.dataset.v5210Location,{decision:"EXPAND",evidence:$("v5210DecisionEvidence").value,reason:$("v5210DecisionReason").value});
  else if(ev.target.closest("[data-v5210-hold]"))await e.decide(loc.dataset.v5210Location,{decision:"HOLD",evidence:$("v5210DecisionEvidence").value,reason:$("v5210DecisionReason").value});
  else if(ev.target.closest("[data-v5210-retire]"))await e.decide(loc.dataset.v5210Location,{decision:"RETIRE",evidence:$("v5210DecisionEvidence").value,reason:$("v5210DecisionReason").value});
  await load();
 }catch(err){$("v5210Headline").textContent=err.message;}});
 $("v5210Refresh")?.addEventListener("click",load);["pilot-closeout:reviewed","pilot-closeout:decision","pilot-stabilization:decision","auth:restored"].forEach(x=>eventBus?.on?.(x,load));load();return{engine:e,load};
}
window.createBlueCurrentPilotCloseoutOutcomeCenterModule=createBlueCurrentPilotCloseoutOutcomeCenterModule;
})();