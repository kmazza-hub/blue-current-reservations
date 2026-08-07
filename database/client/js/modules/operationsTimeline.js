(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  function text(id, fallback = "") {
    return byId(id)?.textContent?.trim() || fallback;
  }

  function nowLabel(offsetMinutes = 0) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(Date.now() + offsetMinutes * 60000));
  }

  function collectTimelineEvents() {
    const events = [];

    const pulseState = text("restaurantPulseState", "Building");
    const pulseScore = text("restaurantPulseScore", "—");
    events.push({
      time: nowLabel(),
      category: "service",
      tone: /critical/i.test(pulseState) ? "risk" : /busy|building/i.test(pulseState) ? "watch" : "normal",
      title: `Restaurant Pulse: ${pulseState}`,
      detail: `Current operating-health score is ${pulseScore}.`,
      badge: "Live"
    });

    const riskTitle = text("predictiveRiskTitle", "");
    const riskEta = text("predictiveRiskEta", "");
    const riskDetail = text("predictiveRiskDetail", "");
    if (riskTitle) {
      events.push({
        time: riskEta || "Next",
        category: "risk",
        tone: /no immediate/i.test(riskTitle) ? "normal" : "risk",
        title: riskTitle,
        detail: riskDetail || "Blue Current is monitoring the predicted risk.",
        badge: "Forecast"
      });
    }

    const selectedHour = text("shiftRiskDetailTime", "");
    const selectedScore = Number.parseInt(text("shiftRiskDetailScore", "0"), 10) || 0;
    const selectedSummary = text("shiftRiskDetailSummary", "");
    if (selectedHour) {
      events.push({
        time: selectedHour,
        category: "risk",
        tone: selectedScore >= 72 ? "risk" : selectedScore >= 52 ? "watch" : "normal",
        title: `Shift risk score ${selectedScore}`,
        detail: selectedSummary,
        badge: "Heatmap"
      });
    }

    const handoffMeta = text("handoffMeta", "");
    const handoffSummary = text("handoffSummary", "");
    if (handoffMeta || handoffSummary) {
      events.push({
        time: handoffMeta || "Previous shift",
        category: "people",
        tone: text("handoffAttention", "") ? "watch" : "normal",
        title: "Previous shift handoff",
        detail: handoffSummary || "No summary has been posted.",
        badge: "Handoff"
      });
    }

    const openActions = [...document.querySelectorAll("#managerActionItems .manager-action-item:not(.is-complete)")]
      .slice(0, 4);

    openActions.forEach((item, index) => {
      const title = item.querySelector(".manager-action-copy strong")?.textContent?.trim();
      const detail = item.querySelector(".manager-action-copy small")?.textContent?.trim();
      const priority = item.dataset.priority || "medium";
      if (!title) return;

      events.push({
        time: index === 0 ? "Now" : `Priority ${index + 1}`,
        category: priority === "high" ? "risk" : "people",
        tone: priority === "high" ? "risk" : priority === "medium" ? "watch" : "normal",
        title,
        detail: detail || "Manager action is open.",
        badge: "Action"
      });
    });

    const weather = text("weatherCondition", "");
    const rain = text("weatherRain", "");
    if (weather) {
      events.push({
        time: nowLabel(30),
        category: "service",
        tone: /rain|storm/i.test(weather) || Number.parseFloat(rain) >= 50 ? "watch" : "normal",
        title: `Weather: ${weather}`,
        detail: rain ? `${rain} rain probability may affect seating flow.` : "Weather conditions are being monitored.",
        badge: "Weather"
      });
    }

    const reservationCount = text("operationReservations", "");
    if (reservationCount) {
      events.push({
        time: nowLabel(60),
        category: "service",
        tone: Number.parseInt(reservationCount, 10) >= 90 ? "watch" : "normal",
        title: `${reservationCount} reservations on the books`,
        detail: "Monitor arrival clustering, host coverage, and table availability.",
        badge: "Guests"
      });
    }

    return events;
  }

  const state = {
    filter: "all"
  };

  function filteredEvents(events) {
    if (state.filter === "all") return events;
    return events.filter(event => event.category === state.filter);
  }

  function renderTimeline() {
    const list = byId("operationsTimelineList");
    const summary = byId("operationsTimelineSummary");
    const updated = byId("operationsTimelineUpdated");
    if (!list || !summary || !updated) return;

    const allEvents = collectTimelineEvents();
    const events = filteredEvents(allEvents);

    summary.textContent = allEvents.some(event => event.tone === "risk")
      ? "The timeline contains at least one high-risk operating signal."
      : allEvents.some(event => event.tone === "watch")
        ? "The restaurant is stable, with several watch items developing."
        : "The restaurant is operating within expected conditions.";

    updated.textContent = `Updated ${nowLabel()}`;
    list.replaceChildren();

    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "operations-timeline-empty";
      empty.textContent = "No events match this filter.";
      list.append(empty);
      return;
    }

    events.forEach(event => {
      const article = document.createElement("article");
      article.className = "operations-timeline-item";
      article.dataset.tone = event.tone;

      const marker = document.createElement("span");
      marker.className = "operations-timeline-marker";

      const time = document.createElement("span");
      time.className = "operations-timeline-time";
      time.textContent = event.time;

      const copy = document.createElement("div");
      copy.className = "operations-timeline-copy";
      copy.innerHTML = "<strong></strong><p></p>";
      copy.querySelector("strong").textContent = event.title;
      copy.querySelector("p").textContent = event.detail;

      const badge = document.createElement("span");
      badge.className = "operations-timeline-badge";
      badge.textContent = event.badge;

      article.append(marker, time, copy, badge);
      list.append(article);
    });
  }

  function bindFilters() {
    document.querySelectorAll("[data-timeline-filter]").forEach(button => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.timelineFilter;
        document.querySelectorAll("[data-timeline-filter]").forEach(item => {
          item.classList.toggle("is-active", item === button);
        });
        renderTimeline();
      });
    });
  }

  function observe() {
    if (!window.MutationObserver) return;

    const ids = [
      "restaurantPulseState",
      "restaurantPulseScore",
      "predictiveRiskTitle",
      "predictiveRiskEta",
      "predictiveRiskDetail",
      "shiftRiskDetailTime",
      "shiftRiskDetailScore",
      "shiftRiskDetailSummary",
      "handoffMeta",
      "handoffSummary",
      "handoffAttention",
      "managerActionItems",
      "weatherCondition",
      "weatherRain",
      "operationReservations"
    ];

    const observer = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(renderTimeline, 80);
    });

    ids.map(byId).filter(Boolean).forEach(node => observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    }));
  }

  function init() {
    if (!byId("operationsTimelinePanel")) return;
    bindFilters();
    renderTimeline();
    observe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
