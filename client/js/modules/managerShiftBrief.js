(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.managerShift.started";

  function formatDate() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(new Date());
  }

  function applyStartedState(started) {
    const panel = document.getElementById("managerShiftBrief");
    const button = document.getElementById("managerShiftStart");
    const status = document.getElementById("managerShiftBriefStatus");
    if (!panel || !button || !status) return;

    panel.classList.toggle("is-started", started);
    button.textContent = started ? "Shift started" : "Start shift";
    status.textContent = started ? `Started · ${formatDate()}` : "Ready for manager review";
  }

  function init() {
    const panel = document.getElementById("managerShiftBrief");
    const button = document.getElementById("managerShiftStart");
    if (!panel || !button) return;

    const started = localStorage.getItem(STORAGE_KEY) === "true";
    applyStartedState(started);

    button.addEventListener("click", () => {
      const next = !panel.classList.contains("is-started");
      localStorage.setItem(STORAGE_KEY, String(next));
      applyStartedState(next);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
