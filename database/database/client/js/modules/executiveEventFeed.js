(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.executiveEventFeed.v34.1.5b";
  const byId = id => document.getElementById(id);

  const state = {
    filter: "all",
    events: []
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function loadEvents() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.events = Array.isArray(value) ? value : [];
    } catch {
      state.events = [];
    }
  }

  function saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events.slice(0, 120)));
  }

  function addEvent(event) {
    const normalized = {
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      time: event.time || nowIso(),
      location: event.location || "Portfolio",
      category: event.category || "operations",
      severity: event.severity || "info",
      title: event.title || "Portfolio event",
      detail: event.detail || "",
      resolved: Boolean(event.resolved),
      responseMinutes: Number.isFinite(event.responseMinutes) ? event.responseMinutes : null
    };

    state.events.unshift(normalized);
    saveEvents();
    render();
  }

  function seedEvents() {
    if (state.events.length) return;

    state.events = [
      {
        id: "seed_1",
        time: new Date(Date.now() - 8 * 60000).toISOString(),
        location: "Asbury Boardwalk",
        category: "staffing",
        severity: "critical",
        title: "Labor pressure exceeded portfolio target",
        detail: "Projected labor reached 30.4% and requires district review.",
        resolved: false,
        responseMinutes: null
      },
      {
        id: "seed_2",
        time: new Date(Date.now() - 18 * 60000).toISOString(),
        location: "Marina Grill",
        category: "guests",
        severity: "warning",
        title: "Reservation pace increased",
        detail: "Dinner arrivals are building faster than the current host plan.",
        resolved: false,
        responseMinutes: null
      },
      {
        id: "seed_3",
        time: new Date(Date.now() - 34 * 60000).toISOString(),
        location: "Lobster Shanty",
        category: "operations",
        severity: "success",
        title: "Kitchen pressure alert resolved",
        detail: "Expo coverage was adjusted before the projected rush.",
        resolved: true,
        responseMinutes: 12
      },
      {
        id: "seed_4",
        time: new Date(Date.now() - 51 * 60000).toISOString(),
        location: "Portfolio",
        category: "ai",
        severity: "info",
        title: "Executive Morning Brief generated",
        detail: "Blue Current summarized portfolio health, labor, alerts, and priorities.",
        resolved: true,
        responseMinutes: 0
      }
    ];

    saveEvents();
  }

  function filteredEvents() {
    if (state.filter === "all") return state.events;
    if (state.filter === "critical") {
      return state.events.filter(event => event.severity === "critical");
    }
    return state.events.filter(event => event.category === state.filter);
  }

  function formatTime(value) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function renderKPIs() {
    const today = new Date().toDateString();
    const todayEvents = state.events.filter(event => new Date(event.time).toDateString() === today);
    const critical = todayEvents.filter(event => event.severity === "critical").length;
    const resolved = todayEvents.filter(event => event.resolved).length;
    const responseValues = todayEvents
      .map(event => event.responseMinutes)
      .filter(value => Number.isFinite(value));

    const average = responseValues.length
      ? Math.round(responseValues.reduce((sum, value) => sum + value, 0) / responseValues.length)
      : null;

    byId("executiveEventCount").textContent = String(todayEvents.length);
    byId("executiveCriticalCount").textContent = String(critical);
    byId("executiveResolvedCount").textContent = String(resolved);
    byId("executiveResponseTime").textContent = average === null ? "—" : `${average} min`;

    byId("executiveEventHeadline").textContent =
      critical > 0
        ? `${critical} critical portfolio event${critical === 1 ? "" : "s"} require leadership attention.`
        : todayEvents.some(event => event.severity === "warning")
          ? "Portfolio activity is stable with several watch items."
          : "No critical portfolio events are currently open.";

    byId("executiveEventUpdated").textContent = `Updated ${formatTime(nowIso())}`;
  }

  function render() {
    const list = byId("executiveEventList");
    if (!list) return;

    renderKPIs();
    list.replaceChildren();

    const events = filteredEvents();

    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "executive-event-empty";
      empty.textContent = "No events match this filter.";
      list.append(empty);
      return;
    }

    events.slice(0, 24).forEach(event => {
      const article = document.createElement("article");
      article.className = "executive-event-item";
      article.dataset.severity = event.severity;

      const marker = document.createElement("span");
      marker.className = "executive-event-marker";

      const time = document.createElement("span");
      time.className = "executive-event-time";
      time.textContent = formatTime(event.time);

      const copy = document.createElement("div");
      copy.className = "executive-event-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent = event.location;
      copy.querySelector("strong").textContent = event.title;
      copy.querySelector("p").textContent = event.detail;

      const badge = document.createElement("span");
      badge.className = "executive-event-badge";
      badge.textContent = event.severity;

      article.append(marker, time, copy, badge);
      list.append(article);
    });
  }

  function bindSystemEvents() {
    window.addEventListener("bluecurrent:manager-action-created", event => {
      const action = event.detail?.action;
      if (!action) return;

      addEvent({
        location: action.locationName || action.locationId || "Portfolio",
        category: action.source === "Executive Intelligence" ? "operations" : "ai",
        severity: action.priority === "high" ? "warning" : "info",
        title: `${action.source || "Blue Current"} action created`,
        detail: action.title || "A new portfolio action was created."
      });
    });

    window.addEventListener("bluecurrent:location-selected", event => {
      const location = event.detail?.location;
      if (!location) return;

      addEvent({
        location: location.name,
        category: "operations",
        severity: "info",
        title: "Location opened from District Command",
        detail: `${location.name} was selected for portfolio review.`
      });
    });
  }

  function observeExecutiveActions() {
    const center = byId("executiveActionCenter");
    if (!center || !window.MutationObserver) return;

    let previousCompleted = Number.parseInt(
      byId("executiveActionCompletedCount")?.textContent || "0",
      10
    ) || 0;

    const observer = new MutationObserver(() => {
      const currentCompleted = Number.parseInt(
        byId("executiveActionCompletedCount")?.textContent || "0",
        10
      ) || 0;

      if (currentCompleted > previousCompleted) {
        addEvent({
          location: "Portfolio",
          category: "operations",
          severity: "success",
          title: "Executive action completed",
          detail: "Leadership closed an executive action and moved it to review.",
          resolved: true,
          responseMinutes: 15
        });
      }

      previousCompleted = currentCompleted;
    });

    observer.observe(center, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function init() {
    if (!byId("executiveEventFeed")) return;

    loadEvents();
    seedEvents();

    byId("executiveEventFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      render();
    });

    bindSystemEvents();
    observeExecutiveActions();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();
