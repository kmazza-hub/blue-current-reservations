(() => {
  "use strict";

  const ROLLOUT_KEY = "blueCurrent.autonomyRolloutManager.v34.1.6";
  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const GOVERNOR_KEY = "blueCurrent.autonomyPerformanceGovernor.v34.1.5";
  const STORAGE_KEY = "blueCurrent.autonomyDeploymentObservatory.v34.1.7";
  const byId = id => document.getElementById(id);

  const state = {
    selectedId:null,
    filter:"all",
    history:[]
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      selectedId:state.selectedId,
      filter:state.filter,
      history:state.history.slice(-100),
      updatedAt:new Date().toISOString()
    }));
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.selectedId = stored.selectedId || null;
    state.filter = stored.filter || "all";
    state.history = Array.isArray(stored.history) ? stored.history : [];
  }

  function addHistory(action,detail) {
    state.history.push({
      id:`deployment_event_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
    save();
  }

  function allRollouts() {
    const stored = read(ROLLOUT_KEY);
    return Array.isArray(stored.rollouts) ? stored.rollouts : [];
  }

  function outcomesForDomain(domain) {
    const stored = read(OUTCOME_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];
    const key = String(domain || "").toLowerCase();

    return history.filter(item => {
      const text = `${item.title || ""} ${item.note || ""}`.toLowerCase();
      if (key === "executive recovery") {
        return /recovery|commitment|accountability|overdue/.test(text);
      }
      return text.includes(key);
    });
  }

  function deploymentMetrics(rollout) {
    const outcomes = outcomesForDomain(rollout.domain);
    const successful = outcomes.filter(item => item.classification === "successful").length;
    const partial = outcomes.filter(item => item.classification === "partial").length;
    const underperformed = outcomes.filter(item => item.classification === "underperformed").length;
    const successRate = outcomes.length
      ? Math.round((successful + partial*.5)/outcomes.length*100)
      : 0;

    const expected = outcomes.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
    const observed = outcomes.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
    const valueDelivery = expected
      ? Math.round(observed/expected*100)
      : successRate;

    const governor = read(GOVERNOR_KEY);
    const emergencyStop = Boolean(governor.emergencyStop);

    let health = "healthy";
    if (
      emergencyStop ||
      rollout.status === "rollback" ||
      underperformed >= 2 ||
      (outcomes.length >= Number(rollout.minOutcomes || 3) &&
       (successRate < Number(rollout.minSuccess || 80)-15 ||
        valueDelivery < Number(rollout.minValue || 85)-20))
    ) {
      health = "critical";
    } else if (
      rollout.status === "paused" ||
      outcomes.length < Number(rollout.minOutcomes || 3) ||
      successRate < Number(rollout.minSuccess || 80) ||
      valueDelivery < Number(rollout.minValue || 85)
    ) {
      health = "watch";
    }

    return {
      outcomes:outcomes.length,
      successful,
      partial,
      underperformed,
      successRate,
      valueDelivery,
      health
    };
  }

  function deployments() {
    return allRollouts().map(rollout => ({
      ...rollout,
      metrics:deploymentMetrics(rollout)
    }));
  }

  function selectedDeployment() {
    return deployments().find(item => item.id === state.selectedId) || null;
  }

  function renderMap() {
    const root = byId("autonomyDeploymentMapList");
    root.replaceChildren();

    const items = deployments().filter(item =>
      state.filter === "all" || item.metrics.health === state.filter
    );

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-deployment-empty";
      empty.textContent = "No deployments match the selected filter.";
      root.append(empty);
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "autonomy-deployment-map-item";
      card.dataset.health = item.metrics.health;
      card.classList.toggle("is-selected",item.id === state.selectedId);
      card.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      card.querySelector("strong").textContent = item.name;
      card.querySelector("span").textContent =
        `${item.location} · ${item.domain} · ${item.exposure}% exposure · ${item.metrics.successRate}% success · ${item.metrics.valueDelivery}% value`;
      card.querySelector("b").textContent = item.metrics.health;

      card.addEventListener("click",() => {
        state.selectedId = item.id;
        save();
        render();
      });

      root.append(card);
    });
  }

  function renderInspector() {
    const item = selectedDeployment();
    const openButton = byId("autonomyDeploymentOpenRollout");
    const pauseButton = byId("autonomyDeploymentPause");

    openButton.disabled = !item;
    pauseButton.disabled = !item || ["rollback","promoted"].includes(item?.status);

    if (!item) {
      byId("autonomyDeploymentSelectedTitle").textContent = "Choose a deployment";
      byId("autonomyDeploymentSelectedDetail").textContent =
        "Select a rollout to review exposure, gate performance, risk trajectory, and the recommended next action.";
      return;
    }

    byId("autonomyDeploymentSelectedTitle").textContent = item.name;
    byId("autonomyDeploymentSelectedDetail").textContent =
      `${item.domain} autonomy at ${item.location} is running at ${item.exposure}% exposure with ${item.metrics.outcomes} verified outcomes.`;
    byId("autonomyDeploymentSelectedHealth").textContent =
      item.metrics.health.charAt(0).toUpperCase()+item.metrics.health.slice(1);
    byId("autonomyDeploymentSelectedExposure").textContent = `${item.exposure}%`;
    byId("autonomyDeploymentSelectedSuccess").textContent = `${item.metrics.successRate}%`;
    byId("autonomyDeploymentSelectedValue").textContent = `${item.metrics.valueDelivery}%`;
    pauseButton.textContent = item.status === "paused" ? "Resume deployment" : "Pause deployment";
  }

  function alerts() {
    const items = [];
    deployments().forEach(item => {
      if (item.metrics.health === "critical") {
        items.push({
          tone:"risk",
          title:`Critical deployment: ${item.name}`,
          detail:`${item.location} · ${item.domain} · ${item.metrics.successRate}% success · ${item.metrics.valueDelivery}% value. Rollback review is recommended.`,
          level:"critical"
        });
      } else if (item.metrics.health === "watch") {
        items.push({
          tone:"watch",
          title:`Watch deployment: ${item.name}`,
          detail:`Evidence or performance is below one or more rollout gates. Hold exposure until the next verified outcome.`,
          level:"watch"
        });
      }
    });

    return items;
  }

  function renderAlerts() {
    const root = byId("autonomyDeploymentAlertList");
    root.replaceChildren();
    const items = alerts();

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-deployment-empty";
      empty.textContent = "No deployment alerts are active.";
      root.append(empty);
    } else {
      items.forEach(entry => {
        const item = document.createElement("article");
        item.className = "autonomy-deployment-alert-item";
        item.dataset.tone = entry.tone;
        item.innerHTML = "<div><strong></strong><span></span></div><b></b>";
        item.querySelector("strong").textContent = entry.title;
        item.querySelector("span").textContent = entry.detail;
        item.querySelector("b").textContent = entry.level;
        root.append(item);
      });
    }

    byId("autonomyDeploymentAlertCount").textContent =
      `${items.length} alert${items.length === 1 ? "" : "s"}`;
  }

  function renderKPIs() {
    const items = deployments().filter(item => item.status !== "rollback");
    const healthy = items.filter(item => item.metrics.health === "healthy").length;
    const watch = items.filter(item => item.metrics.health === "watch").length;
    const critical = items.filter(item => item.metrics.health === "critical").length;
    const exposure = items.length
      ? Math.round(items.reduce((sum,item) => sum+Number(item.exposure || 0),0)/items.length)
      : 0;
    const locations = new Set(items.map(item => item.location)).size;
    const score = items.length
      ? Math.max(0,Math.min(100,85 + healthy*4 - watch*8 - critical*18))
      : 0;

    byId("autonomyDeploymentExposure").textContent = `${exposure}%`;
    byId("autonomyDeploymentHealthy").textContent = String(healthy);
    byId("autonomyDeploymentWatch").textContent = String(watch);
    byId("autonomyDeploymentCritical").textContent = String(critical);
    byId("autonomyDeploymentProtected").textContent = String(locations);
    byId("autonomyDeploymentObservatoryScore").textContent = String(score);
    byId("autonomyDeploymentObservatoryLabel").textContent =
      score >= 85 ? "Deployment portfolio healthy" :
      score >= 65 ? "Deployment attention required" :
      items.length ? "Critical rollout pressure" : "Awaiting rollouts";
    byId("autonomyDeploymentObservatoryScoreCard").dataset.tone =
      score >= 85 ? "stable" : score >= 65 ? "watch" : "risk";
  }

  function renderBrief() {
    const items = deployments();
    const healthy = items.filter(item => item.metrics.health === "healthy");
    const watch = items.filter(item => item.metrics.health === "watch");
    const critical = items.filter(item => item.metrics.health === "critical");

    byId("autonomyDeploymentBriefTitle").textContent =
      critical.length
        ? `${critical.length} deployment${critical.length === 1 ? "" : "s"} require immediate review.`
        : watch.length
          ? `${watch.length} deployment${watch.length === 1 ? "" : "s"} should remain at current exposure.`
          : items.length
            ? "Autonomy deployments are operating within rollout gates."
            : "No deployment brief available";

    byId("autonomyDeploymentBriefDetail").textContent =
      items.length
        ? `${healthy.length} healthy, ${watch.length} watch, and ${critical.length} critical deployments are active. The highest-priority action is ${critical[0]?.name ? `review ${critical[0].name}` : watch[0]?.name ? `hold ${watch[0].name} at current exposure` : "continue measured rollout promotion"}.`
        : "Create and evaluate rollout plans to generate live deployment intelligence.";
  }

  function renderHistory() {
    const root = byId("autonomyDeploymentHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-deployment-empty";
      empty.textContent = "Deployment events will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-deployment-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(item);
    });
  }

  function pauseSelected() {
    const item = selectedDeployment();
    if (!item) return;

    const stored = read(ROLLOUT_KEY);
    const rollouts = Array.isArray(stored.rollouts) ? stored.rollouts : [];
    const target = rollouts.find(rollout => rollout.id === item.id);
    if (!target) return;

    target.status = target.status === "paused" ? "pilot" : "paused";
    target.updatedAt = new Date().toISOString();

    localStorage.setItem(ROLLOUT_KEY,JSON.stringify({
      ...stored,
      rollouts,
      updatedAt:new Date().toISOString()
    }));

    addHistory(
      target.status === "paused" ? "Deployment paused" : "Deployment resumed",
      `${target.name} at ${target.location} is now ${target.status}.`
    );

    byId("autonomyDeploymentStatus").textContent =
      target.status === "paused" ? "Deployment paused." : "Deployment resumed.";
    render();

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-deployment-state-changed", {
      detail:{rollout:target}
    }));
  }

  function copyBrief() {
    const items = deployments();
    const text = [
      "Blue Current Autonomy Deployment Brief",
      `Deployments: ${items.length}`,
      `Average exposure: ${items.length ? Math.round(items.reduce((sum,item)=>sum+Number(item.exposure||0),0)/items.length) : 0}%`,
      `Healthy: ${items.filter(item=>item.metrics.health==="healthy").length}`,
      `Watch: ${items.filter(item=>item.metrics.health==="watch").length}`,
      `Critical: ${items.filter(item=>item.metrics.health==="critical").length}`,
      "",
      ...items.map(item =>
        `${item.name} — ${item.location} · ${item.domain} · ${item.exposure}% exposure · ${item.metrics.health} · ${item.metrics.successRate}% success · ${item.metrics.valueDelivery}% value`
      )
    ].join("\n");

    navigator.clipboard?.writeText(text).then(() => {
      byId("autonomyDeploymentStatus").textContent = "Deployment brief copied.";
    }).catch(() => {
      byId("autonomyDeploymentStatus").textContent = "Copy unavailable in this browser.";
    });
  }

  function render() {
    renderKPIs();
    renderMap();
    renderInspector();
    renderAlerts();
    renderBrief();
    renderHistory();
    byId("autonomyDeploymentObservatoryUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function init() {
    if (!byId("autonomyDeploymentObservatory")) return;

    load();
    byId("autonomyDeploymentFilter").value = state.filter;

    byId("autonomyDeploymentFilter")?.addEventListener("change",event => {
      state.filter = event.target.value;
      save();
      renderMap();
    });
    byId("autonomyDeploymentOpenRollout")?.addEventListener("click",() => {
      byId("autonomyRolloutManager")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
    byId("autonomyDeploymentPause")?.addEventListener("click",pauseSelected);
    byId("autonomyDeploymentRefresh")?.addEventListener("click",render);
    byId("autonomyDeploymentCopyBrief")?.addEventListener("click",copyBrief);
    byId("autonomyDeploymentClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      renderHistory();
    });

    [
      "bluecurrent:autonomy-rollout-created",
      "bluecurrent:autonomy-rollout-promoted",
      "bluecurrent:autonomy-rollout-rolled-back",
      "bluecurrent:autonomy-outcome-verified",
      "bluecurrent:autonomy-governor-policy-applied"
    ].forEach(name => window.addEventListener(name,render));

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