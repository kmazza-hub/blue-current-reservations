(function(){"use strict";
function createBlueCurrentReservationGuestJourneyCenterModule(eventBus,appState){
  const root=document.getElementById("reservationGuestJourney");
  if(!root||!window.BlueCurrentReservationGuestJourneyEngine)return null;
  const e=new window.BlueCurrentReservationGuestJourneyEngine({eventBus,appState}),$=id=>document.getElementById(id),
    esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function render(s){
    const locs=s.locations||[];
    $("rgjStatus").textContent=s.status||"—";
    $("rgjSystemEvidence").textContent=`${locs.reduce((n,x)=>n+x.systemEvidencePassed,0)}/${locs.reduce((n,x)=>n+x.totalStages,0)}`;
    $("rgjHumanEvidence").textContent=`${locs.reduce((n,x)=>n+x.completedStages,0)}/${locs.reduce((n,x)=>n+x.totalStages,0)}`;
    $("rgjCertified").textContent=locs.filter(x=>x.journeyState==="JOURNEY_CERTIFIED").length;
    $("rgjHeadline").textContent=s.headline||"Reservation/guest journey unavailable.";
    $("rgjLocations").innerHTML=locs.map(x=>`<article data-rgj-location="${esc(x.locationId)}"${x.session?` data-rgj-session="${esc(x.session.id)}"`:""}><div><strong>${esc(x.locationName)}</strong><span>${esc(x.journeyState)} · ${x.completedStages}/${x.totalStages} human checkpoints · ${x.systemEvidencePassed}/${x.totalStages} system evidence</span></div><p>Reservations ${x.modelSummary.reservations} · Events ${x.modelSummary.reservationEvents} · Waitlist ${x.modelSummary.waitlist} · Seating events ${x.modelSummary.seatingEvents} · Guest profiles ${x.modelSummary.guestProfiles} · Recovery ${x.modelSummary.recoveryEngagements}</p>${!x.session||x.session.status!=="ACTIVE"?'<div class="v4316-actions"><button type="button" data-rgj-start="true">Start guest journey rehearsal</button></div>':""}<div class="v432-list">${x.stages.map(st=>`<article data-rgj-stage="${esc(st.stage)}"><strong>${esc(st.state)} · ${esc(st.label)}</strong><span>${st.systemEvidence?"system evidence present":"system evidence gap"}</span>${x.session?.status==="ACTIVE"&&(st.state==="READY_FOR_CHECKPOINT"||st.state==="EVIDENCE_GAP")?'<button type="button" data-rgj-checkpoint="true">Record checkpoint</button>':""}</article>`).join("")}</div>${x.completedStages===x.totalStages&&x.journeyState!=="JOURNEY_CERTIFIED"?'<div class="v4316-actions"><button type="button" data-rgj-certify="true">Certify end-to-end journey</button></div>':""}</article>`).join("")||"<article><strong>No in-scope restaurants.</strong></article>";
  }
  async function load(){try{render(await e.snapshot());}catch(err){$("rgjHeadline").textContent=err.message;}}
  root.addEventListener("click",async ev=>{
    const loc=ev.target.closest("[data-rgj-location]");if(!loc)return;
    try{
      if(ev.target.closest("[data-rgj-start]")){
        await e.start(loc.dataset.rgjLocation,{guestName:$("rgjGuest").value,phone:$("rgjPhone").value,occasion:$("rgjOccasion").value,note:$("rgjNote").value});
      }else if(ev.target.closest("[data-rgj-certify]")){
        await e.certify(loc.dataset.rgjLocation,{evidence:$("rgjCertificationEvidence").value,note:$("rgjCertificationNote").value});
      }else{
        const st=ev.target.closest("[data-rgj-stage]");
        if(st&&ev.target.closest("[data-rgj-checkpoint]")&&loc.dataset.rgjSession){
          await e.checkpoint(loc.dataset.rgjSession,{stage:st.dataset.rgjStage,evidence:$("rgjEvidence").value,overrideReason:$("rgjOverride").value});
        }
      }
      await load();
    }catch(err){$("rgjHeadline").textContent=err.message;}
  });
  $("rgjRefresh")?.addEventListener("click",load);
  ["reservation-guest-journey:started","reservation-guest-journey:checkpoint","reservation-guest-journey:certified","reservation:created","reservation:updated","reservation:seated","guest:recovery-completed","auth:restored"].forEach(x=>eventBus?.on?.(x,load));
  load();return{engine:e,load};
}
window.createBlueCurrentReservationGuestJourneyCenterModule=createBlueCurrentReservationGuestJourneyCenterModule;
})();