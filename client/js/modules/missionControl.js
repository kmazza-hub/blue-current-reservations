/** Blue Current Mission Control V34.0.5 */
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
    "executive:updated": ["↗","Executive",()=>"Leadership metrics refreshed",p=>`${Number(p.reservationsToday||0).toLocaleString()} reservations · $${Number(p.estimatedRevenue||0).toLocaleString()} estimated revenue.`,"synced"],
    "guest:arrived": ["↘","Host stand",p=>`${p.guestName||"Guest"} arrived`,p=>`Arrival recognized for Table ${p.tableNumber||"—"}.`,"synced"],
    "guest:seated": ["▦","Dining room",p=>`${p.guestName||"Guest"} seated`,p=>`Table ${p.tableNumber||"—"} transitioned into active service.`,"synced"],
    "dining:started": ["✦","Experience",()=>"Dining experience underway",p=>`${p.guestName||"Guest"} is now in the active dining journey.`,"synced"],
    "followup:scheduled": ["↗","Guest relationship",()=>"Follow-up scheduled",p=>`${p.channel||"SMS"} outreach will continue the guest relationship.`,"synced"],
    "table:manager-flagged": ["!","Manager",p=>`${p.table?.name||"Table"} needs attention`,p=>"Service timing exceeded the target and manager follow-up was requested.","synced",false,true],
    "server-ready-notified": ["↗","Handoff",p=>`${p.route?.server||p.handoff?.server||"Server"} notified`,p=>`${p.route?.tableName||p.handoff?.tableName||"Ready course"} is waiting for pickup.`,"synced",false,true],
    "kitchen-ticket-updated": ["◆","Kitchen",p=>`${p.ticket?.tableName||"Kitchen ticket"} marked ${p.ticket?.status||"updated"}`,p=>`${p.ticket?.course||"Course"} · ${p.ticket?.station||"Kitchen"} station.`,"synced"]
  };

  let eventCount = 0;
  let recoveredRevenue = 0;
  let incidentCount = 0;
  let latestPriorityTarget = null;

  const setText = (id,value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const time = () => new Date().toLocaleTimeString([], {
    hour:"numeric",
    minute:"2-digit",
    second:"2-digit"
  });

  function readStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function collectOperationalSnapshot(state) {
    const floor = readStorage("blueCurrent.liveFloorOperations.v35.0.3");
    const kitchen = readStorage("blueCurrent.kitchenExpo.v35.0.8");
    const handoff = readStorage("blueCurrent.serverHandoff.v35.1.0");

    const tables = Array.isArray(floor.tables) ? floor.tables : [];
    const tickets = Array.isArray(kitchen.tickets) ? kitchen.tickets : [];
    const handoffs = Array.isArray(handoff.handoffs) ? handoff.handoffs : [];

    const attentionTables = tables.filter(table => table.status === "attention");
    const lateTickets = tickets.filter(ticket => {
      if (!ticket.createdAt) return false;
      const age = Math.max(0,(Date.now() - new Date(ticket.firedAt || ticket.createdAt).getTime()) / 60000);
      return ticket.status !== "ready" && age >= Number(ticket.target || 15);
    });
    const lateHandoffs = handoffs.filter(item => {
      if (item.status === "complete" || !item.readyAt) return false;
      return (Date.now() - new Date(item.readyAt).getTime()) / 60000 >= Number(item.qualityWindow || 8);
    });

    const occupancy = Number(state.occupancyPercent || 0);
    const activeIncidents = attentionTables.length + lateTickets.length + lateHandoffs.length;
    const actionQueue = activeIncidents + (occupancy >= 90 ? 1 : 0);

    let tone = "stable";
    if (activeIncidents >= 3 || occupancy >= 95) tone = "risk";
    else if (activeIncidents >= 1 || occupancy >= 85) tone = "watch";

    return {
      attentionTables,
      lateTickets,
      lateHandoffs,
      occupancy,
      activeIncidents,
      actionQueue,
      tone
    };
  }

  function renderCommandWall(state) {
    const snapshot = collectOperationalSnapshot(state);

    setText("missionIncidentCount", String(snapshot.activeIncidents));
    setText(
      "missionIncidentSummary",
      snapshot.activeIncidents
        ? `${snapshot.attentionTables.length} floor · ${snapshot.lateTickets.length} kitchen · ${snapshot.lateHandoffs.length} handoff`
        : "No active incidents."
    );

    setText("missionAttentionTables", String(snapshot.attentionTables.length));
    setText(
      "missionAttentionSummary",
      snapshot.attentionTables.length
        ? `${snapshot.attentionTables[0].name || "A table"} is the highest floor priority.`
        : "Dining room flow is normal."
    );

    const kitchenRisk =
      snapshot.lateTickets.length >= 2 ? "High" :
      snapshot.lateTickets.length === 1 ? "Watch" : "Low";
    setText("missionKitchenRisk", kitchenRisk);
    setText(
      "missionKitchenRiskDetail",
      snapshot.lateTickets.length
        ? `${snapshot.lateTickets.length} ticket${snapshot.lateTickets.length === 1 ? "" : "s"} beyond target.`
        : "Ticket routing is within target."
    );

    setText("missionActionQueue", String(snapshot.actionQueue));

    const pressureBadge = document.getElementById("missionPressureBadge");
    if (pressureBadge) {
      pressureBadge.dataset.tone = snapshot.tone;
      pressureBadge.textContent =
        snapshot.tone === "risk" ? "High risk" :
        snapshot.tone === "watch" ? "Watch" : "Stable";
    }

    if (snapshot.tone === "risk") {
      setText("missionCriticalWindow","Immediate intervention");
      setText("missionCriticalWindowDetail","Operational pressure is above the safe target. Open the highest-priority workflow now.");
    } else if (snapshot.tone === "watch") {
      setText("missionCriticalWindow","Next 20 minutes");
      setText("missionCriticalWindowDetail","Floor or kitchen pressure is building. Prepare the next operational response.");
    } else {
      setText("missionCriticalWindow","7:00–7:30 PM");
      setText("missionCriticalWindowDetail","Arrival volume and kitchen demand are projected to overlap.");
    }

    latestPriorityTarget =
      snapshot.attentionTables.length ? "liveFloorOperationsV2" :
      snapshot.lateTickets.length ? "kitchenExpoCommand" :
      snapshot.lateHandoffs.length ? "serverHandoffCenter" :
      snapshot.occupancy >= 90 ? "waitlistEngine" : null;

    const priorityButton = document.getElementById("missionOpenPriority");
    if (priorityButton) priorityButton.disabled = !latestPriorityTarget;

    incidentCount = snapshot.activeIncidents;
    updateRecommendations(snapshot);
  }

  function updateRecommendations(snapshot) {
    const list = document.getElementById("missionRecommendationList");
    if (!list) return;

    const recommendations = [];

    if (snapshot.attentionTables.length) {
      recommendations.push({
        tone:"critical",
        title:`Inspect ${snapshot.attentionTables[0].name || "attention table"}`,
        detail:"Service timing is outside target. Confirm the server and next course."
      });
    }

    if (snapshot.lateTickets.length) {
      recommendations.push({
        tone:"warning",
        title:"Relieve kitchen bottleneck",
        detail:`${snapshot.lateTickets.length} ticket${snapshot.lateTickets.length === 1 ? " is" : "s are"} beyond target.`
      });
    }

    if (snapshot.lateHandoffs.length) {
      recommendations.push({
        tone:"warning",
        title:"Escalate food pickup",
        detail:`${snapshot.lateHandoffs.length} ready course${snapshot.lateHandoffs.length === 1 ? " has" : "s have"} exceeded the quality window.`
      });
    }

    if (snapshot.occupancy >= 90) {
      recommendations.push({
        tone:"warning",
        title:"Protect the next seating window",
        detail:`Occupancy is ${snapshot.occupancy}%. Hold flexible inventory for the next arrival wave.`
      });
    }

    setText("missionRecommendationCount", String(recommendations.length));
    list.replaceChildren();

    if (!recommendations.length) {
      const empty = document.createElement("p");
      empty.className = "mission-no-recommendations";
      empty.textContent = "No intervention required.";
      list.append(empty);
      return;
    }

    recommendations.forEach(rec => {
      const item = document.createElement("article");
      item.className = `mission-recommendation ${rec.tone}`;
      item.innerHTML = "<strong></strong><p></p>";
      item.querySelector("strong").textContent = rec.title;
      item.querySelector("p").textContent = rec.detail;
      list.append(item);
    });
  }

  function setJourney(stage) {
    const order = ["call","recognized","matched","confirmed","synced"];
    const active = order.indexOf(stage);
    document.querySelectorAll(".mission-journey-step").forEach((el,i) => {
      el.classList.toggle("is-complete", i < active);
      el.classList.toggle("is-active", i === active);
    });
  }

  function updateAlert(state) {
    const snapshot = collectOperationalSnapshot(state);

    if (snapshot.activeIncidents >= 2) {
      setText("missionAlertTitle","Multiple operational issues require attention");
      setText("missionAlertText",`${snapshot.activeIncidents} live conditions are outside target. Open the highest-priority workflow.`);
      document.getElementById("missionAiAlert")?.classList.add("is-warning");
    } else if (snapshot.occupancy >= 90) {
      setText("missionAlertTitle","Capacity pressure building");
      setText("missionAlertText",`Occupancy is ${snapshot.occupancy}%. Protect the next seating window and prioritize flexible inventory.`);
      document.getElementById("missionAiAlert")?.classList.add("is-warning");
    } else if (state.activeGuest?.tier?.toLowerCase().includes("premier")) {
      setText("missionAlertTitle","Premier guest in journey");
      setText("missionAlertText",`${state.activeGuest.guestName} has been recognized. Preferences are synchronized for the host team.`);
      document.getElementById("missionAiAlert")?.classList.remove("is-warning");
    } else {
      setText("missionAlertTitle","Operation stable");
      setText("missionAlertText","All connected modules are synchronized and no immediate intervention is required.");
      document.getElementById("missionAiAlert")?.classList.remove("is-warning");
    }
  }

  function addEvent(name,payload={}) {
    const d = definitions[name];
    if (!d) return;

    document.getElementById("missionEmptyState")?.remove();
    eventCount++;

    if (name === "reservation:confirmed") {
      recoveredRevenue += Number(payload.revenueImpact || 0);
    }

    const [icon,label,titleFn,detailFn,stage,confirmed,incident] = d;
    const title = titleFn(payload);
    const stamp = time();
    const item = document.createElement("article");

    item.className =
      `mission-event${confirmed ? " is-confirmed" : ""}${incident ? " is-incident" : ""}`;
    item.innerHTML =
      `<div class="mission-event-icon" aria-hidden="true">${icon}</div>` +
      `<div class="mission-event-copy"><small>${label}</small><strong>${title}</strong><p>${detailFn(payload)}</p></div>` +
      `<time>${stamp}</time>`;

    feed.append(item);
    feed.scrollTo({top:feed.scrollHeight,behavior:"smooth"});

    setJourney(stage);
    setText("missionEventCount",String(eventCount));
    setText("missionRevenue",`$${recoveredRevenue.toLocaleString()}`);
    setText("missionHeadline",title);
    setText("missionClock",stamp);

    if (incident) incidentCount++;
    renderCommandWall(appState.getState());
  }

  function renderState(state) {
    setText("missionService",state.serviceStatus === "live" ? "Live" : "Closed");
    setText("missionGuest",state.activeGuest?.guestName || "—");
    setText("missionTable",state.activeTable?.tableNumber ? `Table ${state.activeTable.tableNumber}` : "—");
    setText("missionReservations",Number(state.reservationsToday || 0).toLocaleString());
    setText("missionCalls",Number(state.callsAnswered || 0).toLocaleString());
    setText("missionOccupancy",`${Number(state.occupancyPercent || 0)}%`);
    setText("missionBrief",state.executiveBrief || "Waiting for dinner service…");
    updateAlert(state);
    renderCommandWall(state);
  }

  const unsubs = Object.keys(definitions).map(name => eventBus.on(name,p => addEvent(name,p)));
  unsubs.push(eventBus.on("state:updated",({state}) => renderState(state)));
  unsubs.push(eventBus.on("state:reset",({state}) => renderState(state)));

  function resetFeed(message="Event bus connected") {
    eventCount = 0;
    recoveredRevenue = 0;
    incidentCount = 0;
    setJourney("");
    feed.innerHTML =
      `<div class="mission-empty-state" id="missionEmptyState"><span>⌁</span><strong>${message}</strong>` +
      `<p>The next operational event will appear here automatically.</p></div>`;
    setText("missionEventCount","0");
    setText("missionRevenue","$0");
    setText("missionHeadline","Waiting for the next operational event");
    setText("missionClock","Now");
    renderCommandWall(appState.getState());
  }

  document.getElementById("missionClear")?.addEventListener("click",() => resetFeed("Feed cleared"));
  document.getElementById("missionReplay")?.addEventListener("click",() => {
    appState.reset();
    resetFeed("Replaying live journey");
    motionEngine.restart();
  });

  document.getElementById("missionOpenPriority")?.addEventListener("click",() => {
    if (!latestPriorityTarget) return;
    document.getElementById(latestPriorityTarget)?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  });

  renderState(appState.getState());

  return {
    destroy() {
      unsubs.forEach(fn => fn?.());
    }
  };
}

window.createBlueCurrentMissionControlModule = createMissionControlModule;
