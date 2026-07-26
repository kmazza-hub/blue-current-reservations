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
      "managerActionItems"
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
