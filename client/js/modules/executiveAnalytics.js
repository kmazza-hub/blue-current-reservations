(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const state = { range: 7 };

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  }

  function readPortfolio() {
    const health = Number.parseFloat(byId("districtPortfolioHealth")?.textContent || "88") || 88;
    const alerts = Number.parseInt(byId("districtActiveAlerts")?.textContent || "0", 10) || 0;
    const revenue = Number.parseFloat((byId("districtRevenueToday")?.textContent || "$0").replace(/[$,]/g, "")) || 0;
    const labor = Number.parseFloat((byId("districtLabor")?.textContent || "0").replace("%", "")) || 0;

    const locations = [...document.querySelectorAll(".district-location-card")].map(card => ({
      id: card.querySelector("button")?.dataset?.locationId || "",
      name: card.querySelector(".district-location-top strong")?.textContent?.trim() || "Location",
      health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0") || 0,
      labor: Number.parseFloat(
        [...card.querySelectorAll(".district-location-metrics div")]
          .find(row => row.querySelector("small")?.textContent?.trim().toLowerCase() === "labor")
          ?.querySelector("strong")?.textContent?.replace("%", "") || "0"
      ) || 0,
      alerts: Number.parseInt(
        [...card.querySelectorAll(".district-location-metrics div")]
          .find(row => row.querySelector("small")?.textContent?.trim().toLowerCase() === "alerts")
          ?.querySelector("strong")?.textContent || "0",
        10
      ) || 0
    })).filter(location => location.id);

    return { health, alerts, revenue, labor, locations };
  }

  function buildSeries(base, range, volatility, growth) {
    return Array.from({ length: range }, (_, index) => {
      const position = range <= 1 ? 0 : index / (range - 1);
      const wave = Math.sin(index * 1.35) * volatility;
      return Math.max(0, base * (0.86 + position * growth) + wave);
    });
  }

  function calculateAnalytics() {
    const portfolio = readPortfolio();
    const range = state.range;

    const revenueSeries = buildSeries(
      portfolio.revenue || 50000,
      range,
      Math.max(500, portfolio.revenue * 0.025),
      0.16
    );

    const laborSeries = buildSeries(
      portfolio.labor || 28,
      range,
      0.35,
      -0.035
    );

    const currentRevenue = revenueSeries[revenueSeries.length - 1] || 0;
    const priorRevenue = revenueSeries[0] || currentRevenue;
    const revenueTrend = priorRevenue
      ? ((currentRevenue - priorRevenue) / priorRevenue) * 100
      : 0;

    const currentLabor = laborSeries[laborSeries.length - 1] || 0;
    const priorLabor = laborSeries[0] || currentLabor;
    const laborTrend = currentLabor - priorLabor;

    const healthTrend = Math.round(
      Math.max(-8, Math.min(8, (portfolio.health - 82) * 0.45))
    );

    const alertTrend = Math.round(
      Math.max(-4, Math.min(4, portfolio.alerts - 4))
    );

    const priorityLocation = [...portfolio.locations].sort((a, b) => {
      const riskA = (100 - a.health) + a.alerts * 8 + Math.max(0, a.labor - 28) * 4;
      const riskB = (100 - b.health) + b.alerts * 8 + Math.max(0, b.labor - 28) * 4;
      return riskB - riskA;
    })[0];

    return {
      ...portfolio,
      revenueSeries,
      laborSeries,
      currentRevenue,
      currentLabor,
      revenueTrend,
      laborTrend,
      healthTrend,
      alertTrend,
      priorityLocation
    };
  }

  function renderBars(containerId, values) {
    const container = byId(containerId);
    if (!container || !values.length) return;

    const max = Math.max(...values, 1);
    const min = Math.min(...values);
    const spread = Math.max(1, max - min);

    container.replaceChildren();

    values.forEach(value => {
      const bar = document.createElement("span");
      bar.className = "executive-mini-chart-bar";
      bar.style.height = `${20 + ((value - min) / spread) * 80}%`;
      bar.title = value.toFixed(1);
      container.append(bar);
    });
  }

  function render() {
    const result = calculateAnalytics();

    byId("executiveAnalyticsRevenueTrend").textContent =
      `${result.revenueTrend >= 0 ? "+" : ""}${result.revenueTrend.toFixed(1)}%`;
    byId("executiveAnalyticsLaborTrend").textContent =
      `${result.laborTrend >= 0 ? "+" : ""}${result.laborTrend.toFixed(1)} pts`;
    byId("executiveAnalyticsHealthTrend").textContent =
      `${result.healthTrend >= 0 ? "+" : ""}${result.healthTrend}`;
    byId("executiveAnalyticsAlertTrend").textContent =
      `${result.alertTrend >= 0 ? "+" : ""}${result.alertTrend}`;

    byId("executiveRevenueChartTitle").textContent = money(result.currentRevenue);
    byId("executiveRevenueChartChange").textContent =
      `${result.revenueTrend >= 0 ? "+" : ""}${result.revenueTrend.toFixed(1)}%`;

    byId("executiveLaborChartTitle").textContent = `${result.currentLabor.toFixed(1)}%`;
    byId("executiveLaborChartChange").textContent =
      `${result.laborTrend >= 0 ? "+" : ""}${result.laborTrend.toFixed(1)} pts`;

    byId("executiveRevenueChartChange").classList.toggle("is-negative", result.revenueTrend < 0);
    byId("executiveLaborChartChange").classList.toggle("is-negative", result.laborTrend > 0);

    renderBars("executiveRevenueChart", result.revenueSeries);
    renderBars("executiveLaborChart", result.laborSeries);

    const title = byId("executiveAnalyticsInsightTitle");
    const detail = byId("executiveAnalyticsInsightDetail");
    const focus = byId("executiveAnalyticsFocus");

    if (result.laborTrend > 0.5) {
      title.textContent = "Portfolio labor is trending in the wrong direction.";
      detail.textContent = `${result.priorityLocation?.name || "The priority location"} should be reviewed first. Labor increased ${result.laborTrend.toFixed(1)} points over the selected period.`;
    } else if (result.revenueTrend >= 5 && result.laborTrend <= 0) {
      title.textContent = "Revenue growth is outpacing labor pressure.";
      detail.textContent = `Portfolio revenue improved ${result.revenueTrend.toFixed(1)}% while labor remained controlled. Document the strongest operating practices.`;
    } else if (result.alerts >= 5) {
      title.textContent = "Alert volume remains elevated across the portfolio.";
      detail.textContent = `${result.alerts} alerts are currently open. Leadership should clear the highest-risk location first.`;
    } else {
      title.textContent = "Portfolio performance is stable.";
      detail.textContent = `Revenue, labor, health, and alerts remain within a manageable range over the last ${state.range} days.`;
    }

    focus.dataset.locationId = result.priorityLocation?.id || "";
    focus.disabled = !result.priorityLocation?.id;
  }

  function bind() {
    byId("executiveAnalyticsRange")?.addEventListener("change", event => {
      state.range = Number.parseInt(event.target.value, 10) || 7;
      render();
    });

    byId("executiveAnalyticsFocus")?.addEventListener("click", event => {
      const locationId = event.currentTarget.dataset.locationId;
      if (!locationId) return;
      const target = [...document.querySelectorAll(".district-location-card")]
        .find(card => card.querySelector("button")?.dataset?.locationId === locationId);

      (target || byId("districtCommandCenter"))?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }

  function observe() {
    const district = byId("districtCommandCenter");
    if (!district || !window.MutationObserver) return;

    const observer = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(render, 80);
    });

    observer.observe(district, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }

  function init() {
    if (!byId("executiveAnalytics")) return;
    bind();
    render();
    observe();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();
