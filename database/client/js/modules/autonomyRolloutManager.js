(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const GOVERNOR_KEY = "blueCurrent.autonomyPerformanceGovernor.v34.1.5";
  const GUARDRAIL_KEY = "blueCurrent.aiBrainAutonomyGuardrails.v34.1.3";
  const STORAGE_KEY = "blueCurrent.autonomyRolloutManager.v34.1.6";
  const byId = id => document.getElementById(id);

  const state = {
    rollouts:[],
    audit:[],
    selectedId:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.rollouts = Array.isArray(stored.rollouts) ? stored.rollouts : [];
    state.audit = Array.isArray(stored.audit) ? stored.audit : [];
    state.selectedId = stored.selectedId || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      rollouts:state.rollouts,
      audit:state.audit.slice(-100),
      selectedId:state.selectedId,
      updatedAt:new Date().toISOString()
    }));
  }

  function addAudit(action,detail) {
    state.audit.push({
      id:`rollout_audit_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
  }

  function outcomesForDomain(domain) {
    const stored = read(OUTCOME_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];
    const text = domain.toLowerCase();

    return history.filter(item => {
      const corpus = `${item.title || ""} ${item.note || ""}`.toLowerCase();
      if (text === "executive recovery") {
        return /recovery|commitment|accountability|overdue/.test(corpus);
      }
      return corpus.includes(text.toLowerCase());
    });
  }

  function evaluateRollout(item) {
    const outcomes = outcomesForDomain(item.domain);
    const successful = outcomes.filter(x => x.classification === "successful").length;
    const partial = outcomes.filter(x => x.classification === "partial").length;
    const underperformed = outcomes.filter(x => x.classification === "underperformed").length;
    const successRate = outcomes.length
      ? Math.round((successful + partial*.5)/outcomes.length*100)
      : 0;

    const expected = outcomes.reduce((sum,x) => sum+Number(x.expectedValue || 0),0);
    const observed = outcomes.reduce((sum,x) => sum+Number(x.observedValue || 0),0);
    const valueDelivery = expected
      ? Math.round(observed/expected*100)
      : successRate;

    const outcomeGate = outcomes.length >= Number(item.minOutcomes);
    const successGate = successRate >= Number(item.minSuccess);
    const valueGate = valueDelivery >= Number(item.minValue);
    const governor = read(GOVERNOR_KEY);
    const emergencyStop = Boolean(governor.emergencyStop);

    let result = "hold";
    let decision = "Collect more evidence";

    if (emergencyStop) {
      result = "rollback";
      decision = "Rollback immediately";
    } else if (outcomeGate && successGate && valueGate && underperformed === 0) {
      result = "promote";
      decision = item.exposure >= 100 ? "Maintain full deployment" : "Increase exposure";
    } else if (outcomeGate && (!successGate || !valueGate || underperformed >= 2)) {
      result = "rollback";
      decision = "Rollback and review";
    }

    return {
      outcomes:outcomes.length,
      successRate,
      valueDelivery,
      underperformed,
      result,
      decision,
      gates:{
        outcomes:outcomeGate,
        success:successGate,
        value:valueGate
      }
    };
  }

  function createRollout() {
    const name = byId("autonomyRolloutName").value.trim();
    if (!name) {
      byId("autonomyRolloutPlanStatus").textContent = "Enter a rollout name.";
      return;
    }

    const item = {
      id:`rollout_${Date.now()}`,
      name,
      domain:byId("autonomyRolloutDomain").value,
      location:byId("autonomyRolloutLocation").value,
      exposure:Number(byId("autonomyRolloutExposure").value || 25),
      minSuccess:Number(byId("autonomyRolloutMinSuccess").value || 80),
      minValue:Number(byId("autonomyRolloutMinValue").value || 85),
      minOutcomes:Number(byId("autonomyRolloutMinOutcomes").value || 3),
      reviewWindow:byId("autonomyRolloutReviewWindow").value,
      status:"pilot",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    state.rollouts.push(item);
    state.selectedId = item.id;
    addAudit(
      "Rollout created",
      `${item.name} launched for ${item.domain} at ${item.location} with ${item.exposure}% exposure.`
    );
    save();
    render();
    byId("autonomyRolloutPlanStatus").textContent = "Rollout plan created.";
    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-rollout-created", {
      detail:{rollout:item}
    }));
  }

  function selected() {
    return state.rollouts.find(item => item.id === state.selectedId) || null;
  }

  function renderList() {
    const root = byId("autonomyRolloutList");
    root.replaceChildren();

    if (!state.rollouts.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-rollout-empty";
      empty.textContent = "No autonomy rollout plans have been created.";
      root.append(empty);
      return;
    }

    state.rollouts
      .slice()
      .sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt))
      .forEach(item => {
        const evaluation = evaluateRollout(item);
        const card = document.createElement("article");
        card.className = "autonomy-rollout-item";
        card.dataset.status = item.status;
        card.classList.toggle("is-selected",item.id === state.selectedId);
        card.innerHTML = "<div><strong></strong><span></span></div><b></b>";
        card.querySelector("strong").textContent = item.name;
        card.querySelector("span").textContent =
          `${item.domain} · ${item.location} · ${item.exposure}% exposure · ${evaluation.outcomes} verified outcomes`;
        card.querySelector("b").textContent = item.status;

        card.addEventListener("click",() => {
          state.selectedId = item.id;
          save();
          render();
        });
        root.append(card);
      });
  }

  function renderSelected() {
    const item = selected();
    const buttons = [
      "autonomyRolloutEvaluate",
      "autonomyRolloutPromote",
      "autonomyRolloutRollback"
    ];
    buttons.forEach(id => byId(id).disabled = !item);

    if (!item) {
      byId("autonomyRolloutSelectedTitle").textContent = "Choose a rollout";
      byId("autonomyRolloutSelectedDetail").textContent =
        "Select a rollout to review its safety gates, measured outcomes, and recommended next step.";
      return;
    }

    const evaluation = evaluateRollout(item);
    byId("autonomyRolloutSelectedTitle").textContent = item.name;
    byId("autonomyRolloutSelectedDetail").textContent =
      `${item.domain} autonomy at ${item.location} is running at ${item.exposure}% exposure. ${evaluation.outcomes} verified outcomes currently support the rollout decision.`;
    byId("autonomyRolloutSelectedStatus").textContent =
      item.status.charAt(0).toUpperCase()+item.status.slice(1);
    byId("autonomyRolloutSelectedExposure").textContent = `${item.exposure}%`;
    byId("autonomyRolloutSelectedGate").textContent =
      `${evaluation.successRate}% success / ${evaluation.valueDelivery}% value`;
    byId("autonomyRolloutSelectedDecision").textContent = evaluation.decision;

    byId("autonomyRolloutPromote").disabled =
      !["promote","hold"].includes(evaluation.result) ||
      item.status === "rollback" ||
      item.exposure >= 100;
    byId("autonomyRolloutRollback").disabled =
      item.status === "rollback";
  }

  function evaluateSelected() {
    const item = selected();
    if (!item) return;
    const result = evaluateRollout(item);
    item.lastEvaluation = result;
    item.updatedAt = new Date().toISOString();
    addAudit(
      "Rollout evaluated",
      `${item.name}: ${result.decision} · ${result.successRate}% success · ${result.valueDelivery}% value delivery.`
    );
    save();
    render();
    byId("autonomyRolloutStatus").textContent = `Gate result: ${result.decision}.`;
  }

  function promoteSelected() {
    const item = selected();
    if (!item) return;

    const previous = item.exposure;
    item.exposure = previous < 25 ? 25 :
      previous < 50 ? 50 :
      previous < 100 ? 100 : 100;
    item.status = item.exposure >= 100 ? "promoted" : "pilot";
    item.updatedAt = new Date().toISOString();

    addAudit(
      "Rollout promoted",
      `${item.name} increased from ${previous}% to ${item.exposure}% exposure.`
    );
    save();
    render();
    byId("autonomyRolloutStatus").textContent =
      `Rollout promoted to ${item.exposure}% exposure.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-rollout-promoted", {
      detail:{rollout:item}
    }));
  }

  function rollbackSelected() {
    const item = selected();
    if (!item) return;

    item.status = "rollback";
    item.exposure = 0;
    item.updatedAt = new Date().toISOString();
    addAudit(
      "Rollout rolled back",
      `${item.name} was rolled back and automatic exposure was set to 0%.`
    );

    const guardrails = read(GUARDRAIL_KEY);
    const policy = {
      ...(guardrails.policy || {}),
      mode:"supervised"
    };
    localStorage.setItem(GUARDRAIL_KEY,JSON.stringify({
      ...guardrails,
      policy,
      updatedAt:new Date().toISOString()
    }));

    save();
    render();
    byId("autonomyRolloutStatus").textContent =
      "Rollout rolled back and autonomy returned to supervised mode.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-rollout-rolled-back", {
      detail:{rollout:item}
    }));
  }

  function renderAudit() {
    const root = byId("autonomyRolloutAuditList");
    root.replaceChildren();

    if (!state.audit.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-rollout-empty";
      empty.textContent = "Rollout activity will appear here.";
      root.append(empty);
      return;
    }

    state.audit.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-rollout-audit-item";
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

  function renderKPIs() {
    const active = state.rollouts.filter(item => item.status === "pilot");
    const promoted = state.rollouts.filter(item => item.status === "promoted");
    const rollbacks = state.rollouts.filter(item => item.status === "rollback");
    const locations = new Set(
      state.rollouts
        .filter(item => item.status !== "rollback")
        .map(item => item.location)
    );
    const domains = new Set(
      state.rollouts
        .filter(item => item.status !== "rollback")
        .map(item => item.domain)
    );
    const promotionReady = state.rollouts.filter(item =>
      evaluateRollout(item).result === "promote" && item.exposure < 100
    ).length;
    const rollbackRequired = state.rollouts.filter(item =>
      evaluateRollout(item).result === "rollback" && item.status !== "rollback"
    ).length;

    const readiness = state.rollouts.length
      ? Math.max(0,Math.min(100,
          72 + promoted.length*7 + promotionReady*4 -
          rollbackRequired*15 - rollbacks.length*4
        ))
      : 0;

    byId("autonomyRolloutActivePilots").textContent = String(active.length);
    byId("autonomyRolloutLocationCount").textContent = String(locations.size);
    byId("autonomyRolloutDomainCount").textContent = String(domains.size);
    byId("autonomyRolloutPromotionCount").textContent = String(promotionReady);
    byId("autonomyRolloutRollbackCount").textContent = String(rollbackRequired);
    byId("autonomyRolloutManagerScore").textContent = String(readiness);
    byId("autonomyRolloutManagerLabel").textContent =
      readiness >= 85 ? "Rollout portfolio healthy" :
      readiness >= 65 ? "Controlled rollout attention" :
      state.rollouts.length ? "Rollback risk detected" : "Awaiting rollout plan";
    byId("autonomyRolloutManagerScoreCard").dataset.tone =
      readiness >= 85 ? "stable" :
      readiness >= 65 ? "watch" : "risk";
  }

  function render() {
    renderKPIs();
    renderList();
    renderSelected();
    renderAudit();
    byId("autonomyRolloutManagerUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function resetForm() {
    byId("autonomyRolloutName").value = "";
    byId("autonomyRolloutDomain").value = "Kitchen";
    byId("autonomyRolloutLocation").selectedIndex = 0;
    byId("autonomyRolloutExposure").value = "25";
    byId("autonomyRolloutMinSuccess").value = "80";
    byId("autonomyRolloutMinValue").value = "85";
    byId("autonomyRolloutMinOutcomes").value = "3";
    byId("autonomyRolloutReviewWindow").value = "three_shifts";
    byId("autonomyRolloutPlanStatus").textContent = "Form reset.";
  }

  function init() {
    if (!byId("autonomyRolloutManager")) return;

    load();
    byId("autonomyRolloutCreate")?.addEventListener("click",createRollout);
    byId("autonomyRolloutResetPlan")?.addEventListener("click",resetForm);
    byId("autonomyRolloutEvaluate")?.addEventListener("click",evaluateSelected);
    byId("autonomyRolloutPromote")?.addEventListener("click",promoteSelected);
    byId("autonomyRolloutRollback")?.addEventListener("click",rollbackSelected);
    byId("autonomyRolloutRefresh")?.addEventListener("click",render);
    byId("autonomyRolloutClearAudit")?.addEventListener("click",() => {
      state.audit = [];
      save();
      renderAudit();
    });

    window.addEventListener("bluecurrent:autonomy-outcome-verified",render);
    window.addEventListener("bluecurrent:autonomy-governor-policy-applied",render);
    window.addEventListener("storage",event => {
      if ([OUTCOME_KEY,GOVERNOR_KEY,GUARDRAIL_KEY,STORAGE_KEY].includes(event.key)) {
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