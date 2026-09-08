(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.decisionOutcomeTracker.v34.0.12";
  const ACK_KEY = "blueCurrent.confidenceDriftAcknowledgment.v34.0.13.8";
  const byId = id => document.getElementById(id);

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function measuredOutcomes() {
    const state = read(OUTCOME_KEY);
    const outcomes = Array.isArray(state.outcomes) ? state.outcomes : [];
    return outcomes
      .filter(item => item.status === "measured")
      .sort((a,b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0));
  }

  function outcomeAccuracy(item) {
    const predicted = Number(item.predictedValue || 0);
    const observed = Number(item.observedValue || 0);
    if (predicted <= 0) return 70;
    const error = Math.abs(observed - predicted) / predicted;
    return Math.max(0,Math.min(100,Math.round((1-error)*100)));
  }

  function analyze() {
    const outcomes = measuredOutcomes();
    const allAccuracies = outcomes.map(outcomeAccuracy);
    const recentOutcomes = outcomes.slice(-5);
    const recentAccuracies = recentOutcomes.map(outcomeAccuracy);

    const average = values =>
      values.length
        ? Math.round(values.reduce((sum,value) => sum + value,0) / values.length)
        : 0;

    const baselineAccuracy = average(allAccuracies);
    const recentAccuracy = average(recentAccuracies);
    const gap = recentAccuracy - baselineAccuracy;
    const downwardTrend =
      recentAccuracies.length >= 3 &&
      recentAccuracies.slice(-3).every((value,index,array) =>
        index === 0 || value <= array[index-1]
      );

    const driftScore = outcomes.length < 3
      ? 0
      : Math.max(0,Math.min(100,
          Math.abs(gap) * 2 +
          (downwardTrend ? 18 : 0) +
          (recentAccuracy < 60 ? 20 : recentAccuracy < 75 ? 8 : 0)
        ));

    let status = "stable";
    let title = "No retraining action required";
    let detail = "The current model remains within acceptable calibration limits.";
    let action = "Continue monitoring";
    let priority = "Low";
    let reviewWindow = "Next 5 outcomes";
    let benefit = "Maintain calibration";

    if (outcomes.length < 3) {
      status = "insufficient";
      title = "Collect more measured outcomes";
      detail = "At least three measured outcomes are needed before drift can be assessed reliably.";
      action = "Increase measurement coverage";
      priority = "Low";
      reviewWindow = "After 3 outcomes";
      benefit = "Establish baseline";
    } else if (driftScore >= 55) {
      status = "risk";
      title = "Retraining review recommended";
      detail = "Recent prediction accuracy has materially diverged from the historical baseline.";
      action = "Review weights and retrain";
      priority = "High";
      reviewWindow = "Before next peak shift";
      benefit = "Restore forecast accuracy";
    } else if (driftScore >= 25) {
      status = "watch";
      title = "Calibration review recommended";
      detail = "Recent outcomes show early confidence drift that should be watched closely.";
      action = "Recalculate learning profile";
      priority = "Medium";
      reviewWindow = "Next 2 outcomes";
      benefit = "Prevent model degradation";
    }

    return {
      outcomes,
      recentOutcomes,
      baselineAccuracy,
      recentAccuracy,
      gap,
      driftScore,
      downwardTrend,
      status,
      title,
      detail,
      action,
      priority,
      reviewWindow,
      benefit
    };
  }

  function tone(value) {
    if (value >= 55) return "risk";
    if (value >= 25) return "watch";
    return "stable";
  }

  function renderTrend(analysis) {
    const root = byId("confidenceDriftTrendList");
    root.replaceChildren();

    if (!analysis.recentOutcomes.length) {
      const empty = document.createElement("div");
      empty.className = "confidence-drift-empty";
      empty.textContent = "Record measured outcomes to begin confidence drift monitoring.";
      root.append(empty);
      return;
    }

    analysis.recentOutcomes.forEach((item,index) => {
      const accuracy = outcomeAccuracy(item);
      const card = document.createElement("article");
      card.className = "confidence-drift-trend-item";
      card.dataset.tone = tone(100-accuracy);
      card.innerHTML = "<small></small><strong></strong><span></span>";
      card.querySelector("small").textContent = `Outcome ${analysis.outcomes.length-analysis.recentOutcomes.length+index+1}`;
      card.querySelector("strong").textContent = `${accuracy}% accuracy`;
      card.querySelector("span").textContent =
        item.classification === "underperformed"
          ? "Underperformed"
          : item.classification === "partial"
            ? "Partially successful"
            : "Successful";
      root.append(card);
    });
  }

  function render() {
    const analysis = analyze();

    byId("confidenceDriftScore").textContent = String(analysis.driftScore);
    byId("confidenceDriftLabel").textContent =
      analysis.status === "risk" ? "High drift" :
      analysis.status === "watch" ? "Early drift" :
      analysis.status === "insufficient" ? "Insufficient data" : "Stable";
    byId("confidenceDriftScoreCard").dataset.tone = tone(analysis.driftScore);

    byId("confidenceDriftRecentAccuracy").textContent =
      `${analysis.recentAccuracy}%`;
    byId("confidenceDriftBaselineAccuracy").textContent =
      `${analysis.baselineAccuracy}%`;
    byId("confidenceDriftGap").textContent =
      `${analysis.gap >= 0 ? "+" : ""}${analysis.gap}`;
    byId("confidenceDriftSamples").textContent =
      String(analysis.outcomes.length);
    byId("confidenceDriftGovernance").textContent =
      analysis.status === "risk" ? "Review" :
      analysis.status === "watch" ? "Watch" :
      analysis.status === "insufficient" ? "Collecting" : "Healthy";

    byId("confidenceDriftRecommendationTitle").textContent = analysis.title;
    byId("confidenceDriftRecommendationDetail").textContent = analysis.detail;
    byId("confidenceDriftAction").textContent = analysis.action;
    byId("confidenceDriftPriority").textContent = analysis.priority;
    byId("confidenceDriftReviewWindow").textContent = analysis.reviewWindow;
    byId("confidenceDriftBenefit").textContent = analysis.benefit;
    byId("confidenceDriftWindowLabel").textContent =
      `Last ${analysis.recentOutcomes.length} outcome${analysis.recentOutcomes.length === 1 ? "" : "s"}`;

    renderTrend(analysis);

    const acknowledgment = read(ACK_KEY);
    byId("confidenceDriftStatus").textContent =
      acknowledgment.driftScore === analysis.driftScore
        ? `Recommendation acknowledged ${new Date(acknowledgment.acknowledgedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`
        : "";

    byId("confidenceDriftUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function acknowledge() {
    const analysis = analyze();
    localStorage.setItem(ACK_KEY,JSON.stringify({
      driftScore:analysis.driftScore,
      status:analysis.status,
      acknowledgedAt:new Date().toISOString()
    }));
    render();
  }

  function init() {
    if (!byId("confidenceDriftMonitor")) return;

    byId("confidenceDriftAcknowledge")?.addEventListener("click",acknowledge);
    byId("confidenceDriftOpenLearning")?.addEventListener("click",() => {
      byId("outcomeLearningEngine")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
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