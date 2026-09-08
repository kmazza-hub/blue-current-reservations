(function () {
  "use strict";

  function createBlueCurrentPortfolioIntelligenceCenterModule(eventBus, appState) {
    const root = document.getElementById("portfolioIntelligenceCenter");
    if (!root || !window.BlueCurrentPortfolioIntelligenceEngine) return null;
    const engine = new window.BlueCurrentPortfolioIntelligenceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
    const titleCase = value => String(value || "").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
    let selectedLocationId = null;
    let selectedRecommendationId = null;

    function renderLocations(snapshot) {
      const list = byId("portfolioIntelligenceLocations");
      if (!list) return;
      if (!snapshot.locations.some(location => location.id === selectedLocationId)) selectedLocationId = snapshot.locations.find(location => location.isSelected)?.id || snapshot.locations[0]?.id;
      list.innerHTML = snapshot.locations.map(location => `
        <button type="button" class="portfolio-intelligence-location status-${escapeHtml(location.status)} ${location.id === selectedLocationId ? "is-selected" : ""}" data-portfolio-intelligence-location="${escapeHtml(location.id)}">
          <span><small>${escapeHtml(location.market)}</small><strong>${escapeHtml(location.name)}</strong></span>
          <i>${escapeHtml(titleCase(location.status))}</i>
          <dl><div><dt>Health</dt><dd>${location.healthScore}</dd></div><div><dt>Occupancy</dt><dd>${location.occupancy}%</dd></div><div><dt>Kitchen</dt><dd>${location.kitchenLoad}%</dd></div></dl>
          <p>${escapeHtml(location.primaryConstraint)}</p>
        </button>`).join("");
    }

    function renderLocationInspector(snapshot) {
      const location = snapshot.locations.find(item => item.id === selectedLocationId) || snapshot.locations[0];
      if (!location) return;
      byId("portfolioIntelligenceSelectedName").textContent = location.name;
      byId("portfolioIntelligenceSelectedMarket").textContent = location.market;
      byId("portfolioIntelligenceSelectedStatus").textContent = titleCase(location.status);
      byId("portfolioIntelligenceSelectedStatus").dataset.tone = location.status;
      byId("portfolioIntelligenceSelectedNarrative").textContent = location.narrative;
      byId("portfolioIntelligenceSelectedHealth").textContent = location.healthScore;
      byId("portfolioIntelligenceSelectedPressure").textContent = location.pressureScore;
      byId("portfolioIntelligenceSelectedWait").textContent = `${location.waitMinutes} min`;
      byId("portfolioIntelligenceSelectedTickets").textContent = `${location.ticketMinutes} min`;
      byId("portfolioIntelligenceSelectedLabor").textContent = `${location.laborPercent}%`;
      byId("portfolioIntelligenceSelectedRevenue").textContent = money(location.revenue);
      byId("portfolioIntelligenceSelectedConstraint").textContent = location.primaryConstraint;
    }

    function renderExceptions(snapshot) {
      const list = byId("portfolioIntelligenceExceptions");
      if (!list) return;
      list.innerHTML = snapshot.exceptions.length ? snapshot.exceptions.map(exception => `
        <article class="severity-${escapeHtml(exception.severity)}">
          <div><small>${escapeHtml(exception.locationName)} · ${escapeHtml(exception.owner)}</small><strong>${escapeHtml(exception.title)}</strong><p>${escapeHtml(exception.detail)}</p></div>
          <span><b>${exception.dueMinutes} min</b><small>response window</small></span>
          <ul>${exception.evidence.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>`).join("") : `<div class="portfolio-intelligence-empty"><strong>No active portfolio exceptions</strong><p>All locations are operating within the configured health band.</p></div>`;
    }

    function renderRecommendations(snapshot) {
      const list = byId("portfolioIntelligenceRecommendations");
      if (!list) return;
      if (!snapshot.recommendations.some(item => item.id === selectedRecommendationId)) selectedRecommendationId = snapshot.recommendations[0]?.id || null;
      list.innerHTML = snapshot.recommendations.map(item => `
        <button type="button" class="portfolio-intelligence-recommendation ${item.id === selectedRecommendationId ? "is-selected" : ""}" data-portfolio-intelligence-recommendation="${escapeHtml(item.id)}">
          <span><small>${escapeHtml(titleCase(item.type))} · ${item.confidence}% confidence</small><strong>${escapeHtml(item.title)}</strong></span><i>${escapeHtml(titleCase(item.priority))}</i>
          <p>${escapeHtml(item.action)}</p>
        </button>`).join("");
      renderRecommendationInspector(snapshot);
    }

    function renderRecommendationInspector(snapshot) {
      const recommendation = snapshot.recommendations.find(item => item.id === selectedRecommendationId) || snapshot.recommendations[0];
      byId("portfolioIntelligenceRecommendationTitle").textContent = recommendation?.title || "No recommendation selected";
      byId("portfolioIntelligenceRecommendationAction").textContent = recommendation?.action || "—";
      byId("portfolioIntelligenceRecommendationImpact").textContent = recommendation?.expectedImpact || "—";
      byId("portfolioIntelligenceRecommendationConfidence").textContent = recommendation ? `${recommendation.confidence}%` : "—";
      byId("portfolioIntelligenceRecommendationApproval").textContent = recommendation?.approvalRequired ? "Manager approval required" : "Advisory only";
      const approve = byId("portfolioIntelligenceApprove");
      if (approve) approve.disabled = !recommendation;
    }

    function render(snapshot = engine.snapshot()) {
      byId("portfolioIntelligenceUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
      byId("portfolioIntelligenceHeadline").textContent = snapshot.headline;
      byId("portfolioIntelligenceHealth").textContent = snapshot.totals.healthScore;
      byId("portfolioIntelligenceLocationCount").textContent = snapshot.totals.locationCount;
      byId("portfolioIntelligenceOccupancy").textContent = `${snapshot.totals.occupancy}%`;
      byId("portfolioIntelligenceGuests").textContent = snapshot.totals.guests.toLocaleString();
      byId("portfolioIntelligenceRevenue").textContent = money(snapshot.totals.revenue);
      byId("portfolioIntelligenceCritical").textContent = snapshot.totals.criticalLocations;
      byId("portfolioIntelligenceWatch").textContent = snapshot.totals.watchLocations;
      byId("portfolioIntelligenceActiveRecommendations").textContent = snapshot.totals.activeRecommendations;
      renderLocations(snapshot);
      renderLocationInspector(snapshot);
      renderExceptions(snapshot);
      renderRecommendations(snapshot);
    }

    root.addEventListener("click", event => {
      const location = event.target.closest("[data-portfolio-intelligence-location]");
      if (location) { selectedLocationId = location.dataset.portfolioIntelligenceLocation; render(engine.snapshot()); return; }
      const recommendation = event.target.closest("[data-portfolio-intelligence-recommendation]");
      if (recommendation) { selectedRecommendationId = recommendation.dataset.portfolioIntelligenceRecommendation; render(engine.snapshot()); }
    });

    byId("portfolioIntelligenceRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("portfolioIntelligenceOpenLocation")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const location = snapshot.locations.find(item => item.id === selectedLocationId);
      if (!location) return;
      appState.update({ selectedLocationId: location.id, activeLocation: location, executiveBrief: `${location.name}: ${location.narrative}` });
      eventBus.emit("portfolio-intelligence:location-opened", { location });
      document.getElementById("operationalDigitalTwinCenter")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    byId("portfolioIntelligenceApprove")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const recommendation = snapshot.recommendations.find(item => item.id === selectedRecommendationId);
      if (!recommendation) return;
      eventBus.emit("portfolio-intelligence:recommendation-approved", { recommendation, approvedAt: new Date().toISOString() });
      const status = byId("portfolioIntelligenceDecisionStatus");
      status.textContent = `Approved: ${recommendation.title}`;
      setTimeout(() => { status.textContent = ""; }, 3500);
    });

    eventBus.on("portfolio-intelligence:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentPortfolioIntelligenceCenterModule = createBlueCurrentPortfolioIntelligenceCenterModule;
})();
