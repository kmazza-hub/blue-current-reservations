(() => {
  "use strict";

  function init() {
    const root = document.getElementById("shiftRiskHeatmap");
    if (!root) return;
    const createAction = document.getElementById("shiftRiskCreateAction");

    const periods = [
      ["Opening", "Low"],
      ["Lunch", "Moderate"],
      ["Afternoon", "Low"],
      ["Dinner Prep", "Moderate"],
      ["Dinner Rush", "High"],
      ["Closing", "Low"]
    ];

    root.replaceChildren();

    periods.forEach(([label, risk]) => {
      const item = document.createElement("article");
      item.className = "shift-risk-heatmap-cell";
      item.dataset.risk = risk.toLowerCase();
      item.innerHTML = "<small></small><strong></strong>";
      item.querySelector("small").textContent = label;
      item.querySelector("strong").textContent = risk;
      root.append(item);
    });

    createAction?.addEventListener("click", () => {
      const authoritativeAction = document.getElementById("predictiveCreateAction");
      if (!authoritativeAction) return;
      authoritativeAction.click();
      authoritativeAction.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();
