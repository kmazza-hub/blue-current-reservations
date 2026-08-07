(() => {
  "use strict";

  const INCIDENT_KEY = "blueCurrent.autonomyIncidentResponseCenter.v34.1.8";
  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const ROLLOUT_KEY = "blueCurrent.autonomyRolloutManager.v34.1.6";
  const GUARDRAIL_KEY = "blueCurrent.aiBrainAutonomyGuardrails.v34.1.3";
  const STORAGE_KEY = "blueCurrent.autonomyRecoveryRequalification.v34.1.9";
  const byId = id => document.getElementById(id);

  const state = {
    plans:[],
    history:[],
    selectedId:null
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.plans = Array.isArray(stored.plans) ? stored.plans : [];
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.selectedId = stored.selectedId || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      plans:state.plans,
      history:state.history.slice(-100),
      selectedId:state.selectedId,
      updatedAt:new Date().toISOString()
    }));
  }

  function addHistory(action,detail) {
    state.history.push({
      id:`recovery_event_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
  }

  function incidents() {
    const stored = read(INCIDENT_KEY);
    return Array.isArray(stored.incidents) ? stored.incidents : [];
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

  function importResolvedIncidents() {
    const resolved = incidents().filter(item => item.status === "resolved");
    let added = 0;

    resolved.forEach(incident => {
      if (state.plans.some(plan => plan.incidentId === incident.id)) return;

      state.plans.push({
        id:`recovery_plan_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        incidentId:incident.id,
        rolloutId:incident.rolloutId,
        title:`Recovery plan: ${incident.title}`,
        detail:incident.resolutionNote || incident.detail,
        domain:incident.domain,
        location:incident.location,
        owner:incident.owner || "Operations Director",
        requiredOutcomes:incident.severity === "critical" ? 3 : 2,
        minValue:incident.severity === "critical" ? 95 : 90,
        note:"",
        status:"active",
        createdAt:new Date().toISOString(),
        evaluatedAt:null,
        reinstatedAt:null,
        learningAppliedAt:null
      });
      added += 1;
    });

    if (added) {
      addHistory("Recovery plans imported",`${added} resolved incident${added === 1 ? "" : "s"} converted into requalification plans.`);
    }
    save();
    render();
    byId("autonomyRecoveryStatus").textContent =
      added ? `${added} recovery plan${added === 1 ? "" : "s"} imported.` : "No new resolved incidents were available.";
  }

  function selected() {
    return state.plans.find(item => item.id === state.selectedId) || null;
  }

  function evidence(plan) {
    const outcomes = outcomesForDomain(plan.domain)
      .filter(item => new Date(item.recordedAt || 0) >= new Date(plan.createdAt));

    const successful = outcomes.filter(item => item.classification === "successful");
    const partial = outcomes.filter(item => item.classification === "partial");
    const underperformed = outcomes.filter(item => item.classification === "underperformed");
    const expected = outcomes.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
    const observed = outcomes.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
    const valueDelivery = expected
      ? Math.round(observed/expected*100)
      : 0;

    const successGate = successful.length >= Number(plan.requiredOutcomes || 2);
    const valueGate = valueDelivery >= Number(plan.minValue || 90);
    const failureGate = underperformed.length === 0;
    const ownerGate = Boolean(plan.owner);
    const noteGate = Boolean(String(plan.note || "").trim());

    return {
      outcomes,
      successful,
      partial,
      underperformed,
      valueDelivery,
      gates:{
        success:successGate,
        value:valueGate,
        failure:failureGate,
        owner:ownerGate,
        note:noteGate
      },
      ready:successGate && valueGate && failureGate && ownerGate && noteGate
    };
  }

  function renderPlans() {
    const root = byId("autonomyRecoveryPlanList");
    root.replaceChildren();

    if (!state.plans.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-recovery-empty";
      empty.textContent = "Import resolved incidents to create recovery plans.";
      root.append(empty);
      return;
    }

    state.plans.forEach((plan,index) => {
      const result = evidence(plan);
      const displayStatus =
        plan.status === "reinstated" ? "reinstated" :
        plan.status === "failed" ? "failed" :
        result.ready ? "ready" : "active";

      const card = document.createElement("article");
      card.className = "autonomy-recovery-plan-item";
      card.dataset.status = displayStatus;
      card.classList.toggle("is-selected",plan.id === state.selectedId);
      card.innerHTML =
        "<span class='autonomy-recovery-rank'></span>" +
        "<div class='autonomy-recovery-copy'><strong></strong><span></span></div>" +
        "<span class='autonomy-recovery-badge'></span>";

      card.querySelector(".autonomy-recovery-rank").textContent = String(index+1);
      card.querySelector(".autonomy-recovery-copy strong").textContent = plan.title;
      card.querySelector(".autonomy-recovery-copy span").textContent =
        `${plan.location} · ${plan.domain} · ${result.successful.length}/${plan.requiredOutcomes} successful outcomes · ${result.valueDelivery}% value`;
      card.querySelector(".autonomy-recovery-badge").textContent = displayStatus;

      card.addEventListener("click",() => {
        state.selectedId = plan.id;
        save();
        render();
      });
      root.append(card);
    });
  }

  function renderInspector() {
    const plan = selected();
    const controls = [
      "autonomyRecoveryOwner",
      "autonomyRecoveryRequiredOutcomes",
      "autonomyRecoveryMinValue",
      "autonomyRecoveryNote",
      "autonomyRecoverySave",
      "autonomyRecoveryEvaluate",
      "autonomyRecoveryReinstate"
    ];
    controls.forEach(id => byId(id).disabled = !plan);

    if (!plan) {
      byId("autonomyRecoverySelectedTitle").textContent = "Choose a recovery plan";
      byId("autonomyRecoverySelectedDetail").textContent =
        "Select a plan to define proof requirements, track successful outcomes, and safely restore autonomy.";
      return;
    }

    const result = evidence(plan);
    byId("autonomyRecoverySelectedTitle").textContent = plan.title;
    byId("autonomyRecoverySelectedDetail").textContent =
      `${plan.domain} autonomy at ${plan.location} requires ${plan.requiredOutcomes} successful outcomes and ${plan.minValue}% value delivery before reinstatement.`;
    byId("autonomyRecoveryOwner").value = plan.owner;
    byId("autonomyRecoveryRequiredOutcomes").value = String(plan.requiredOutcomes);
    byId("autonomyRecoveryMinValue").value = String(plan.minValue);
    byId("autonomyRecoveryNote").value = plan.note || "";
    byId("autonomyRecoveryReinstate").disabled =
      !result.ready || plan.status === "reinstated";
    byId("autonomyRecoveryApplyLearning").disabled = false;
  }

  function renderGates() {
    const root = byId("autonomyRecoveryGateList");
    root.replaceChildren();
    const plan = selected();

    if (!plan) {
      const empty = document.createElement("div");
      empty.className = "autonomy-recovery-empty";
      empty.textContent = "Select a recovery plan to view its requalification gates.";
      root.append(empty);
      byId("autonomyRecoveryGateCount").textContent = "0 gates";
      return;
    }

    const result = evidence(plan);
    const gates = [
      {
        title:"Successful outcome requirement",
        detail:`${result.successful.length} of ${plan.requiredOutcomes} successful verified outcomes recorded.`,
        passed:result.gates.success
      },
      {
        title:"Value-delivery requirement",
        detail:`${result.valueDelivery}% observed value delivery versus ${plan.minValue}% required.`,
        passed:result.gates.value
      },
      {
        title:"No repeat underperformance",
        detail:`${result.underperformed.length} underperforming outcomes recorded during recovery.`,
        passed:result.gates.failure
      },
      {
        title:"Accountable recovery owner",
        detail:plan.owner ? `Assigned to ${plan.owner}.` : "No owner assigned.",
        passed:result.gates.owner
      },
      {
        title:"Corrective-action documentation",
        detail:plan.note ? "Recovery note documented." : "Recovery note still required.",
        passed:result.gates.note
      }
    ];

    gates.forEach((gate,index) => {
      const item = document.createElement("article");
      item.className = "autonomy-recovery-gate-item";
      item.innerHTML = "<b></b><div><strong></strong><span></span></div><em></em>";
      item.querySelector("b").textContent = String(index+1);
      item.querySelector("strong").textContent = gate.title;
      item.querySelector("span").textContent = gate.detail;
      item.querySelector("em").textContent = gate.passed ? "passed" : "open";
      root.append(item);
    });

    byId("autonomyRecoveryGateCount").textContent =
      `${gates.length} gates`;
  }

  function renderLearning() {
    const plan = selected();
    if (!plan) {
      byId("autonomyRecoveryLearningTitle").textContent =
        "No recovery plan selected";
      byId("autonomyRecoveryLearningDetail").textContent =
        "Select a recovery plan to generate a preventive policy recommendation.";
      return;
    }

    const result = evidence(plan);
    const repeatFailures = result.underperformed.length;
    const recommendedConfidence = repeatFailures
      ? 95
      : result.valueDelivery >= 100 ? 84 : 90;
    const recommendedValue = repeatFailures
      ? 250
      : Math.max(250,Math.min(1500,Math.round(result.valueDelivery*6/50)*50));

    byId("autonomyRecoveryLearningTitle").textContent =
      repeatFailures
        ? `Tighten ${plan.domain} autonomy after repeat underperformance`
        : `Reinstate ${plan.domain} with learned guardrails`;
    byId("autonomyRecoveryLearningDetail").textContent =
      `Recommended preventive policy: ${recommendedConfidence}% minimum confidence, $${recommendedValue.toLocaleString()} maximum automatic value, and an active rollout plan for ${plan.domain}.`;
  }

  function renderKPIs() {
    const active = state.plans.filter(plan =>
      !["reinstated","failed"].includes(plan.status)
    );
    const ready = active.filter(plan => evidence(plan).ready);
    const reinstated = state.plans.filter(plan => plan.status === "reinstated");
    const repeatFailures = state.plans.filter(plan =>
      evidence(plan).underperformed.length > 0
    );
    const score = state.plans.length
      ? Math.max(0,Math.min(100,
          60 + ready.length*12 + reinstated.length*8 -
          repeatFailures.length*15
        ))
      : 0;

    byId("autonomyRecoveryPlanCount").textContent = String(state.plans.length);
    byId("autonomyRecoveryActiveCount").textContent = String(active.length);
    byId("autonomyRecoveryReadyCount").textContent = String(ready.length);
    byId("autonomyRecoveryReinstatedCount").textContent = String(reinstated.length);
    byId("autonomyRecoveryRepeatFailureCount").textContent = String(repeatFailures.length);
    byId("autonomyRecoveryScore").textContent = String(score);
    byId("autonomyRecoveryLabel").textContent =
      score >= 85 ? "Recovery portfolio healthy" :
      score >= 65 ? "Requalification in progress" :
      state.plans.length ? "Recovery attention required" : "Awaiting resolved incidents";
    byId("autonomyRecoveryScoreCard").dataset.tone =
      score >= 85 ? "stable" :
      score >= 65 ? "watch" : state.plans.length ? "risk" : "watch";
  }

  function saveSelected() {
    const plan = selected();
    if (!plan) return;

    plan.owner = byId("autonomyRecoveryOwner").value;
    plan.requiredOutcomes = Number(byId("autonomyRecoveryRequiredOutcomes").value || 2);
    plan.minValue = Number(byId("autonomyRecoveryMinValue").value || 90);
    plan.note = byId("autonomyRecoveryNote").value.trim();
    plan.updatedAt = new Date().toISOString();

    addHistory("Recovery plan updated",`${plan.title} updated by ${plan.owner}.`);
    save();
    render();
    byId("autonomyRecoveryStatus").textContent = "Recovery plan saved.";
  }

  function evaluateSelected() {
    const plan = selected();
    if (!plan) return;

    const result = evidence(plan);
    plan.evaluatedAt = new Date().toISOString();
    plan.status = result.underperformed.length
      ? "failed"
      : result.ready
        ? "ready"
        : "active";

    addHistory(
      "Recovery gates evaluated",
      `${plan.title}: ${plan.status} · ${result.successful.length}/${plan.requiredOutcomes} successful · ${result.valueDelivery}% value delivery.`
    );
    save();
    render();
    byId("autonomyRecoveryStatus").textContent =
      result.ready
        ? "Recovery gates passed."
        : result.underperformed.length
          ? "Recovery failed due to repeat underperformance."
          : "Recovery remains in progress.";
  }

  function reinstateSelected() {
    const plan = selected();
    if (!plan) return;
    const result = evidence(plan);
    if (!result.ready) return;

    plan.status = "reinstated";
    plan.reinstatedAt = new Date().toISOString();

    const rolloutState = read(ROLLOUT_KEY);
    const rollouts = Array.isArray(rolloutState.rollouts)
      ? rolloutState.rollouts
      : [];
    const rollout = rollouts.find(item => item.id === plan.rolloutId);
    if (rollout) {
      rollout.status = "pilot";
      rollout.exposure = Math.min(25,Number(rollout.exposure || 25) || 25);
      rollout.updatedAt = plan.reinstatedAt;
      localStorage.setItem(ROLLOUT_KEY,JSON.stringify({
        ...rolloutState,
        rollouts,
        updatedAt:plan.reinstatedAt
      }));
    }

    addHistory(
      "Autonomy reinstated",
      `${plan.domain} autonomy at ${plan.location} restored at controlled pilot exposure.`
    );
    save();
    render();
    byId("autonomyRecoveryStatus").textContent =
      "Autonomy reinstated at controlled pilot exposure.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-reinstated", {
      detail:{plan,rollout}
    }));
  }

  function applyLearning() {
    const plan = selected();
    if (!plan) return;

    const result = evidence(plan);
    const repeatFailures = result.underperformed.length;
    const minConfidence = repeatFailures
      ? 95
      : result.valueDelivery >= 100 ? 84 : 90;
    const maxValue = repeatFailures
      ? 250
      : Math.max(250,Math.min(1500,Math.round(result.valueDelivery*6/50)*50));

    const guardrails = read(GUARDRAIL_KEY);
    localStorage.setItem(GUARDRAIL_KEY,JSON.stringify({
      ...guardrails,
      policy:{
        ...(guardrails.policy || {}),
        mode:repeatFailures ? "advisory" : "supervised",
        minConfidence,
        maxValue
      },
      updatedAt:new Date().toISOString()
    }));

    plan.learningAppliedAt = new Date().toISOString();
    addHistory(
      "Preventive learning applied",
      `${plan.domain}: ${minConfidence}% confidence floor and $${maxValue.toLocaleString()} maximum automatic value.`
    );
    save();
    render();
    byId("autonomyRecoveryStatus").textContent =
      "Preventive learning applied to Autonomy Guardrails.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-recovery-learning-applied", {
      detail:{plan,minConfidence,maxValue}
    }));
  }

  function renderHistory() {
    const root = byId("autonomyRecoveryHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-recovery-empty";
      empty.textContent = "Recovery activity will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-recovery-history-item";
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

  function render() {
    renderKPIs();
    renderPlans();
    renderInspector();
    renderGates();
    renderLearning();
    renderHistory();
    byId("autonomyRecoveryUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{
        hour:"numeric",
        minute:"2-digit"
      }).format(new Date())}.`;
  }

  function init() {
    if (!byId("autonomyRecoveryRequalification")) return;

    load();
    byId("autonomyRecoveryImportIncidents")?.addEventListener(
      "click",
      importResolvedIncidents
    );
    byId("autonomyRecoverySave")?.addEventListener("click",saveSelected);
    byId("autonomyRecoveryEvaluate")?.addEventListener("click",evaluateSelected);
    byId("autonomyRecoveryReinstate")?.addEventListener("click",reinstateSelected);
    byId("autonomyRecoveryApplyLearning")?.addEventListener("click",applyLearning);
    byId("autonomyRecoveryClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      renderHistory();
    });

    [
      "bluecurrent:autonomy-incident-resolved",
      "bluecurrent:autonomy-outcome-verified"
    ].forEach(name => window.addEventListener(name,render));

    window.addEventListener("storage",event => {
      if ([INCIDENT_KEY,OUTCOME_KEY,ROLLOUT_KEY,GUARDRAIL_KEY,STORAGE_KEY].includes(event.key)) {
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