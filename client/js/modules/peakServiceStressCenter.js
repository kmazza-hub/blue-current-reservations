(function(){"use strict";
function createBlueCurrentPeakServiceStressCenterModule(eventBus,appState){
  const root=document.getElementById("peakServiceStress");
  if(!root||!window.BlueCurrentPeakServiceStressEngine)return null;
  const e=new window.BlueCurrentPeakServiceStressEngine({eventBus,appState}),
    $=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("pssStatus").textContent=s.status||"—";
    $("pssPassed").textContent=s.totals?.passed||0;
    $("pssFailed").textContent=s.totals?.failed||0;
    $("pssOpen").textContent=s.totals?.open||0;
    $("pssHeadline").textContent=s.headline||"Peak-service stress testing unavailable.";
    $("pssLocations").innerHTML=locs.map(x=>`<article data-pss-location="${esc(x.locationId)}"${x.run?` data-pss-run="${esc(x.run.id)}"`:""}><div><strong>${esc(x.locationName)}</strong><span>${esc(x.stressState)} · ${x.passed}/${x.total} PASS · ${x.stressPercent}%</span></div><p>Model: ${x.model.tables} tables · ${x.model.seats} seats · ${x.model.activePeople} active people · ${x.model.kitchenStations} kitchen stations · ${x.model.connectedConnectors} live connectors</p>${!x.run||x.run.status!=="ACTIVE"?'<div class="v4316-actions"><button type="button" data-pss-start="true">Start peak-service rehearsal</button></div>':""}<div class="v432-list">${(x.scenarios||[]).map(sc=>`<article data-pss-scenario="${esc(sc.id)}"><strong>${esc(sc.state)} · ${esc(sc.label)}</strong><span>${sc.prerequisites.filter(p=>p.passed).length}/${sc.prerequisites.length} prerequisites${sc.failure?" · recovery evidence required for PASS":""}</span>${x.run?.status==="ACTIVE"&&(sc.state==="READY"||sc.state==="BLOCKED"||sc.state==="FAIL")?'<button type="button" data-pss-result="true">Record result</button>':""}</article>`).join("")}</div></article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("pssHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const loc=ev.target.closest("[data-pss-location]"); if(!loc)return;
    if(ev.target.closest("[data-pss-start]")){
      try{await e.start(loc.dataset.pssLocation,{targetOccupancyPercent:Number($("pssOccupancy").value||95),reservationBurstCount:Number($("pssBurst").value||25),tableTurnMinutes:Number($("pssTurns").value||55),simulatedLatencyMs:Number($("pssLatency").value||1800),note:$("pssNote").value});await load();}catch(err){$("pssHeadline").textContent=err.message;}return;
    }
    const sc=ev.target.closest("[data-pss-scenario]");
    if(ev.target.closest("[data-pss-result]")&&sc&&loc.dataset.pssRun){
      try{await e.result(loc.dataset.pssRun,{scenarioId:sc.dataset.pssScenario,status:$("pssResultStatus").value,evidence:$("pssEvidence").value,recoveryEvidence:$("pssRecovery").value,overrideReason:$("pssOverride").value,observedLatencyMs:Number($("pssObservedLatency").value||0),observedErrorCount:Number($("pssErrors").value||0),observedDuplicateCount:Number($("pssDuplicates").value||0)});await load();}catch(err){$("pssHeadline").textContent=err.message;}
    }
  });
  $("pssRefresh")?.addEventListener("click",load);
  ["peak-service-stress:started","peak-service-stress:result","restaurant-day:checkpoint","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentPeakServiceStressCenterModule=createBlueCurrentPeakServiceStressCenterModule;
})();