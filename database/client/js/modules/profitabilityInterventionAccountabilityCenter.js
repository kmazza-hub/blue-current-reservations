(function(){"use strict";
function createBlueCurrentProfitabilityInterventionAccountabilityCenterModule(eventBus,appState){
 const root=document.getElementById("v5575ProfitabilityAccountability");if(!root||!window.BlueCurrentProfitabilityInterventionAccountabilityEngine)return null;
 const e=new window.BlueCurrentProfitabilityInterventionAccountabilityEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function render(s){
  $("v5575Status").textContent=s.status||"—";
  $("v5575Ready").textContent=`${s.portfolio?.readyLocations||0}/${s.portfolio?.locations||0}`;
  $("v5575Realized").textContent=`$${Number(s.portfolio?.modeledRealizedValueDollars||0).toLocaleString()}`;
  $("v5575Open").textContent=s.portfolio?.openInterventions||0;
  $("v5575Headline").textContent=s.headline||"Profitability accountability unavailable.";
  $("v5575Locations").innerHTML=(s.locations||[]).map(x=>`<article data-v5575-location="${esc(x.locationId)}">
   <strong>${esc(x.locationName)}</strong>
   <span>${esc(x.state)} · ${x.passed}/${x.total} gates · $${Number(x.modeledRealizedValueDollars||0).toLocaleString()} modeled realized · ${x.averageRealizationRate}% avg realization</span>
   <div class="v432-list">${(x.signals||[]).slice(0,5).map(sig=>`<article data-v5575-signal="${esc(sig.id)}"><strong>${esc(sig.severity.toUpperCase())} · ${esc(sig.title)}</strong><span>$${Number(sig.impactDollars||0).toLocaleString()} opportunity · Owner: ${esc(sig.owner||"Manager")} · ${esc(sig.nextAction)}</span><button data-v5575-create="${esc(sig.id)}">Create intervention</button></article>`).join("")}</div>
   <div class="v432-list">${(x.interventions||[]).map(a=>`<article data-v5575-intervention="${esc(a.id)}"><strong>${esc(a.status)} · ${esc(a.signalTitle)}</strong><span>${esc(a.owner)} · target ${esc(a.targetDate)} · baseline $${Number(a.baselineOpportunityDollars||0).toLocaleString()}${a.outcome?` · realized $${Number(a.realizedValueDollars||0).toLocaleString()} (${a.realizationRate}%)`:""}</span>${!a.outcome?'<button data-v5575-measure="true">Measure outcome</button>':""}</article>`).join("")}</div>
   <div class="v4316-actions"><button data-v5575-ready="true">READY</button><button data-v5575-revise="true">REVISE</button><button data-v5575-hold="true">HOLD</button></div>
  </article>`).join("");
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5575Headline").textContent=err.message;}}
 root.addEventListener("click",async ev=>{const loc=ev.target.closest("[data-v5575-location]");if(!loc)return;try{
   const create=ev.target.closest("[data-v5575-create]");
   const intervention=ev.target.closest("[data-v5575-intervention]");
   if(create)await e.createIntervention(loc.dataset.v5575Location,{signalId:create.dataset.v5575Create,owner:$("v5575Owner").value,targetDate:$("v5575Target").value,intervention:$("v5575Action").value,evidence:$("v5575Evidence").value});
   else if(ev.target.closest("[data-v5575-measure]")&&intervention)await e.measureOutcome(intervention.dataset.v5575Intervention,{remainingOpportunityDollars:Number($("v5575Remaining").value),result:$("v5575Result").value,decisionAccountability:$("v5575Accountability").value,evidence:$("v5575OutcomeEvidence").value,lessons:$("v5575Lessons").value});
   else if(ev.target.closest("[data-v5575-ready]"))await e.certify(loc.dataset.v5575Location,{decision:"READY",evidence:$("v5575CertEvidence").value,reason:$("v5575Reason").value});
   else if(ev.target.closest("[data-v5575-revise]"))await e.certify(loc.dataset.v5575Location,{decision:"REVISE",evidence:$("v5575CertEvidence").value,reason:$("v5575Reason").value});
   else if(ev.target.closest("[data-v5575-hold]"))await e.certify(loc.dataset.v5575Location,{decision:"HOLD",evidence:$("v5575CertEvidence").value,reason:$("v5575Reason").value});
   await load();
  }catch(err){$("v5575Headline").textContent=err.message;}});
 $("v5575Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentProfitabilityInterventionAccountabilityCenterModule=createBlueCurrentProfitabilityInterventionAccountabilityCenterModule;})();