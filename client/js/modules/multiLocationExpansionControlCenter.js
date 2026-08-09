(function(){"use strict";
function createBlueCurrentMultiLocationExpansionControlCenterModule(eventBus,appState){
 const root=document.getElementById("v5220MultiLocationExpansion");if(!root||!window.BlueCurrentMultiLocationExpansionControlEngine)return null;
 const e=new window.BlueCurrentMultiLocationExpansionControlEngine({eventBus,appState}),$=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
 function parseIds(raw){return String(raw||"").split(/[\n,]/).map(x=>x.trim()).filter(Boolean);}
 function render(s){
  $("v5220Status").textContent=s.status||"—";$("v5220Targets").textContent=(s.approvedTargets||[]).length;$("v5220Cohorts").textContent=`${(s.cohorts||[]).filter(x=>x.ready).length}/${(s.cohorts||[]).length}`;$("v5220Headline").textContent=s.headline||"Expansion control unavailable.";
  $("v5220Plan").innerHTML=s.plan?`<article><strong>${esc(s.plan.name)}</strong><span>Max concurrent ${s.plan.maxConcurrentLocations} · support ${esc(s.plan.supportOwner)} · pause authority ${esc(s.plan.pauseAuthority)}</span><div class="v432-list">${s.planChecks.map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.id)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div>${!s.approval?'<button type="button" data-v5220-approve="true">Approve expansion plan</button>':""}</article>`:"<article><strong>No expansion plan defined.</strong></article>";
  $("v5220CohortList").innerHTML=(s.cohorts||[]).map(c=>`<article><strong>${esc(c.name)} · Sequence ${c.sequence}</strong><span>${c.locations.map(x=>esc(x.locationName)).join(", ")} · ${c.passed}/${c.total} gates</span><div class="v432-list">${c.checks.map(x=>`<article><strong>${x.passed?"PASS":"OPEN"} · ${esc(x.id)}</strong><span>${esc(x.actual)}</span></article>`).join("")}</div></article>`).join("");
 }
 async function load(){try{render(await e.snapshot());}catch(err){$("v5220Headline").textContent=err.message;}}
 $("v5220Create")?.addEventListener("click",async()=>{try{await e.createPlan({name:$("v5220Name").value,maxConcurrentLocations:Number($("v5220Max").value||1),supportOwner:$("v5220SupportOwner").value,pauseAuthority:$("v5220PauseAuthority").value,evidence:$("v5220Evidence").value,note:$("v5220Note").value,cohorts:[{name:"Cohort 1",locationIds:parseIds($("v5220LocationIds").value),windowStart:$("v5220WindowStart").value,windowEnd:$("v5220WindowEnd").value,supportLoad:$("v5220SupportLoad").value,dependencyEvidence:$("v5220Dependency").value,blockers:[]} ]});await load();}catch(err){$("v5220Headline").textContent=err.message;}});
 root.addEventListener("click",async ev=>{if(!ev.target.closest("[data-v5220-approve]"))return;try{const s=await e.snapshot();await e.approve(s.plan.id,{evidence:$("v5220ApprovalEvidence").value,note:$("v5220ApprovalNote").value});await load();}catch(err){$("v5220Headline").textContent=err.message;}});
 $("v5220Refresh")?.addEventListener("click",load);load();return{engine:e,load};
}
window.createBlueCurrentMultiLocationExpansionControlCenterModule=createBlueCurrentMultiLocationExpansionControlCenterModule;
})();