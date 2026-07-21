/**
 * Blue Current Mission Control
 * A derived operational view of Event Bus activity and shared App State.
 */
function createMissionControlModule(eventBus, appState, motionEngine) {
  const feed = document.getElementById("missionEventFeed");
  if (!feed) return null;

  const eventDefinitions = {
    "service:started": {
      icon: "◉",
      label: "Service",
      title: () => "Dinner service started",
      detail: (payload) => `${payload.serviceName || "Service"} is live across the operation.`
    },
    "concierge:call-started": {
      icon: "☎",
      label: "Concierge",
      title: () => "Incoming call answered",
      detail: (payload) => `${payload.guestType === "returning" ? "Returning guest" : "Guest"} call ${payload.phoneNumber || ""} connected immediately.`
    },
    "guest:recognized": {
      icon: "◎",
      label: "Guest intelligence",
      title: (payload) => `${payload.guestName || "Guest"} recognized`,
      detail: (payload) => `${payload.tier || "Guest profile"} · ${(payload.preferences || []).join(" · ") || "Preferences loaded"}`
    },
    "availability:matched": {
      icon: "⌁",
      label: "Inventory",
      title: (payload) => `Table ${payload.tableNumber || "—"} matched`,
      detail: (payload) => `${payload.offeredTime || "Available time"} recovered from constrained inventory.`
    },
    "reservation:confirmed": {
      icon: "✓",
      label: "Reservation",
      title: (payload) => `${payload.reservation?.guestName || "Guest"} confirmed`,
      detail: (payload) => `Table ${payload.reservation?.tableNumber || "—"} · Party of ${payload.reservation?.partySize || "—"} · ${payload.reservation?.reservationTime || "Time confirmed"}`,
      confirmed: true
    },
    "reservation:created": {
      icon: "+",
      label: "Host stand",
      title: () => "Reservation added to service",
      detail: (payload) => `${payload.guestName || "Guest"} is now visible to the host team.`
    },
    "table:assigned": {
      icon: "▦",
      label: "Digital Twin",
      title: (payload) => `Table ${payload.tableNumber || "—"} reserved`,
      detail: (payload) => `Dining room inventory updated for a party of ${payload.partySize || "—"}.`
    },
    "occupancy:updated": {
      icon: "%",
      label: "Operations",
      title: (payload) => `Occupancy updated to ${payload.occupancyPercent || 0}%`,
      detail: () => "Shared operational state synchronized across every active module."
    },
    "executive:updated": {
      icon: "↗",
      label: "Executive",
      title: () => "Leadership metrics refreshed",
      detail: (payload) => `${Number(payload.reservationsToday || 0).toLocaleString()} reservations · $${Number(payload.estimatedRevenue || 0).toLocaleString()} estimated revenue.`
    }
  };

  let eventCount = 0;
  let recoveredRevenue = 0;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const formatTime = () => new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });

  function addEvent(eventName, payload = {}) {
    const definition = eventDefinitions[eventName];
    if (!definition) return;

    document.getElementById("missionEmptyState")?.remove();
    eventCount += 1;

    if (eventName === "reservation:confirmed") {
      recoveredRevenue += Number(payload.revenueImpact || 0);
    }

    const item = document.createElement("article");
    item.className = `mission-event${definition.confirmed ? " is-confirmed" : ""}`;

    const title = typeof definition.title === "function" ? definition.title(payload) : definition.title;
    const detail = typeof definition.detail === "function" ? definition.detail(payload) : definition.detail;
    const timestamp = formatTime();

    item.innerHTML = `
      <div class="mission-event-icon" aria-hidden="true">${definition.icon}</div>
      <div class="mission-event-copy">
        <small>${definition.label}</small>
        <strong>${title}</strong>
        <p>${detail}</p>
      </div>
      <time>${timestamp}</time>
    `;

    feed.append(item);
    feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });

    setText("missionEventCount", String(eventCount));
    setText("missionRevenue", `$${recoveredRevenue.toLocaleString()}`);
    setText("missionHeadline", title);
    setText("missionClock", timestamp);
  }

  function renderState(state) {
    setText("missionService", state.serviceStatus === "live" ? "Live" : "Closed");
    setText("missionGuest", state.activeGuest?.guestName || "—");
    setText("missionTable", state.activeTable?.tableNumber ? `Table ${state.activeTable.tableNumber}` : "—");
    setText("missionReservations", Number(state.reservationsToday || 0).toLocaleString());
    setText("missionCalls", Number(state.callsAnswered || 0).toLocaleString());
    setText("missionOccupancy", `${Number(state.occupancyPercent || 0)}%`);
    setText("missionBrief", state.executiveBrief || "Waiting for dinner service…");
  }

  const unsubscribers = Object.keys(eventDefinitions).map((eventName) =>
    eventBus.on(eventName, (payload) => addEvent(eventName, payload))
  );

  unsubscribers.push(eventBus.on("state:updated", ({ state }) => renderState(state)));
  unsubscribers.push(eventBus.on("state:reset", ({ state }) => renderState(state)));

  document.getElementById("missionClear")?.addEventListener("click", () => {
    eventCount = 0;
    recoveredRevenue = 0;
    feed.innerHTML = `
      <div class="mission-empty-state" id="missionEmptyState">
        <span>⌁</span>
        <strong>Feed cleared</strong>
        <p>The next operational event will appear here automatically.</p>
      </div>`;
    setText("missionEventCount", "0");
    setText("missionRevenue", "$0");
    setText("missionHeadline", "Waiting for the next operational event");
    setText("missionClock", "Now");
  });

  document.getElementById("missionReplay")?.addEventListener("click", () => {
    appState.reset();
    eventCount = 0;
    recoveredRevenue = 0;
    feed.innerHTML = `
      <div class="mission-empty-state" id="missionEmptyState">
        <span>⌁</span>
        <strong>Replaying live journey</strong>
        <p>Mission Control is listening to the Event Bus.</p>
      </div>`;
    setText("missionEventCount", "0");
    setText("missionRevenue", "$0");
    motionEngine.restart();
  });

  renderState(appState.getState());

  return {
    destroy() {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    }
  };
}

window.createBlueCurrentMissionControlModule = createMissionControlModule;
