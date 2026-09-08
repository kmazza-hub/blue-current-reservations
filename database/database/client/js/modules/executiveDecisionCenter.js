(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.executiveDecisionCenter.v34.0.11";
  const INCIDENT_KEY = "blueCurrent.incidentResponse.v34.0.6";
  const PLAYBOOK_KEY = "blueCurrent.serviceRecovery.v34.0.7";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const KITCHEN_KEY = "blueCurrent.kitchenExpo.v35.0.8";
  const HANDOFF_KEY = "blueCurrent.serverHandoff.v35.1.0";
  const byId = id => document.getElementById(id);

  const state = {
    filter:"all",
    selectedId:null,
    decisions:[],
    history:[]
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.filter = stored.filter || "all";
    state.selectedId = stored.selectedId || null;
    state.decisions = Array.isArray(stored.decisions) ? stored.decisions : [];
    state.history = Array.isArray(stored.history) ? stored.history : [];
  }

  function snapshot() {
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

    const open = incidents.filter(i => i.status === "open");
    const acknowledged = incidents.filter(i => i.status === "acknowledged");
    const resolved = incidents.filter(i => i.status === "resolved");
    const completed = playbooks.filter(p => p.status === "completed");
    const attentionTables = tables.filter(t => t.status === "attention");
    const occupiedTables = tables.filter(t => t.status === "occupied");

    const lateTickets = tickets.filter(t => {
      const start = t.firedAt || t.createdAt;
      if (!start || t.status === "ready") return false;
      return (Date.now() - new Date(start).getTime()) / 60000 >= Number(t.target || 15);
    });

    const lateHandoffs = handoffs.filter(h => {
      if (!h.readyAt || h.status === "complete") return false;
      return (Date.now() - new Date(h.readyAt).getTime()) / 60000 >= Number(h.qualityWindow || 8);
    });

    return {
      open,acknowledged,resolved,completed,attentionTables,occupiedTables,
      lateTickets,lateHandoffs,tables,tickets,handoffs
    };
  }

  function recommendationSet(s) {
    const decisions = [];

    const critical = s.open.find(i => i.severity === "critical");
    if (critical) {
      decisions.push({
        fingerprint:`critical:${critical.id}`,
        urgency:"immediate",
        title:`Resolve ${critical.title}`,
        why:`A critical exception is open. ${critical.detail}`,
        sourceTarget:critical.sourceTarget || "missionIncidentCenter",
        revenueImpact:450,
        guestImpact:"High",
        laborImpact:"Low",
        estimatedCost:0,
        confidence:96
      });
    }

    if (s.lateTickets.length) {
      decisions.push({
        fingerprint:"kitchen:late-cluster",
        urgency:s.lateTickets.length >= 2 ? "immediate" : "today",
        title:"Rebalance kitchen station coverage",
        why:`${s.lateTickets.length} ticket${s.lateTickets.length === 1 ? " is" : "s are"} beyond target. Moving support to the constrained station should reduce downstream delays.`,
        sourceTarget:"kitchenExpoCommand",
        revenueImpact:s.lateTickets.length * 180,
        guestImpact:"High",
        laborImpact:"Medium",
        estimatedCost:45,
        confidence:89
      });
    }

    if (s.attentionTables.length) {
      decisions.push({
        fingerprint:"floor:attention",
        urgency:s.attentionTables.length >= 2 ? "immediate" : "today",
        title:"Deploy manager-led table recovery",
        why:`${s.attentionTables.length} table${s.attentionTables.length === 1 ? " requires" : "s require"} attention. A coordinated manager touch can protect guest satisfaction and return intent.`,
        sourceTarget:"liveFloorOperationsV2",
        revenueImpact:s.attentionTables.length * 140,
        guestImpact:"High",
        laborImpact:"Low",
        estimatedCost:0,
        confidence:92
      });
    }

    if (s.lateHandoffs.length) {
      decisions.push({
        fingerprint:"handoff:late",
        urgency:"today",
        title:"Assign a dedicated food runner",
        why:`${s.lateHandoffs.length} ready course${s.lateHandoffs.length === 1 ? " has" : "s have"} exceeded the pickup window.`,
        sourceTarget:"serverHandoffCenter",
        revenueImpact:s.lateHandoffs.length * 120,
        guestImpact:"Medium",
        laborImpact:"Medium",
        estimatedCost:35,
        confidence:86
      });
    }

    if (s.occupiedTables.length >= 8) {
      decisions.push({
        fingerprint:"capacity:occupied",
        urgency:"monitor",
        title:"Protect flexible table inventory",
        why:"Current occupancy suggests the next arrival wave may compress table availability.",
        sourceTarget:"liveFloorOperationsV2",
        revenueImpact:260,
        guestImpact:"Medium",
        laborImpact:"Low",
        estimatedCost:0,
        confidence:82
      });
    }

    if (!decisions.length) {
      decisions.push({
        fingerprint:"stable:monitor",
        urgency:"monitor",
        title:"Maintain current operating plan",
        why:"No live condition currently justifies a material operating change.",
        sourceTarget:"liveShiftCommander",
        revenueImpact:0,
        guestImpact:"Stable",
        laborImpact:"Stable",
        estimatedCost:0,
        confidence:94
      });
    }

    return decisions;
  }

  function syncDecisions() {
    const recommendations = recommendationSet(snapshot());

    recommendations.forEach(candidate => {
      const existing = state.decisions.find(item =>
        item.fingerprint === candidate.fingerprint &&
        item.status !== "completed" &&
        item.status !== "dismissed"
      );

      if (existing) {
        Object.assign(existing, candidate, {updatedAt:new Date().toISOString()});
      } else {
        state.decisions.push({
          ...candidate,
          id:`decision_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          status:"open",
          note:"",
          createdAt:new Date().toISOString(),
          updatedAt:new Date().toISOString(),
          approvedAt:null,
          completedAt:null
        });
      }
    });

    if (!state.selectedId && state.decisions[0]) {
      state.selectedId = state.decisions[0].id;
    }

    save();
  }

  function visibleDecisions() {
    if (state.filter === "all") return state.decisions.filter(d => d.status !== "dismissed");
    if (state.filter === "completed") return state.decisions.filter(d => d.status === "completed");
    return state.decisions.filter(d => d.urgency === state.filter && d.status !== "dismissed");
  }

  function selectedDecision() {
    return state.decisions.find(item => item.id === state.selectedId) || null;
  }

  function renderQueue() {
    const root = byId("executiveDecisionQueue");
    root.replaceChildren();

    const rank = {immediate:0,today:1,monitor:2};
    const items = visibleDecisions().slice().sort((a,b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      return (rank[a.urgency] ?? 9) - (rank[b.urgency] ?? 9)
        || b.confidence - a.confidence;
    });

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "executive-decision-empty";
      empty.textContent = "No decisions match this view.";
      root.append(empty);
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "executive-decision-card";
      card.dataset.urgency = item.urgency;
      card.dataset.status = item.status;
      card.classList.toggle("is-selected", item.id === state.selectedId);

      const urgency = document.createElement("span");
      urgency.className = "executive-decision-urgency";
      urgency.textContent = item.status === "completed" ? "Completed" : item.urgency;

      const copy = document.createElement("div");
      copy.className = "executive-decision-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent = `${item.confidence}% confidence`;
      copy.querySelector("strong").textContent = item.title;
      copy.querySelector("p").textContent = item.why;

      const impact = document.createElement("div");
      impact.className = "executive-decision-impact";
      impact.innerHTML = "<strong></strong><span></span>";
      impact.querySelector("strong").textContent = `$${item.revenueImpact.toLocaleString()}`;
      impact.querySelector("span").textContent = "potential impact";

      card.addEventListener("click", () => {
        state.selectedId = item.id;
        save();
        render();
      });

      card.append(urgency,copy,impact);
      root.append(card);
    });
  }

  function renderInspector() {
    const item = selectedDecision();

    if (!item) {
      byId("executiveDecisionSelectedTitle").textContent = "Choose a decision";
      byId("executiveDecisionSelectedWhy").textContent = "No recommendation selected.";
      ["executiveDecisionUrgency","executiveDecisionSelectedConfidence","executiveDecisionRevenueImpact","executiveDecisionGuestImpact","executiveDecisionLaborImpact","executiveDecisionEstimatedCost"]
        .forEach(id => byId(id).textContent = "—");
      byId("executiveDecisionNote").value = "";
      return;
    }

    byId("executiveDecisionSelectedTitle").textContent = item.title;
    byId("executiveDecisionSelectedWhy").textContent = item.why;
    byId("executiveDecisionUrgency").textContent =
      item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1);
    byId("executiveDecisionSelectedConfidence").textContent = `${item.confidence}%`;
    byId("executiveDecisionRevenueImpact").textContent = `$${item.revenueImpact.toLocaleString()}`;
    byId("executiveDecisionGuestImpact").textContent = item.guestImpact;
    byId("executiveDecisionLaborImpact").textContent = item.laborImpact;
    byId("executiveDecisionEstimatedCost").textContent = `$${item.estimatedCost.toLocaleString()}`;
    byId("executiveDecisionNote").value = item.note || "";

    byId("executiveDecisionApprove").disabled =
      item.status === "completed" || item.status === "dismissed";
    byId("executiveDecisionDismiss").disabled =
      item.status === "completed" || item.status === "dismissed";
  }

  function renderForecast() {
    const s = snapshot();
    const confidence = Math.max(70,Math.min(97,90 - s.open.length * 2 + s.resolved.length));
    byId("executiveDecisionForecastConfidence").textContent = `Confidence ${confidence}%`;

    const cards = [
      {
        horizon:"30 minutes",
        title:s.lateTickets.length ? "Kitchen pressure remains elevated" : "Current service remains manageable",
        detail:s.lateTickets.length
          ? "Rebalancing station support is expected to protect ticket times."
          : "No immediate load correction is required."
      },
      {
        horizon:"60 minutes",
        title:s.occupiedTables.length >= 8 ? "Table availability will tighten" : "Table flow should remain stable",
        detail:s.occupiedTables.length >= 8
          ? "Protect flexible inventory and control walk-in pacing."
          : "Normal turn progression is expected."
      },
      {
        horizon:"120 minutes",
        title:s.open.length ? "Unresolved issues may affect late service" : "Late service risk remains low",
        detail:s.open.length
          ? "Close open incidents before labor begins to step down."
          : "Labor and closing pace can follow the current plan."
      }
    ];

    const root = byId("executiveDecisionForecastGrid");
    root.replaceChildren();

    cards.forEach(card => {
      const item = document.createElement("article");
      item.className = "executive-decision-forecast-card";
      item.innerHTML = "<small></small><strong></strong><p></p>";
      item.querySelector("small").textContent = card.horizon;
      item.querySelector("strong").textContent = card.title;
      item.querySelector("p").textContent = card.detail;
      root.append(item);
    });
  }

  function renderHistory() {
    const root = byId("executiveDecisionHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "executive-decision-empty";
      empty.textContent = "Approved decisions and outcomes will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "executive-decision-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.title;
      item.querySelector("span").textContent =
        `${entry.outcome} · Estimated impact $${entry.revenueImpact.toLocaleString()}`;
      item.querySelector("time").textContent =
        new Date(entry.completedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(item);
    });
  }

  function renderKPIs() {
    const active = state.decisions.filter(d => d.status === "open");
    const completed = state.decisions.filter(d => d.status === "completed");
    const protectedRevenue = completed.reduce((sum,d) => sum + d.revenueImpact,0);
    const atRisk = active.reduce((sum,d) => sum + d.revenueImpact,0);
    const recovered = state.history.reduce((sum,d) => sum + d.revenueImpact,0);
    const confidence = active.length
      ? Math.round(active.reduce((sum,d) => sum + d.confidence,0) / active.length)
      : 94;

    const s = snapshot();
    let health = 100
      - s.open.length * 10
      - s.attentionTables.length * 7
      - s.lateTickets.length * 9
      - s.lateHandoffs.length * 6
      + s.resolved.length * 2
      + s.completed.length * 2;
    health = Math.max(0,Math.min(100,health));

    byId("executiveDecisionProtected").textContent = `$${protectedRevenue.toLocaleString()}`;
    byId("executiveDecisionRisk").textContent = `$${atRisk.toLocaleString()}`;
    byId("executiveDecisionRecovered").textContent = `$${recovered.toLocaleString()}`;
    byId("executiveDecisionOpen").textContent = String(active.length);
    byId("executiveDecisionConfidence").textContent = `${confidence}%`;
    byId("executiveDecisionHealthScore").textContent = String(health);
    byId("executiveDecisionHealthLabel").textContent =
      health >= 88 ? "Strong operating position" :
      health >= 72 ? "Controlled operating pressure" : "Executive action required";
    byId("executiveDecisionHealth").dataset.tone =
      health >= 88 ? "stable" : health >= 72 ? "watch" : "risk";
  }

  function approve() {
    const item = selectedDecision();
    if (!item || item.status !== "open") return;

    item.note = byId("executiveDecisionNote").value.trim();
    item.status = "completed";
    item.approvedAt = new Date().toISOString();
    item.completedAt = new Date().toISOString();

    state.history.push({
      id:`history_${Date.now()}`,
      title:item.title,
      outcome:"Approved and recorded",
      revenueImpact:item.revenueImpact,
      completedAt:item.completedAt,
      note:item.note
    });

    save();
    render();

    byId("executiveDecisionStatus").textContent =
      `${item.title} approved.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:executive-decision-approved", {
      detail:{ decision:{...item} }
    }));
  }

  function dismiss() {
    const item = selectedDecision();
    if (!item || item.status !== "open") return;

    item.note = byId("executiveDecisionNote").value.trim();
    item.status = "dismissed";
    save();

    state.selectedId =
      state.decisions.find(d => d.status === "open")?.id || null;
    save();
    render();

    byId("executiveDecisionStatus").textContent =
      `${item.title} dismissed.`;
  }

  function openSource() {
    const item = selectedDecision();
    if (!item?.sourceTarget) return;
    byId(item.sourceTarget)?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function render() {
    syncDecisions();
    renderKPIs();
    renderQueue();
    renderInspector();
    renderForecast();
    renderHistory();

    byId("executiveDecisionUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function bind() {
    byId("executiveDecisionFilter").addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("executiveDecisionNote").addEventListener("change", () => {
      const item = selectedDecision();
      if (!item) return;
      item.note = byId("executiveDecisionNote").value.trim();
      save();
    });

    byId("executiveDecisionApprove").addEventListener("click", approve);
    byId("executiveDecisionDismiss").addEventListener("click", dismiss);
    byId("executiveDecisionOpenSource").addEventListener("click", openSource);

    byId("executiveDecisionClearHistory").addEventListener("click", () => {
      state.history = [];
      save();
      render();
    });

    [
      "bluecurrent:incident-acknowledged",
      "bluecurrent:incident-resolved",
      "bluecurrent:playbook-completed",
      "bluecurrent:table-manager-flagged",
      "bluecurrent:kitchen-ticket-updated",
      "bluecurrent:server-ready-notified"
    ].forEach(name => window.addEventListener(name,render));
  }

  function init() {
    if (!byId("executiveDecisionCenter")) return;
    load();
    byId("executiveDecisionFilter").value = state.filter;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();