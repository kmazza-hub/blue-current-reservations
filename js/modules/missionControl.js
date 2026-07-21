/** Blue Current Mission Control V15.2 */
function createMissionControlModule(eventBus, appState, motionEngine) {
  const feed = document.getElementById("missionEventFeed");
  if (!feed) return null;

  const definitions = {
    "service:started": ["◉","Service",()=>"Dinner service started",p=>`${p.serviceName||"Dinner service"} is live across the operation.`,"service"],
    "concierge:call-started": ["☎","Concierge",()=>"Incoming call answered",p=>`${p.guestType==="returning"?"Returning guest":"Guest"} connected immediately.`,"call"],
    "guest:recognized": ["◎","Guest intelligence",p=>`${p.guestName||"Guest"} recognized`,p=>`${p.tier||"Guest profile"} · ${(p.preferences||[]).join(" · ")||"Preferences loaded"}`,"recognized"],
    "availability:matched": ["⌁","Inventory",p=>`Table ${p.tableNumber||"—"} matched`,p=>`${p.offeredTime||"Available time"} recovered from constrained inventory.`,"matched"],
    "reservation:confirmed": ["✓","Reservation",p=>`${p.reservation?.guestName||"Guest"} confirmed`,p=>`Table ${p.reservation?.tableNumber||"—"} · Party of ${p.reservation?.partySize||"—"} · ${p.reservation?.reservationTime||"Time confirmed"}`,"confirmed",true],
    "reservation:created": ["+","Host stand",()=>"Reservation added to service",p=>`${p.guestName||"Guest"} is now visible to the host team.`,"synced"],
    "table:assigned": ["▦","Digital Twin",p=>`Table ${p.tableNumber||"—"} reserved`,p=>`Dining room inventory updated for a party of ${p.partySize||"—"}.`,"synced"],
    "occupancy:updated": ["%","Operations",p=>`Occupancy updated to ${p.occupancyPercent||0}%`,()=>"Shared operational state synchronized across every active module.","synced"],
    "executive:updated": ["↗","Executive",()=>"Leadership metrics refreshed",p=>`${Number(p.reservationsToday||0).toLocaleString()} reservations · $${Number(p.estimatedRevenue||0).toLocaleString()} estimated revenue.`,"synced"]
  };

  let eventCount=0, recoveredRevenue=0;
  const setText=(id,value)=>{const el=document.getElementById(id); if(el) el.textContent=value;};
  const time=()=>new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"});

  function setJourney(stage){
    const order=["call","recognized","matched","confirmed","synced"];
    const active=order.indexOf(stage);
    document.querySelectorAll(".mission-journey-step").forEach((el,i)=>{
      el.classList.toggle("is-complete", i<active);
      el.classList.toggle("is-active", i===active);
    });
  }

  function updateAlert(state){
    const occ=Number(state.occupancyPercent||0);
    if(occ>=90){
      setText("missionAlertTitle","Capacity pressure building");
      setText("missionAlertText",`Occupancy is ${occ}%. Protect the next seating window and prioritize flexible inventory.`);
      document.getElementById("missionAiAlert")?.classList.add("is-warning");
    } else if(state.activeGuest?.tier?.toLowerCase().includes("premier")) {
      setText("missionAlertTitle","Premier guest in journey");
      setText("missionAlertText",`${state.activeGuest.guestName} has been recognized. Preferences are synchronized for the host team.`);
      document.getElementById("missionAiAlert")?.classList.remove("is-warning");
    } else {
      setText("missionAlertTitle","Operation stable");
      setText("missionAlertText","All connected modules are synchronized and no immediate intervention is required.");
      document.getElementById("missionAiAlert")?.classList.remove("is-warning");
    }
  }

  function addEvent(name,payload={}){
    const d=definitions[name]; if(!d) return;
    document.getElementById("missionEmptyState")?.remove();
    eventCount++;
    if(name==="reservation:confirmed") recoveredRevenue+=Number(payload.revenueImpact||0);
    const [icon,label,titleFn,detailFn,stage,confirmed]=d;
    const title=titleFn(payload), stamp=time();
    const item=document.createElement("article");
    item.className=`mission-event${confirmed?" is-confirmed":""}`;
    item.innerHTML=`<div class="mission-event-icon" aria-hidden="true">${icon}</div><div class="mission-event-copy"><small>${label}</small><strong>${title}</strong><p>${detailFn(payload)}</p></div><time>${stamp}</time>`;
    feed.append(item); feed.scrollTo({top:feed.scrollHeight,behavior:"smooth"});
    setJourney(stage); setText("missionEventCount",String(eventCount)); setText("missionRevenue",`$${recoveredRevenue.toLocaleString()}`); setText("missionHeadline",title); setText("missionClock",stamp);
  }

  function renderState(state){
    setText("missionService",state.serviceStatus==="live"?"Live":"Closed");
    setText("missionGuest",state.activeGuest?.guestName||"—");
    setText("missionTable",state.activeTable?.tableNumber?`Table ${state.activeTable.tableNumber}`:"—");
    setText("missionReservations",Number(state.reservationsToday||0).toLocaleString());
    setText("missionCalls",Number(state.callsAnswered||0).toLocaleString());
    setText("missionOccupancy",`${Number(state.occupancyPercent||0)}%`);
    setText("missionBrief",state.executiveBrief||"Waiting for dinner service…");
    updateAlert(state);
  }

  const unsubs=Object.keys(definitions).map(name=>eventBus.on(name,p=>addEvent(name,p)));
  unsubs.push(eventBus.on("state:updated",({state})=>renderState(state)));
  unsubs.push(eventBus.on("state:reset",({state})=>renderState(state)));

  function resetFeed(message="Event bus connected"){
    eventCount=0; recoveredRevenue=0; setJourney("");
    feed.innerHTML=`<div class="mission-empty-state" id="missionEmptyState"><span>⌁</span><strong>${message}</strong><p>The next operational event will appear here automatically.</p></div>`;
    setText("missionEventCount","0"); setText("missionRevenue","$0"); setText("missionHeadline","Waiting for the next operational event"); setText("missionClock","Now");
  }
  document.getElementById("missionClear")?.addEventListener("click",()=>resetFeed("Feed cleared"));
  document.getElementById("missionReplay")?.addEventListener("click",()=>{appState.reset(); resetFeed("Replaying live journey"); motionEngine.restart();});
  renderState(appState.getState());
  return {destroy(){unsubs.forEach(fn=>fn?.());}};
}
window.createBlueCurrentMissionControlModule=createMissionControlModule;
