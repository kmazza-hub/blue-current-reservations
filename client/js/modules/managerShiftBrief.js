(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.managerShift.started";

  const byId = id => document.getElementById(id);

  function text(id, fallback = "—") {
    const node = byId(id);
    const value = node?.textContent?.trim();
    return value || fallback;
  }

  function formatDate() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(new Date());
  }

  function applyStartedState(started) {
    const panel = byId("managerShiftBrief");
    const button = byId("managerShiftStart");
    const status = byId("managerShiftBriefStatus");
    if (!panel || !button || !status) return;

    panel.classList.toggle("is-started", started);
    button.textContent = started ? "Shift started" : "Start shift";
    status.textContent = started ? `Started · ${formatDate()}` : "Live operating brief";
  }

  function openManagerActions() {
    return [...document.querySelectorAll("#managerActionItems .manager-action-item")]
      .filter(item => !item.classList.contains("is-complete"))
      .map(item => {
        const title = item.querySelector(".manager-action-copy strong")?.textContent?.trim();
        const detail = item.querySelector(".manager-action-copy small")?.textContent?.trim();
        return { title, detail };
      })
      .filter(item => item.title);
  }

  function fallbackPriorities() {
    const priorities = [];

    const attentionItems = [...document.querySelectorAll("#attentionList li strong")]
      .map(node => node.textContent.trim())
      .filter(Boolean);

    for (const item of attentionItems.slice(0, 3)) {
      priorities.push(item);
    }

    const pto = Number.parseInt(text("operationPto", "0"), 10);
    if (pto > 0) priorities.push(`Review ${pto} pending PTO request${pto === 1 ? "" : "s"}.`);

    return priorities;
  }

  function renderPriorities() {
    const list = byId("managerShiftPriorityList");
    const count = byId("managerShiftPriorityCount");
    if (!list || !count) return;

    const actionItems = openManagerActions();
    const priorities = actionItems.length
      ? actionItems.slice(0, 5).map(item => item.title)
      : fallbackPriorities().slice(0, 5);

    list.replaceChildren();

    if (!priorities.length) {
      const li = document.createElement("li");
      li.textContent = "No urgent priorities are currently open.";
      list.append(li);
      count.textContent = "Clear";
      return;
    }

    priorities.forEach(priority => {
      const li = document.createElement("li");
      li.textContent = priority;
      list.append(li);
    });

    count.textContent = `${priorities.length} item${priorities.length === 1 ? "" : "s"}`;
  }

  function buildNarrative() {
    const forecast = text("forecastRevenue");
    const change = text("forecastChange");
    const reservations = text("operationReservations");
    const labor = text("operationLabor");
    const weather = text("weatherCondition");
    const impact = text("weatherImpact", "");
    const attentionCount = document.querySelectorAll("#attentionList li").length;
    const actions = openManagerActions().length;

    const sentences = [
      `Today is forecast at ${forecast}${change !== "—" ? ` (${change} versus last year)` : ""}.`,
      `${reservations} reservations are currently booked, with projected labor at ${labor}.`,
      `${weather}${impact ? `. ${impact}` : "."}`
    ];

    if (attentionCount || actions) {
      sentences.push(
        `${Math.max(attentionCount, actions)} operating priorit${Math.max(attentionCount, actions) === 1 ? "y" : "ies"} should be reviewed before service.`
      );
    } else {
      sentences.push("No urgent operating issues are currently open.");
    }

    return sentences.join(" ");
  }

  function syncHandoff() {
    const meta = byId("managerShiftHandoffMeta");
    const summary = byId("managerShiftHandoffSummary");
    const tags = byId("managerShiftHandoffTags");
    const alert = byId("managerShiftHandoffAlert");
    if (!meta || !summary || !tags || !alert) return;

    meta.textContent = text("handoffMeta", "No handoff posted");
    summary.textContent = text("handoffSummary", "No previous shift summary is available yet.");

    tags.replaceChildren();
    const sourceTags = [...document.querySelectorAll("#handoffHighlights span, #handoffHighlights b, #handoffHighlights li")]
      .map(node => node.textContent.trim())
      .filter(Boolean)
      .slice(0, 6);

    sourceTags.forEach(value => {
      const chip = document.createElement("span");
      chip.textContent = value;
      tags.append(chip);
    });

    const sourceAlert = byId("handoffAttention");
    const alertText = sourceAlert?.textContent?.trim() || "";
    alert.hidden = !alertText;
    alert.textContent = alertText;
  }

  function numericValue(id, fallback = 0) {
    const raw = text(id, String(fallback)).replace(/[$,%+,]/g, "");
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function buildManagerRecommendation() {
    const labor = numericValue("operationLabor", 0);
    const reservations = numericValue("operationReservations", 0);
    const scheduled = numericValue("operationScheduled", 0);
    const pendingPto = numericValue("operationPto", 0);
    const forecastChange = numericValue("forecastChange", 0);
    const weather = text("weatherCondition", "").toLowerCase();
    const rain = numericValue("weatherRain", 0);
    const attention = document.querySelectorAll("#attentionList li").length;
    const openActions = openManagerActions().length;

    const recommendations = [];
    let confidence = "Medium";

    if (labor >= 30) {
      recommendations.push(`Projected labor is ${labor.toFixed(1)}%. Review the first cut window and avoid adding coverage unless demand rises.`);
      confidence = "High";
    } else if (labor > 0 && labor <= 25) {
      recommendations.push(`Labor is controlled at ${labor.toFixed(1)}%. Preserve coverage through the peak rather than cutting early.`);
    }

    if (forecastChange >= 8) {
      recommendations.push(`Sales are tracking ${forecastChange.toFixed(1)}% ahead of last year. Increase prep and confirm peak staffing.`);
      confidence = "High";
    } else if (forecastChange <= -5) {
      recommendations.push(`Sales are tracking ${Math.abs(forecastChange).toFixed(1)}% below last year. Stage labor conservatively and watch walk-in pace.`);
      confidence = "High";
    }

    if (weather.includes("rain") || weather.includes("storm") || rain >= 50) {
      recommendations.push(`Weather may reduce patio demand. Contact outdoor reservations and prepare an indoor seating plan.`);
      confidence = "High";
    } else if (
      weather.includes("sun") ||
      weather.includes("clear") ||
      weather.includes("fair")
    ) {
      recommendations.push(`Favorable weather supports patio demand. Verify patio setup and outdoor server coverage before the rush.`);
    }

    if (reservations >= 80 && scheduled > 0) {
      recommendations.push(`${Math.round(reservations)} reservations are booked. Confirm host coverage and table-turn pacing before service.`);
    }

    if (pendingPto > 0) {
      recommendations.push(`Resolve ${Math.round(pendingPto)} pending PTO request${pendingPto === 1 ? "" : "s"} before finalizing upcoming schedules.`);
    }

    if (attention > 0 || openActions > 0) {
      const count = Math.max(attention, openActions);
      recommendations.push(`Clear the ${count} highest-priority operating item${count === 1 ? "" : "s"} before service begins.`);
    }

    if (!recommendations.length) {
      recommendations.push("The operation is balanced. Maintain current staffing, monitor guest pace, and protect service readiness.");
      confidence = "Medium";
    }

    return {
      message: recommendations.slice(0, 3).join(" "),
      confidence
    };
  }

  function apiClient() {
    const module = window.BlueCurrentModules?.cloudFoundation;
    return module?.api || (window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null);
  }

  function recommendationTitle(message) {
    const firstSentence = String(message || "").split(/(?<=[.!?])\s+/)[0] || "Review Blue Current recommendation";
    return firstSentence.slice(0, 137).replace(/[.!?]+$/, "") + ".";
  }

  async function addRecommendationToActionList() {
    const button = byId("aiRecommendationToAction");
    const status = byId("aiRecommendationActionStatus");
    const recommendation = text("aiRecommendation", "");
    const confidence = text("aiConfidence", "Medium");

    if (!button || !status || !recommendation) return;

    const api = apiClient();
    if (!api?.hasCapability?.("createManagerAction") || !api.token) {
      status.textContent = "Sign in to save this recommendation.";
      return;
    }

    button.disabled = true;
    status.textContent = "Adding action…";

    try {
      const action = await api.createManagerAction({
        locationId: "loc_marina",
        title: recommendationTitle(recommendation),
        source: "AI Brief",
        priority: confidence === "High" ? "high" : "medium",
        due: "Before service"
      });

      status.textContent = "Added to today’s action list.";
      window.dispatchEvent(new CustomEvent("bluecurrent:manager-action-created", {
        detail: { action }
      }));
    } catch (error) {
      status.textContent = error.message || "Could not add recommendation.";
    } finally {
      button.disabled = false;
    }
  }

  function bindRecommendationAction() {
    const button = byId("aiRecommendationToAction");
    if (!button) return;
    button.addEventListener("click", addRecommendationToActionList);
  }

  function buildRecommendationSignals() {
    const labor = numericValue("operationLabor", 0);
    const reservations = numericValue("operationReservations", 0);
    const scheduled = numericValue("operationScheduled", 0);
    const pendingPto = numericValue("operationPto", 0);
    const forecastChange = numericValue("forecastChange", 0);
    const weather = text("weatherCondition", "Unknown");
    const rain = numericValue("weatherRain", 0);
    const openActions = openManagerActions().length;
    const attention = document.querySelectorAll("#attentionList li").length;

    return [
      {
        label: `Labor ${labor ? `${labor.toFixed(1)}%` : "—"}`,
        tone: labor >= 30 ? "risk" : labor >= 28 ? "watch" : "normal"
      },
      {
        label: `${Math.round(reservations)} reservations`,
        tone: reservations >= 80 ? "watch" : "normal"
      },
      {
        label: `${Math.round(scheduled)} scheduled`,
        tone: "normal"
      },
      {
        label: `${forecastChange >= 0 ? "+" : ""}${forecastChange.toFixed(1)}% vs. last year`,
        tone: forecastChange <= -5 ? "risk" : forecastChange >= 8 ? "watch" : "normal"
      },
      {
        label: `${weather}${rain ? ` · ${Math.round(rain)}% rain` : ""}`,
        tone: /rain|storm/i.test(weather) || rain >= 50 ? "risk" : "normal"
      },
      {
        label: `${Math.round(pendingPto)} PTO pending`,
        tone: pendingPto > 0 ? "watch" : "normal"
      },
      {
        label: `${Math.max(openActions, attention)} open priorities`,
        tone: Math.max(openActions, attention) >= 4 ? "risk" : Math.max(openActions, attention) > 0 ? "watch" : "normal"
      }
    ];
  }

  function syncRecommendationSignals() {
    const container = byId("aiRecommendationSignals");
    if (!container) return;

    container.replaceChildren();
    buildRecommendationSignals().forEach(signal => {
      const chip = document.createElement("span");
      chip.textContent = signal.label;
      if (signal.tone === "watch") chip.classList.add("signal-watch");
      if (signal.tone === "risk") chip.classList.add("signal-risk");
      container.append(chip);
    });
  }

  function bindRecommendationWhy() {
    const toggle = byId("aiRecommendationWhyToggle");
    const panel = byId("aiRecommendationWhy");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
      toggle.textContent = willOpen ? "Hide why" : "Why?";
      if (willOpen) syncRecommendationSignals();
    });
  }

  function calculateRecommendationImpact() {
    const labor = numericValue("operationLabor", 0);
    const forecast = numericValue("forecastRevenue", 0);
    const reservations = numericValue("operationReservations", 0);
    const scheduled = numericValue("operationScheduled", 0);
    const rain = numericValue("weatherRain", 0);
    const weather = text("weatherCondition", "").toLowerCase();
    const confidenceText = text("aiConfidence", "Medium");

    let laborDelta = 0.4;
    let savings = Math.max(45, Math.round((forecast * 0.006) / 5) * 5);
    let waitImpact = 0.3;
    let risk = "Low";
    let confidence = confidenceText === "High" ? 91 : 82;

    if (labor >= 30) {
      laborDelta = 1.2;
      savings = Math.max(120, Math.round((forecast * 0.011) / 5) * 5);
      waitImpact = reservations >= 80 ? 0.8 : 0.4;
      risk = reservations >= 100 ? "Medium" : "Low";
    } else if (labor >= 28) {
      laborDelta = 0.8;
      savings = Math.max(80, Math.round((forecast * 0.008) / 5) * 5);
      waitImpact = reservations >= 80 ? 0.6 : 0.3;
    } else if (labor > 0 && labor <= 25) {
      laborDelta = -0.2;
      savings = 0;
      waitImpact = -0.1;
      risk = "Low";
    }

    if (/rain|storm/.test(weather) || rain >= 50) {
      risk = reservations >= 70 ? "Medium" : risk;
      waitImpact += 0.2;
      confidence = Math.min(95, confidence + 2);
    }

    if (scheduled > 0 && reservations / scheduled > 6) {
      risk = "Medium";
      waitImpact += 0.4;
    }

    const afterLabor = Math.max(0, labor - laborDelta);
    const summary = savings > 0
      ? `Estimated savings of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(savings)} with approximately ${waitImpact.toFixed(1)} minutes of guest wait impact.`
      : "The current recommendation favors protecting service capacity rather than reducing labor.";

    return {
      beforeLabor: labor,
      afterLabor,
      savings,
      waitImpact,
      risk,
      confidence,
      summary
    };
  }

  function syncImpactPreview() {
    const impact = calculateRecommendationImpact();

    const before = byId("aiImpactLaborBefore");
    const after = byId("aiImpactLaborAfter");
    const savings = byId("aiImpactSavings");
    const wait = byId("aiImpactWait");
    const risk = byId("aiImpactRisk");
    const confidence = byId("aiImpactConfidence");
    const summary = byId("aiImpactSummary");

    if (before) before.textContent = `${impact.beforeLabor.toFixed(1)}%`;
    if (after) after.textContent = `${impact.afterLabor.toFixed(1)}%`;
    if (savings) {
      savings.textContent = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(impact.savings);
    }
    if (wait) wait.textContent = `${impact.waitImpact >= 0 ? "+" : ""}${impact.waitImpact.toFixed(1)} min`;
    if (risk) risk.textContent = impact.risk;
    if (confidence) confidence.textContent = `Confidence ${impact.confidence}%`;
    if (summary) summary.textContent = impact.summary;
  }

  function syncManagerRecommendation() {
    const recommendation = byId("aiRecommendation");
    const confidence = byId("aiConfidence");
    if (!recommendation || !confidence) return;

    const result = buildManagerRecommendation();
    recommendation.textContent = result.message;
    confidence.textContent = result.confidence;
    syncRecommendationSignals();
    syncImpactPreview();
  }

  function syncFromCommandCenter() {
    const forecast = byId("managerShiftForecastSales");
    const forecastDelta = byId("managerShiftForecastDelta");
    const reservations = byId("managerShiftReservations");
    const reservationNote = byId("managerShiftReservationNote");
    const labor = byId("managerShiftLabor");
    const laborNote = byId("managerShiftLaborNote");
    const weather = byId("managerShiftWeather");
    const weatherNote = byId("managerShiftWeatherNote");
    const narrative = byId("managerShiftNarrative");

    if (forecast) forecast.textContent = text("forecastRevenue", "$19,800");
    if (forecastDelta) forecastDelta.textContent = `${text("forecastChange", "+0%")} vs. last year`;
    if (reservations) reservations.textContent = text("operationReservations", "0");
    if (reservationNote) reservationNote.textContent = `${text("operationScheduled", "0")} team members scheduled`;
    if (labor) labor.textContent = text("operationLabor", "—");
    if (laborNote) laborNote.textContent = `${text("operationPto", "0")} PTO request${text("operationPto", "0") === "1" ? "" : "s"} pending`;
    if (weather) weather.textContent = text("weatherTemperature", "—");
    if (weatherNote) weatherNote.textContent = `${text("weatherCondition", "Weather loading")} · ${text("weatherRain", "Rain —")}`;
    if (narrative) narrative.textContent = buildNarrative();

    renderPriorities();
    syncHandoff();
    syncManagerRecommendation();
  }

  function observeLiveData() {
    const targets = [
      "forecastRevenue",
      "forecastChange",
      "operationReservations",
      "operationScheduled",
      "operationPto",
      "operationLabor",
      "weatherTemperature",
      "weatherCondition",
      "weatherRain",
      "weatherImpact",
      "attentionList",
      "managerActionItems",
      "handoffMeta",
      "handoffSummary",
      "handoffHighlights",
      "handoffAttention",
      "aiRecommendation",
      "aiConfidence"
    ]
      .map(byId)
      .filter(Boolean);

    if (!targets.length || !window.MutationObserver) return;

    const observer = new MutationObserver(() => {
      window.clearTimeout(observeLiveData.timer);
      observeLiveData.timer = window.setTimeout(syncFromCommandCenter, 60);
    });

    targets.forEach(target => observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    }));
  }

  function init() {
    const panel = byId("managerShiftBrief");
    const button = byId("managerShiftStart");
    if (!panel || !button) return;

    applyStartedState(localStorage.getItem(STORAGE_KEY) === "true");
    bindRecommendationAction();
    bindRecommendationWhy();
    syncFromCommandCenter();
    observeLiveData();

    button.addEventListener("click", () => {
      const next = !panel.classList.contains("is-started");
      localStorage.setItem(STORAGE_KEY, String(next));
      applyStartedState(next);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
