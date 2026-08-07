(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.decisionOutcomeTracker.v34.0.12";
  const HISTORY_KEY = "blueCurrent.retrainingPlannerHistory.v34.0.13.9";
  const byId = id => document.getElementById(id);

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function outcomes() {
    const state = read(OUTCOME_KEY);
    const items = Array.isArray(state.outcomes) ? state.outcomes : [];
    return items
      .filter(item => item.status === "measured")
      .sort((a,b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0));
  }

  function accuracy(item) {
    const predicted = Number(item.predictedValue || 0);
    const observed = Number(item.observedValue || 0);
    if (predicted <= 0) return 70;
    const error = Math.abs(observed - predicted) / predicted;
    return Math.max(0,Math.min(100,Math.round((1-error)*100)));
  }

  function analyze() {
    const measured = outcomes();
    const all = measured.map(accuracy);
    const recent = measured.slice(-5).map(accuracy);
    const avg = values =>
      values.length
        ? Math.round(values.reduce((sum,value) => sum + value,0) / values.length)
        : 0;

    const baseline = avg(all);
    const recentAccuracy = avg(recent);
    const gap = recentAccuracy - baseline;
    const declining =
      recent.length >= 3 &&
      recent.slice(-3).every((value,index,array) =>
        index === 0 || value <= array[index-1]
      );

    const driftScore = measured.length < 3
      ? 0
      : Math.max(0,Math.min(100,
          Math.abs(gap) * 2 +
          (declining ? 18 : 0) +
          (recentAccuracy < 60 ? 20 : recentAccuracy < 75 ? 8 : 0)
        ));

    let priority = "Low";
    let readiness = 15;
    let title = "Continue monitoring";
    let detail = "No intervention is currently required.";
    let targetWindow = "Next 5 outcomes";
    let expectedBenefit = "Maintain calibration";
    let operationalRisk = "Low";
    let effort = "15 min";
    let actions = [
      {
        tone:"stable",
        title:"Continue collecting measured outcomes",
        detail:"Keep recording predicted and observed business value.",
        timing:"Ongoing"
      }
    ];

    if (measured.length < 3) {
      readiness = 20;
      title = "Build a stronger baseline";
      detail = "More measured outcomes are required before retraining can be justified.";
      targetWindow = "After 3 outcomes";
      expectedBenefit = "Establish reliable baseline";
      actions = [
        {
          tone:"stable",
          title:"Increase outcome measurement coverage",
          detail:"Record at least three measured decisions before changing the model.",
          timing:"Next shifts"
        }
      ];
    } else if (driftScore >= 55) {
      priority = "High";
      readiness = 90;
      title = "Schedule a retraining review";
      detail = "Recent accuracy has materially diverged from the learned baseline.";
      targetWindow = "Before next peak shift";
      expectedBenefit = "Restore forecast accuracy";
      operationalRisk = "High";
      effort = "45–60 min";
      actions = [
        {
          tone:"risk",
          title:"Freeze automatic confidence increases",
          detail:"Prevent recent drift from inflating executive confidence.",
          timing:"Now"
        },
        {
          tone:"risk",
          title:"Review contextual domain weights",
          detail:"Compare demand, kitchen, floor, and labor weights against measured outcomes.",
          timing:"Today"
        },
        {
          tone:"watch",
          title:"Recalculate the learning profile",
          detail:"Generate a fresh calibration profile after the weight review.",
          timing:"Before next peak"
        }
      ];
    } else if (driftScore >= 25) {
      priority = "Medium";
      readiness = 60;
      title = "Plan a calibration review";
      detail = "Early confidence drift is present, but full retraining is not yet required.";
      targetWindow = "Next 2 outcomes";
      expectedBenefit = "Prevent model degradation";
      operationalRisk = "Medium";
      effort = "25–35 min";
      actions = [
        {
          tone:"watch",
          title:"Review recent outcome variance",
          detail:"Identify which predictions are moving away from the baseline.",
          timing:"Today"
        },
        {
          tone:"watch",
          title:"Recalculate the learning profile",
          detail:"Refresh calibration after the next measured outcome.",
          timing:"Next outcome"
        }
      ];
    }

    return {
      measured,
      baseline,
      recentAccuracy,
      gap,
      driftScore,
      priority,
      readiness,
      title,
      detail,
      targetWindow,
      expectedBenefit,
      operationalRisk,
      effort,
      actions
    };
  }

  function tone(score) {
    if (score >= 75) return "risk";
    if (score >= 45) return "watch";
    return "stable";
  }

  function renderActions(analysis) {
    const root = byId("retrainingActionList");
    root.replaceChildren();

    analysis.actions.forEach((action,index) => {
      const item = document.createElement("article");
      item.className = "retraining-action-item";
      item.dataset.tone = action.tone;

      const number = document.createElement("span");
      number.className = "retraining-action-index";
      number.textContent = String(index + 1);

      const copy = document.createElement("div");
      copy.className = "retraining-action-copy";
      copy.innerHTML = "<strong></strong><span></span>";
      copy.querySelector("strong").textContent = action.title;
      copy.querySelector("span").textContent = action.detail;

      const timing = document.createElement("em");
      timing.textContent = action.timing;

      item.append(number,copy,timing);
      root.append(item);
    });

    byId("retrainingActionCount").textContent =
      `${analysis.actions.length} action${analysis.actions.length === 1 ? "" : "s"}`;
  }

  function renderHistory() {
    const state = read(HISTORY_KEY);
    const history = Array.isArray(state.history) ? state.history : [];
    const root = byId("retrainingHistoryList");
    root.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "retraining-empty";
      empty.textContent = "Created maintenance plans will appear here.";
      root.append(empty);
      return;
    }

    history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "retraining-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.title;
      item.querySelector("span").textContent =
        `${entry.priority} priority · Drift ${entry.driftScore}${entry.note ? ` · ${entry.note}` : ""}`;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {
          hour:"numeric",
          minute:"2-digit"
        });
      root.append(item);
    });
  }

  function render() {
    const analysis = analyze();

    byId("retrainingReadinessScore").textContent = String(analysis.readiness);
    byId("retrainingReadinessLabel").textContent =
      analysis.readiness >= 75 ? "Retraining ready" :
      analysis.readiness >= 45 ? "Calibration review" : "Not required";
    byId("retrainingReadinessCard").dataset.tone = tone(analysis.readiness);

    byId("retrainingDriftScore").textContent = String(analysis.driftScore);
    byId("retrainingMeasuredCount").textContent = String(analysis.measured.length);
    byId("retrainingRecentAccuracy").textContent = `${analysis.recentAccuracy}%`;
    byId("retrainingBaselineAccuracy").textContent = `${analysis.baseline}%`;
    byId("retrainingPriority").textContent = analysis.priority;

    byId("retrainingWindowTitle").textContent = analysis.title;
    byId("retrainingWindowDetail").textContent = analysis.detail;
    byId("retrainingTargetWindow").textContent = analysis.targetWindow;
    byId("retrainingExpectedBenefit").textContent = analysis.expectedBenefit;
    byId("retrainingOperationalRisk").textContent = analysis.operationalRisk;
    byId("retrainingEstimatedEffort").textContent = analysis.effort;

    renderActions(analysis);
    renderHistory();

    byId("retrainingPlannerUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function createPlan() {
    const analysis = analyze();
    const state = read(HISTORY_KEY);
    const history = Array.isArray(state.history) ? state.history : [];

    history.push({
      id:`plan_${Date.now()}`,
      title:analysis.title,
      priority:analysis.priority,
      driftScore:analysis.driftScore,
      note:byId("retrainingMaintenanceNote").value.trim(),
      actions:analysis.actions,
      createdAt:new Date().toISOString()
    });

    localStorage.setItem(HISTORY_KEY,JSON.stringify({history}));
    byId("retrainingMaintenanceNote").value = "";
    byId("retrainingPlannerStatus").textContent =
      "Maintenance plan recorded.";
    renderHistory();

    window.dispatchEvent(new CustomEvent("bluecurrent:retraining-plan-created", {
      detail:{plan:history[history.length-1]}
    }));
  }

  function init() {
    if (!byId("retrainingPlanner")) return;

    byId("retrainingCreatePlan")?.addEventListener("click",createPlan);
    byId("retrainingOpenDrift")?.addEventListener("click",() => {
      byId("confidenceDriftMonitor")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });
    byId("retrainingClearHistory")?.addEventListener("click",() => {
      localStorage.setItem(HISTORY_KEY,JSON.stringify({history:[]}));
      renderHistory();
    });

    [
      "bluecurrent:decision-outcome-recorded",
      "bluecurrent:confidence-drift-source-updated"
    ].forEach(name => window.addEventListener(name,render));

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();