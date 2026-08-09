(function(){"use strict";
function createBlueCurrentPilotStabilizationExitCenterModule(eventBus,appState){
  const root=document.getElementById("v5165PilotStabilizationExit");
  if(!root||!window.BlueCurrentPilotStabilizationExitEngine)return null;
  const e=new window.BlueCurrentPilotStabilizationExitEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("v5165Status").textContent=s.status||"—";
    $("v5165Ready").textContent=`${locs.filter(x=>x.stabilizationReady).length}/${locs.length}`;
    $("v5165Assessments").textContent=locs.filter(x=>x.latestAssessment).length;
    $("v5165Decisions").textContent=locs.filter(x=>x.exitDecision).length;
    $("v5165Headline").textContent=s.headline||"Pilot stabilization unavailable.";
    $("v5165Dependencies").textContent=`Execution ${s.dependencyStatus?.execution||"—"} · Data integrity ${s.dependencyStatus?.dataIntegrity||"—"} · Executive accuracy ${s.dependencyStatus?.executiveAccuracy||"—"}`;
    $("v5165Locations").innerHTML=locs.map(x=>`<article data-v5165-location="${esc(x.locationId)}"><div><strong>${esc(x.locationName)}</strong><span>${esc(x.stabilizationState)} · ${x.passed}/${x.total} exit gates · healthy recent ${x.healthyRecentObservations} · high/critical ${x.highCriticalIncidents}</span></div><div class="v432-list">${x.checks.map(c=>`<article><strong>${c.passed?"PASS":"OPEN"} · ${esc(c.label)}</strong><span>${esc(c.actual)}</span></article>`).join("")}</div><div class="v4316-actions">${x.executionSession?'<button type="button" data-v5165-assess="true">Record stabilization assessment</button>':""}${x.latestAssessment?'<button type="button" data-v5165-stable="true">STABLE</button><button type="button" data-v5165-extend="true">EXTEND</button><button type="button" data-v5165-rollback="true">ROLLBACK</button>':""}</div></article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("v5165Headline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const loc=ev.target.closest("[data-v5165-location]");if(!loc)return;
    try{
      if(ev.target.closest("[data-v5165-assess]")){
        await e.assess(loc.dataset.v5165Location,{
          operatorConfidence:Number($("v5165Confidence").value||0),
          workflowStability:$("v5165Workflow").value,
          guestImpact:$("v5165GuestImpact").value,
          supportLoad:$("v5165SupportLoad").value,
          windowStart:$("v5165WindowStart").value,
          windowEnd:$("v5165WindowEnd").value,
          evidence:$("v5165Evidence").value,
          note:$("v5165Note").value
        });
      }else if(ev.target.closest("[data-v5165-stable]")){
        await e.decide(loc.dataset.v5165Location,{decision:"STABLE",evidence:$("v5165DecisionEvidence").value,reason:$("v5165DecisionReason").value});
      }else if(ev.target.closest("[data-v5165-extend]")){
        await e.decide(loc.dataset.v5165Location,{decision:"EXTEND",evidence:$("v5165DecisionEvidence").value,reason:$("v5165DecisionReason").value});
      }else if(ev.target.closest("[data-v5165-rollback]")){
        await e.decide(loc.dataset.v5165Location,{decision:"ROLLBACK",evidence:$("v5165DecisionEvidence").value,reason:$("v5165DecisionReason").value});
      }
      await load();
    }catch(err){$("v5165Headline").textContent=err.message;}
  });
  $("v5165Refresh")?.addEventListener("click",load);
  ["pilot-stabilization:assessed","pilot-stabilization:decision","pilot-execution:observed","pilot-execution:decision","management-executive-accuracy:certified","data-integrity:certified","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentPilotStabilizationExitCenterModule=createBlueCurrentPilotStabilizationExitCenterModule;
})();