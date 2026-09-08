(() => {
  "use strict";

  const ROLLOUT_KEY = "blueCurrent.autonomyRolloutManager.v34.1.6";
  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const GOVERNOR_KEY = "blueCurrent.autonomyPerformanceGovernor.v34.1.5";
  const STORAGE_KEY = "blueCurrent.autonomyIncidentResponseCenter.v34.1.8";
  const byId = id => document.getElementById(id);

  const state = {
    incidents:[],
    history:[],
    selectedId:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.incidents = Array.isArray(stored.incidents) ? stored.incidents : [];
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.selectedId = stored.selectedId || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      incidents:state.incidents,
      history:state.history.slice(-100),
      selectedId:state.selectedId,
      updatedAt:new Date().toISOString()
    }));
  }

  function addHistory(action,detail) {
    state.history.push({
      id:`incident_event_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
  }

  function rolloutData() {
    const stored = read(ROLLOUT_KEY);
    return Array.isArray(stored.rollouts) ? stored.rollouts : [];
  }

  function outcomeData() {
    const stored = read(OUTCOME_KEY);
    return Array.isArray(stored.history) ? stored.history : [];
  }

  function outcomesForDomain(domain) {
    const key = String(domain || "").toLowerCase();
    return outcomeData().filter(item => {
      const text = `${item.title || ""} ${item.note || ""}`.toLowerCase();
      if (key === "executive recovery") {
        return /recovery|commitment|accountability|overdue/.test(text);
      }
      return text.includes(key);
    });
  }

  function detectIncidents() {
    const governor = read(GOVERNOR_KEY);
    const candidates = [];

    rolloutData().forEach(rollout => {
      const outcomes = outcomesForDomain(rollout.domain);
      const underperformed = outcomes.filter(item => item.classification === "underperformed");
      const expected = underperformed.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
      const observed = underperformed.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
      const loss = Math.max(0,expected-observed);

      let severity = null;
      let trigger = "";

      if (governor.emergencyStop && rollout.status !== "rollback") {
        severity = "critical";
        trigger = "System emergency stop is active.";
      } else if (underperformed.length >= 2 && rollout.exposure >= 50) {
        severity = "critical";
        trigger = `${underperformed.length} underperforming outcomes at ${rollout.exposure}% exposure.`;
      } else if (underperformed.length >= 1 && rollout.exposure >= 25) {
        severity = "high";
        trigger = `${underperformed.length} underperforming outcome at ${rollout.exposure}% exposure.`;
      } else if (rollout.status === "paused") {
        severity = "medium";
        trigger = "Deployment is paused pending review.";
      }

      if (!severity) return;

      const incidentId = `incident_${rollout.id}_${severity}`;
      if (state.incidents.some(item =>
        item.fingerprint === incidentId &&
        ["open","contained"].includes(item.status)
      )) return;

      candidates.push({
        id:`autonomy_incident_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        fingerprint:incidentId,
        title:`${rollout.domain} autonomy incident at ${rollout.location}`,
        detail:`${rollout.name}: ${trigger}`,
        severity,
        domain:rollout.domain,
        location:rollout.location,
        rolloutId:rollout.id,
        exposure:Number(rollout.exposure || 0),
        protectedValue:loss,
        owner:severity === "critical" ? "Operations Director" : "Regional Manager",
        status:"open",
        resolutionNote:"",
        detectedAt:new Date().toISOString(),
        containedAt:null,
        resolvedAt:null
      });
    });

    candidates.forEach(item => {
      state.incidents.push(item);
      addHistory("Incident detected",`${item.title} · ${item.severity} severity.`);
    });

    save();
    render();
    byId("autonomyIncidentStatus").textContent =
      candidates.length
        ? `${candidates.length} incident${candidates.length === 1 ? "" : "s"} detected.`
        : "No new incidents detected.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-incidents-detected", {
      detail:{incidents:candidates}
    }));
  }

  function selected() {
    return state.incidents.find(item => item.id === state.selectedId) || null;
  }

  function playbook(item) {
    if (!item) return [];

    const steps = [
      {
        title:"Freeze exposure",
        detail:`Pause ${item.domain} autonomy at ${item.location} and prevent new bounded executions.`
      },
      {
        title:"Preserve evidence",
        detail:"Capture rollout state, recent outcomes, guardrail policy, and affected commitments."
      },
      {
        title:"Assign incident owner",
        detail:`Route the response to ${item.owner} with a documented review deadline.`
      }
    ];

    if (item.severity === "critical") {
      steps.push({
        title:"Activate emergency containment",
        detail:"Move the affected domain to advisory-only operation until the root cause is verified."
      });
    }

    steps.push({
      title:"Verify recovery",
      detail:"Require two successful measured outcomes before resuming or promoting the deployment."
    });

    return steps;
  }

  function renderQueue() {
    const root = byId("autonomyIncidentQueueList");
    root.replaceChildren();

    const incidents = state.incidents
      .slice()
      .sort((a,b) => {
        const rank = {critical:3,high:2,medium:1};
        return (rank[b.severity] || 0)-(rank[a.severity] || 0) ||
          new Date(b.detectedAt)-new Date(a.detectedAt);
      });

    if (!incidents.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-incident-empty";
      empty.textContent = "No autonomy incidents have been detected.";
      root.append(empty);
      return;
    }

    incidents.forEach((item,index) => {
      const card = document.createElement("article");
      card.className = "autonomy-incident-item";
      card.dataset.severity = item.severity;
      card.classList.toggle("is-selected",item.id === state.selectedId);
      card.innerHTML =
        "<span class='autonomy-incident-rank'></span>" +
        "<div class='autonomy-incident-copy'><strong></strong><span></span></div>" +
        "<span class='autonomy-incident-badge'></span>";

      card.querySelector(".autonomy-incident-rank").textContent = String(index+1);
      card.querySelector(".autonomy-incident-copy strong").textContent = item.title;
      card.querySelector(".autonomy-incident-copy span").textContent =
        `${item.location} · ${item.domain} · ${item.exposure}% exposure · ${item.status}`;
      card.querySelector(".autonomy-incident-badge").textContent = item.severity;

      card.addEventListener("click",() => {
        state.selectedId = item.id;
        save();
        render();
      });

      root.append(card);
    });
  }

  function renderInspector() {
    const item = selected();
    const controls = [
      "autonomyIncidentOwner",
      "autonomyIncidentResolutionNote",
      "autonomyIncidentContain",
      "autonomyIncidentResolve",
      "autonomyIncidentOpenDeployment"
    ];
    controls.forEach(id => byId(id).disabled = !item);

    if (!item) {
      byId("autonomyIncidentSelectedTitle").textContent = "Choose an incident";
      byId("autonomyIncidentSelectedDetail").textContent =
        "Select an incident to review severity, affected deployment, containment status, and recommended response.";
      return;
    }

    byId("autonomyIncidentSelectedTitle").textContent = item.title;
    byId("autonomyIncidentSelectedDetail").textContent = item.detail;
    byId("autonomyIncidentSelectedSeverity").textContent =
      item.severity.charAt(0).toUpperCase()+item.severity.slice(1);
    byId("autonomyIncidentSelectedDomain").textContent = item.domain;
    byId("autonomyIncidentSelectedLocation").textContent = item.location;
    byId("autonomyIncidentSelectedStatus").textContent =
      item.status.charAt(0).toUpperCase()+item.status.slice(1);
    byId("autonomyIncidentOwner").value = item.owner;
    byId("autonomyIncidentResolutionNote").value = item.resolutionNote || "";
    byId("autonomyIncidentContain").disabled =
      item.status !== "open";
    byId("autonomyIncidentResolve").disabled =
      !["open","contained"].includes(item.status);
  }

  function renderPlaybook() {
    const root = byId("autonomyIncidentPlaybookList");
    root.replaceChildren();
    const steps = playbook(selected());

    if (!steps.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-incident-empty";
      empty.textContent = "Select an incident to view the response playbook.";
      root.append(empty);
    } else {
      steps.forEach((step,index) => {
        const item = document.createElement("article");
        item.className = "autonomy-incident-playbook-item";
        item.innerHTML = "<b></b><div><strong></strong><span></span></div>";
        item.querySelector("b").textContent = String(index+1);
        item.querySelector("strong").textContent = step.title;
        item.querySelector("span").textContent = step.detail;
        root.append(item);
      });
    }

    byId("autonomyIncidentPlaybookCount").textContent =
      `${steps.length} step${steps.length === 1 ? "" : "s"}`;
  }

  function renderPostmortem() {
    const item = selected();
    if (!item || item.status !== "resolved") {
      byId("autonomyIncidentPostmortemTitle").textContent =
        "No resolved incident selected";
      byId("autonomyIncidentPostmortemDetail").textContent =
        "Resolve an incident to generate a postmortem summary and prevention recommendation.";
      return;
    }

    byId("autonomyIncidentPostmortemTitle").textContent =
      `${item.domain} incident resolved at ${item.location}`;
    byId("autonomyIncidentPostmortemDetail").textContent =
      `${item.title} was contained and resolved by ${item.owner}. Root cause evidence: ${item.detail} Resolution: ${item.resolutionNote || "No resolution note supplied."} Prevention: require two successful measured outcomes before restoring previous exposure.`;
  }

  function renderKPIs() {
    const open = state.incidents.filter(item => item.status === "open");
    const critical = state.incidents.filter(item =>
      item.severity === "critical" && item.status !== "resolved"
    );
    const contained = state.incidents.filter(item => item.status === "contained");
    const resolved = state.incidents.filter(item => item.status === "resolved");
    const protectedValue = state.incidents.reduce(
      (sum,item) => sum+Number(item.protectedValue || 0),0
    );
    const score = Math.max(0,Math.min(100,
      100 - open.length*12 - critical.length*20 - contained.length*5 + resolved.length*2
    ));

    byId("autonomyIncidentOpenCount").textContent = String(open.length);
    byId("autonomyIncidentCriticalCount").textContent = String(critical.length);
    byId("autonomyIncidentContainedCount").textContent = String(contained.length);
    byId("autonomyIncidentResolvedCount").textContent = String(resolved.length);
    byId("autonomyIncidentProtectedValue").textContent =
      `$${protectedValue.toLocaleString()}`;
    byId("autonomyIncidentResponseScore").textContent = String(score);
    byId("autonomyIncidentResponseLabel").textContent =
      critical.length ? "Critical response active" :
      open.length ? "Incident response required" :
      contained.length ? "Containment monitoring" :
      "No active incidents";
    byId("autonomyIncidentResponseScoreCard").dataset.tone =
      critical.length ? "risk" : open.length || contained.length ? "watch" : "stable";
  }

  function containSelected() {
    const item = selected();
    if (!item || item.status !== "open") return;

    item.owner = byId("autonomyIncidentOwner").value;
    item.resolutionNote = byId("autonomyIncidentResolutionNote").value.trim();
    item.status = "contained";
    item.containedAt = new Date().toISOString();

    const rolloutState = read(ROLLOUT_KEY);
    const rollouts = Array.isArray(rolloutState.rollouts)
      ? rolloutState.rollouts
      : [];
    const rollout = rollouts.find(entry => entry.id === item.rolloutId);
    if (rollout && !["rollback","paused"].includes(rollout.status)) {
      rollout.status = "paused";
      rollout.updatedAt = item.containedAt;
      localStorage.setItem(ROLLOUT_KEY,JSON.stringify({
        ...rolloutState,
        rollouts,
        updatedAt:item.containedAt
      }));
    }

    addHistory("Incident contained",`${item.title} contained by ${item.owner}.`);
    save();
    render();
    byId("autonomyIncidentStatus").textContent = "Incident contained.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-incident-contained", {
      detail:{incident:item}
    }));
  }

  function resolveSelected() {
    const item = selected();
    if (!item || !["open","contained"].includes(item.status)) return;

    item.owner = byId("autonomyIncidentOwner").value;
    item.resolutionNote = byId("autonomyIncidentResolutionNote").value.trim();
    item.status = "resolved";
    item.resolvedAt = new Date().toISOString();

    addHistory(
      "Incident resolved",
      `${item.title} resolved by ${item.owner}. ${item.resolutionNote || ""}`.trim()
    );
    save();
    render();
    byId("autonomyIncidentStatus").textContent = "Incident resolved.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-incident-resolved", {
      detail:{incident:item}
    }));
  }

  function renderHistory() {
    const root = byId("autonomyIncidentHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-incident-empty";
      empty.textContent = "Incident-response activity will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-incident-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {
          hour:"numeric",
          minute:"2-digit"
        });
      root.append(item);
    });
  }

  function copyPostmortem() {
    const item = selected();
    if (!item || item.status !== "resolved") {
      byId("autonomyIncidentStatus").textContent =
        "Select a resolved incident first.";
      return;
    }

    const text = [
      "Blue Current Autonomy Incident Postmortem",
      `Incident: ${item.title}`,
      `Severity: ${item.severity}`,
      `Domain: ${item.domain}`,
      `Location: ${item.location}`,
      `Owner: ${item.owner}`,
      `Detected: ${item.detectedAt}`,
      `Contained: ${item.containedAt || "Not recorded"}`,
      `Resolved: ${item.resolvedAt}`,
      "",
      `Trigger: ${item.detail}`,
      `Resolution: ${item.resolutionNote || "No resolution note supplied."}`,
      "Prevention: Require two successful measured outcomes before restoring previous exposure."
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("autonomyIncidentStatus").textContent = "Postmortem copied.";
    }).catch(() => {
      byId("autonomyIncidentStatus").textContent =
        "Copy unavailable in this browser.";
    });
  }

  function render() {
    renderKPIs();
    renderQueue();
    renderInspector();
    renderPlaybook();
    renderPostmortem();
    renderHistory();
    byId("autonomyIncidentResponseUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{
        hour:"numeric",
        minute:"2-digit"
      }).format(new Date())}.`;
  }

  function init() {
    if (!byId("autonomyIncidentResponseCenter")) return;

    load();
    byId("autonomyIncidentDetect")?.addEventListener("click",detectIncidents);
    byId("autonomyIncidentContain")?.addEventListener("click",containSelected);
    byId("autonomyIncidentResolve")?.addEventListener("click",resolveSelected);
    byId("autonomyIncidentOpenDeployment")?.addEventListener("click",() => {
      byId("autonomyDeploymentObservatory")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });
    byId("autonomyIncidentCopyPostmortem")?.addEventListener(
      "click",
      copyPostmortem
    );
    byId("autonomyIncidentClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      renderHistory();
    });

    [
      "bluecurrent:autonomy-outcome-verified",
      "bluecurrent:autonomy-rollout-promoted",
      "bluecurrent:autonomy-rollout-rolled-back",
      "bluecurrent:autonomy-deployment-state-changed",
      "bluecurrent:autonomy-governor-policy-applied"
    ].forEach(name => window.addEventListener(name,detectIncidents));

    window.addEventListener("storage",event => {
      if ([ROLLOUT_KEY,OUTCOME_KEY,GOVERNOR_KEY,STORAGE_KEY].includes(event.key)) {
        load();
        render();
      }
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();