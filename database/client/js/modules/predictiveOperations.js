(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  function text(id, fallback = "") {
    return byId(id)?.textContent?.trim() || fallback;
  }

  function number(id, fallback = 0) {
    const value = Number.parseFloat(text(id, String(fallback)).replace(/[$,%+,]/g, ""));
    return Number.isFinite(value) ? value : fallback;
  }

  function calculatePrediction() {
    const reservations = number("operationReservations", 0);
    const scheduled = number("operationScheduled", 0);
    const labor = number("operationLabor", 0);
    const forecastRevenue = number("forecastRevenue", 0);
    const forecastChange = number("forecastChange", 0);
    const rain = number("weatherRain", 0);
    const weather = text("weatherCondition", "").toLowerCase();
    const openActions = document.querySelectorAll("#managerActionItems .manager-action-item:not(.is-complete)").length;
    const attention = document.querySelectorAll("#attentionList li").length;

    const reservationPressure = Math.min(35, reservations * 0.28);
    const staffingPressure = scheduled > 0 ? Math.max(0, reservations / scheduled - 3.5) * 8 : 8;
    const laborPressure = labor >= 30 ? 16 : labor >= 28 ? 9 : 2;
    const weatherPressure = /storm|thunder/.test(weather) || rain >= 70 ? 18 : /rain/.test(weather) || rain >= 40 ? 9 : 0;
    const actionPressure = Math.min(14, Math.max(openActions, attention) * 2.5);

    const now = Math.round(Math.min(100, 18 + reservationPressure + staffingPressure + laborPressure + weatherPressure + actionPressure));
    const growth = Math.max(4, Math.min(22, reservations * 0.08 + Math.max(0, forecastChange) * 0.7));
    const p30 = Math.min(100, Math.round(now + growth * 0.55));
    const p60 = Math.min(100, Math.round(now + growth));
    const p90 = Math.max(0, Math.min(100, Math.round(p60 - (weatherPressure ? 2 : 7))));

    const ninetyMinuteRevenue = Math.max(
      0,
      Math.round((forecastRevenue * 0.075) / 10) * 10
    );

    const hostRisk = reservations >= 90 || p60 >= 78;
    const kitchenRisk = p60 >= 82 || reservations >= 110;
    const laborRisk = labor >= 29.5;
    const weatherRisk = weatherPressure >= 15;

    let riskTitle = "No immediate predicted risk";
    let riskDetail = "Operating pressure is expected to remain manageable.";
    let target = "managerShiftBrief";

    if (kitchenRisk) {
      riskTitle = "Kitchen pressure expected within 60 minutes";
      riskDetail = "Prep, expo, and ticket pacing should be reviewed before the rush.";
      target = "kitchen-command-center";
    } else if (hostRisk) {
      riskTitle = "Host-stand congestion expected";
      riskDetail = "Reservation arrivals may outpace table availability during the next demand wave.";
      target = "reservation-operations";
    } else if (laborRisk) {
      riskTitle = "Labor likely to finish above target";
      riskDetail = "Review the next staffing decision before additional coverage is added.";
      target = "managerActionList";
    } else if (weatherRisk) {
      riskTitle = "Weather may disrupt seating flow";
      riskDetail = "Prepare for patio demand to shift indoors.";
      target = "managerShiftBrief";
    }

    return {
      confidence: Math.min(96, Math.round(78 + Math.min(18, reservations / 10))),
      pressure: [now, p30, p60, p90],
      host: hostRisk
        ? ["Congestion building", "Wait-time pressure may rise as reservation arrivals cluster."]
        : ["Stable", "Guest arrivals are expected to remain manageable."],
      kitchen: kitchenRisk
        ? ["Pressure rising", "Ticket-time and expo pressure may increase during the next hour."]
        : ["Balanced", "Kitchen load is expected to remain controlled."],
      labor: laborRisk
        ? ["Above target", `Projected labor is ${labor.toFixed(1)}%; review the next cut window.`]
        : ["On target", `Projected labor is ${labor.toFixed(1)}% and currently aligned with plan.`],
      revenue: [ninetyMinuteRevenue, `Current pace is ${forecastChange >= 0 ? "+" : ""}${forecastChange.toFixed(1)}% versus last year.`],
      risk: {
        title: riskTitle,
        detail: riskDetail,
        target,
        eta: p30 >= 78 ? "Within 30 min" : p60 >= 72 ? "30–60 min" : "60–90 min",
        signals: [
          { label: `Pressure ${p60}`, tone: p60 >= 82 ? "risk" : p60 >= 68 ? "watch" : "normal" },
          { label: `${Math.round(reservations)} reservations`, tone: reservations >= 100 ? "risk" : reservations >= 70 ? "watch" : "normal" },
          { label: `Labor ${labor.toFixed(1)}%`, tone: labor >= 30 ? "risk" : labor >= 28 ? "watch" : "normal" }
        ],
        actionTitle: kitchenRisk
          ? "Prepare kitchen and expo for predicted rush pressure"
          : hostRisk
            ? "Prepare host stand for predicted arrival congestion"
            : laborRisk
              ? "Review staffing plan before labor exceeds target"
              : weatherRisk
                ? "Prepare indoor seating plan for weather disruption"
                : "Review the next predicted operating risk",
        actionNote: `${riskDetail} Expected ${p30 >= 78 ? "within 30 minutes" : p60 >= 72 ? "within 30–60 minutes" : "within 60–90 minutes"}.`
      }
    };
  }

  const PREDICTIVE_ALERT_KEY = "blueCurrent.predictiveAlert.v34.1.0d";

  function loadPredictiveAlertState() {
    try {
      const value = JSON.parse(localStorage.getItem(PREDICTIVE_ALERT_KEY));
      if (!value || typeof value !== "object") return {};
      if (value.snoozedUntil && Date.now() >= new Date(value.snoozedUntil).getTime()) {
        localStorage.removeItem(PREDICTIVE_ALERT_KEY);
        return {};
      }
      return value;
    } catch (error) {
      return {};
    }
  }

  function savePredictiveAlertState(state) {
    try {
      localStorage.setItem(PREDICTIVE_ALERT_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("[PredictiveOperations] Alert state could not be saved.", error);
    }
  }

  function alertLevelFor(result) {
    const peak = Math.max(...result.pressure);
    if (peak >= 86) return "critical";
    if (peak >= 72) return "warning";
    return "watch";
  }

  function syncPredictiveAlertState(result) {
    const container = document.querySelector(".predictive-priority");
    const levelWrap = document.querySelector(".predictive-alert-level");
    const level = byId("predictiveAlertLevel");
    const acknowledge = byId("predictiveAcknowledgeAlert");
    const snooze = byId("predictiveSnoozeAlert");
    const status = byId("predictiveActionStatus");
    if (!container || !levelWrap || !level || !acknowledge || !snooze) return;

    const state = loadPredictiveAlertState();
    const alertLevel = alertLevelFor(result);

    levelWrap.dataset.level = alertLevel;
    level.textContent = alertLevel.charAt(0).toUpperCase() + alertLevel.slice(1);

    container.dataset.alertState = state.acknowledged
      ? "acknowledged"
      : state.snoozedUntil
        ? "snoozed"
        : "active";

    acknowledge.classList.toggle("is-active", Boolean(state.acknowledged));
    acknowledge.textContent = state.acknowledged ? "Acknowledged" : "Acknowledge";

    snooze.classList.toggle("is-active", Boolean(state.snoozedUntil));
    snooze.textContent = state.snoozedUntil ? "Snoozed" : "Snooze 30 min";

    if (state.snoozedUntil && status) {
      status.textContent = `Alert snoozed until ${new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(state.snoozedUntil))}.`;
    } else if (state.acknowledged && status) {
      status.textContent = "Predicted risk acknowledged.";
    }
  }

  function acknowledgePredictiveAlert() {
    const current = loadPredictiveAlertState();
    const next = {
      acknowledged: !current.acknowledged,
      acknowledgedAt: !current.acknowledged ? new Date().toISOString() : null,
      snoozedUntil: null
    };
    savePredictiveAlertState(next);
    renderPrediction();
  }

  function snoozePredictiveAlert() {
    const until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    savePredictiveAlertState({
      acknowledged: false,
      acknowledgedAt: null,
      snoozedUntil: until
    });
    renderPrediction();
  }

  function apiClient() {
    const module = window.BlueCurrentModules?.cloudFoundation;
    return module?.api || (window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null);
  }

  function renderRiskSignals(signals) {
    const container = byId("predictiveRiskSignals");
    if (!container) return;

    container.replaceChildren();
    signals.forEach(signal => {
      const chip = document.createElement("span");
      chip.textContent = signal.label;
      if (signal.tone === "watch") chip.classList.add("is-watch");
      if (signal.tone === "risk") chip.classList.add("is-risk");
      container.append(chip);
    });
  }

  async function createPreventiveAction() {
    const status = byId("predictiveActionStatus");
    const button = byId("predictiveCreateAction");
    const result = calculatePrediction();
    const api = apiClient();

    if (!status || !button) return;

    if (!api?.hasCapability?.("createManagerAction") || !api.token) {
      status.textContent = "Sign in to save a preventive action.";
      return;
    }

    button.disabled = true;
    status.textContent = "Creating preventive action…";

    try {
      const action = await api.createManagerAction({
        locationId: "loc_marina",
        title: result.risk.actionTitle,
        source: "Predictive Operations",
        priority: result.pressure[2] >= 82 ? "high" : "medium",
        due: result.risk.eta
      });

      if (api?.hasCapability?.("updateManagerAction")) {
        try {
          await api.updateManagerAction(action.id, {
            locationId: "loc_marina",
            noteUpdate: true,
            note: result.risk.actionNote
          });
          action.note = result.risk.actionNote;
        } catch (noteError) {
          console.warn("[PredictiveOperations] Preventive note could not be attached.", noteError);
        }
      }

      status.textContent = "Preventive action added.";
      window.dispatchEvent(new CustomEvent("bluecurrent:manager-action-created", {
        detail: { action }
      }));
    } catch (error) {
      status.textContent = error.message || "Could not create preventive action.";
    } finally {
      button.disabled = false;
    }
  }

  function buildForecastWatchlist(result) {
    const reservations = number("operationReservations", 0);
    const scheduled = number("operationScheduled", 0);
    const labor = number("operationLabor", 0);
    const rain = number("weatherRain", 0);
    const weather = text("weatherCondition", "").toLowerCase();
    const p60 = result.pressure[2];

    const items = [
      {
        title: "Guest arrival pace",
        detail: reservations >= 80
          ? `${Math.round(reservations)} reservations may create clustered arrivals.`
          : "Reservation arrivals are currently manageable.",
        tone: reservations >= 100 ? "risk" : reservations >= 70 ? "watch" : "normal"
      },
      {
        title: "Staffing coverage",
        detail: scheduled > 0
          ? `${Math.round(scheduled)} team members are scheduled for the current outlook.`
          : "Scheduled staffing data is still loading.",
        tone: scheduled > 0 && reservations / scheduled > 6 ? "risk" : scheduled > 0 && reservations / scheduled > 4.5 ? "watch" : "normal"
      },
      {
        title: "Kitchen pressure",
        detail: p60 >= 82
          ? "Prep, expo, and ticket pacing may tighten within the next hour."
          : "Kitchen load is projected to remain controlled.",
        tone: p60 >= 82 ? "risk" : p60 >= 68 ? "watch" : "normal"
      },
      {
        title: "Labor pace",
        detail: `Projected labor is ${labor.toFixed(1)}%.`,
        tone: labor >= 30 ? "risk" : labor >= 28 ? "watch" : "normal"
      },
      {
        title: "Weather effect",
        detail: /rain|storm/.test(weather) || rain >= 40
          ? "Seating demand may shift indoors."
          : "Weather is not expected to disrupt seating flow.",
        tone: /storm/.test(weather) || rain >= 70 ? "risk" : /rain/.test(weather) || rain >= 40 ? "watch" : "normal"
      }
    ];

    return items
      .sort((a, b) => {
        const rank = { risk: 0, watch: 1, normal: 2 };
        return rank[a.tone] - rank[b.tone];
      })
      .slice(0, 3);
  }

  function renderForecastWatchlist(result) {
    const list = byId("predictiveWatchlistList");
    const count = byId("predictiveWatchlistCount");
    if (!list || !count) return;

    const items = buildForecastWatchlist(result);
    count.textContent = `${items.length} signal${items.length === 1 ? "" : "s"}`;
    list.replaceChildren();

    items.forEach(item => {
      const article = document.createElement("article");
      article.dataset.tone = item.tone;

      const dot = document.createElement("span");
      dot.className = "predictive-watch-dot";

      const copy = document.createElement("div");
      copy.innerHTML = "<strong></strong><small></small>";
      copy.querySelector("strong").textContent = item.title;
      copy.querySelector("small").textContent = item.detail;

      const badge = document.createElement("b");
      badge.textContent = item.tone === "risk" ? "Risk" : item.tone === "watch" ? "Watch" : "Stable";

      article.append(dot, copy, badge);
      list.append(article);
    });
  }

  function renderPrediction() {
    const result = calculatePrediction();
    const pressureIds = ["predictivePressureNow", "predictivePressure30", "predictivePressure60", "predictivePressure90"];
    pressureIds.forEach((id, index) => {
      if (byId(id)) byId(id).textContent = String(result.pressure[index]);
    });

    byId("predictiveOperationsConfidence").textContent = `Confidence ${result.confidence}%`;
    byId("predictiveHostTitle").textContent = result.host[0];
    byId("predictiveHostDetail").textContent = result.host[1];
    byId("predictiveKitchenTitle").textContent = result.kitchen[0];
    byId("predictiveKitchenDetail").textContent = result.kitchen[1];
    byId("predictiveLaborTitle").textContent = result.labor[0];
    byId("predictiveLaborDetail").textContent = result.labor[1];
    byId("predictiveRevenueTitle").textContent = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(result.revenue[0]) + " next 90 min";
    byId("predictiveRevenueDetail").textContent = result.revenue[1];
    byId("predictiveRiskTitle").textContent = result.risk.title;
    byId("predictiveRiskDetail").textContent = result.risk.detail;
    byId("predictiveRiskEta").textContent = result.risk.eta;
    byId("predictiveRiskAction").dataset.target = result.risk.target;
    renderRiskSignals(result.risk.signals);
    renderForecastWatchlist(result);
    syncPredictiveAlertState(result);
  }

  function observe() {
    if (!window.MutationObserver) return;
    const ids = [
      "operationReservations",
      "operationScheduled",
      "operationLabor",
      "forecastRevenue",
      "forecastChange",
      "weatherRain",
      "weatherCondition",
      "managerActionItems",
      "attentionList"
    ];

    const observer = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(renderPrediction, 75);
    });

    ids.map(byId).filter(Boolean).forEach(node => observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    }));
  }

  function init() {
    if (!byId("predictiveOperationsPanel")) return;
    byId("predictiveRiskAction")?.addEventListener("click", event => {
      const target = byId(event.currentTarget.dataset.target || "managerShiftBrief");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    byId("predictiveAcknowledgeAlert")?.addEventListener("click", acknowledgePredictiveAlert);
    byId("predictiveSnoozeAlert")?.addEventListener("click", snoozePredictiveAlert);
    byId("predictiveCreateAction")?.addEventListener("click", createPreventiveAction);
    renderPrediction();
    observe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
