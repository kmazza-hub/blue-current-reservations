(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  const locations = [
    {
      id: "loc_marina",
      name: "Marina Grill",
      city: "Belmar",
      health: 92,
      revenue: 18420,
      labor: 26.1,
      guests: 426,
      alerts: 1,
      status: "Strong dinner outlook; patio demand is building."
    },
    {
      id: "loc_asbury",
      name: "Asbury Boardwalk",
      city: "Asbury Park",
      health: 76,
      revenue: 22140,
      labor: 30.4,
      guests: 518,
      alerts: 3,
      status: "Labor and host-stand pressure require attention."
    },
    {
      id: "loc_lobster",
      name: "Lobster Shanty",
      city: "Point Pleasant",
      health: 84,
      revenue: 17860,
      labor: 28.7,
      guests: 392,
      alerts: 2,
      status: "Kitchen pressure is building into the dinner peak."
    }
  ];

  const state = {
    sort: "risk",
    selectedLocationId: ""
  };

  function visibleLocations() {
    const authorized = window.BlueCurrentFrontlineLocation?.authorized?.() || [];
    return authorized.length ? locations.filter(location => authorized.includes(location.id)) : [...locations];
  }

  function toneFor(location) {
    if (location.health < 78 || location.alerts >= 3) return "risk";
    if (location.health < 88 || location.alerts >= 2) return "watch";
    return "stable";
  }

  function sortedLocations() {
    const rows = visibleLocations();

    if (state.sort === "health") rows.sort((a, b) => b.health - a.health);
    if (state.sort === "revenue") rows.sort((a, b) => b.revenue - a.revenue);
    if (state.sort === "labor") rows.sort((a, b) => b.labor - a.labor);
    if (state.sort === "alerts") rows.sort((a, b) => b.alerts - a.alerts);
    if (state.sort === "risk") {
      rows.sort((a, b) => {
        const riskA = (100 - a.health) + a.alerts * 8 + Math.max(0, a.labor - 28) * 4;
        const riskB = (100 - b.health) + b.alerts * 8 + Math.max(0, b.labor - 28) * 4;
        return riskB - riskA;
      });
    }

    return rows;
  }

  function renderKPIs() {
    const rows = visibleLocations();
    const totalRevenue = rows.reduce((sum, location) => sum + location.revenue, 0);
    const totalGuests = rows.reduce((sum, location) => sum + location.guests, 0);
    const totalAlerts = rows.reduce((sum, location) => sum + location.alerts, 0);
    const averageHealth = Math.round(
      rows.reduce((sum, location) => sum + location.health, 0) / Math.max(1, rows.length)
    );
    const weightedLabor =
      rows.reduce((sum, location) => sum + location.labor * location.revenue, 0) /
      Math.max(1, totalRevenue);

    byId("districtPortfolioHealth").textContent = String(averageHealth);
    byId("districtActiveAlerts").textContent = String(totalAlerts);
    byId("districtGuestsToday").textContent = new Intl.NumberFormat("en-US").format(totalGuests);
    byId("districtRevenueToday").textContent = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(totalRevenue);
    byId("districtLabor").textContent = `${weightedLabor.toFixed(1)}%`;
  }

  function renderDistrictAlert() {
    const highestRisk = sortedLocations()[0];
    const banner = byId("districtAlertBanner");
    const title = byId("districtAlertTitle");
    const detail = byId("districtAlertDetail");
    const button = byId("districtAlertFocus");

    if (!banner || !title || !detail || !button) return;

    if (!highestRisk) {
      banner.dataset.tone = "normal";
      title.textContent = "No authorized district locations available";
      detail.textContent = "Verified portfolio data will appear when an authorized restaurant is available.";
      button.dataset.locationId = "";
      button.disabled = true;
      return;
    }

    button.disabled = false;

    const tone = toneFor(highestRisk);
    banner.dataset.tone = tone === "stable" ? "normal" : tone;
    title.textContent =
      tone === "risk"
        ? `${highestRisk.name} needs district attention`
        : tone === "watch"
          ? `${highestRisk.name} is the top watch location`
          : "Portfolio operating normally";

    detail.textContent =
      tone === "stable"
        ? "All locations are operating within expected conditions."
        : highestRisk.status;

    button.dataset.locationId = highestRisk.id;
  }

  function selectLocation(locationId) {
    state.selectedLocationId = locationId;

    const location = visibleLocations().find(item => item.id === locationId);
    if (!location) return;

    window.dispatchEvent(new CustomEvent("bluecurrent:location-selected", {
      detail: { location }
    }));

    const target = byId("restaurantPulse") || byId("command-center");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLocations() {
    const grid = byId("districtLocationGrid");
    if (!grid) return;

    grid.replaceChildren();

    sortedLocations().forEach(location => {
      const card = document.createElement("article");
      card.className = "district-location-card";
      card.dataset.tone = toneFor(location);

      const top = document.createElement("div");
      top.className = "district-location-top";
      top.innerHTML = "<div><small></small><strong></strong></div><span class='district-health-badge'></span>";
      top.querySelector("small").textContent = location.city;
      top.querySelector("strong").textContent = location.name;
      top.querySelector(".district-health-badge").textContent = String(location.health);

      const metrics = document.createElement("div");
      metrics.className = "district-location-metrics";

      const metricRows = [
        ["Revenue", new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(location.revenue)],
        ["Labor", `${location.labor.toFixed(1)}%`],
        ["Alerts", String(location.alerts)]
      ];

      metricRows.forEach(([label, value]) => {
        const cell = document.createElement("div");
        cell.innerHTML = "<small></small><strong></strong>";
        cell.querySelector("small").textContent = label;
        cell.querySelector("strong").textContent = value;
        metrics.append(cell);
      });

      const status = document.createElement("p");
      status.className = "district-location-status";
      status.textContent = location.status;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.locationId = location.id;
      button.textContent = "Open location";
      button.addEventListener("click", () => selectLocation(location.id));

      card.append(top, metrics, status, button);
      grid.append(card);
    });
  }

  function init() {
    if (!byId("districtCommandCenter")) return;

    byId("districtSort")?.addEventListener("change", event => {
      state.sort = event.target.value;
      renderLocations();
      renderDistrictAlert();
    });

    byId("districtAlertFocus")?.addEventListener("click", event => {
      const locationId = event.currentTarget.dataset.locationId;
      if (locationId) selectLocation(locationId);
    });

    window.addEventListener("bluecurrent:frontline-location-changed", () => {
      state.selectedLocationId = window.BlueCurrentFrontlineLocation?.get?.() || "";
      renderKPIs();
      renderLocations();
      renderDistrictAlert();
    });

    state.selectedLocationId = window.BlueCurrentFrontlineLocation?.get?.() || visibleLocations()[0]?.id || "";

    renderKPIs();
    renderLocations();
    renderDistrictAlert();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
