(() => {
  "use strict";

  const ready = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  };

  ready(() => {
    const dateLabel = document.getElementById("commandCenterDate");
    const refreshButton = document.getElementById("commandCenterRefresh");
    const meterFill = document.getElementById("readinessMeterFill");
    const scoreLabel = document.getElementById("readinessScore");
    const handoffButton = document.getElementById("acknowledgeHandoff");
    const actionInputs = [...document.querySelectorAll("[data-manager-action]")];
    const progressLabel = document.getElementById("managerActionProgress");

    if (dateLabel) {
      const formatted = new Intl.DateTimeFormat("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      }).format(new Date());
      dateLabel.textContent = `${formatted} · Marina Grille`;
    }

    const updateActionProgress = () => {
      const complete = actionInputs.filter((input) => input.checked).length;
      actionInputs.forEach((input) => input.closest("label")?.classList.toggle("is-complete", input.checked));
      if (progressLabel) progressLabel.textContent = `${complete} of ${actionInputs.length} complete`;
    };

    actionInputs.forEach((input) => input.addEventListener("change", updateActionProgress));
    updateActionProgress();

    handoffButton?.addEventListener("click", () => {
      const complete = handoffButton.classList.toggle("is-complete");
      handoffButton.textContent = complete ? "Handoff acknowledged ✓" : "Acknowledge handoff";
    });

    refreshButton?.addEventListener("click", () => {
      refreshButton.disabled = true;
      refreshButton.textContent = "Refreshing…";
      if (meterFill) meterFill.style.width = "78%";
      if (scoreLabel) scoreLabel.textContent = "78";

      window.setTimeout(() => {
        if (meterFill) meterFill.style.width = "92%";
        if (scoreLabel) scoreLabel.textContent = "92";
        refreshButton.disabled = false;
        refreshButton.textContent = "Brief updated ✓";
        window.setTimeout(() => { refreshButton.textContent = "Refresh brief"; }, 1400);
      }, 650);
    });
  });
})();
