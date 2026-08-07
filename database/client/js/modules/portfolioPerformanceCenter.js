(function () {
  "use strict";

  function createBlueCurrentPortfolioPerformanceCenterModule(eventBus, appState) {
    const root = document.getElementById("portfolioPerformanceCenter");
    if (!root || !window.BlueCurrentPortfolioPerformanceEngine) return null;
    const engine = new window.BlueCurrentPortfolioPerformanceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
    let selectedOpportunityId = null;

    function render(snapshot = engine.snapshot()) {
      byId("portfolioPerformanceUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("portfolioPerformanceHeadline").textContent = snapshot.headline;
      byId("portfolioPerformanceRpi").textContent = snapshot.totals.rpi;
      byId("portfolioPerformanceBand").textContent = snapshot.totals.band;
      byId("portfolioPerformanceBand").dataset.tone = snapshot.totals.band;
      byId("portfolioPerformanceOpportunity").textContent = money(snapshot.totals.revenueOpportunity);
      byId("portfolioPerformanceCaptured").textContent = money(snapshot.totals.revenueCaptured);
      byId("portfolioPerformanceRealized").textContent = money(snapshot.totals.realizedRevenue);
      byId("portfolioPerformanceAtRisk").textContent = snapshot.totals.locationsAtRisk;
      byId("portfolioPerformanceConfidence").textContent = `${snapshot.totals.confidence}%`;

      byId("portfolioPerformanceLocations").innerHTML = snapshot.locations.map(location => `<button type="button" class="portfolio-performance-location ${location.id === snapshot.selectedLocationId ? "is-selected" : ""}" data-portfolio-performance-location="${esc(location.id)}" data-tone="${esc(location.status)}">
        <span><small>${esc(location.market)} · ${esc(location.primaryDriver)}</small><strong>${esc(location.name)}</strong><p>${location.occupancy}% occupancy · ${location.kitchenLoad}% kitchen · ${location.waitMinutes} min wait</p></span>
        <b>${location.rpi}<i>RPI</i></b><em>${money(location.revenueOpportunity)} opportunity</em>
      </button>`).join("");

      const selected = snapshot.selectedLocation;
      byId("portfolioPerformanceLocationName").textContent = selected?.name || "Choose a location";
      byId("portfolioPerformanceLocationDriver").textContent = selected?.primaryDriver || "—";
      byId("portfolioPerformanceLocationRpi").textContent = selected ? selected.rpi : "—";
      byId("portfolioPerformanceLocationRevenue").textContent = selected ? money(selected.revenueOpportunity) : "—";
      byId("portfolioPerformanceLocationRecovery").textContent = selected ? `+${selected.projectedRpiRecovery.toFixed(1)}` : "—";
      byId("portfolioPerformanceLocationConfidence").textContent = selected ? `${selected.confidence}%` : "—";

      if (!snapshot.opportunities.some(item => item.id === selectedOpportunityId)) selectedOpportunityId = snapshot.opportunities[0]?.id || null;
      byId("portfolioPerformanceOpportunities").innerHTML = snapshot.opportunities.length ? snapshot.opportunities.map(item => `<button type="button" class="portfolio-performance-opportunity ${item.id === selectedOpportunityId ? "is-selected" : ""}" data-portfolio-performance-opportunity="${esc(item.id)}">
        <span>${item.rank}</span><div><small>${esc(item.locationName)} · ${item.confidence}% confidence</small><strong>${esc(item.title)}</strong><p>${esc(item.instruction)}</p></div><b>${money(item.revenueImpact)}<i>+${item.projectedRpiGain.toFixed(1)} RPI</i></b>
      </button>`).join("") : `<p class="portfolio-performance-empty">No material portfolio opportunities are currently modeled.</p>`;
      renderSelectedOpportunity(snapshot);
    }

    function renderSelectedOpportunity(snapshot) {
      const item = snapshot.opportunities.find(opportunity => opportunity.id === selectedOpportunityId) || snapshot.opportunities[0];
      byId("portfolioPerformanceActionTitle").textContent = item?.title || "No action selected";
      byId("portfolioPerformanceActionInstruction").textContent = item?.instruction || "—";
      byId("portfolioPerformanceActionRevenue").textContent = item ? money(item.revenueImpact) : "—";
      byId("portfolioPerformanceActionRpi").textContent = item ? `+${item.projectedRpiGain.toFixed(1)}` : "—";
      byId("portfolioPerformanceActionConfidence").textContent = item ? `${item.confidence}%` : "—";
      byId("portfolioPerformanceApprove").disabled = !item;
    }

    root.addEventListener("click", event => {
      const location = event.target.closest("[data-portfolio-performance-location]");
      if (location) { render(engine.selectLocation(location.dataset.portfolioPerformanceLocation)); return; }
      const opportunity = event.target.closest("[data-portfolio-performance-opportunity]");
      if (opportunity) { selectedOpportunityId = opportunity.dataset.portfolioPerformanceOpportunity; render(engine.snapshot()); }
    });

    byId("portfolioPerformanceRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("portfolioPerformanceOpenLocation")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const selected = snapshot.selectedLocation;
      if (!selected) return;
      appState.update({ selectedLocationId: selected.id, activeLocation: selected });
      eventBus.emit("portfolio-performance:location-opened", { location: selected });
      document.getElementById("operationalDigitalTwinCenter")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    byId("portfolioPerformanceApprove")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const item = snapshot.opportunities.find(opportunity => opportunity.id === selectedOpportunityId) || snapshot.opportunities[0];
      if (!item) return;
      const location = snapshot.locations.find(entry => entry.id === item.locationId);
      const action = {
        id: item.id,
        title: item.title,
        instruction: item.instruction,
        revenueImpact: item.revenueImpact,
        projectedRpiGain: item.projectedRpiGain,
        confidence: item.confidence,
        owner: "Regional operations",
        approvalRequired: true,
        locationId: item.locationId,
        locationName: item.locationName
      };
      eventBus.emit("restaurant-performance:action-approved", { action, performance: appState.get("restaurantPerformance"), approvedAt: new Date().toISOString(), portfolioPerformance: snapshot });
      eventBus.emit("portfolio-performance:action-approved", { action, location, approvedAt: new Date().toISOString() });
      const status = byId("portfolioPerformanceDecisionStatus");
      status.textContent = `Approved: ${item.title}`;
      setTimeout(() => { status.textContent = ""; }, 4000);
    });

    eventBus.on("portfolio-performance:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentPortfolioPerformanceCenterModule = createBlueCurrentPortfolioPerformanceCenterModule;
})();
