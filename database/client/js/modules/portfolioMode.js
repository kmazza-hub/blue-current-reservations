(function () {
  "use strict";

  const LOCATIONS = [
    { id: "marina", name: "Marina Grille", market: "Belmar", status: "healthy", statusLabel: "Healthy", occupancy: 91, revenue: 18240, guests: 482, health: 94, kitchen: 9, trend: "+14%", brief: "Operating above plan with strong guest flow and no immediate intervention required." },
    { id: "oyster", name: "Oyster Creek", market: "Leeds Point", status: "watch", statusLabel: "Watch", occupancy: 82, revenue: 11020, guests: 338, health: 86, kitchen: 12, trend: "+7%", brief: "Demand is healthy. Watch patio pacing as the next reservation wave approaches." },
    { id: "atlantic", name: "Atlantic Bar & Grill", market: "Seaside Park", status: "critical", statusLabel: "Action", occupancy: 98, revenue: 23400, guests: 596, health: 71, kitchen: 18, trend: "+19%", brief: "Kitchen ticket times are elevated. Pause walk-ins briefly and rebalance the next seating wave." },
    { id: "shipwreck", name: "Shipwreck Grill", market: "Brielle", status: "healthy", statusLabel: "Healthy", occupancy: 74, revenue: 10000, guests: 330, health: 91, kitchen: 8, trend: "+9%", brief: "Capacity remains available. Shift overflow demand here if neighboring locations tighten." }
  ];

  function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }

  window.createBlueCurrentPortfolioModeModule = function (eventBus, appState) {
    const grid = document.getElementById("portfolioLocationGrid");
    if (!grid) return null;

    const els = {
      revenue: document.getElementById("portfolioRevenue"), occupancy: document.getElementById("portfolioOccupancy"), guests: document.getElementById("portfolioGuests"), alerts: document.getElementById("portfolioAlerts"), alertSummary: document.getElementById("portfolioAlertSummary"),
      focusName: document.getElementById("portfolioFocusName"), focusStatus: document.getElementById("portfolioFocusStatus"), focusOccupancy: document.getElementById("portfolioFocusOccupancy"), focusRevenue: document.getElementById("portfolioFocusRevenue"), focusHealth: document.getElementById("portfolioFocusHealth"), focusKitchen: document.getElementById("portfolioFocusKitchen"), focusBrief: document.getElementById("portfolioFocusBrief"), pulse: document.getElementById("portfolioPulse"), reset: document.getElementById("portfolioReset"), open: document.getElementById("portfolioOpenLocation")
    };
    let activeId = LOCATIONS[0].id;
    let pulseTimer = null;

    function aggregate() {
      const revenue = LOCATIONS.reduce((sum, location) => sum + location.revenue, 0);
      const guests = LOCATIONS.reduce((sum, location) => sum + location.guests, 0);
      const occupancy = Math.round(LOCATIONS.reduce((sum, location) => sum + location.occupancy, 0) / LOCATIONS.length);
      const alerts = LOCATIONS.filter(location => location.status === "critical").length;
      els.revenue.textContent = money(revenue); els.guests.textContent = guests.toLocaleString(); els.occupancy.textContent = `${occupancy}%`; els.alerts.textContent = String(alerts);
    }

    function renderCards() {
      grid.innerHTML = LOCATIONS.map(location => `
        <button class="portfolio-location-card ${location.id === activeId ? "active" : ""}" type="button" data-location-id="${location.id}">
          <div class="portfolio-location-card-head"><div><small>${location.market}</small><strong>${location.name}</strong></div><span class="portfolio-status ${location.status}">${location.statusLabel}</span></div>
          <div class="portfolio-location-metrics"><span><small>Occupancy</small><b>${location.occupancy}%</b></span><span><small>Revenue</small><b>${money(location.revenue)}</b></span><span><small>Health</small><b>${location.health}</b></span></div>
          <div class="portfolio-location-foot"><span>Kitchen ${location.kitchen} min</span><strong>${location.trend}</strong></div>
        </button>`).join("");
      grid.querySelectorAll("[data-location-id]").forEach(button => button.addEventListener("click", () => selectLocation(button.dataset.locationId, true)));
    }

    function selectLocation(id, publish) {
      const location = LOCATIONS.find(item => item.id === id) || LOCATIONS[0]; activeId = location.id;
      els.focusName.textContent = location.name; els.focusStatus.textContent = location.statusLabel; els.focusStatus.className = `portfolio-status ${location.status}`;
      els.focusOccupancy.textContent = `${location.occupancy}%`; els.focusRevenue.textContent = money(location.revenue); els.focusHealth.textContent = String(location.health); els.focusKitchen.textContent = `${location.kitchen} min`; els.focusBrief.textContent = location.brief;
      els.alertSummary.textContent = location.status === "critical" ? `${location.name} requires attention` : "Portfolio operating normally";
      renderCards();
      if (publish) {
        appState?.update?.({ activeLocation: location, occupancyPercent: location.occupancy, estimatedRevenue: location.revenue, executiveBrief: `${location.name}: ${location.brief}` }, "portfolio:location-selected");
        eventBus?.emit?.("portfolio:location-selected", { location });
      }
    }

    function runPulse() {
      clearInterval(pulseTimer); let index = 0; els.pulse.disabled = true; els.pulse.textContent = "Scanning portfolio…";
      selectLocation(LOCATIONS[index].id, true);
      pulseTimer = setInterval(() => {
        index += 1;
        if (index >= LOCATIONS.length) { clearInterval(pulseTimer); pulseTimer = null; els.pulse.disabled = false; els.pulse.textContent = "Run portfolio pulse"; selectLocation("atlantic", true); eventBus?.emit?.("portfolio:pulse-complete", { locations: LOCATIONS.length, critical: 1 }); return; }
        selectLocation(LOCATIONS[index].id, true);
      }, 1050);
    }

    els.pulse?.addEventListener("click", runPulse);
    els.reset?.addEventListener("click", () => { clearInterval(pulseTimer); pulseTimer = null; els.pulse.disabled = false; els.pulse.textContent = "Run portfolio pulse"; selectLocation(LOCATIONS[0].id, true); });
    els.open?.addEventListener("click", () => { document.getElementById("mission-control")?.scrollIntoView({ behavior: "smooth" }); eventBus?.emit?.("portfolio:mission-control-opened", { location: LOCATIONS.find(item => item.id === activeId) }); });
    eventBus?.on?.("time-machine:snapshot-applied", payload => { if (payload?.snapshot?.occupancy >= 90) selectLocation("atlantic", false); });

    aggregate(); selectLocation(activeId, false); eventBus?.emit?.("portfolio:ready", { locations: LOCATIONS.length });
    return { locations: LOCATIONS.slice(), selectLocation, runPulse, getActiveLocation: () => LOCATIONS.find(item => item.id === activeId) };
  };
})();
