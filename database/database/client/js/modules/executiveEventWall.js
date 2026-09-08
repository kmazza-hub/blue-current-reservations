(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.executiveEventWall.v34.0.10";
  const INCIDENT_KEY = "blueCurrent.incidentResponse.v34.0.6";
  const PLAYBOOK_KEY = "blueCurrent.serviceRecovery.v34.0.7";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const KITCHEN_KEY = "blueCurrent.kitchenExpo.v35.0.8";
  const HANDOFF_KEY = "blueCurrent.serverHandoff.v35.1.0";

  const byId = id => document.getElementById(id);

  const state = {
    filter:"all",
    paused:false,
    events:[],
    sessionStartedAt:new Date().toISOString(),
    latestPriorityTarget:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      filter:state.filter,
      paused:state.paused,
      events:state.events.slice(-150),
      sessionStartedAt:state.sessionStartedAt
    }));
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.filter = stored.filter || "all";
    state.paused = Boolean(stored.paused);
    state.events = Array.isArray(stored.events) ? stored.events : [];
    state.sessionStartedAt = stored.sessionStartedAt || state.sessionStartedAt;
  }

  function addEvent({category,tone="normal",title,detail,target=null,icon="•",source="Blue Current"}) {
    if (state.paused) return;

    const event = {
      id:`event_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      category,
      tone,
      title,
      detail,
      target,
      icon,
      source,
      createdAt:new Date().toISOString()
    };

    state.events.push(event);
    state.events = state.events.slice(-150);
    save();
    render();
  }

  function synthesizeFromStorage() {
    const incidentState = read(INCIDENT_KEY);
    const playbookState = read(PLAYBOOK_KEY);
    const floorState = read(FLOOR_KEY);
    const kitchenState = read(KITCHEN_KEY);
    const handoffState = read(HANDOFF_KEY);

    const incidents = Array.isArray(incidentState.incidents) ? incidentState.incidents : [];
    const playbooks = Array.isArray(playbookState.runs) ? playbookState.runs : [];
    const tables = Array.isArray(floorState.tables) ? floorState.tables : [];
    const tickets = Array.isArray(kitchenState.tickets) ? kitchenState.tickets : [];
    const handoffs = Array.isArray(handoffState.handoffs) ? handoffState.handoffs : [];

    const critical = incidents.filter(i => i.status !== "resolved" && i.severity === "critical");
    const open = incidents.filter(i => i.status === "open");
    const acknowledged = incidents.filter(i => i.status === "acknowledged");
    const resolved = incidents.filter(i => i.status === "resolved");
    const completed = playbooks.filter(p => p.status === "completed");
    const attention = tables.filter(t => t.status === "attention");
    const lateTickets = tickets.filter(t => {
      const start = t.firedAt || t.createdAt;
      if (!start || t.status === "ready") return false;
      return (Date.now() - new Date(start).getTime()) / 60000 >= Number(t.target || 15);
    });
    const lateHandoffs = handoffs.filter(h => {
      if (!h.readyAt || h.status === "complete") return false;
      return (Date.now() - new Date(h.readyAt).getTime()) / 60000 >= Number(h.qualityWindow || 8);
    });

    state.latestPriorityTarget =
      critical[0]?.sourceTarget ||
      open[0]?.sourceTarget ||
      (lateTickets.length ? "kitchenExpoCommand" : null) ||
      (attention.length ? "liveFloorOperationsV2" : null) ||
      (lateHandoffs.length ? "serverHandoffCenter" : null);

    return {
      critical,open,acknowledged,resolved,completed,attention,lateTickets,lateHandoffs
    };
  }

  function filteredEvents() {
    if (state.filter === "all") return state.events;
    return state.events.filter(event => event.category === state.filter);
  }

  function timeLabel(value) {
    return new Date(value).toLocaleTimeString([], {
      hour:"numeric",
      minute:"2-digit",
      second:"2-digit"
    });
  }

  function renderStream() {
    const root = byId("executiveEventStream");
    root.replaceChildren();

    const events = filteredEvents().slice().reverse();

    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "executive-event-empty";
      empty.textContent = "Waiting for the next live operational event.";
      root.append(empty);
      return;
    }

    events.forEach(event => {
      const item = document.createElement("article");
      item.className = "executive-event-item";
      item.dataset.tone = event.tone;

      const icon = document.createElement("div");
      icon.className = "executive-event-icon";
      icon.textContent = event.icon;

      const copy = document.createElement("div");
      copy.className = "executive-event-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent = `${event.source} · ${event.category}`;
      copy.querySelector("strong").textContent = event.title;
      copy.querySelector("p").textContent = event.detail;

      const time = document.createElement("time");
      time.className = "executive-event-time";
      time.textContent = timeLabel(event.createdAt);

      if (event.target) {
        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
          byId(event.target)?.scrollIntoView({behavior:"smooth",block:"start"});
        });
      }

      item.append(icon,copy,time);
      root.append(item);
    });
  }

  function renderPatterns(snapshot) {
    const patterns = [];

    if (snapshot.critical.length) {
      patterns.push({
        title:"Critical events are clustering",
        detail:`${snapshot.critical.length} unresolved critical event${snapshot.critical.length === 1 ? "" : "s"} require executive attention.`
      });
    }

    if (snapshot.lateTickets.length && snapshot.lateHandoffs.length) {
      patterns.push({
        title:"Kitchen delay is reaching the dining room",
        detail:"Late production and delayed pickup are occurring simultaneously."
      });
    }

    if (snapshot.attention.length >= 2) {
      patterns.push({
        title:"Dining-room pressure is spreading",
        detail:`${snapshot.attention.length} tables currently require manager attention.`
      });
    }

    if (snapshot.resolved.length || snapshot.completed.length) {
      patterns.push({
        title:"Recovery actions are working",
        detail:`${snapshot.resolved.length + snapshot.completed.length} incident or playbook outcome${snapshot.resolved.length + snapshot.completed.length === 1 ? "" : "s"} completed.`
      });
    }

    if (!patterns.length) {
      patterns.push({
        title:"No negative pattern detected",
        detail:"The event stream remains within normal operating variance."
      });
    }

    const root = byId("executiveEventPatternList");
    root.replaceChildren();

    patterns.slice(0,3).forEach(pattern => {
      const item = document.createElement("article");
      item.className = "executive-event-pattern";
      item.innerHTML = "<strong></strong><span></span>";
      item.querySelector("strong").textContent = pattern.title;
      item.querySelector("span").textContent = pattern.detail;
      root.append(item);
    });
  }

  function renderInsight(snapshot) {
    if (snapshot.critical.length) {
      byId("executiveEventInsightTitle").textContent =
        "Critical operating events require immediate attention.";
      byId("executiveEventInsightDetail").textContent =
        `${snapshot.critical.length} critical condition${snapshot.critical.length === 1 ? "" : "s"} remain unresolved. Open the highest-priority source now.`;
    } else if (snapshot.open.length || snapshot.lateTickets.length || snapshot.attention.length) {
      byId("executiveEventInsightTitle").textContent =
        "Pressure is building across live operations.";
      byId("executiveEventInsightDetail").textContent =
        "The current event pattern suggests manager intervention before the next reservation wave.";
    } else {
      byId("executiveEventInsightTitle").textContent =
        "Operation is stable.";
      byId("executiveEventInsightDetail").textContent =
        "No event pattern currently requires executive intervention.";
    }
  }

  function renderKPIs(snapshot) {
    const criticalCount = state.events.filter(event => event.tone === "critical").length;
    const recoveredCount = state.events.filter(event => event.tone === "recovered").length;
    const elapsedHours = Math.max(
      1 / 60,
      (Date.now() - new Date(state.sessionStartedAt).getTime()) / 3600000
    );
    const velocity = Math.round(state.events.length / elapsedHours);

    byId("executiveWallSessionCount").textContent = String(state.events.length);
    byId("executiveCriticalEventCount").textContent = String(criticalCount);
    byId("executiveRecoveredEventCount").textContent = String(recoveredCount);
    byId("executiveEventVelocity").textContent = `${velocity}/hr`;

    byId("executiveEventWallPause").textContent =
      state.paused ? "Resume feed" : "Pause feed";

    byId("executiveEventWallUpdated").textContent =
      `${state.paused ? "Paused" : "Live"} · Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function render() {
    const snapshot = synthesizeFromStorage();
    renderKPIs(snapshot);
    renderStream();
    renderPatterns(snapshot);
    renderInsight(snapshot);
  }

  function exportBriefing() {
    const text = [
      `Blue Current Executive Event Briefing`,
      byId("executiveEventInsightTitle").textContent,
      byId("executiveEventInsightDetail").textContent,
      `Events: ${byId("executiveWallSessionCount").textContent}`,
      `Critical: ${byId("executiveCriticalEventCount").textContent}`,
      `Recovered: ${byId("executiveRecoveredEventCount").textContent}`
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("executiveEventStatus").textContent = "Executive briefing copied.";
    }).catch(() => {
      byId("executiveEventStatus").textContent = "Copy unavailable in this browser.";
    });
  }

  function bindEventSources() {
    window.addEventListener("bluecurrent:incident-acknowledged", event => {
      const incident = event.detail?.incident || {};
      addEvent({
        category:"incident",
        tone:"warning",
        icon:"!",
        source:"Incident Center",
        title:`${incident.title || "Incident"} acknowledged`,
        detail:`Owner: ${incident.owner || "Unassigned"}.`,
        target:"missionIncidentCenter"
      });
    });

    window.addEventListener("bluecurrent:incident-resolved", event => {
      const incident = event.detail?.incident || {};
      addEvent({
        category:"recovery",
        tone:"recovered",
        icon:"✓",
        source:"Incident Center",
        title:`${incident.title || "Incident"} resolved`,
        detail:incident.note || "Operational condition returned within target.",
        target:"missionIncidentCenter"
      });
    });

    window.addEventListener("bluecurrent:playbook-started", event => {
      const playbook = event.detail?.playbook || {};
      addEvent({
        category:"recovery",
        tone:"warning",
        icon:"▶",
        source:"Recovery Playbooks",
        title:`${playbook.title || "Recovery playbook"} started`,
        detail:`Assigned to ${playbook.assignedTo || playbook.owner || "manager"}.`,
        target:"serviceRecoveryCenter"
      });
    });

    window.addEventListener("bluecurrent:playbook-completed", event => {
      const playbook = event.detail?.playbook || {};
      addEvent({
        category:"recovery",
        tone:"recovered",
        icon:"✓",
        source:"Recovery Playbooks",
        title:`${playbook.title || "Recovery playbook"} completed`,
        detail:"All recovery steps were completed.",
        target:"serviceRecoveryCenter"
      });
    });

    window.addEventListener("bluecurrent:table-manager-flagged", event => {
      const table = event.detail?.table || {};
      addEvent({
        category:"floor",
        tone:"warning",
        icon:"▦",
        source:"Dining Room",
        title:`${table.name || "Table"} flagged for manager attention`,
        detail:`${table.guests || 0} guests · ${table.server || "Unassigned server"}.`,
        target:"liveFloorOperationsV2"
      });
    });

    window.addEventListener("bluecurrent:kitchen-ticket-updated", event => {
      const ticket = event.detail?.ticket || {};
      addEvent({
        category:"kitchen",
        tone:ticket.status === "ready" ? "recovered" : "normal",
        icon:"◆",
        source:"Kitchen",
        title:`${ticket.tableName || "Ticket"} marked ${ticket.status || "updated"}`,
        detail:`${ticket.course || "Course"} · ${ticket.station || "Kitchen"} station.`,
        target:"kitchenExpoCommand"
      });
    });

    window.addEventListener("bluecurrent:server-ready-notified", event => {
      const route = event.detail?.route || event.detail?.handoff || {};
      addEvent({
        category:"floor",
        tone:"warning",
        icon:"↗",
        source:"Server Handoff",
        title:`${route.server || "Server"} notified`,
        detail:`${route.tableName || "Ready course"} is awaiting pickup.`,
        target:"serverHandoffCenter"
      });
    });

    window.addEventListener("bluecurrent:party-seated", event => {
      const party = event.detail?.party || event.detail || {};
      addEvent({
        category:"guest",
        tone:"normal",
        icon:"◎",
        source:"Host Stand",
        title:`${party.guestName || "Guest party"} seated`,
        detail:`${party.tableName || party.tableNumber || "Table assigned"}.`,
        target:"liveFloorOperationsV2"
      });
    });
  }

  function init() {
    if (!byId("executiveEventWall")) return;

    load();
    byId("executiveEventWallFilter").value = state.filter;

    byId("executiveEventWallFilter").addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("executiveEventWallPause").addEventListener("click", () => {
      state.paused = !state.paused;
      save();
      render();
    });

    byId("executiveEventWallClear").addEventListener("click", () => {
      state.events = [];
      state.sessionStartedAt = new Date().toISOString();
      save();
      render();
    });

    byId("executiveEventOpenPriority").addEventListener("click", () => {
      if (!state.latestPriorityTarget) {
        byId("executiveEventStatus").textContent = "No active priority requires navigation.";
        return;
      }
      byId(state.latestPriorityTarget)?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    byId("executiveEventExport").addEventListener("click", exportBriefing);

    bindEventSources();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();