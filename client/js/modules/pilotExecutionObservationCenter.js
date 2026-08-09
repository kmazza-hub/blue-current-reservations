(function(){"use strict";
function createBlueCurrentPilotExecutionObservationCenterModule(eventBus,appState){
  const root=document.getElementById("v5160PilotExecutionObservation");
  if(!root||!window.BlueCurrentPilotExecutionObservationEngine)return null;
  const e=new window.BlueCurrentPilotExecutionObservationEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("v5160Status").textContent=s.status||"—";
    $("v5160Active").textContent=locs.filter(x=>x.session?.status==="ACTIVE").length;
    $("v5160Milestones").textContent=`${locs.reduce((n,x)=>n+x.confirmedMilestones,0)}/${locs.reduce((n,x)=>n+x.totalMilestones,0)}`;
    $("v5160Incidents").textContent=locs.reduce((n,x)=>n+x.highCriticalIncidents,0);
    $("v5160Headline").textContent=s.headline||"Pilot execution observation unavailable.";
    $("v5160Locations").innerHTML=locs.map(x=>`<article data-v5160-location="${esc(x.locationId)}"${x.session?` data-v5160-session="${esc(x.session.id)}"`:""}><div><strong>${esc(x.locationName)}</strong><span>${esc(x.executionState)} · ${x.confirmedMilestones}/${x.totalMilestones} milestones · high/critical ${x.highCriticalIncidents}</span></div>${!x.executionReady?'<p>Human launch authorization required before pilot execution can start.</p>':""}${x.executionReady&&!x.session?'<button type="button" data-v5160-start="true">Record pilot start</button>':""}${x.session?.status==="ACTIVE"?`<div class="v432-list">${x.milestones.map(m=>`<article data-v5160-milestone="${esc(m.milestone)}"><strong>${esc(m.status)} · ${esc(m.milestone.replaceAll("_"," "))}</strong>${m.status==="OPEN"&&m.milestone!=="PILOT_START"?'<button type="button" data-v5160-confirm="true">Confirm milestone</button>':""}</article>`).join("")}</div><div class="v4316-actions"><button type="button" data-v5160-observe="true">Record health observation</button><button type="button" data-v5160-continue="true">CONTINUE</button><button type="button" data-v5160-hold="true">HOLD</button><button type="button" data-v5160-rollback="true">ROLLBACK</button></div>`:""}${x.latestObservation?`<p>Latest health: ${Object.values(x.latestObservation.health||{}).filter(Boolean).length}/${Object.keys(x.latestObservation.health||{}).length} · severity ${esc(x.latestObservation.severity)}</p>`:""}</article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("v5160Headline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const loc=ev.target.closest("[data-v5160-location]");if(!loc)return;
    try{
      if(ev.target.closest("[data-v5160-start]")){
        await e.start(loc.dataset.v5160Location,{launchOwner:$("v5160LaunchOwner").value,supportBridge:$("v5160SupportBridge").value,evidence:$("v5160StartEvidence").value,note:$("v5160Note").value});
      }else if(ev.target.closest("[data-v5160-observe]")&&loc.dataset.v5160Session){
        await e.observe(loc.dataset.v5160Session,{severity:$("v5160Severity").value,apiHealthy:$("v5160Api").checked,authenticationHealthy:$("v5160Auth").checked,reservationHealthy:$("v5160Reservation").checked,floorHealthy:$("v5160Floor").checked,kitchenHealthy:$("v5160Kitchen").checked,supportBridgeHealthy:$("v5160Support").checked,incident:$("v5160Incident").value,note:$("v5160ObservationNote").value});
      }else if(ev.target.closest("[data-v5160-continue]")&&loc.dataset.v5160Session){
        await e.decide(loc.dataset.v5160Session,{decision:"CONTINUE",evidence:$("v5160DecisionEvidence").value,reason:$("v5160DecisionReason").value});
      }else if(ev.target.closest("[data-v5160-hold]")&&loc.dataset.v5160Session){
        await e.decide(loc.dataset.v5160Session,{decision:"HOLD",evidence:$("v5160DecisionEvidence").value,reason:$("v5160DecisionReason").value});
      }else if(ev.target.closest("[data-v5160-rollback]")&&loc.dataset.v5160Session){
        await e.decide(loc.dataset.v5160Session,{decision:"ROLLBACK",evidence:$("v5160DecisionEvidence").value,reason:$("v5160DecisionReason").value});
      }else{
        const m=ev.target.closest("[data-v5160-milestone]");
        if(m&&ev.target.closest("[data-v5160-confirm]")&&loc.dataset.v5160Session){
          await e.milestone(loc.dataset.v5160Session,{milestone:m.dataset.v5160Milestone,evidence:$("v5160MilestoneEvidence").value});
        }
      }
      await load();
    }catch(err){$("v5160Headline").textContent=err.message;}
  });
  $("v5160Refresh")?.addEventListener("click",load);
  ["pilot-execution:started","pilot-execution:milestone","pilot-execution:observed","pilot-execution:decision","pilot-launch:authorized","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentPilotExecutionObservationCenterModule=createBlueCurrentPilotExecutionObservationCenterModule;
})();