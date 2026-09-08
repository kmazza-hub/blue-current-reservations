(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.incidentResponse.v34.0.6";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const KITCHEN_KEY = "blueCurrent.kitchenExpo.v35.0.8";
  const HANDOFF_KEY = "blueCurrent.serverHandoff.v35.1.0";
  const byId = id => document.getElementById(id);

  const state = {
    filter:"open",
    selectedId:null,
    incidents:[]
  };

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.filter = stored.filter || "open";
    state.selectedId = stored.selectedId || null;
    state.incidents = Array.isArray(stored.incidents) ? stored.incidents : [];
    detectIncidents();
  }

  function upsertIncident(candidate) {
    const existing = state.incidents.find(item =>
      item.fingerprint === candidate.fingerprint &&
      item.status !== "resolved"
    );

    if (existing) {
      existing.title = candidate.title;
      existing.detail = candidate.detail;
      existing.severity = candidate.severity;
      existing.sourceTarget = candidate.sourceTarget;
      existing.lastSeenAt = new Date().toISOString();
      return;
    }

    state.incidents.push({
      ...candidate,
      id:`incident_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      status:"open",
      owner:"",
      note:"",
      detectedAt:new Date().toISOString(),
      acknowledgedAt:null,
      resolvedAt:null
    });
  }

  function detectIncidents() {
    const floor = read(FLOOR_KEY);
    const kitchen = read(KITCHEN_KEY);
    const handoff = read(HANDOFF_KEY);

    const tables = Array.isArray(floor.tables) ? floor.tables : [];
    const tickets = Array.isArray(kitchen.tickets) ? kitchen.tickets : [];
    const handoffs = Array.isArray(handoff.handoffs) ? handoff.handoffs : [];

    tables
      .filter(table => table.status === "attention")
      .forEach(table => upsertIncident({
        fingerprint:`floor:${table.id}`,
        source:"Dining room",
        sourceTarget:"liveFloorOperationsV2",
        severity:"warning",
        title:`${table.name || "Table"} needs manager attention`,
        detail:`${table.guests || 0} guests · ${table.server || "Unassigned server"} · ${table.stage || "service"} stage`
      }));

    tickets.forEach(ticket => {
      const start = ticket.firedAt || ticket.createdAt;
      if (!start || ticket.status === "ready") return;
      const age = (Date.now() - new Date(start).getTime()) / 60000;
      const target = Number(ticket.target || 15);

      if (age >= target) {
        upsertIncident({
          fingerprint:`kitchen:${ticket.id}`,
          source:"Kitchen",
          sourceTarget:"kitchenExpoCommand",
          severity:age >= target * 1.5 ? "critical" : "warning",
          title:`${ticket.tableName || "Ticket"} is beyond kitchen target`,
          detail:`${ticket.course || "Course"} · ${ticket.station || "Station"} · ${Math.round(age)} min old`
        });
      }
    });

    handoffs.forEach(item => {
      if (item.status === "complete" || !item.readyAt) return;
      const age = (Date.now() - new Date(item.readyAt).getTime()) / 60000;
      const target = Number(item.qualityWindow || 8);

      if (age >= target) {
        upsertIncident({
          fingerprint:`handoff:${item.id}`,
          source:"Server handoff",
          sourceTarget:"serverHandoffCenter",
          severity:age >= target * 1.5 ? "critical" : "warning",
          title:`${item.tableName || "Ready course"} pickup is late`,
          detail:`${item.course || "Course"} · ${item.server || "Unassigned server"} · ${Math.round(age)} min ready`
        });
      }
    });

    if (!state.selectedId && state.incidents[0]) {
      state.selectedId = state.incidents[0].id;
    }

    save();
  }

  function visibleIncidents() {
    if (state.filter === "all") return state.incidents;
    return state.incidents.filter(item => item.status === state.filter);
  }

  function selectedIncident() {
    return state.incidents.find(item => item.id === state.selectedId) || null;
  }

  function ageLabel(dateValue) {
    if (!dateValue) return "—";
    const minutes = Math.max(0, Math.round((Date.now() - new Date(dateValue).getTime()) / 60000));
    if (minutes < 1) return "Now";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} hr`;
  }

  function updateCounts() {
    byId("missionIncidentOpen").textContent =
      String(state.incidents.filter(item => item.status === "open").length);
    byId("missionIncidentAcknowledged").textContent =
      String(state.incidents.filter(item => item.status === "acknowledged").length);
    byId("missionIncidentResolved").textContent =
      String(state.incidents.filter(item => item.status === "resolved").length);
  }

  function renderList() {
    const list = byId("missionIncidentList");
    list.replaceChildren();

    const incidents = visibleIncidents().sort((a,b) => {
      const severityRank = {critical:0,warning:1,info:2};
      return severityRank[a.severity] - severityRank[b.severity]
        || new Date(b.detectedAt) - new Date(a.detectedAt);
    });

    if (!incidents.length) {
      const empty = document.createElement("div");
      empty.className = "mission-incident-empty";
      empty.textContent = "No incidents match this view.";
      list.append(empty);
      return;
    }

    incidents.forEach(item => {
      const card = document.createElement("article");
      card.className = "mission-incident-card";
      card.dataset.severity = item.severity;
      card.classList.toggle("is-selected", item.id === state.selectedId);

      const marker = document.createElement("span");
      marker.className = "mission-incident-marker";

      const copy = document.createElement("div");
      copy.className = "mission-incident-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent =
        `${item.source} · ${item.status}`;
      copy.querySelector("strong").textContent = item.title;
      copy.querySelector("p").textContent = item.detail;

      const age = document.createElement("span");
      age.className = "mission-incident-age";
      age.textContent = ageLabel(item.detectedAt);

      card.addEventListener("click", () => {
        state.selectedId = item.id;
        save();
        render();
      });

      card.append(marker, copy, age);
      list.append(card);
    });
  }

  function renderInspector() {
    const item = selectedIncident();

    if (!item) {
      byId("missionIncidentSelectedTitle").textContent = "Choose an incident";
      byId("missionIncidentSelectedStatus").textContent = "No incident selected";
      ["missionIncidentSource","missionIncidentSeverity","missionIncidentDetected","missionIncidentOwner"]
        .forEach(id => byId(id).textContent = "—");
      byId("missionIncidentOwnerSelect").value = "";
      byId("missionIncidentNote").value = "";
      return;
    }

    byId("missionIncidentSelectedTitle").textContent = item.title;
    byId("missionIncidentSelectedStatus").textContent =
      `${item.status} · ${item.detail}`;
    byId("missionIncidentSource").textContent = item.source;
    byId("missionIncidentSeverity").textContent =
      item.severity.charAt(0).toUpperCase() + item.severity.slice(1);
    byId("missionIncidentDetected").textContent = ageLabel(item.detectedAt);
    byId("missionIncidentOwner").textContent = item.owner || "Unassigned";
    byId("missionIncidentOwnerSelect").value = item.owner || "";
    byId("missionIncidentNote").value = item.note || "";

    byId("missionIncidentAcknowledge").disabled =
      item.status === "acknowledged" || item.status === "resolved";
    byId("missionIncidentResolve").disabled = item.status === "resolved";
  }

  function render() {
    detectIncidents();
    updateCounts();
    renderList();
    renderInspector();
    byId("missionIncidentCenterUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function persistInspector() {
    const item = selectedIncident();
    if (!item) return;

    item.owner = byId("missionIncidentOwnerSelect").value;
    item.note = byId("missionIncidentNote").value.trim();
    save();
    render();
  }

  function acknowledge() {
    const item = selectedIncident();
    if (!item || item.status === "resolved") return;

    item.owner = byId("missionIncidentOwnerSelect").value || item.owner;
    item.note = byId("missionIncidentNote").value.trim();
    item.status = "acknowledged";
    item.acknowledgedAt = new Date().toISOString();
    save();
    render();

    byId("missionIncidentStatus").textContent =
      `${item.title} acknowledged.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:incident-acknowledged", {
      detail:{ incident:{...item} }
    }));
  }

  function resolve() {
    const item = selectedIncident();
    if (!item) return;

    item.owner = byId("missionIncidentOwnerSelect").value || item.owner;
    item.note = byId("missionIncidentNote").value.trim();
    item.status = "resolved";
    item.resolvedAt = new Date().toISOString();
    save();
    render();

    byId("missionIncidentStatus").textContent =
      `${item.title} resolved.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:incident-resolved", {
      detail:{ incident:{...item} }
    }));
  }

  function openSource() {
    const item = selectedIncident();
    if (!item?.sourceTarget) return;

    byId(item.sourceTarget)?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  function bind() {
    byId("missionIncidentFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("missionIncidentRefresh")?.addEventListener("click", render);
    byId("missionIncidentOwnerSelect")?.addEventListener("change", persistInspector);
    byId("missionIncidentNote")?.addEventListener("change", persistInspector);
    byId("missionIncidentAcknowledge")?.addEventListener("click", acknowledge);
    byId("missionIncidentResolve")?.addEventListener("click", resolve);
    byId("missionIncidentOpenSource")?.addEventListener("click", openSource);

    [
      "bluecurrent:table-manager-flagged",
      "bluecurrent:kitchen-ticket-updated",
      "bluecurrent:server-ready-notified",
      "bluecurrent:party-seated",
      "bluecurrent:table-cleared"
    ].forEach(name => window.addEventListener(name, render));
  }

  function init() {
    if (!byId("missionIncidentCenter")) return;
    load();
    byId("missionIncidentFilter").value = state.filter;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
