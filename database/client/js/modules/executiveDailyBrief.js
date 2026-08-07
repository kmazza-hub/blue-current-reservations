(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  function text(id, fallback = "") {
    return byId(id)?.textContent?.trim() || fallback;
  }

  function number(id, fallback = 0) {
    const parsed = Number.parseFloat(text(id, String(fallback)).replace(/[$,%+,]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function timeLabel() {
    return new Intl.DateTimeFormat("en-US", {
      weekday:"long",
      month:"short",
      day:"numeric",
      hour:"numeric",
      minute:"2-digit"
    }).format(new Date());
  }

  function readPriorityLocation() {
    const cards = [...document.querySelectorAll(".district-location-card")];
    if (!cards.length) return null;

    return cards
      .map(card => {
        const metrics = [...card.querySelectorAll(".district-location-metrics div")];
        const metricMap = Object.fromEntries(metrics.map(metric => {
          const key = metric.querySelector("small")?.textContent?.trim().toLowerCase();
          const value = metric.querySelector("strong")?.textContent?.trim();
          return [key, value];
        }));

        const location = {
          id: card.querySelector("button")?.dataset?.locationId || "loc_marina",
          name: card.querySelector(".district-location-top strong")?.textContent?.trim() || "Location",
          health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0") || 0,
          labor: Number.parseFloat(String(metricMap.labor || "0").replace("%", "")) || 0,
          alerts: Number.parseInt(metricMap.alerts || "0", 10) || 0
        };

        location.risk =
          (100 - location.health) +
          location.alerts * 8 +
          Math.max(0, location.labor - 28) * 4;

        return location;
      })
      .sort((a, b) => b.risk - a.risk)[0];
  }

  function buildBrief() {
    const health = number("districtPortfolioHealth", 0);
    const revenue = text("districtRevenueToday", "$0");
    const labor = text("districtLabor", "—");
    const critical = number("executiveCriticalCount", 0);
    const openActions = number("executiveActionOpenCount", 0);
    const resolved = number("executiveResolvedCount", 0);
    const completed = number("executiveActionCompletedCount", 0);
    const revenueTrend = number("executiveAnalyticsRevenueTrend", 0);
    const laborTrend = number("executiveAnalyticsLaborTrend", 0);
    const healthTrend = number("executiveAnalyticsHealthTrend", 0);
    const alertTrend = number("executiveAnalyticsAlertTrend", 0);
    const grade = text("executiveScorecardGrade", "B");
    const priorityLocation = readPriorityLocation();

    const priorities = [];
    if (priorityLocation?.labor >= 30) {
      priorities.push(`Review labor at ${priorityLocation.name}; current projection is ${priorityLocation.labor.toFixed(1)}%.`);
    }
    if (priorityLocation?.alerts >= 2) {
      priorities.push(`Clear ${priorityLocation.alerts} active alerts at ${priorityLocation.name}.`);
    }
    if (critical > 0) {
      priorities.push(`Resolve ${critical} critical portfolio event${critical === 1 ? "" : "s"} before peak service.`);
    }
    if (openActions > 0) {
      priorities.push(`Advance ${openActions} open executive action${openActions === 1 ? "" : "s"} and confirm ownership.`);
    }
    if (!priorities.length) {
      priorities.push("Maintain current operating plan and monitor the next demand wave.");
    }

    const wins = [
      `${resolved} portfolio event${resolved === 1 ? "" : "s"} resolved today.`,
      `${completed} executive action${completed === 1 ? "" : "s"} completed.`,
      revenueTrend >= 0
        ? `Revenue trend improved ${revenueTrend.toFixed(1)}%.`
        : `Revenue performance was reviewed against a ${Math.abs(revenueTrend).toFixed(1)}% decline.`,
      laborTrend <= 0
        ? `Labor improved ${Math.abs(laborTrend).toFixed(1)} points.`
        : `Labor trend is measured and visible across the portfolio.`
    ];

    const watch = [
      priorityLocation
        ? `${priorityLocation.name} remains the highest-risk location.`
        : "Continue monitoring the district risk ranking.",
      alertTrend > 0
        ? `Open alerts increased by ${alertTrend.toFixed(0)}.`
        : "Alert volume is stable or improving.",
      laborTrend > 0
        ? `Portfolio labor increased ${laborTrend.toFixed(1)} points.`
        : "Labor is stable or improving.",
      healthTrend < 0
        ? `Portfolio health declined ${Math.abs(healthTrend).toFixed(0)} points.`
        : "Portfolio health remains stable."
    ];

    const confidence = Math.max(
      74,
      Math.min(98, Math.round(82 + (health ? 5 : 0) + (revenue !== "$0" ? 4 : 0) + Math.min(7, openActions + critical)))
    );

    let headline = "Portfolio performance is stable.";
    let narrative = `Portfolio health is ${health || "still loading"} with an executive scorecard grade of ${grade}.`;

    if (critical > 0 || priorityLocation?.health < 78) {
      headline = `${priorityLocation?.name || "The portfolio"} requires leadership attention today.`;
      narrative = `${critical} critical event${critical === 1 ? "" : "s"} and ${openActions} open executive action${openActions === 1 ? "" : "s"} require focused follow-through.`;
    } else if (revenueTrend >= 5 && laborTrend <= 0) {
      headline = "Revenue growth is outpacing labor pressure.";
      narrative = `Revenue is trending ${revenueTrend.toFixed(1)}% higher while labor remains stable or improving.`;
    } else if (openActions > 0) {
      headline = "Portfolio performance is stable with open leadership follow-through.";
      narrative = `${openActions} executive action${openActions === 1 ? "" : "s"} remain open across the district.`;
    }

    return {
      health,
      revenue,
      labor,
      critical,
      openActions,
      confidence,
      headline,
      narrative,
      priorities: priorities.slice(0, 4),
      wins: wins.slice(0, 4),
      watch: watch.slice(0, 4),
      priorityLocation
    };
  }

  function renderList(id, values) {
    const list = byId(id);
    if (!list) return;
    list.replaceChildren();
    values.forEach(value => {
      const item = document.createElement("li");
      item.textContent = value;
      list.append(item);
    });
  }

  function render() {
    const result = buildBrief();

    byId("executiveDailyBriefTime").textContent = timeLabel();
    byId("executiveDailyHeadline").textContent = result.headline;
    byId("executiveDailyNarrative").textContent = result.narrative;
    byId("executiveDailyConfidence").textContent = `${result.confidence}%`;
    byId("executiveDailyHealth").textContent = result.health ? String(Math.round(result.health)) : "—";
    byId("executiveDailyRevenue").textContent = result.revenue;
    byId("executiveDailyLabor").textContent = result.labor;
    byId("executiveDailyCritical").textContent = String(Math.round(result.critical));
    byId("executiveDailyOpenActions").textContent = String(Math.round(result.openActions));
    byId("executiveDailyPriorityCount").textContent = String(result.priorities.length);

    renderList("executiveDailyPriorities", result.priorities);
    renderList("executiveDailyWins", result.wins);
    renderList("executiveDailyWatch", result.watch);

    byId("executiveDailyPriority").dataset.locationId =
      result.priorityLocation?.id || "loc_marina";
  }

  function bind() {
    byId("executiveDailyPrint")?.addEventListener("click", () => {
      byId("executiveDailyStatus").textContent = "Opening print view…";
      window.print();
    });

    byId("executiveDailyAnalytics")?.addEventListener("click", () => {
      byId("executiveAnalytics")?.scrollIntoView({
        behavior:"smooth",
        block:"start"
      });
    });

    byId("executiveDailyPriority")?.addEventListener("click", event => {
      const locationId = event.currentTarget.dataset.locationId;
      const target = [...document.querySelectorAll(".district-location-card")]
        .find(card => card.querySelector("button")?.dataset?.locationId === locationId);

      (target || byId("districtCommandCenter"))?.scrollIntoView({
        behavior:"smooth",
        block:"center"
      });
    });
  }

  function observe() {
    if (!window.MutationObserver) return;

    const ids = [
      "districtCommandCenter",
      "executiveAnalytics",
      "executiveEventFeed",
      "executiveActionCenter",
      "executiveScorecards"
    ];

    const observer = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(render, 100);
    });

    ids.map(byId).filter(Boolean).forEach(node => observer.observe(node, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true
    }));
  }

  function init() {
    if (!byId("executiveDailyBrief")) return;
    bind();
    render();
    observe();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})();
