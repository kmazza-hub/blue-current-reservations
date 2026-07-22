(function () {
  "use strict";

  const scenarios = [
    { label:"Current service", occupancy:82, occupancy15:89, occupancy30:94, wait:12, kitchen:11, kitchenProjected:15, revenue:8420, forecast:13950, confidence:94, staffing:"Balanced", action:"Prepare patio section", reason:"Two large parties arrive within 25 minutes." },
    { label:"Demand building", occupancy:89, occupancy15:96, occupancy30:99, wait:18, kitchen:13, kitchenProjected:18, revenue:9730, forecast:15180, confidence:92, staffing:"Dining room tight", action:"Open patio and delay breaks", reason:"Four reservations and two walk-ins are converging." },
    { label:"Peak pressure", occupancy:96, occupancy15:99, occupancy30:97, wait:24, kitchen:17, kitchenProjected:21, revenue:11280, forecast:16240, confidence:90, staffing:"Kitchen heavy", action:"Pause walk-ins for 10 minutes", reason:"Ticket load is rising faster than table turns." },
    { label:"Recovery underway", occupancy:91, occupancy15:86, occupancy30:79, wait:9, kitchen:14, kitchenProjected:11, revenue:12860, forecast:16520, confidence:95, staffing:"Recovering", action:"Resume normal seating", reason:"Table turns and kitchen throughput are improving." }
  ];

  const money = value => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(value);

  window.createBlueCurrentPredictiveOperationsModule = function (eventBus, appState) {
    const root = document.getElementById("predictive-operations");
    if (!root) return null;

    const el = id => document.getElementById(id);
    const els = {
      state:el("predictionState"), occNow:el("forecastOccNow"), occ15:el("forecastOcc15"), occ30:el("forecastOcc30"), wait:el("forecastWait"),
      kitchenNow:el("forecastKitchenNow"), kitchenProjected:el("forecastKitchenProjected"), kitchenReason:el("forecastKitchenReason"),
      revenueNow:el("forecastRevenueNow"), revenueClose:el("forecastRevenueClose"), revenueConfidence:el("forecastRevenueConfidence"),
      staffing:el("forecastStaffing"), action:el("forecastAction"), brief:el("forecastBrief"), confidence:el("forecastConfidence"),
      run:el("forecastRun"), next:el("forecastNext"), bar15:el("forecastBar15"), bar30:el("forecastBar30")
    };

    let index = 0;
    let timer = null;

    function buildBrief(s) {
      return `${s.label}. Occupancy is ${s.occupancy}% and is projected to reach ${s.occupancy15}% within fifteen minutes. Kitchen time is expected to move from ${s.kitchen} to ${s.kitchenProjected} minutes. Forecast close is ${money(s.forecast)}. Recommended action: ${s.action.toLowerCase()}.`;
    }

    function render(i, publish) {
      index = (i + scenarios.length) % scenarios.length;
      const s = scenarios[index];
      els.state.textContent = s.label;
      els.occNow.textContent = `${s.occupancy}%`;
      els.occ15.textContent = `${s.occupancy15}%`;
      els.occ30.textContent = `${s.occupancy30}%`;
      els.wait.textContent = `${s.wait} min`;
      els.kitchenNow.textContent = `${s.kitchen} min`;
      els.kitchenProjected.textContent = `${s.kitchenProjected} min`;
      els.kitchenReason.textContent = s.reason;
      els.revenueNow.textContent = money(s.revenue);
      els.revenueClose.textContent = money(s.forecast);
      els.revenueConfidence.textContent = `${s.confidence}%`;
      els.staffing.textContent = s.staffing;
      els.action.textContent = s.action;
      els.brief.textContent = buildBrief(s);
      els.confidence.textContent = `${s.confidence}% confidence`;
      els.bar15.style.width = `${Math.min(100, s.occupancy15)}%`;
      els.bar30.style.width = `${Math.min(100, s.occupancy30)}%`;

      if (publish) {
        appState?.update?.({
          occupancyPercent:s.occupancy,
          estimatedRevenue:s.revenue,
          revenueForecast:s.forecast,
          projectedOccupancy:s.occupancy15,
          projectedKitchenMinutes:s.kitchenProjected,
          executiveBrief:buildBrief(s)
        }, "predictive:forecast-updated");
        eventBus?.emit?.("predictive:forecast-updated", { scenario:s, index });
        eventBus?.emit?.("ai-manager:recommendation", { priority:s.occupancy15 >= 96 ? "warning" : "info", title:s.action, detail:s.reason });
      }
    }

    function runForecast() {
      clearInterval(timer);
      els.run.disabled = true;
      els.run.textContent = "Forecasting…";
      let step = 0;
      render(step, true);
      timer = setInterval(() => {
        step += 1;
        if (step >= scenarios.length) {
          clearInterval(timer); timer = null;
          els.run.disabled = false; els.run.textContent = "Run predictive service";
          eventBus?.emit?.("predictive:run-complete", { scenarios:scenarios.length });
          return;
        }
        render(step, true);
      }, 1500);
    }

    els.run?.addEventListener("click", runForecast);
    els.next?.addEventListener("click", () => render(index + 1, true));
    eventBus?.on?.("portfolio:location-selected", ({ location }) => {
      if (!location) return;
      const closest = location.occupancy >= 95 ? 2 : location.occupancy >= 86 ? 1 : 0;
      render(closest, false);
    });
    eventBus?.on?.("time-machine:snapshot-applied", ({ snapshot }) => {
      if (!snapshot) return;
      const closest = snapshot.occupancy >= 94 ? 2 : snapshot.occupancy >= 86 ? 1 : snapshot.occupancy >= 75 ? 0 : 3;
      render(closest, false);
    });

    render(0, false);
    eventBus?.emit?.("predictive:ready", { scenarios:scenarios.length });
    return { render, runForecast, scenarios:scenarios.slice(), getCurrent:() => scenarios[index] };
  };
})();
