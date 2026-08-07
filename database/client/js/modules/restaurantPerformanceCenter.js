(function () {
  "use strict";

  function createBlueCurrentRestaurantPerformanceCenterModule(eventBus, appState) {
    const root = document.getElementById("restaurantPerformanceCenter");
    if (!root || !window.BlueCurrentRestaurantPerformanceEngine) return null;
    const engine = new window.BlueCurrentRestaurantPerformanceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
    let selectedActionId = null;

    function render(snapshot = engine.snapshot()) {
      const scores = snapshot.scores;
      byId("restaurantPerformanceUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("restaurantPerformanceIndex").textContent = Number(snapshot.overall).toFixed(1);
      byId("restaurantPerformanceBand").textContent = snapshot.band;
      byId("restaurantPerformanceBand").dataset.tone = snapshot.band;
      byId("restaurantPerformanceTrend").textContent = `${snapshot.trend >= 0 ? "+" : ""}${snapshot.trend.toFixed(1)} today`;
      byId("restaurantPerformanceHeadline").textContent = snapshot.headline;
      byId("restaurantPerformanceConfidence").textContent = `${snapshot.confidence}%`;
      byId("restaurantPerformanceAvailable").textContent = money(snapshot.opportunity.available);
      byId("restaurantPerformanceCaptured").textContent = money(snapshot.opportunity.captured);
      byId("restaurantPerformanceRemaining").textContent = money(snapshot.opportunity.remaining);
      byId("restaurantPerformanceFinancial").textContent = scores.financial;
      byId("restaurantPerformanceGuest").textContent = scores.guest;
      byId("restaurantPerformanceOperations").textContent = scores.operations;
      byId("restaurantPerformanceAi").textContent = scores.ai;
      ["Financial", "Guest", "Operations", "Ai"].forEach(key => {
        const value = scores[key.toLowerCase() === "ai" ? "ai" : key.toLowerCase()];
        const bar = byId(`restaurantPerformance${key}Bar`);
        if (bar) bar.style.width = `${value}%`;
      });
      byId("restaurantPerformanceDrivers").innerHTML = snapshot.drivers.map((driver, index) => `<article>
        <span>${index + 1}</span><div><small>${esc(driver.detail)}</small><strong>${esc(driver.label)}</strong><p>Performance score ${driver.score}</p></div><b>${money(driver.impact)}</b>
      </article>`).join("");
      if (!snapshot.actions.some(action => action.id === selectedActionId)) selectedActionId = snapshot.actions[0]?.id || null;
      byId("restaurantPerformanceActions").innerHTML = snapshot.actions.map(action => `<button type="button" class="restaurant-performance-action ${action.id === selectedActionId ? "is-selected" : ""}" data-performance-action="${esc(action.id)}">
        <span><small>${esc(action.owner)} · ${action.confidence}% confidence</small><strong>${esc(action.title)}</strong><p>${esc(action.instruction)}</p></span><b>+${action.projectedRpiGain.toFixed(1)} RPI<br><i>${money(action.revenueImpact)}</i></b>
      </button>`).join("");
      renderSelected(snapshot);
    }

    function renderSelected(snapshot) {
      const action = snapshot.actions.find(item => item.id === selectedActionId) || snapshot.actions[0];
      byId("restaurantPerformanceActionTitle").textContent = action?.title || "No action selected";
      byId("restaurantPerformanceActionInstruction").textContent = action?.instruction || "—";
      byId("restaurantPerformanceActionRevenue").textContent = action ? money(action.revenueImpact) : "—";
      byId("restaurantPerformanceActionRpi").textContent = action ? `+${action.projectedRpiGain.toFixed(1)}` : "—";
      byId("restaurantPerformanceActionConfidence").textContent = action ? `${action.confidence}%` : "—";
      byId("restaurantPerformanceApprove").disabled = !action || !action.approvalRequired;
      byId("restaurantPerformanceApprove").textContent = action?.approvalRequired ? "Approve action" : "No approval required";
    }

    root.addEventListener("click", event => {
      const action = event.target.closest("[data-performance-action]");
      if (!action) return;
      selectedActionId = action.dataset.performanceAction;
      render(engine.snapshot());
    });
    byId("restaurantPerformanceRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("restaurantPerformanceApprove")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const action = snapshot.actions.find(item => item.id === selectedActionId);
      if (!action || !action.approvalRequired) return;
      eventBus.emit("restaurant-performance:action-approved", { action, performance: snapshot, approvedAt: new Date().toISOString() });
      eventBus.emit("portfolio-intelligence:recommendation-approved", { recommendation: { ...action, action: action.instruction, expectedImpact: `${money(action.revenueImpact)} projected opportunity and +${action.projectedRpiGain.toFixed(1)} RPI.` }, approvedAt: new Date().toISOString() });
      const status = byId("restaurantPerformanceDecisionStatus");
      status.textContent = `Approved: ${action.title}`;
      setTimeout(() => { status.textContent = ""; }, 4000);
    });
    eventBus.on("restaurant-performance:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentRestaurantPerformanceCenterModule = createBlueCurrentRestaurantPerformanceCenterModule;
})();
