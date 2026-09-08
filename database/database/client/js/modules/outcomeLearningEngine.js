(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.decisionOutcomeTracker.v34.0.12";
  const CALIBRATION_KEY = "blueCurrent.outcomeLearningCalibration.v34.0.13.6";
  const byId = id => document.getElementById(id);

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function clamp(value,min=0,max=100) {
    return Math.max(min,Math.min(max,value));
  }

  function measuredOutcomes() {
    const state = read(OUTCOME_KEY);
    const outcomes = Array.isArray(state.outcomes) ? state.outcomes : [];
    return outcomes.filter(item => item.status === "measured");
  }

  function calculateProfile() {
    const outcomes = measuredOutcomes();

    if (!outcomes.length) {
      return {
        measured:0,
        accuracy:0,
        averageVariance:0,
        successRate:0,
        calibrationScore:82,
        confidenceAdjustment:0,
        weights:{demand:1,kitchen:1,floor:1,labor:1},
        signals:[{
          tone:"stable",
          title:"Baseline calibration active",
          detail:"Record measured outcomes to begin adapting forecast confidence and domain weights."
        }]
      };
    }

    const comparable = outcomes.filter(item => Number(item.predictedValue || 0) > 0);
    const accuracy = comparable.length
      ? clamp(Math.round(
          comparable.reduce((sum,item) => {
            const predicted = Number(item.predictedValue || 0);
            const observed = Number(item.observedValue || 0);
            const error = Math.abs(observed - predicted) / predicted;
            return sum + Math.max(0,1-error);
          },0) / comparable.length * 100
        ))
      : 70;

    const averageVariance = comparable.length
      ? Math.round(
          comparable.reduce((sum,item) => {
            const predicted = Number(item.predictedValue || 0);
            const observed = Number(item.observedValue || 0);
            return sum + ((observed - predicted) / predicted * 100);
          },0) / comparable.length
        )
      : 0;

    const successful = outcomes.filter(item => item.classification === "successful").length;
    const partial = outcomes.filter(item => item.classification === "partial").length;
    const underperformed = outcomes.filter(item => item.classification === "underperformed").length;
    const successRate = Math.round((successful + partial * .5) / outcomes.length * 100);

    const confidenceAdjustment =
      accuracy >= 90 ? 4 :
      accuracy >= 80 ? 2 :
      accuracy >= 65 ? 0 :
      accuracy >= 50 ? -3 : -6;

    const text = outcomes
      .map(item => `${item.title || ""} ${item.detail || ""} ${item.note || ""}`.toLowerCase())
      .join(" ");

    const counts = {
      demand:(text.match(/reservation|demand|arrival|walk-in|capacity/g) || []).length,
      kitchen:(text.match(/kitchen|ticket|station|expo|course/g) || []).length,
      floor:(text.match(/table|floor|guest|seating|server/g) || []).length,
      labor:(text.match(/labor|staff|coverage|employee|runner/g) || []).length
    };

    const totalMentions = Math.max(1,Object.values(counts).reduce((sum,value) => sum + value,0));
    const weights = {
      demand:Number((1 + counts.demand / totalMentions * .25).toFixed(2)),
      kitchen:Number((1 + counts.kitchen / totalMentions * .25).toFixed(2)),
      floor:Number((1 + counts.floor / totalMentions * .25).toFixed(2)),
      labor:Number((1 + counts.labor / totalMentions * .25).toFixed(2))
    };

    const calibrationScore = clamp(Math.round(accuracy * .65 + successRate * .35));

    const signals = [
      {
        tone:accuracy >= 80 ? "stable" : accuracy >= 60 ? "watch" : "risk",
        title:"Prediction accuracy",
        detail:`Measured forecasts are ${accuracy}% accurate across ${comparable.length} comparable outcome${comparable.length === 1 ? "" : "s"}.`
      },
      {
        tone:Math.abs(averageVariance) <= 15 ? "stable" : "watch",
        title:"Forecast bias",
        detail:`Observed value is averaging ${averageVariance >= 0 ? "+" : ""}${averageVariance}% versus predicted value.`
      },
      {
        tone:underperformed ? "watch" : "stable",
        title:"Recommendation effectiveness",
        detail:`${successful} successful, ${partial} partial, and ${underperformed} underperforming measured decision${outcomes.length === 1 ? "" : "s"}.`
      }
    ];

    return {
      measured:outcomes.length,
      accuracy,
      averageVariance,
      successRate,
      calibrationScore,
      confidenceAdjustment,
      weights,
      signals
    };
  }

  function saveProfile(profile) {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify({
      ...profile,
      recalculatedAt:new Date().toISOString()
    }));
  }

  function render() {
    const profile = calculateProfile();
    saveProfile(profile);

    byId("outcomeLearningMeasured").textContent = String(profile.measured);
    byId("outcomeLearningAccuracy").textContent = `${profile.accuracy}%`;
    byId("outcomeLearningVariance").textContent =
      `${profile.averageVariance >= 0 ? "+" : ""}${profile.averageVariance}%`;
    byId("outcomeLearningSuccess").textContent = `${profile.successRate}%`;
    byId("outcomeLearningAdjustment").textContent =
      profile.confidenceAdjustment > 0
        ? `+${profile.confidenceAdjustment}`
        : String(profile.confidenceAdjustment);

    byId("outcomeLearningCalibrationScore").textContent =
      String(profile.calibrationScore);
    byId("outcomeLearningCalibrationLabel").textContent =
      profile.measured === 0 ? "Baseline calibration" :
      profile.calibrationScore >= 88 ? "Well calibrated" :
      profile.calibrationScore >= 70 ? "Learning in progress" :
      "Calibration review needed";
    byId("outcomeLearningCalibrationCard").dataset.tone =
      profile.calibrationScore >= 88 ? "stable" :
      profile.calibrationScore >= 70 ? "watch" : "risk";

    byId("outcomeLearningDemandWeight").textContent =
      profile.weights.demand.toFixed(2);
    byId("outcomeLearningKitchenWeight").textContent =
      profile.weights.kitchen.toFixed(2);
    byId("outcomeLearningFloorWeight").textContent =
      profile.weights.floor.toFixed(2);
    byId("outcomeLearningLaborWeight").textContent =
      profile.weights.labor.toFixed(2);

    byId("outcomeLearningProfileTitle").textContent =
      profile.measured
        ? "Adaptive profile active"
        : "Default profile active";
    byId("outcomeLearningProfileDetail").textContent =
      profile.measured
        ? `Forecast confidence is adjusted ${profile.confidenceAdjustment >= 0 ? "+" : ""}${profile.confidenceAdjustment} points using ${profile.measured} measured outcome${profile.measured === 1 ? "" : "s"}.`
        : "Forecast confidence remains on the baseline until enough measured outcomes are available.";

    const list = byId("outcomeLearningSignalList");
    list.replaceChildren();

    profile.signals.forEach(signal => {
      const item = document.createElement("article");
      item.className = "outcome-learning-signal";
      item.dataset.tone = signal.tone;
      item.innerHTML = "<strong></strong><span></span>";
      item.querySelector("strong").textContent = signal.title;
      item.querySelector("span").textContent = signal.detail;
      list.append(item);
    });

    byId("outcomeLearningSignalCount").textContent =
      `${profile.signals.length} signal${profile.signals.length === 1 ? "" : "s"}`;
    byId("outcomeLearningUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;

    window.dispatchEvent(new CustomEvent("bluecurrent:forecast-calibration-updated", {
      detail:{profile}
    }));
    window.dispatchEvent(new CustomEvent("bluecurrent:confidence-drift-source-updated", {
      detail:{profile}
    }));
  }

  function init() {
    if (!byId("outcomeLearningEngine")) return;

    byId("outcomeLearningRecalculate")?.addEventListener("click",() => {
      render();
      byId("outcomeLearningStatus").textContent =
        "Forecast calibration profile recalculated.";
    });

    window.addEventListener("bluecurrent:decision-outcome-recorded",render);
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();