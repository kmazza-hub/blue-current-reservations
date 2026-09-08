(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const state = { metric: "health" };

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  }

  function readLocations() {
    return [...document.querySelectorAll(".district-location-card")].map(card => {
      const metrics = [...card.querySelectorAll(".district-location-metrics div")];
      const metricMap = Object.fromEntries(metrics.map(metric => {
        const key = metric.querySelector("small")?.textContent?.trim().toLowerCase();
        const value = metric.querySelector("strong")?.textContent?.trim();
        return [key, value];
      }));

      return {
        name: card.querySelector(".district-location-top strong")?.textContent?.trim() || "Location",
        city: card.querySelector(".district-location-top small")?.textContent?.trim() || "",
        health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0"),
        revenue: Number.parseFloat(String(metricMap.revenue || "0").replace(/[$,]/g, "")) || 0,
        labor: Number.parseFloat(String(metricMap.labor || "0").replace("%", "")) || 0,
        alerts: Number.parseInt(metricMap.alerts || "0", 10) || 0
      };
    });
  }

  function metricConfig(metric) {
    if (metric === "revenue") return { label: "Revenue", higherIsBetter: true, format: money };
    if (metric === "labor") return { label: "Labor", higherIsBetter: false, format: value => `${value.toFixed(1)}%` };
    if (metric === "alerts") return { label: "Active alerts", higherIsBetter: false, format: value => String(value) };
    return { label: "Health score", higherIsBetter: true, format: value => String(Math.round(value)) };
  }

  function toneFor(metric, value) {
    if (metric === "health") return value < 78 ? "risk" : value < 88 ? "watch" : "stable";
    if (metric === "labor") return value >= 30 ? "risk" : value >= 28 ? "watch" : "stable";
    if (metric === "alerts") return value >= 3 ? "risk" : value >= 2 ? "watch" : "stable";
    return "stable";
  }

  function render() {
    const locations = readLocations();
    const container = byId("crossLocationBars");
    if (!container || !locations.length) return;

    const config = metricConfig(state.metric);
    const sorted = [...locations].sort((a, b) =>
      config.higherIsBetter ? b[state.metric] - a[state.metric] : a[state.metric] - b[state.metric]
    );

    const maxValue = Math.max(...locations.map(location => location[state.metric]), 1);
    const minValue = Math.min(...locations.map(location => location[state.metric]));
    const leader = sorted[0];
    const laggard = sorted[sorted.length - 1];

    container.replaceChildren();

    sorted.forEach(location => {
      const row = document.createElement("article");
      row.className = "cross-location-row";
      row.dataset.tone = toneFor(state.metric, location[state.metric]);

      const name = document.createElement("div");
      name.className = "cross-location-name";
      name.innerHTML = "<small></small><strong></strong>";
      name.querySelector("small").textContent = location.city;
      name.querySelector("strong").textContent = location.name;

      const track = document.createElement("div");
      track.className = "cross-location-track";
      const fill = document.createElement("div");
      fill.className = "cross-location-fill";
      fill.style.width = `${Math.max(8, (location[state.metric] / maxValue) * 100)}%`;
      track.append(fill);

      const value = document.createElement("div");
      value.className = "cross-location-value";
      value.textContent = config.format(location[state.metric]);

      row.append(name, track, value);
      container.append(row);
    });

    byId("crossLocationSummaryTitle").textContent = `${config.label} comparison across ${locations.length} locations.`;
    byId("crossLocationSummaryDetail").textContent = `${leader.name} leads; ${laggard.name} needs the closest review.`;
    byId("crossLocationLeader").textContent = leader.name;
    byId("crossLocationLeaderDetail").textContent = `${leader.city} · ${config.label} ${config.format(leader[state.metric])}.`;
    byId("crossLocationLaggard").textContent = laggard.name;
    byId("crossLocationLaggardDetail").textContent = `${laggard.city} · ${config.label} ${config.format(laggard[state.metric])}.`;
    byId("crossLocationSpread").textContent =
      state.metric === "revenue" ? money(maxValue - minValue) :
      state.metric === "labor" ? `${(maxValue - minValue).toFixed(1)} pts` :
      String(Math.round(maxValue - minValue));
    byId("crossLocationSpreadDetail").textContent = `Difference between highest and lowest ${config.label.toLowerCase()} values.`;
  }

  function observeDistrict() {
    const grid = byId("districtLocationGrid");
    if (!grid || !window.MutationObserver) return;
    const observer = new MutationObserver(() => {
      clearTimeout(observeDistrict.timer);
      observeDistrict.timer = setTimeout(render, 80);
    });
    observer.observe(grid, { childList:true, subtree:true, characterData:true, attributes:true });
  }

  function init() {
    if (!byId("crossLocationComparison")) return;
    byId("crossLocationMetric")?.addEventListener("change", event => {
      state.metric = event.target.value;
      render();
    });
    render();
    observeDistrict();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
