(function(){"use strict";
function createBlueCurrentRestaurantDayLifecycleCenterModule(eventBus,appState){
  const root=document.getElementById("restaurantDayLifecycle");
  if(!root||!window.BlueCurrentRestaurantDayLifecycleEngine)return null;
  const e=new window.BlueCurrentRestaurantDayLifecycleEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("rdlStatus").textContent=s.status||"—";
    $("rdlActive").textContent=locs.filter(x=>x.lifecycleState==="DAY_LIFECYCLE_ACTIVE").length;
    $("rdlComplete").textContent=locs.filter(x=>x.lifecycleState==="DAY_LIFECYCLE_COMPLETE").length;
    $("rdlStages").textContent=`${locs.reduce((n,x)=>n+x.completedStages,0)}/${locs.reduce((n,x)=>n+x.totalStages,0)}`;
    $("rdlHeadline").textContent=s.headline||"Restaurant day lifecycle unavailable.";
    $("rdlLocations").innerHTML=locs.map(x=>`<article data-rdl-location="${esc(x.locationId)}"${x.session?` data-rdl-session="${esc(x.session.id)}"`:""}><div><strong>${esc(x.locationName)}</strong><span>${esc(x.lifecycleState)} · ${x.completedStages}/${x.totalStages} stages · ${x.lifecyclePercent}%${x.session?` · ${esc(x.session.mode)}`:""}</span></div>${!x.session||x.session.status!=="ACTIVE"?`<div class="v4316-actions"><button type="button" data-rdl-start="true">Start day rehearsal</button></div>`:""}<div class="v432-list">${(x.stages||[]).map(st=>`<article data-rdl-stage="${esc(st.stage)}"><strong>${esc(st.state)} · ${esc(st.label)}</strong><span>${st.checks.filter(c=>c.passed).length}/${st.checks.length} prerequisites${st.blockerCount?` · ${st.blockerCount} open`:""}</span>${st.state==="READY_FOR_CHECKPOINT"||st.state==="BLOCKED"?'<button type="button" data-rdl-checkpoint="true">Record checkpoint</button>':""}</article>`).join("")}</div></article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("rdlHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const loc=ev.target.closest("[data-rdl-location]");
    if(!loc)return;
    if(ev.target.closest("[data-rdl-start]")){
      try{await e.start(loc.dataset.rdlLocation,{serviceDate:$("rdlServiceDate").value,shiftLabel:$("rdlShift").value,manager:$("rdlManager").value,note:$("rdlNote").value});await load();}catch(err){$("rdlHeadline").textContent=err.message;}return;
    }
    const stageCard=ev.target.closest("[data-rdl-stage]");
    if(ev.target.closest("[data-rdl-checkpoint]")&&stageCard&&loc.dataset.rdlSession){
      try{await e.checkpoint(loc.dataset.rdlSession,{stage:stageCard.dataset.rdlStage,evidence:$("rdlEvidence").value,overrideReason:$("rdlOverride").value});await load();}catch(err){$("rdlHeadline").textContent=err.message;}
    }
  });
  $("rdlRefresh")?.addEventListener("click",load);
  ["restaurant-day:started","restaurant-day:checkpoint","auth:restored","pilot-proof:configured","technical-activation:authorized"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentRestaurantDayLifecycleCenterModule=createBlueCurrentRestaurantDayLifecycleCenterModule;
})();