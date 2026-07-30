(() => {
  "use strict";

  const KEYS = {
    incidents:"blueCurrent.incidentResponse.v34.0.6",
    eventWall:"blueCurrent.executiveEventWall.v34.0.10",
    decisions:"blueCurrent.executiveDecisionCenter.v34.0.11",
    outcomes:"blueCurrent.decisionOutcomeTracker.v34.0.12",
    retraining:"blueCurrent.retrainingPlannerHistory.v34.0.13.9"
  };

  const byId = id => document.getElementById(id);

  const state = {
    type:"all",
    severity:"all",
    search:"",
    selectedId:null,
    events:[]
  };

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function normalizeSeverity(value) {
    if (value === "critical" || value === "risk" || value === "high") return "critical";
    if (value === "warning" || value === "watch" || value === "medium") return "watch";
    return "info";
  }

  function pushEvent(events,event) {
    if (!event.createdAt) return;
    events.push({
      id:event.id || `timeline_${events.length}_${new Date(event.createdAt).getTime()}`,
      type:event.type || "incident",
      severity:normalizeSeverity(event.severity),
      title:event.title || "Operational event",
      detail:event.detail || "",
      impact:event.impact || "Operational",
      sourceTarget:event.sourceTarget || null,
      createdAt:event.createdAt
    });
  }

  function collect() {
    const events = [];

    const eventWall = read(KEYS.eventWall);
    (Array.isArray(eventWall.events) ? eventWall.events : []).forEach(item => {
      pushEvent(events,{
        id:`wall_${item.id}`,
        type:item.category === "recovery" ? "outcome" :
          item.category === "incident" ? "incident" :
          item.category === "kitchen" || item.category === "floor" || item.category === "guest"
            ? "forecast" : "incident",
        severity:item.tone,
        title:item.title,
        detail:item.detail,
        impact:item.category,
        sourceTarget:item.target,
        createdAt:item.createdAt
      });
    });

    const incidentState = read(KEYS.incidents);
    (Array.isArray(incidentState.incidents) ? incidentState.incidents : []).forEach(item => {
      pushEvent(events,{
        id:`incident_${item.id}`,
        type:"incident",
        severity:item.severity,
        title:item.title,
        detail:item.detail || item.note || "",
        impact:item.status || "Incident",
        sourceTarget:item.sourceTarget || "missionIncidentCenter",
        createdAt:item.detectedAt || item.createdAt
      });
    });

    const decisionState = read(KEYS.decisions);
    (Array.isArray(decisionState.decisions) ? decisionState.decisions : []).forEach(item => {
      pushEvent(events,{
        id:`decision_${item.id}`,
        type:"decision",
        severity:item.urgency === "immediate" ? "critical" :
          item.urgency === "today" ? "watch" : "info",
        title:item.title,
        detail:item.why,
        impact:`$${Number(item.revenueImpact || 0).toLocaleString()} potential impact`,
        sourceTarget:"executiveDecisionCenter",
        createdAt:item.createdAt || item.updatedAt
      });

      if (item.completedAt) {
        pushEvent(events,{
          id:`decision_completed_${item.id}`,
          type:"decision",
          severity:"info",
          title:`Decision approved: ${item.title}`,
          detail:item.note || "Executive recommendation approved.",
          impact:"Approved",
          sourceTarget:"executiveDecisionCenter",
          createdAt:item.completedAt
        });
      }
    });

    const outcomeState = read(KEYS.outcomes);
    (Array.isArray(outcomeState.outcomes) ? outcomeState.outcomes : []).forEach(item => {
      if (item.status !== "measured") return;
      pushEvent(events,{
        id:`outcome_${item.id}`,
        type:"outcome",
        severity:item.classification === "underperformed" ? "critical" :
          item.classification === "partial" ? "watch" : "info",
        title:`Outcome measured: ${item.title}`,
        detail:item.note || `${item.classification} result recorded.`,
        impact:`$${Number(item.observedValue || 0).toLocaleString()} observed`,
        sourceTarget:"decisionOutcomeTracker",
        createdAt:item.recordedAt
      });
    });

    const retrainingState = read(KEYS.retraining);
    (Array.isArray(retrainingState.history) ? retrainingState.history : []).forEach(item => {
      pushEvent(events,{
        id:`maintenance_${item.id}`,
        type:"maintenance",
        severity:item.priority === "High" ? "critical" :
          item.priority === "Medium" ? "watch" : "info",
        title:item.title,
        detail:item.note || `${item.actions?.length || 0} maintenance actions recorded.`,
        impact:`Drift ${item.driftScore}`,
        sourceTarget:"retrainingPlanner",
        createdAt:item.createdAt
      });
    });

    return events.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function filteredEvents() {
    const query = state.search.trim().toLowerCase();

    return state.events.filter(event => {
      if (state.type !== "all" && event.type !== state.type) return false;
      if (state.severity !== "all" && event.severity !== state.severity) return false;
      if (query && !`${event.title} ${event.detail} ${event.impact}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }

  function selectedEvent() {
    return state.events.find(event => event.id === state.selectedId) || null;
  }

  function renderKPIs() {
    const critical = state.events.filter(event => event.severity === "critical").length;
    const decisions = state.events.filter(event => event.type === "decision").length;
    const outcomes = state.events.filter(event => event.type === "outcome").length;
    const plans = state.events.filter(event => event.type === "maintenance").length;

    const score = Math.max(0,Math.min(100,
      100 - critical * 8 - plans * 2 + outcomes * 3
    ));

    byId("executiveTimelineTotal").textContent = String(state.events.length);
    byId("executiveTimelineCritical").textContent = String(critical);
    byId("executiveTimelineDecisions").textContent = String(decisions);
    byId("executiveTimelineOutcomes").textContent = String(outcomes);
    byId("executiveTimelinePlans").textContent = String(plans);
    byId("executiveTimelineSessionScore").textContent = String(score);
    byId("executiveTimelineSessionLabel").textContent =
      score >= 88 ? "Stable session" :
      score >= 70 ? "Controlled pressure" : "Executive review needed";
    byId("executiveTimelineSessionCard").dataset.tone =
      score >= 88 ? "stable" : score >= 70 ? "watch" : "risk";
  }

  function renderList() {
    const root = byId("executiveTimelineList");
    root.replaceChildren();
    const items = filteredEvents();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "executive-timeline-empty";
      empty.textContent = "No timeline events match the current filters.";
      root.append(empty);
      byId("executiveTimelineVisibleCount").textContent = "0 visible events";
      return;
    }

    items.forEach(event => {
      const item = document.createElement("article");
      item.className = "executive-timeline-item";
      item.dataset.severity = event.severity;
      item.classList.toggle("is-selected",event.id === state.selectedId);

      const marker = document.createElement("span");
      marker.className = "executive-timeline-marker";

      const copy = document.createElement("div");
      copy.className = "executive-timeline-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent = `${event.type} · ${event.severity}`;
      copy.querySelector("strong").textContent = event.title;
      copy.querySelector("p").textContent = event.detail || event.impact;

      const time = document.createElement("time");
      time.className = "executive-timeline-time";
      time.textContent = new Date(event.createdAt).toLocaleTimeString([], {
        hour:"numeric",
        minute:"2-digit"
      });

      item.addEventListener("click",() => {
        state.selectedId = event.id;
        render();
      });

      item.append(marker,copy,time);
      root.append(item);
    });

    byId("executiveTimelineVisibleCount").textContent =
      `${items.length} visible event${items.length === 1 ? "" : "s"}`;
  }

  function renderInspector() {
    const event = selectedEvent();

    if (!event) {
      byId("executiveTimelineSelectedTitle").textContent = "Choose an event";
      byId("executiveTimelineSelectedDetail").textContent =
        "Select a timeline event to review its cause, impact, and related source.";
      ["executiveTimelineSelectedType","executiveTimelineSelectedSeverity","executiveTimelineSelectedTime","executiveTimelineSelectedImpact"]
        .forEach(id => byId(id).textContent = "—");
      byId("executiveTimelineOpenSource").disabled = true;
      return;
    }

    byId("executiveTimelineSelectedTitle").textContent = event.title;
    byId("executiveTimelineSelectedDetail").textContent = event.detail || "No additional detail.";
    byId("executiveTimelineSelectedType").textContent =
      event.type.charAt(0).toUpperCase() + event.type.slice(1);
    byId("executiveTimelineSelectedSeverity").textContent =
      event.severity.charAt(0).toUpperCase() + event.severity.slice(1);
    byId("executiveTimelineSelectedTime").textContent =
      new Date(event.createdAt).toLocaleString();
    byId("executiveTimelineSelectedImpact").textContent = event.impact;
    byId("executiveTimelineOpenSource").disabled = !event.sourceTarget;
  }

  function render() {
    state.events = collect();

    if (state.selectedId && !state.events.some(event => event.id === state.selectedId)) {
      state.selectedId = null;
    }

    renderKPIs();
    renderList();
    renderInspector();

    byId("executiveTimelineUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function openSource() {
    const event = selectedEvent();
    if (!event?.sourceTarget) return;

    byId(event.sourceTarget)?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  function copyBrief() {
    const items = filteredEvents().slice(0,10);
    const text = [
      "Blue Current Executive Shift Brief",
      `Events: ${state.events.length}`,
      `Critical: ${state.events.filter(event => event.severity === "critical").length}`,
      "",
      ...items.map(event =>
        `${new Date(event.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} — ${event.title}: ${event.detail || event.impact}`
      )
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("executiveTimelineStatus").textContent = "Shift brief copied.";
    }).catch(() => {
      byId("executiveTimelineStatus").textContent = "Copy unavailable in this browser.";
    });
  }

  function init() {
    if (!byId("executiveIntelligenceTimeline")) return;

    byId("executiveTimelineTypeFilter")?.addEventListener("change",event => {
      state.type = event.target.value;
      renderList();
    });

    byId("executiveTimelineSeverityFilter")?.addEventListener("change",event => {
      state.severity = event.target.value;
      renderList();
    });

    byId("executiveTimelineSearch")?.addEventListener("input",event => {
      state.search = event.target.value;
      renderList();
    });

    byId("executiveTimelineRefresh")?.addEventListener("click",render);
    byId("executiveTimelineCopyBrief")?.addEventListener("click",copyBrief);
    byId("executiveTimelineOpenSource")?.addEventListener("click",openSource);

    [
      "bluecurrent:incident-acknowledged",
      "bluecurrent:incident-resolved",
      "bluecurrent:executive-decision-approved",
      "bluecurrent:decision-outcome-recorded",
      "bluecurrent:retraining-plan-created"
    ].forEach(name => window.addEventListener(name,render));

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();