(() => {
  "use strict";
  const byId = id => document.getElementById(id);

  function text(id, fallback="") {
    return byId(id)?.textContent?.trim() || fallback;
  }

  function number(id, fallback=0) {
    const value = Number.parseFloat(text(id, String(fallback)).replace(/[$,%+,]/g, ""));
    return Number.isFinite(value) ? value : fallback;
  }

  function apiClient() {
    const module = window.BlueCurrentModules?.cloudFoundation;
    return module?.api || (window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null);
  }

  function readPortfolio() {
    const health = number("districtPortfolioHealth", 88);
    const revenue = number("districtRevenueToday", 0);
    const labor = number("districtLabor", 28);
    const alerts = number("districtActiveAlerts", 0);
    const critical = number("executiveCriticalCount", 0);
    const revenueTrend = number("executiveAnalyticsRevenueTrend", 0);
    const laborTrend = number("executiveAnalyticsLaborTrend", 0);

    const locations = [...document.querySelectorAll(".district-location-card")].map(card => {
      const metrics = [...card.querySelectorAll(".district-location-metrics div")];
      const metricMap = Object.fromEntries(metrics.map(row => [
        row.querySelector("small")?.textContent?.trim().toLowerCase(),
        row.querySelector("strong")?.textContent?.trim()
      ]));
      return {
        id: card.querySelector("button")?.dataset?.locationId || "loc_marina",
        name: card.querySelector(".district-location-top strong")?.textContent?.trim() || "Location",
        health: Number.parseFloat(card.querySelector(".district-health-badge")?.textContent || "0") || 0,
        labor: Number.parseFloat(String(metricMap.labor || "0").replace("%","")) || 0,
        alerts: Number.parseInt(metricMap.alerts || "0", 10) || 0
      };
    });

    const priority = [...locations].sort((a,b) => {
      const ra = (100-a.health)+a.alerts*8+Math.max(0,a.labor-28)*4;
      const rb = (100-b.health)+b.alerts*8+Math.max(0,b.labor-28)*4;
      return rb-ra;
    })[0];

    return { health, revenue, labor, alerts, critical, revenueTrend, laborTrend, priority };
  }

  function riskLabel(score) {
    if (score >= 75) return "High";
    if (score >= 52) return "Moderate";
    return "Low";
  }

  function tone(score) {
    if (score >= 75) return "risk";
    if (score >= 52) return "watch";
    return "stable";
  }

  function calculateForecast() {
    const p = readPortfolio();
    const basePressure = Math.max(15, Math.min(90,
      (100-p.health)*0.65 + p.alerts*5 + p.critical*8 + Math.max(0,p.labor-28)*6
    ));

    const windows = [
      { label:"Next hour", modifier:-4 },
      { label:"Lunch", modifier:4 },
      { label:"Afternoon", modifier:-2 },
      { label:"Dinner rush", modifier:18 },
      { label:"Late night", modifier:-8 }
    ].map((window, index) => {
      const wave = Math.sin(index * 1.2) * 5;
      const score = Math.round(Math.max(8, Math.min(100, basePressure + window.modifier + wave)));
      return { ...window, score, tone:tone(score) };
    });

    const laborRisk = Math.max(0, Math.min(100, 35 + Math.max(0,p.labor-27)*12 + Math.max(0,p.laborTrend)*10));
    const guestRisk = Math.max(0, Math.min(100, 28 + p.alerts*6 + Math.max(0,p.revenueTrend)*1.6));
    const kitchenRisk = Math.max(0, Math.min(100, windows[3].score + p.critical*5));
    const projectedRevenue = Math.max(0, Math.round(p.revenue * (1 + p.revenueTrend/100) / 10) * 10);

    const priority = p.priority;
    let recommendation = "Maintain the current operating plan.";
    let detail = "No immediate portfolio intervention is required.";
    let due = "Today";
    let priorityLevel = "medium";

    if (laborRisk >= 70) {
      recommendation = `Review labor plan at ${priority?.name || "the priority location"}.`;
      detail = `Portfolio labor is ${p.labor.toFixed(1)}% with a forecast risk score of ${Math.round(laborRisk)}.`;
      due = "Before peak service";
      priorityLevel = "high";
    } else if (guestRisk >= 70) {
      recommendation = `Prepare arrival and seating plan at ${priority?.name || "the priority location"}.`;
      detail = "Guest-demand pressure is expected to rise during the next operating window.";
      due = "Within 60 minutes";
      priorityLevel = "high";
    } else if (kitchenRisk >= 70) {
      recommendation = `Review kitchen and expo readiness at ${priority?.name || "the priority location"}.`;
      detail = "Dinner-rush pressure may exceed current service capacity.";
      due = "Before dinner rush";
      priorityLevel = "high";
    }

    const confidence = Math.max(74, Math.min(97, Math.round(82 + p.locations?.length || 0 + Math.min(10,p.alerts))));

    return {
      p, windows, laborRisk, guestRisk, kitchenRisk, projectedRevenue,
      recommendation, detail, due, priorityLevel,
      confidence: Math.max(82, Math.min(96, 86 + Math.min(8, p.alerts + p.critical)))
    };
  }

  function renderTimeline(windows) {
    const container = byId("executiveForecastTimeline");
    if (!container) return;
    container.replaceChildren();

    windows.forEach(window => {
      const card = document.createElement("article");
      card.className = "executive-forecast-window";
      card.dataset.tone = window.tone;
      card.innerHTML = "<small></small><strong></strong><span></span><div class='executive-forecast-meter'><i></i></div>";
      card.querySelector("small").textContent = window.label;
      card.querySelector("strong").textContent = `${window.score}/100`;
      card.querySelector("span").textContent = riskLabel(window.score) + " operating pressure";
      card.querySelector("i").style.width = `${window.score}%`;
      container.append(card);
    });
  }

  function render() {
    const result = calculateForecast();
    const dinner = result.windows.find(w => w.label === "Dinner rush");

    byId("executiveForecastUpdated").textContent = `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
    byId("executiveForecastConfidence").textContent = `${result.confidence}%`;

    byId("executiveForecastHeadline").textContent =
      dinner.score >= 75
        ? "Portfolio pressure is expected to peak during dinner."
        : dinner.score >= 52
          ? "Portfolio demand is building into the dinner window."
          : "Portfolio demand is expected to remain manageable.";

    byId("executiveForecastNarrative").textContent =
      `Dinner pressure is projected at ${dinner.score}/100. Portfolio health is ${Math.round(result.p.health)} with labor at ${result.p.labor.toFixed(1)}%.`;

    renderTimeline(result.windows);

    byId("executiveForecastLaborRisk").textContent = riskLabel(result.laborRisk);
    byId("executiveForecastLaborDetail").textContent = `Risk score ${Math.round(result.laborRisk)} · Labor ${result.p.labor.toFixed(1)}%.`;
    byId("executiveForecastGuestRisk").textContent = riskLabel(result.guestRisk);
    byId("executiveForecastGuestDetail").textContent = `Risk score ${Math.round(result.guestRisk)} · Revenue trend ${result.p.revenueTrend >= 0 ? "+" : ""}${result.p.revenueTrend.toFixed(1)}%.`;
    byId("executiveForecastKitchenRisk").textContent = riskLabel(result.kitchenRisk);
    byId("executiveForecastKitchenDetail").textContent = `Dinner pressure ${dinner.score}/100 · ${Math.round(result.p.critical)} critical events.`;

    byId("executiveForecastRevenue").textContent = new Intl.NumberFormat("en-US",{
      style:"currency",currency:"USD",maximumFractionDigits:0
    }).format(result.projectedRevenue);
    byId("executiveForecastRevenueDetail").textContent = "Projected end-of-day portfolio revenue.";

    byId("executiveForecastRecommendation").textContent = result.recommendation;
    byId("executiveForecastRecommendationDetail").textContent = result.detail;
    byId("executiveForecastReview").dataset.locationId = result.p.priority?.id || "loc_marina";
    byId("executiveForecastCreateAction").dataset.title = result.recommendation;
    byId("executiveForecastCreateAction").dataset.detail = result.detail;
    byId("executiveForecastCreateAction").dataset.priority = result.priorityLevel;
    byId("executiveForecastCreateAction").dataset.due = result.due;
    byId("executiveForecastCreateAction").dataset.locationId = result.p.priority?.id || "loc_marina";
  }

  async function createAction(event) {
    const button = event.currentTarget;
    const status = byId("executiveForecastStatus");
    const api = apiClient();

    if (!api?.hasCapability?.("createManagerAction") || !api.token) {
      status.textContent = "Sign in to save this forecast action.";
      return;
    }

    button.disabled = true;
    status.textContent = "Creating forecast action…";

    try {
      const action = await api.createManagerAction({
        locationId: button.dataset.locationId,
        title: button.dataset.title,
        source: "Executive Forecast",
        priority: button.dataset.priority,
        due: button.dataset.due
      });

      if (api?.hasCapability?.("updateManagerAction")) {
        try {
          await api.updateManagerAction(action.id,{
            locationId:button.dataset.locationId,
            noteUpdate:true,
            note:button.dataset.detail
          });
          action.note = button.dataset.detail;
        } catch (error) {
          console.warn("[ExecutiveForecast] Note could not be attached.", error);
        }
      }

      status.textContent = "Forecast action created.";
      window.dispatchEvent(new CustomEvent("bluecurrent:manager-action-created",{detail:{action}}));
    } catch (error) {
      status.textContent = error.message || "Could not create forecast action.";
    } finally {
      button.disabled = false;
    }
  }

  function bind() {
    byId("executiveForecastReview")?.addEventListener("click", event => {
      const locationId = event.currentTarget.dataset.locationId;
      const target = [...document.querySelectorAll(".district-location-card")]
        .find(card => card.querySelector("button")?.dataset?.locationId === locationId);
      (target || byId("districtCommandCenter"))?.scrollIntoView({behavior:"smooth",block:"center"});
    });

    byId("executiveForecastCreateAction")?.addEventListener("click", createAction);
  }

  function observe() {
    if (!window.MutationObserver) return;
    const ids = ["districtCommandCenter","executiveAnalytics","executiveEventFeed","executiveActionCenter"];
    const observer = new MutationObserver(() => {
      clearTimeout(observe.timer);
      observe.timer = setTimeout(render,100);
    });
    ids.map(byId).filter(Boolean).forEach(node => observer.observe(node,{
      childList:true,subtree:true,characterData:true,attributes:true
    }));
  }

  function init() {
    if (!byId("executiveForecastCenter")) return;
    bind();
    render();
    observe();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
