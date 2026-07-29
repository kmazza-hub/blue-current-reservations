(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.restaurantOpening.v35.0.1";
  const byId = id => document.getElementById(id);

  const defaultState = {
    status: "opening",
    checklist: {},
    notes: ""
  };

  const state = { ...defaultState };

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && typeof stored === "object") {
        state.status = stored.status || "opening";
        state.checklist = stored.checklist || {};
        state.notes = stored.notes || "";
      }
    } catch {
      Object.assign(state, defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatClock() {
    const now = new Date();
    const hour = now.getHours();

    byId("restaurantOpeningDaypart").textContent =
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    byId("restaurantOpeningClock").textContent = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);
  }

  function currentPhase() {
    const hour = new Date().getHours();

    if (hour < 10) return "opening";
    if (hour < 11) return "lunch-prep";
    if (hour < 15) return "lunch-service";
    if (hour < 16) return "afternoon";
    if (hour < 17) return "dinner-prep";
    if (hour < 22) return "dinner-rush";
    return "closing";
  }

  function renderTimeline() {
    const phase = state.status === "open" ? currentPhase() : "opening";

    document.querySelectorAll("#restaurantOpeningTimeline [data-phase]").forEach(item => {
      item.classList.toggle("is-current", item.dataset.phase === phase);
    });
  }

  function checklistInputs() {
    return [...document.querySelectorAll("[data-opening-task]")];
  }

  function renderChecklist() {
    const inputs = checklistInputs();

    inputs.forEach(input => {
      input.checked = Boolean(state.checklist[input.dataset.openingTask]);
      input.closest("label")?.classList.toggle("is-complete", input.checked);
    });

    const complete = inputs.filter(input => input.checked).length;
    const percent = inputs.length ? Math.round((complete / inputs.length) * 100) : 0;

    byId("restaurantOpeningChecklistCount").textContent = `${complete} / ${inputs.length}`;
    byId("restaurantOpeningReadiness").textContent = `${percent}%`;
    byId("restaurantOpeningReadinessBar").style.width = `${percent}%`;
    byId("restaurantOpeningReadinessDetail").textContent =
      percent === 100
        ? "Restaurant ready for service."
        : `${inputs.length - complete} opening task${inputs.length - complete === 1 ? "" : "s"} remaining.`;

    const assistantTitle = byId("restaurantOpeningAssistantTitle");
    assistantTitle.textContent =
      percent === 100
        ? "Opening tasks are complete."
        : `${inputs.length - complete} checklist item${inputs.length - complete === 1 ? "" : "s"} remain.`;

    byId("restaurantOpeningAdvance").textContent =
      percent === 100 && state.status !== "open"
        ? "Open restaurant"
        : state.status === "open"
          ? "Restaurant open"
          : "Complete checklist";

    byId("restaurantOpeningAdvance").disabled =
      percent < 100 || state.status === "open";
  }

  function renderStatus() {
    const wrap = byId("restaurantOpeningStatusWrap");
    const label = byId("restaurantOpeningStatus");

    wrap.dataset.status = state.status;
    label.textContent = state.status === "open" ? "Open" : "Opening";
    renderTimeline();
  }

  function bindChecklist() {
    checklistInputs().forEach(input => {
      input.addEventListener("change", () => {
        state.checklist[input.dataset.openingTask] = input.checked;
        saveState();
        renderChecklist();

        window.dispatchEvent(new CustomEvent("bluecurrent:opening-checklist-updated", {
          detail: {
            task: input.dataset.openingTask,
            complete: input.checked
          }
        }));
      });
    });
  }

  function bindStatus() {
    byId("restaurantOpeningAdvance")?.addEventListener("click", () => {
      const complete = checklistInputs().every(input => input.checked);
      if (!complete) return;

      state.status = "open";
      saveState();
      renderStatus();
      renderChecklist();

      window.dispatchEvent(new CustomEvent("bluecurrent:restaurant-opened", {
        detail: {
          locationId: "loc_marina",
          locationName: "Marina Grill",
          openedAt: new Date().toISOString()
        }
      }));
    });
  }

  function bindNotes() {
    const textarea = byId("restaurantOpeningNotes");
    const status = byId("restaurantOpeningNotesStatus");

    textarea.value = state.notes;

    byId("restaurantOpeningSaveNotes")?.addEventListener("click", () => {
      state.notes = textarea.value.trim();
      saveState();
      status.textContent = "Saved";

      window.dispatchEvent(new CustomEvent("bluecurrent:opening-notes-saved", {
        detail: { notes: state.notes }
      }));

      setTimeout(() => {
        status.textContent = "";
      }, 1600);
    });
  }

  function bindQuickActions() {
    document.querySelectorAll("[data-opening-target]").forEach(button => {
      button.addEventListener("click", () => {
        const target = byId(button.dataset.openingTarget);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function hydrateLiveValues() {
    const reservations =
      byId("operationReservations")?.textContent?.trim() ||
      byId("districtGuestsToday")?.textContent?.trim();

    if (reservations) {
      byId("restaurantOpeningReservations").textContent = reservations;
      byId("restaurantOpeningReservationsDetail").textContent =
        "Current live reservation and guest outlook.";
    }

    const labor = byId("operationLabor")?.textContent?.trim();
    if (labor) {
      byId("restaurantOpeningStaffingDetail").textContent =
        `Current labor projection: ${labor}.`;
    }

    const forecastHeadline = byId("executiveForecastHeadline")?.textContent?.trim();
    if (forecastHeadline) {
      byId("restaurantOpeningForecastDetail").textContent = forecastHeadline;
    }

    const weather = byId("weatherCondition")?.textContent?.trim();
    const rain = byId("weatherRain")?.textContent?.trim();
    if (weather) {
      byId("restaurantOpeningWeather").textContent = weather;
      byId("restaurantOpeningWeatherDetail").textContent =
        rain ? `${rain} rain probability.` : "Weather conditions loaded.";
    }
  }

  function observeLiveValues() {
    if (!window.MutationObserver) return;

    const ids = [
      "operationReservations",
      "districtGuestsToday",
      "operationLabor",
      "executiveForecastHeadline",
      "weatherCondition",
      "weatherRain"
    ];

    const observer = new MutationObserver(() => {
      clearTimeout(observeLiveValues.timer);
      observeLiveValues.timer = setTimeout(hydrateLiveValues, 100);
    });

    ids.map(byId).filter(Boolean).forEach(node => observer.observe(node, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    }));
  }

  function init() {
    if (!byId("restaurantOpeningDashboard")) return;

    loadState();
    bindChecklist();
    bindStatus();
    bindNotes();
    bindQuickActions();

    renderStatus();
    renderChecklist();
    hydrateLiveValues();
    observeLiveValues();
    formatClock();
    setInterval(formatClock, 1000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();
