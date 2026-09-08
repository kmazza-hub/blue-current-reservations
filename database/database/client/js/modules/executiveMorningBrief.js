(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  }

  function getPortfolioLocations() {
    const cards = [...document.querySelectorAll(".district-location-card")];

    if (cards.length) {
      return cards.map(card => {
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
          health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0"),
          revenue: Number.parseFloat(String(metricMap.revenue || "0").replace(/[$,]/g, "")) || 0,
          labor: Number.parseFloat(String(metricMap.labor || "0").replace("%", "")) || 0,
          alerts: Number.parseInt(metricMap.alerts || "0", 10) || 0,
          status: card.querySelector(".district-location-status")?.textContent?.trim() || ""
        };
      });
    }

    return [
      { id:"loc_marina", name:"Marina Grill", city:"Belmar", health:92, revenue:18420, labor:26.1, alerts:1, status:"Strong dinner outlook." },
      { id:"loc_asbury", name:"Asbury Boardwalk", city:"Asbury Park", health:76, revenue:22140, labor:30.4, alerts:3, status:"Labor and host-stand pressure require attention." },
      { id:"loc_lobster", name:"Lobster Shanty", city:"Point Pleasant", health:84, revenue:17860, labor:28.7, alerts:2, status:"Kitchen pressure is building." }
    ];
  }

  function summarizePortfolio(locations) {
    const totalRevenue = locations.reduce((sum, location) => sum + location.revenue, 0);
    const totalAlerts = locations.reduce((sum, location) => sum + location.alerts, 0);
    const averageHealth = Math.round(
      locations.reduce((sum, location) => sum + location.health, 0) / Math.max(1, locations.length)
    );
    const weightedLabor = locations.reduce(
      (sum, location) => sum + location.labor * location.revenue,
      0
    ) / Math.max(1, totalRevenue);

    const rankedRisk = [...locations].sort((a, b) => {
      const riskA = (100 - a.health) + a.alerts * 8 + Math.max(0, a.labor - 28) * 4;
      const riskB = (100 - b.health) + b.alerts * 8 + Math.max(0, b.labor - 28) * 4;
      return riskB - riskA;
    });

    const topRisk = rankedRisk[0];
    const topPerformer = [...locations].sort((a, b) => {
      const scoreA = a.health + Math.max(0, 30 - a.labor) * 2 + a.revenue / 5000;
      const scoreB = b.health + Math.max(0, 30 - b.labor) * 2 + b.revenue / 5000;
      return scoreB - scoreA;
    })[0];

    const priorities = [];

    if (topRisk.labor >= 30) {
      priorities.push(`Review labor at ${topRisk.name}; current projection is ${topRisk.labor.toFixed(1)}%.`);
    }
    if (topRisk.alerts >= 2) {
      priorities.push(`Clear ${topRisk.alerts} active alerts at ${topRisk.name}.`);
    }
    if (topRisk.health < 80) {
      priorities.push(`Contact ${topRisk.name} leadership and review the operating plan before peak service.`);
    }

    const secondRisk = rankedRisk[1];
    if (priorities.length < 3 && secondRisk) {
      priorities.push(`Monitor ${secondRisk.name}; portfolio risk is next-highest at that location.`);
    }

    if (priorities.length < 3) {
      priorities.push(`Recognize ${topPerformer.name} for the strongest current operating position.`);
    }

    while (priorities.length < 3) {
      priorities.push("Continue monitoring portfolio labor, demand, and active alerts.");
    }

    return {
      totalRevenue,
      totalAlerts,
      averageHealth,
      weightedLabor,
      topRisk,
      topPerformer,
      priorities: priorities.slice(0, 3)
    };
  }

  function renderBrief() {
    const locations = getPortfolioLocations();
    const summary = summarizePortfolio(locations);

    byId("executiveBriefHealth").textContent = String(summary.averageHealth);
    byId("executiveBriefRevenue").textContent = money(summary.totalRevenue);
    byId("executiveBriefLabor").textContent = `${summary.weightedLabor.toFixed(1)}%`;
    byId("executiveBriefAlerts").textContent = String(summary.totalAlerts);

    byId("executiveBriefTopRisk").textContent = summary.topRisk.name;
    byId("executiveBriefTopRiskDetail").textContent =
      `${summary.topRisk.city} · Health ${summary.topRisk.health} · Labor ${summary.topRisk.labor.toFixed(1)}% · ${summary.topRisk.alerts} alerts.`;

    byId("executiveBriefTopPerformer").textContent = summary.topPerformer.name;
    byId("executiveBriefTopPerformerDetail").textContent =
      `${summary.topPerformer.city} · Health ${summary.topPerformer.health} · ${money(summary.topPerformer.revenue)} revenue today.`;

    const headline = byId("executiveBriefHeadline");
    const narrative = byId("executiveBriefNarrative");

    if (summary.topRisk.health < 78 || summary.topRisk.alerts >= 3) {
      headline.textContent = `${summary.topRisk.name} requires leadership attention.`;
      narrative.textContent = `Portfolio health is ${summary.averageHealth}. ${summary.topRisk.name} carries the highest risk due to labor, alerts, or operating-health pressure.`;
    } else if (summary.totalAlerts >= 4) {
      headline.textContent = "Portfolio performance is stable with several watch items.";
      narrative.textContent = `${summary.totalAlerts} alerts are active across the district. Focus leadership attention on the highest-risk location first.`;
    } else {
      headline.textContent = "Portfolio performance is stable.";
      narrative.textContent = `Average health is ${summary.averageHealth}, with labor at ${summary.weightedLabor.toFixed(1)}% and ${summary.totalAlerts} active alerts.`;
    }

    const list = byId("executiveBriefPriorities");
    list.replaceChildren();
    summary.priorities.forEach(priority => {
      const item = document.createElement("li");
      item.textContent = priority;
      list.append(item);
    });

    byId("executiveBriefPriorityCount").textContent = String(summary.priorities.length);
    byId("executiveBriefUpdated").textContent = `Updated ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date())}`;

    byId("executiveBriefFocus").dataset.locationId = summary.topRisk.id || "loc_asbury";
  }

  function bindFocus() {
    byId("executiveBriefFocus")?.addEventListener("click", event => {
      const locationId = event.currentTarget.dataset.locationId;
      const cards = [...document.querySelectorAll(".district-location-card")];
      const target = cards.find(card =>
        card.querySelector("button")?.dataset?.locationId === locationId
      ) || byId("districtCommandCenter");

      target?.scrollIntoView({ behavior:"smooth", block:"center" });
    });
  }

  function observeDistrict() {
    const grid = byId("districtLocationGrid");
    if (!grid || !window.MutationObserver) return;

    const observer = new MutationObserver(() => {
      clearTimeout(observeDistrict.timer);
      observeDistrict.timer = setTimeout(renderBrief, 80);
    });

    observer.observe(grid, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true
    });
  }

  function init() {
    if (!byId("executiveMorningBrief")) return;
    bindFocus();
    renderBrief();
    observeDistrict();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
