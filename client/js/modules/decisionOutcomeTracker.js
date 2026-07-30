(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.decisionOutcomeTracker.v34.0.12";
  const DECISION_KEY = "blueCurrent.executiveDecisionCenter.v34.0.11";
  const byId = id => document.getElementById(id);

  const state = {
    filter:"pending",
    selectedId:null,
    outcomes:[]
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
    state.filter = stored.filter || "pending";
    state.selectedId = stored.selectedId || null;
    state.outcomes = Array.isArray(stored.outcomes) ? stored.outcomes : [];
    syncApprovedDecisions();
  }

  function syncApprovedDecisions() {
    const decisionState = read(DECISION_KEY);
    const decisions = Array.isArray(decisionState.decisions) ? decisionState.decisions : [];

    decisions
      .filter(decision => decision.status === "completed")
      .forEach(decision => {
        const existing = state.outcomes.find(outcome => outcome.decisionId === decision.id);
        if (existing) return;

        state.outcomes.push({
          id:`outcome_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          decisionId:decision.id,
          title:decision.title,
          detail:decision.why,
          predictedValue:Number(decision.revenueImpact || 0),
          observedValue:null,
          confidence:Number(decision.confidence || 0),
          approvedAt:decision.approvedAt || decision.completedAt || new Date().toISOString(),
          classification:"successful",
          note:"",
          status:"pending",
          recordedAt:null
        });
      });

    if (!state.selectedId && state.outcomes[0]) {
      state.selectedId = state.outcomes[0].id;
    }

    save();
  }

  function visibleOutcomes() {
    if (state.filter === "all") return state.outcomes;
    return state.outcomes.filter(outcome =>
      state.filter === "pending"
        ? outcome.status === "pending"
        : outcome.status === "measured"
    );
  }

  function selectedOutcome() {
    return state.outcomes.find(outcome => outcome.id === state.selectedId) || null;
  }

  function variancePercent(outcome) {
    if (outcome.observedValue === null || outcome.predictedValue <= 0) return 0;
    return Math.round(((outcome.observedValue - outcome.predictedValue) / outcome.predictedValue) * 100);
  }

  function renderList() {
    const root = byId("decisionOutcomeList");
    root.replaceChildren();

    const items = visibleOutcomes().slice().sort((a,b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.approvedAt) - new Date(a.approvedAt);
    });

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "decision-outcome-empty";
      empty.textContent = "No decision outcomes match this view.";
      root.append(empty);
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "decision-outcome-card";
      card.dataset.classification = item.classification;
      card.classList.toggle("is-selected", item.id === state.selectedId);

      const copy = document.createElement("div");
      copy.className = "decision-outcome-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent =
        item.status === "pending" ? "Pending measurement" : item.classification;
      copy.querySelector("strong").textContent = item.title;
      copy.querySelector("p").textContent = item.detail;

      const impact = document.createElement("div");
      impact.className = "decision-outcome-impact";
      impact.innerHTML = "<strong></strong><span></span>";
      impact.querySelector("strong").textContent =
        item.observedValue === null
          ? `$${item.predictedValue.toLocaleString()}`
          : `$${item.observedValue.toLocaleString()}`;
      impact.querySelector("span").textContent =
        item.observedValue === null ? "predicted" : "observed";

      card.addEventListener("click", () => {
        state.selectedId = item.id;
        save();
        render();
      });

      card.append(copy,impact);
      root.append(card);
    });
  }

  function renderInspector() {
    const item = selectedOutcome();

    if (!item) {
      byId("decisionOutcomeSelectedTitle").textContent = "Choose a decision";
      byId("decisionOutcomeSelectedDetail").textContent = "No approved decision selected.";
      ["decisionOutcomePredicted","decisionOutcomeObserved","decisionOutcomeVariance","decisionOutcomeConfidence","decisionOutcomeApprovedAt","decisionOutcomeStatusLabel"]
        .forEach(id => byId(id).textContent = "—");
      byId("decisionOutcomeObservedInput").value = "";
      byId("decisionOutcomeNote").value = "";
      return;
    }

    byId("decisionOutcomeSelectedTitle").textContent = item.title;
    byId("decisionOutcomeSelectedDetail").textContent = item.detail;
    byId("decisionOutcomePredicted").textContent = `$${item.predictedValue.toLocaleString()}`;
    byId("decisionOutcomeObserved").textContent =
      item.observedValue === null ? "Pending" : `$${item.observedValue.toLocaleString()}`;
    byId("decisionOutcomeVariance").textContent =
      item.observedValue === null ? "Pending" : `${variancePercent(item)}%`;
    byId("decisionOutcomeConfidence").textContent = `${item.confidence}%`;
    byId("decisionOutcomeApprovedAt").textContent =
      new Date(item.approvedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
    byId("decisionOutcomeStatusLabel").textContent =
      item.status === "pending" ? "Awaiting measurement" : item.classification;

    byId("decisionOutcomeObservedInput").value =
      item.observedValue === null ? "" : String(item.observedValue);
    byId("decisionOutcomeClassification").value = item.classification;
    byId("decisionOutcomeNote").value = item.note || "";
    byId("decisionOutcomeRecord").disabled = item.status === "measured";
  }

  function renderKPIs() {
    const measured = state.outcomes.filter(outcome => outcome.status === "measured");
    const successful = measured.filter(outcome => outcome.classification === "successful");
    const underperformed = measured.filter(outcome => outcome.classification === "underperformed");
    const value = measured.reduce((sum,outcome) => sum + Number(outcome.observedValue || 0),0);

    const comparable = measured.filter(outcome => outcome.predictedValue > 0);
    const accuracy = comparable.length
      ? Math.max(0,Math.min(100,Math.round(
          comparable.reduce((sum,outcome) => {
            const error = Math.abs(outcome.observedValue - outcome.predictedValue) / outcome.predictedValue;
            return sum + Math.max(0,1 - error);
          },0) / comparable.length * 100
        )))
      : 0;

    let score = measured.length
      ? Math.round(
          measured.reduce((sum,outcome) => {
            if (outcome.classification === "successful") return sum + 100;
            if (outcome.classification === "partial") return sum + 70;
            return sum + 35;
          },0) / measured.length
        )
      : 100;

    byId("decisionOutcomeMeasured").textContent = String(measured.length);
    byId("decisionOutcomeSuccessful").textContent = String(successful.length);
    byId("decisionOutcomeUnderperformed").textContent = String(underperformed.length);
    byId("decisionOutcomeValue").textContent = `$${value.toLocaleString()}`;
    byId("decisionOutcomeAccuracy").textContent = `${accuracy}%`;
    byId("decisionOutcomeScore").textContent = String(score);
    byId("decisionOutcomeScoreLabel").textContent =
      score >= 88 ? "Strong execution" :
      score >= 70 ? "Mixed execution" : "Decision quality review needed";
    byId("decisionOutcomeScoreCard").dataset.tone =
      score >= 88 ? "stable" : score >= 70 ? "watch" : "risk";
  }

  function renderInsights() {
    const measured = state.outcomes.filter(outcome => outcome.status === "measured");
    const insights = [];

    if (!measured.length) {
      insights.push({
        title:"Outcome data is still forming",
        detail:"Record the observed result of approved decisions to begin measuring decision quality."
      });
    } else {
      const successful = measured.filter(outcome => outcome.classification === "successful");
      const underperformed = measured.filter(outcome => outcome.classification === "underperformed");
      const averageVariance = Math.round(
        measured.reduce((sum,outcome) => sum + variancePercent(outcome),0) / measured.length
      );

      insights.push({
        title:"Decision success rate",
        detail:`${Math.round(successful.length / measured.length * 100)}% of measured decisions met or exceeded target.`
      });

      insights.push({
        title:"Prediction variance",
        detail:`Observed value is averaging ${averageVariance >= 0 ? "+" : ""}${averageVariance}% versus prediction.`
      });

      if (underperformed.length) {
        insights.push({
          title:"Review underperforming decisions",
          detail:`${underperformed.length} decision${underperformed.length === 1 ? " requires" : "s require"} a post-action review.`
        });
      } else {
        insights.push({
          title:"No material underperformance detected",
          detail:"Measured executive actions are currently producing acceptable outcomes."
        });
      }
    }

    const root = byId("decisionOutcomeInsightList");
    root.replaceChildren();

    insights.slice(0,3).forEach(insight => {
      const item = document.createElement("article");
      item.className = "decision-outcome-insight";
      item.innerHTML = "<strong></strong><span></span>";
      item.querySelector("strong").textContent = insight.title;
      item.querySelector("span").textContent = insight.detail;
      root.append(item);
    });

    byId("decisionOutcomeLearningCount").textContent =
      `${insights.length} learning signal${insights.length === 1 ? "" : "s"}`;
  }

  function recordOutcome() {
    const item = selectedOutcome();
    if (!item || item.status === "measured") return;

    const observed = Number(byId("decisionOutcomeObservedInput").value);
    if (!Number.isFinite(observed) || observed < 0) {
      byId("decisionOutcomeStatus").textContent =
        "Enter a valid observed business value.";
      return;
    }

    item.observedValue = observed;
    item.classification = byId("decisionOutcomeClassification").value;
    item.note = byId("decisionOutcomeNote").value.trim();
    item.status = "measured";
    item.recordedAt = new Date().toISOString();

    save();
    render();

    byId("decisionOutcomeStatus").textContent =
      `${item.title} outcome recorded.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:decision-outcome-recorded", {
      detail:{ outcome:{...item} }
    }));
  }

  function openDecision() {
    byId("executiveDecisionCenter")?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  function render() {
    syncApprovedDecisions();
    renderKPIs();
    renderList();
    renderInspector();
    renderInsights();

    byId("decisionOutcomeUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function bind() {
    byId("decisionOutcomeFilter").addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("decisionOutcomeRecord").addEventListener("click", recordOutcome);
    byId("decisionOutcomeOpenDecision").addEventListener("click", openDecision);

    window.addEventListener("bluecurrent:executive-decision-approved", render);
  }

  function init() {
    if (!byId("decisionOutcomeTracker")) return;
    load();
    byId("decisionOutcomeFilter").value = state.filter;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();