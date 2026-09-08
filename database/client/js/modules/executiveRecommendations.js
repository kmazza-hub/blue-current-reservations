(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  function apiClient() {
    const module = window.BlueCurrentModules?.cloudFoundation;
    return module?.api || (window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null);
  }

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
        id: card.querySelector("button")?.dataset?.locationId || "",
        name: card.querySelector(".district-location-top strong")?.textContent?.trim() || "Location",
        city: card.querySelector(".district-location-top small")?.textContent?.trim() || "",
        health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0"),
        revenue: Number.parseFloat(String(metricMap.revenue || "0").replace(/[$,]/g, "")) || 0,
        labor: Number.parseFloat(String(metricMap.labor || "0").replace("%", "")) || 0,
        alerts: Number.parseInt(metricMap.alerts || "0", 10) || 0,
        status: card.querySelector(".district-location-status")?.textContent?.trim() || ""
      };
    }).filter(location => location.id);
  }

  function recommendationFor(location) {
    if (location.labor >= 30) {
      return {
        locationId: location.id,
        locationName: location.name,
        title: `Review labor plan at ${location.name}`,
        detail: `Labor is projected at ${location.labor.toFixed(1)}%. Review coverage, demand pace, and the next cut window before peak service.`,
        priority: "high",
        due: "Before peak service",
        impactLabel: "Labor opportunity",
        impactValue: `${Math.max(0.5, location.labor - 28).toFixed(1)} pts`,
        owner: "District Operations"
      };
    }

    if (location.alerts >= 3 || location.health < 78) {
      return {
        locationId: location.id,
        locationName: location.name,
        title: `Stabilize operations at ${location.name}`,
        detail: `${location.alerts} active alerts and a health score of ${location.health} indicate that leadership should review the operating plan.`,
        priority: "high",
        due: "Within 30 minutes",
        impactLabel: "Health recovery",
        impactValue: `Target +${Math.max(5, 85 - location.health)} pts`,
        owner: "Regional Leader"
      };
    }

    if (location.alerts >= 2 || location.health < 88) {
      return {
        locationId: location.id,
        locationName: location.name,
        title: `Monitor emerging pressure at ${location.name}`,
        detail: `${location.status || "Operating pressure is building."} Confirm that the GM has a clear response plan.`,
        priority: "medium",
        due: "Before dinner rush",
        impactLabel: "Risk avoided",
        impactValue: `${location.alerts} alerts`,
        owner: "Area Manager"
      };
    }

    return {
      locationId: location.id,
      locationName: location.name,
      title: `Recognize and document performance at ${location.name}`,
      detail: `Health is ${location.health} with labor at ${location.labor.toFixed(1)}%. Capture the operating practices contributing to current performance.`,
      priority: "low",
      due: "Today",
      impactLabel: "Revenue protected",
      impactValue: money(location.revenue),
      owner: "District Leadership"
    };
  }

  function buildRecommendations() {
    const locations = readLocations();
    if (!locations.length) return [];

    const recommendations = locations.map(recommendationFor);

    const rank = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);

    return recommendations.slice(0, 3);
  }

  function reviewLocation(locationId) {
    const target = [...document.querySelectorAll(".district-location-card")]
      .find(card => card.querySelector("button")?.dataset?.locationId === locationId);

    (target || byId("districtCommandCenter"))?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  async function createExecutiveAction(recommendation, button) {
    const status = byId("executiveRecommendationsStatus");
    const api = apiClient();

    if (!status || !button) return;

    if (!recommendation.locationId) {
      status.textContent = "Select a verified restaurant before creating an action.";
      return;
    }

    if (!api?.hasCapability?.("createManagerAction") || !api.token) {
      status.textContent = "Sign in to save an executive recommendation.";
      return;
    }

    button.disabled = true;
    status.textContent = "Creating district action…";

    try {
      const action = await api.createManagerAction({
        locationId: recommendation.locationId,
        title: recommendation.title,
        source: "Executive Intelligence",
        priority: recommendation.priority,
        due: recommendation.due
      });

      if (api?.hasCapability?.("updateManagerAction")) {
        try {
          await api.updateManagerAction(action.id, {
            locationId: recommendation.locationId,
            noteUpdate: true,
            note: `${recommendation.detail} Suggested owner: ${recommendation.owner}.`
          });
          action.note = recommendation.detail;
        } catch (error) {
          console.warn("[ExecutiveRecommendations] Note could not be attached.", error);
        }
      }

      status.textContent = `Executive action created for ${recommendation.locationName}.`;
      window.dispatchEvent(new CustomEvent("bluecurrent:manager-action-created", {
        detail: { action }
      }));
    } catch (error) {
      status.textContent = error.message || "Could not create executive action.";
    } finally {
      button.disabled = false;
    }
  }

  function render() {
    const list = byId("executiveRecommendationsList");
    const headline = byId("executiveRecommendationsHeadline");
    const narrative = byId("executiveRecommendationsNarrative");
    const updated = byId("executiveRecommendationsUpdated");
    if (!list || !headline || !narrative || !updated) return;

    const recommendations = buildRecommendations();
    list.replaceChildren();

    if (!recommendations.length) {
      const empty = document.createElement("div");
      empty.className = "executive-recommendations-empty";
      empty.textContent = "No district location data is available yet.";
      list.append(empty);
      return;
    }

    const highCount = recommendations.filter(item => item.priority === "high").length;
    headline.textContent = highCount
      ? `${highCount} executive intervention${highCount === 1 ? "" : "s"} should be prioritized today.`
      : "No immediate executive intervention is required.";

    narrative.textContent = highCount
      ? "Blue Current identified portfolio conditions where district leadership can reduce risk or improve performance."
      : "Current recommendations focus on preserving strong operations and documenting repeatable practices.";

    recommendations.forEach(recommendation => {
      const card = document.createElement("article");
      card.className = "executive-recommendation-card";
      card.dataset.priority = recommendation.priority;
      card.dataset.locationId = recommendation.locationId;

      const top = document.createElement("div");
      top.className = "executive-recommendation-top";
      top.innerHTML = "<div><small></small><strong></strong></div><span class='executive-recommendation-priority'></span>";
      top.querySelector("small").textContent = recommendation.locationName;
      top.querySelector("strong").textContent = recommendation.title;
      top.querySelector(".executive-recommendation-priority").textContent = recommendation.priority;

      const detail = document.createElement("p");
      detail.textContent = recommendation.detail;

      const impact = document.createElement("div");
      impact.className = "executive-recommendation-impact";
      impact.innerHTML = `
        <div><small>Expected impact</small><strong></strong></div>
        <div><small>Suggested owner</small><strong></strong></div>
      `;
      impact.children[0].querySelector("strong").textContent =
        `${recommendation.impactLabel}: ${recommendation.impactValue}`;
      impact.children[1].querySelector("strong").textContent = recommendation.owner;

      const actions = document.createElement("div");
      actions.className = "executive-recommendation-actions";

      const review = document.createElement("button");
      review.type = "button";
      review.className = "executive-recommendation-review";
      review.textContent = "Review location";
      review.addEventListener("click", () => reviewLocation(recommendation.locationId));

      const create = document.createElement("button");
      create.type = "button";
      create.className = "executive-recommendation-create";
      create.textContent = "Create action";
      create.addEventListener("click", () => createExecutiveAction(recommendation, create));

      actions.append(review, create);
      card.append(top, detail, impact, actions);
      list.append(card);
    });

    updated.textContent = `Updated ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date())}`;
  }

  function observeDistrict() {
    const grid = byId("districtLocationGrid");
    if (!grid || !window.MutationObserver) return;

    const observer = new MutationObserver(() => {
      clearTimeout(observeDistrict.timer);
      observeDistrict.timer = setTimeout(render, 80);
    });

    observer.observe(grid, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }

  function init() {
    if (!byId("executiveRecommendations")) return;
    render();
    observeDistrict();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
