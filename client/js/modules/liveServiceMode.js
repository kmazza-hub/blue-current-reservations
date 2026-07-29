(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.liveServiceMode.v35.0.2";
  const byId = id => document.getElementById(id);

  const modeConfig = {
    closed: {
      label:"Closed",
      detail:"The restaurant is secured with no active service.",
      focus:"Secure the building and confirm all closing tasks.",
      target:"restaurantOpeningDashboard",
      screen:"Opening Dashboard"
    },
    opening: {
      label:"Opening",
      detail:"Preparing the restaurant for service.",
      focus:"Finish opening readiness and confirm staffing.",
      target:"restaurantOpeningDashboard",
      screen:"Opening Dashboard"
    },
    "lunch-prep": {
      label:"Lunch Prep",
      detail:"Stations, staffing, and reservations are being prepared.",
      focus:"Complete lineup and confirm lunch sections.",
      target:"staff-operations",
      screen:"Staff Dashboard"
    },
    "lunch-service": {
      label:"Lunch Service",
      detail:"Guests are actively being seated and served.",
      focus:"Protect guest flow, floor pacing, and kitchen readiness.",
      target:"live-floor-operations",
      screen:"Live Floor Operations"
    },
    afternoon: {
      label:"Afternoon",
      detail:"The restaurant is resetting between service periods.",
      focus:"Recover the dining room and prepare for dinner.",
      target:"managerShiftBrief",
      screen:"Manager Shift Brief"
    },
    "dinner-prep": {
      label:"Dinner Prep",
      detail:"The team is preparing for peak service.",
      focus:"Confirm staffing, sections, reservations, and forecast risks.",
      target:"executiveForecastCenter",
      screen:"Forecast Center"
    },
    "dinner-rush": {
      label:"Dinner Rush",
      detail:"The restaurant is operating at peak demand.",
      focus:"Monitor floor congestion, kitchen pressure, and stalled tables.",
      target:"live-floor-operations",
      screen:"Live Floor Operations"
    },
    "late-night": {
      label:"Late Night",
      detail:"Service continues with reduced demand and staffing.",
      focus:"Protect labor while maintaining guest experience.",
      target:"staff-operations",
      screen:"Staff Dashboard"
    },
    closing: {
      label:"Closing",
      detail:"The restaurant is completing end-of-day procedures.",
      focus:"Complete closing tasks and prepare the shift handoff.",
      target:"managerShiftBrief",
      screen:"Manager Shift Brief"
    }
  };

  const state = {
    currentMode:"opening",
    selectedMode:"opening",
    startedAt:new Date().toISOString()
  };

  function loadState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (value && modeConfig[value.currentMode]) {
        state.currentMode = value.currentMode;
        state.selectedMode = value.currentMode;
        state.startedAt = value.startedAt || new Date().toISOString();
      }
    } catch {}
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function suggestedMode() {
    const hour = new Date().getHours();
    if (hour < 7) return "closed";
    if (hour < 10) return "opening";
    if (hour < 11) return "lunch-prep";
    if (hour < 15) return "lunch-service";
    if (hour < 16) return "afternoon";
    if (hour < 17) return "dinner-prep";
    if (hour < 22) return "dinner-rush";
    if (hour < 23) return "late-night";
    return "closing";
  }

  function elapsedLabel() {
    const started = new Date(state.startedAt).getTime();
    const minutes = Math.max(0, Math.round((Date.now() - started) / 60000));

    if (minutes < 60) return `${minutes} min elapsed`;

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours} hr ${remaining} min elapsed`;
  }

  function render() {
    const current = modeConfig[state.currentMode];
    const selected = modeConfig[state.selectedMode];

    byId("liveServiceCurrent").dataset.mode = state.currentMode;
    byId("liveServiceCurrentLabel").textContent = current.label;
    byId("liveServiceCurrentDetail").textContent = current.detail;

    byId("liveServicePrimaryFocus").textContent = selected.focus;
    byId("liveServicePrimaryDetail").textContent =
      state.selectedMode === state.currentMode
        ? "This is the current operating priority."
        : `Confirm ${selected.label} to make this the active restaurant mode.`;

    byId("liveServiceRecommendedScreen").textContent = selected.screen;
    byId("liveServiceOpenScreen").dataset.target = selected.target;

    byId("liveServiceStartedAt").textContent = new Intl.DateTimeFormat("en-US", {
      hour:"numeric",
      minute:"2-digit"
    }).format(new Date(state.startedAt));

    byId("liveServiceElapsed").textContent = elapsedLabel();

    document.querySelectorAll("[data-service-mode]").forEach(button => {
      button.classList.toggle("is-current", button.dataset.serviceMode === state.currentMode);
      button.classList.toggle("is-selected", button.dataset.serviceMode === state.selectedMode);
    });

    byId("liveServiceConfirmMode").disabled = state.selectedMode === state.currentMode;
    byId("liveServiceConfirmMode").textContent =
      state.selectedMode === state.currentMode
        ? "Mode active"
        : `Confirm ${selected.label}`;

    byId("liveServiceModeUpdated").textContent =
      `Suggested: ${modeConfig[suggestedMode()].label} · Updated ${new Intl.DateTimeFormat("en-US", {
        hour:"numeric",
        minute:"2-digit"
      }).format(new Date())}`;
  }

  function selectMode(mode) {
    if (!modeConfig[mode]) return;
    state.selectedMode = mode;
    render();
  }

  function confirmMode() {
    if (state.selectedMode === state.currentMode) return;

    state.currentMode = state.selectedMode;
    state.startedAt = new Date().toISOString();
    saveState();
    render();

    byId("liveServiceStatus").textContent =
      `${modeConfig[state.currentMode].label} mode is now active.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:service-mode-changed", {
      detail:{
        mode:state.currentMode,
        label:modeConfig[state.currentMode].label,
        startedAt:state.startedAt
      }
    }));

    setTimeout(() => {
      byId("liveServiceStatus").textContent = "";
    }, 2200);
  }

  function bind() {
    document.querySelectorAll("[data-service-mode]").forEach(button => {
      button.addEventListener("click", () => selectMode(button.dataset.serviceMode));
    });

    byId("liveServiceAutoMode")?.addEventListener("click", () => {
      selectMode(suggestedMode());
      byId("liveServiceStatus").textContent =
        `${modeConfig[state.selectedMode].label} is the suggested mode for this time.`;
    });

    byId("liveServiceConfirmMode")?.addEventListener("click", confirmMode);

    byId("liveServiceOpenScreen")?.addEventListener("click", event => {
      const target = byId(event.currentTarget.dataset.target);
      target?.scrollIntoView({ behavior:"smooth", block:"start" });
    });

    window.addEventListener("bluecurrent:restaurant-opened", () => {
      state.selectedMode = suggestedMode() === "opening" ? "lunch-prep" : suggestedMode();
      render();
    });
  }

  function init() {
    if (!byId("liveServiceMode")) return;

    loadState();
    bind();
    render();

    setInterval(() => {
      byId("liveServiceElapsed").textContent = elapsedLabel();
      byId("liveServiceModeUpdated").textContent =
        `Suggested: ${modeConfig[suggestedMode()].label} · Updated ${new Intl.DateTimeFormat("en-US", {
          hour:"numeric",
          minute:"2-digit"
        }).format(new Date())}`;
    }, 60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})();
