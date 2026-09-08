(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const state = { view: "balanced" };

  function readLocations() {
    return [...document.querySelectorAll(".district-location-card")].map(card => {
      const metrics = [...card.querySelectorAll(".district-location-metrics div")];
      const metricMap = Object.fromEntries(metrics.map(metric => {
        const key = metric.querySelector("small")?.textContent?.trim().toLowerCase();
        const value = metric.querySelector("strong")?.textContent?.trim();
        return [key, value];
      }));

      return {
        id: card.querySelector("button")?.dataset?.locationId || "",
        name: card.querySelector(".district-location-top strong")?.textContent?.trim() || "Location",
        city: card.querySelector(".district-location-top small")?.textContent?.trim() || "",
        health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0") || 0,
        revenue: Number.parseFloat(String(metricMap.revenue || "0").replace(/[$,]/g, "")) || 0,
        labor: Number.parseFloat(String(metricMap.labor || "0").replace("%", "")) || 0,
        alerts: Number.parseInt(metricMap.alerts || "0", 10) || 0
      };
    }).filter(location => location.id);
  }

  function readEventMetrics() {
    return {
      events: Number.parseInt(byId("executiveEventCount")?.textContent || "0", 10) || 0,
      critical: Number.parseInt(byId("executiveCriticalCount")?.textContent || "0", 10) || 0,
      resolved: Number.parseInt(byId("executiveResolvedCount")?.textContent || "0", 10) || 0,
      response: Number.parseFloat(byId("executiveResponseTime")?.textContent || "0") || 0
    };
  }

  function normalize(value, min, max, invert = false) {
    const score = Math.max(0, Math.min(100, ((value - min) / Math.max(1, max - min)) * 100));
    return invert ? 100 - score : score;
  }

  function buildPortfolioScores(locations) {
    const totalRevenue = locations.reduce((sum, location) => sum + location.revenue, 0);
    const averageHealth = locations.reduce((sum, location) => sum + location.health, 0) / Math.max(1, locations.length);
    const averageLabor = locations.reduce((sum, location) => sum + location.labor, 0) / Math.max(1, locations.length);
    const totalAlerts = locations.reduce((sum, location) => sum + location.alerts, 0);
    const events = readEventMetrics();

    const growth = normalize(totalRevenue, 25000, 75000);
    const efficiency = normalize(averageLabor, 24, 32, true);
    const guest = Math.max(55, Math.min(98, averageHealth + 4 - events.critical * 3));
    const risk = Math.max(20, Math.min(100, 100 - totalAlerts * 7 - events.critical * 8));
    const execution = Math.max(40, Math.min(100, 70 + events.resolved * 4 - events.critical * 4 - Math.max(0, events.response - 10)));

    const weights = {
      balanced: { growth:.22, efficiency:.22, guest:.2, risk:.2, execution:.16 },
      growth: { growth:.42, efficiency:.18, guest:.16, risk:.12, execution:.12 },
      efficiency: { growth:.14, efficiency:.44, guest:.14, risk:.16, execution:.12 },
      guest: { growth:.12, efficiency:.14, guest:.46, risk:.16, execution:.12 },
      risk: { growth:.1, efficiency:.16, guest:.14, risk:.46, execution:.14 }
    }[state.view];

    const overall = Math.round(
      growth * weights.growth +
      efficiency * weights.efficiency +
      guest * weights.guest +
      risk * weights.risk +
      execution * weights.execution
    );

    return {
      overall,
      metrics: [
        { key:"growth", label:"Growth", score:Math.round(growth), detail:`$${Math.round(totalRevenue).toLocaleString("en-US")} revenue` },
        { key:"efficiency", label:"Efficiency", score:Math.round(efficiency), detail:`${averageLabor.toFixed(1)}% labor` },
        { key:"guest", label:"Guest experience", score:Math.round(guest), detail:`Health ${averageHealth.toFixed(0)}` },
        { key:"risk", label:"Risk control", score:Math.round(risk), detail:`${totalAlerts} active alerts` },
        { key:"execution", label:"Execution", score:Math.round(execution), detail:`${events.resolved} resolved today` }
      ]
    };
  }

  function locationScore(location) {
    const revenueScore = normalize(location.revenue, 12000, 25000);
    const laborScore = normalize(location.labor, 24, 32, true);
    const alertScore = normalize(location.alerts, 0, 4, true);
    const healthScore = location.health;

    const scores = {
      balanced: healthScore * .38 + revenueScore * .22 + laborScore * .22 + alertScore * .18,
      growth: revenueScore * .5 + healthScore * .22 + laborScore * .16 + alertScore * .12,
      efficiency: laborScore * .5 + healthScore * .22 + alertScore * .18 + revenueScore * .1,
      guest: healthScore * .55 + alertScore * .2 + laborScore * .15 + revenueScore * .1,
      risk: alertScore * .45 + healthScore * .3 + laborScore * .15 + revenueScore * .1
    };

    return Math.round(scores[state.view]);
  }

  function gradeFor(score) {
    if (score >= 93) return "A";
    if (score >= 88) return "A−";
    if (score >= 84) return "B+";
    if (score >= 80) return "B";
    if (score >= 76) return "B−";
    if (score >= 70) return "C+";
    return "C";
  }

  function toneFor(score) {
    if (score < 72) return "risk";
    if (score < 84) return "watch";
    return "stable";
  }

  function renderPortfolioMetrics(result) {
    const grid = byId("executiveScorecardsGrid");
    if (!grid) return;

    grid.replaceChildren();

    result.metrics.forEach(metric => {
      const card = document.createElement("article");
      card.className = "executive-scorecard-metric";
      card.dataset.tone = toneFor(metric.score);
      card.innerHTML = `
        <small></small>
        <strong></strong>
        <span></span>
        <div class="executive-scorecard-progress"><i></i></div>
      `;
      card.querySelector("small").textContent = metric.label;
      card.querySelector("strong").textContent = String(metric.score);
      card.querySelector("span").textContent = metric.detail;
      card.querySelector("i").style.width = `${metric.score}%`;
      grid.append(card);
    });
  }

  function renderLocations(locations) {
    const list = byId("executiveLocationScorecardList");
    if (!list) return;

    const ranked = locations
      .map(location => ({ ...location, score: locationScore(location) }))
      .sort((a, b) => b.score - a.score);

    list.replaceChildren();

    ranked.forEach(location => {
      const row = document.createElement("article");
      row.className = "executive-location-score-row";
      row.dataset.tone = toneFor(location.score);

      const name = document.createElement("div");
      name.innerHTML = "<small></small><strong></strong>";
      name.querySelector("small").textContent = location.city;
      name.querySelector("strong").textContent = location.name;

      const track = document.createElement("div");
      track.className = "executive-location-score-track";
      const fill = document.createElement("i");
      fill.style.width = `${location.score}%`;
      track.append(fill);

      const value = document.createElement("div");
      value.className = "executive-location-score-value";
      value.textContent = String(location.score);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Review";
      button.addEventListener("click", () => {
        const target = [...document.querySelectorAll(".district-location-card")]
          .find(card => card.querySelector("button")?.dataset?.locationId === location.id);
        (target || byId("districtCommandCenter"))?.scrollIntoView({ behavior:"smooth", block:"center" });
      });

      row.append(name, track, value, button);
      list.append(row);
    });

    const focus = byId("executiveScorecardFocus");
    focus.dataset.locationId = ranked.at(-1)?.id || "";
    focus.disabled = !ranked.at(-1)?.id;
  }

  function render() {
    const locations = readLocations();
    if (!locations.length) return;

    const result = buildPortfolioScores(locations);
    const grade = gradeFor(result.overall);

    byId("executiveScorecardGrade").textContent = grade;
    byId("executiveScorecardNarrative").textContent =
      `${state.view.charAt(0).toUpperCase() + state.view.slice(1)} scorecard: ${result.overall}/100 across growth, efficiency, guest experience, risk control, and execution.`;

    renderPortfolioMetrics(result);
    renderLocations(locations);

    byId("executiveLocationScorecardUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US", { hour:"numeric", minute:"2-digit" }).format(new Date())}`;
  }

  function bind() {
    byId("executiveScorecardView")?.addEventListener("change", event => {
      state.view = event.target.value;
      render();
    });

    byId("executiveScorecardFocus")?.addEventListener("click", event => {
      const locationId = event.currentTarget.dataset.locationId;
      if (!locationId) return;
      const target = [...document.querySelectorAll(".district-location-card")]
        .find(card => card.querySelector("button")?.dataset?.locationId === locationId);
      (target || byId("districtCommandCenter"))?.scrollIntoView({ behavior:"smooth", block:"center" });
    });
  }

  function observe() {
    const district = byId("districtCommandCenter");
    const feed = byId("executiveEventFeed");
    if (!window.MutationObserver) return;

    const observer = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(render, 90);
    });

    [district, feed].filter(Boolean).forEach(node => observer.observe(node, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true
    }));
  }

  function init() {
    if (!byId("executiveScorecards")) return;
    bind();
    render();
    observe();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})();
