(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.decisionOutcomeTracker.v34.0.12";
  const LEARNING_KEY = "blueCurrent.outcomeLearningCalibration.v34.0.13.6";
  const ADAPTIVE_KEY = "blueCurrent.adaptiveForecastWeights.v34.0.13.7";
  const byId = id => document.getElementById(id);

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function servicePeriod(date = new Date()) {
    const hour = date.getHours();
    if (hour < 11) return "opening";
    if (hour < 16) return "lunch";
    if (hour < 22) return "dinner";
    return "closing";
  }

  function dayGroup(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6 ? "weekend" : "weekday";
  }

  function clampWeight(value) {
    return Math.max(.85,Math.min(1.25,Number(value.toFixed(2))));
  }

  function calculate() {
    const outcomeState = read(OUTCOME_KEY);
    const learning = read(LEARNING_KEY);
    const outcomes = Array.isArray(outcomeState.outcomes)
      ? outcomeState.outcomes.filter(item => item.status === "measured")
      : [];

    const period = servicePeriod();
    const group = dayGroup();
    const context = `${group}-${period}`;

    const contextual = outcomes.filter(item => {
      const value = item.recordedAt || item.approvedAt;
      if (!value) return false;
      const date = new Date(value);
      return servicePeriod(date) === period && dayGroup(date) === group;
    });

    const sample = contextual.length >= 2 ? contextual : outcomes;
    const base = learning.weights || {demand:1,kitchen:1,floor:1,labor:1};
    const text = sample
      .map(item => `${item.title || ""} ${item.detail || ""} ${item.note || ""}`.toLowerCase())
      .join(" ");

    const mentions = {
      demand:(text.match(/reservation|demand|arrival|walk-in|capacity|patio/g) || []).length,
      kitchen:(text.match(/kitchen|ticket|station|expo|course|grill/g) || []).length,
      floor:(text.match(/table|floor|guest|seating|server|section/g) || []).length,
      labor:(text.match(/labor|staff|coverage|employee|runner|callout/g) || []).length
    };

    const total = Math.max(1,Object.values(mentions).reduce((sum,value) => sum + value,0));
    const weights = {
      demand:clampWeight(Number(base.demand || 1) + mentions.demand / total * .12),
      kitchen:clampWeight(Number(base.kitchen || 1) + mentions.kitchen / total * .12),
      floor:clampWeight(Number(base.floor || 1) + mentions.floor / total * .12),
      labor:clampWeight(Number(base.labor || 1) + mentions.labor / total * .12)
    };

    return {
      context,
      period,
      dayGroup:group,
      sourceSample:sample.length,
      contextualSample:contextual.length,
      weights,
      updatedAt:new Date().toISOString()
    };
  }

  function render() {
    const profile = calculate();
    localStorage.setItem(ADAPTIVE_KEY,JSON.stringify(profile));

    byId("adaptiveForecastProfileTitle").textContent =
      `${profile.dayGroup === "weekend" ? "Weekend" : "Weekday"} ${profile.period} profile`;

    byId("adaptiveForecastProfileDetail").textContent =
      profile.sourceSample
        ? `Using ${profile.sourceSample} measured outcome${profile.sourceSample === 1 ? "" : "s"}; ${profile.contextualSample} match the current service context.`
        : "No measured outcomes yet. Contextual weights remain near baseline.";

    byId("adaptiveDemandWeight").textContent = profile.weights.demand.toFixed(2);
    byId("adaptiveKitchenWeight").textContent = profile.weights.kitchen.toFixed(2);
    byId("adaptiveFloorWeight").textContent = profile.weights.floor.toFixed(2);
    byId("adaptiveLaborWeight").textContent = profile.weights.labor.toFixed(2);

    window.dispatchEvent(new CustomEvent("bluecurrent:adaptive-forecast-weights-updated", {
      detail:{profile}
    }));
  }

  function init() {
    if (!byId("adaptiveForecastProfile")) return;

    [
      "bluecurrent:decision-outcome-recorded",
      "bluecurrent:forecast-calibration-updated"
    ].forEach(name => window.addEventListener(name,render));

    byId("outcomeLearningRecalculate")?.addEventListener("click",render);
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();