(function () {
  "use strict";

  const HORIZONS = [15, 30, 60];

  class BlueCurrentPredictiveServiceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PredictiveServiceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.history = [];
      this.refreshTimer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      const schedule = payload => this.scheduleRefresh(payload?.reason || "operational-event");
      [
        "digital-twin:updated",
        "context:captured",
        "portfolio-intelligence:updated",
        "orchestration:queue-updated",
        "recommendation:decision-recorded",
        "state:reset"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, schedule)));
    }

    scheduleRefresh(reason = "operational-event") {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refresh({ reason }), 140);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const twin = state.operationalDigitalTwin || {};
      const context = state.operationalContext || {};
      const portfolio = state.portfolioIntelligence || {};
      const baseline = this.buildBaseline({ state, twin, context, portfolio });
      const horizons = HORIZONS.map(minutes => this.buildHorizon({ minutes, baseline, twin, context }));
      const riskWindows = this.buildRiskWindows(horizons, baseline);
      const interventions = this.buildInterventions(riskWindows, horizons, baseline);
      const confidence = this.calculateConfidence({ twin, context, portfolio, baseline });
      const snapshot = {
        id: `predictive-service-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        baseline,
        horizons,
        riskWindows,
        interventions,
        confidence,
        headline: this.buildHeadline(horizons, riskWindows, interventions),
        evidence: this.buildEvidence({ baseline, twin, context, portfolio })
      };

      this.snapshotValue = snapshot;
      this.history.unshift({
        capturedAt: snapshot.capturedAt,
        pressure: baseline.pressure,
        nextRisk: riskWindows[0]?.title || "No material risk",
        confidence
      });
      this.history = this.history.slice(0, 24);
      this.appState.update({
        predictiveService: snapshot,
        predictiveServiceHistory: this.history.slice(0, 16),
        predictiveServiceRiskWindows: riskWindows,
        predictiveServiceInterventions: interventions
      });
      this.eventBus.emit("predictive-service:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" }));
    }

    buildBaseline({ state, twin, context, portfolio }) {
      const occupancy = this.clamp(Number(twin.summary?.occupancyPercent ?? context.occupancyPercent ?? state.occupancyPercent ?? 72), 0, 100);
      const kitchen = this.clamp(Number(twin.kitchen?.load ?? context.kitchenLoad ?? state.kitchenLoad ?? 68), 0, 100);
      const pressure = this.clamp(Number(context.pressureScore ?? twin.health?.pressureScore ?? 40), 0, 100);
      const wait = this.clamp(Number(context.waitMinutes ?? state.waitMinutes ?? Math.max(0, (occupancy - 65) * .35)), 0, 90);
      const arrivals = this.clamp(Number(twin.forecast?.expectedArrivals ?? Math.round((state.reservationsToday || 180) / 12)), 0, 120);
      const turns = this.clamp(Number(twin.forecast?.expectedTurns ?? Math.round((twin.summary?.occupiedTables || 14) * .35)), 0, 80);
      const labor = this.clamp(Number(context.laborPercent ?? state.projectedLabor ?? 21.4), 8, 45);
      const activeWorkflows = Number((state.activeOrchestrationWorkflows || []).length);
      const criticalLocations = Number(portfolio.totals?.criticalLocations || 0);
      return { occupancy, kitchen, pressure, wait, arrivals, turns, labor, activeWorkflows, criticalLocations };
    }

    buildHorizon({ minutes, baseline }) {
      const multiplier = minutes / 30;
      const demandWave = Math.sin((new Date().getMinutes() + minutes) / 18) * 4.5;
      const netTables = baseline.arrivals * multiplier * .32 - baseline.turns * multiplier * .42;
      const occupancy = this.clamp(Math.round(baseline.occupancy + netTables + demandWave), 0, 100);
      const kitchen = this.clamp(Math.round(baseline.kitchen + Math.max(0, occupancy - baseline.occupancy) * .72 + baseline.pressure * .05 * multiplier), 0, 100);
      const wait = this.clamp(Math.round(baseline.wait + Math.max(0, occupancy - 78) * .3 + Math.max(0, kitchen - 82) * .22), 0, 90);
      const ticket = this.clamp(Math.round(8 + kitchen * .13 + Math.max(0, baseline.pressure - 60) * .04), 8, 35);
      const pressure = this.clamp(Math.round((occupancy * .36) + (kitchen * .38) + (Math.min(wait, 30) * .7) + (baseline.activeWorkflows * 1.5)), 0, 100);
      const band = pressure >= 82 ? "critical" : pressure >= 66 ? "elevated" : pressure >= 48 ? "watch" : "stable";
      const constraint = kitchen >= 90 ? "Kitchen throughput" : occupancy >= 94 ? "Dining capacity" : wait >= 20 ? "Guest wait" : baseline.labor >= 25 ? "Labor coverage" : "No material constraint";
      return {
        minutes,
        occupancy,
        kitchen,
        wait,
        ticket,
        pressure,
        band,
        constraint,
        arrivals: Math.round(baseline.arrivals * multiplier),
        turns: Math.round(baseline.turns * multiplier),
        narrative: this.horizonNarrative({ minutes, occupancy, kitchen, wait, pressure, constraint, band })
      };
    }

    buildRiskWindows(horizons, baseline) {
      const windows = [];
      horizons.forEach(horizon => {
        if (horizon.kitchen >= 86) windows.push(this.windowFrom(horizon, "Kitchen compression", `Kitchen load is projected to reach ${horizon.kitchen}% with ${horizon.ticket}-minute tickets.`, "Kitchen lead", horizon.kitchen >= 93 ? "critical" : "high"));
        if (horizon.occupancy >= 90) windows.push(this.windowFrom(horizon, "Capacity compression", `Dining-room occupancy is projected to reach ${horizon.occupancy}%.`, "Floor manager", horizon.occupancy >= 97 ? "critical" : "high"));
        if (horizon.wait >= 16) windows.push(this.windowFrom(horizon, "Guest wait escalation", `Guest wait is projected to reach ${horizon.wait} minutes.`, "Guest experience lead", horizon.wait >= 25 ? "critical" : "watch"));
      });
      if (baseline.criticalLocations > 0) windows.push({
        id: "portfolio-spillover",
        startsInMinutes: 15,
        severity: "watch",
        title: "Portfolio spillover risk",
        detail: `${baseline.criticalLocations} portfolio location${baseline.criticalLocations === 1 ? " is" : "s are"} currently critical, increasing the chance of redirected demand.`,
        owner: "Regional operations",
        evidence: ["Portfolio exception feed", "Cross-location demand model"]
      });
      return windows.sort((a,b) => a.startsInMinutes - b.startsInMinutes || this.severityRank(b.severity) - this.severityRank(a.severity)).slice(0, 8);
    }

    windowFrom(horizon, title, detail, owner, severity) {
      return {
        id: `${title.toLowerCase().replace(/\W+/g, "-")}-${horizon.minutes}`,
        startsInMinutes: horizon.minutes,
        severity,
        title,
        detail,
        owner,
        evidence: [`${horizon.occupancy}% occupancy`, `${horizon.kitchen}% kitchen load`, `${horizon.pressure} pressure score`]
      };
    }

    buildInterventions(riskWindows, horizons, baseline) {
      const items = [];
      const firstKitchen = riskWindows.find(item => item.title === "Kitchen compression");
      if (firstKitchen) items.push({
        id: "pace-seating",
        priority: firstKitchen.severity,
        title: "Protect kitchen throughput",
        action: `Add a 4-minute seating buffer beginning in ${Math.max(5, firstKitchen.startsInMinutes - 10)} minutes.`,
        owner: "Floor manager",
        confidence: 91,
        expectedImpact: "Reduce peak ticket-time growth while preserving guest communication.",
        approvalRequired: true
      });
      const firstWait = riskWindows.find(item => item.title === "Guest wait escalation");
      if (firstWait) items.push({
        id: "activate-guest-recovery",
        priority: firstWait.severity,
        title: "Prepare guest-recovery coverage",
        action: `Assign one host to proactive updates before the ${firstWait.startsInMinutes}-minute risk window.`,
        owner: "Guest experience lead",
        confidence: 86,
        expectedImpact: "Reduce uncertainty and protect satisfaction during the demand wave.",
        approvalRequired: true
      });
      if (baseline.labor >= 24.5 && horizons[1]?.pressure < 72) items.push({
        id: "hold-labor-posture",
        priority: "normal",
        title: "Hold current labor posture",
        action: "Delay labor reductions until the 30-minute demand wave clears.",
        owner: "Manager on duty",
        confidence: 84,
        expectedImpact: "Preserve service flexibility through the highest projected pressure window.",
        approvalRequired: false
      });
      if (!items.length) items.push({
        id: "monitor-stable-service",
        priority: "normal",
        title: "Maintain current operating posture",
        action: "Continue monitoring. No preemptive intervention is required at this time.",
        owner: "Manager on duty",
        confidence: 88,
        expectedImpact: "Avoid unnecessary operating changes while conditions remain stable.",
        approvalRequired: false
      });
      return items.slice(0, 5);
    }

    calculateConfidence({ twin, context, portfolio, baseline }) {
      let score = 62;
      if (twin?.capturedAt) score += 10;
      if (context?.capturedAt) score += 10;
      if (portfolio?.capturedAt) score += 6;
      if (baseline.arrivals > 0) score += 5;
      if (baseline.turns > 0) score += 4;
      return this.clamp(score, 55, 96);
    }

    buildEvidence({ baseline, twin, context, portfolio }) {
      return [
        { label: "Digital twin", status: twin?.capturedAt ? "current" : "estimated", detail: `${baseline.occupancy}% occupancy · ${baseline.kitchen}% kitchen` },
        { label: "Operational context", status: context?.capturedAt ? "current" : "estimated", detail: `${baseline.pressure} pressure · ${baseline.wait} min wait` },
        { label: "Portfolio network", status: portfolio?.capturedAt ? "current" : "limited", detail: `${baseline.criticalLocations} critical locations` },
        { label: "Workflow load", status: "current", detail: `${baseline.activeWorkflows} active AI workflows` }
      ];
    }

    buildHeadline(horizons, windows, interventions) {
      const peak = [...horizons].sort((a,b) => b.pressure - a.pressure)[0];
      if (!peak) return "Forecast is waiting for operating context.";
      if (windows.some(item => item.severity === "critical")) return `Critical service pressure is forecast within ${windows[0].startsInMinutes} minutes. ${interventions[0]?.title || "Review the operating plan"}.`;
      if (windows.length) return `${windows.length} emerging risk window${windows.length === 1 ? "" : "s"} detected. Peak pressure is forecast at ${peak.minutes} minutes.`;
      return `Service is forecast to remain stable through the next hour. Peak pressure is ${peak.pressure}.`;
    }

    horizonNarrative({ minutes, occupancy, kitchen, wait, pressure, constraint, band }) {
      return `In ${minutes} minutes, occupancy is projected at ${occupancy}%, kitchen load at ${kitchen}%, and guest wait at ${wait} minutes. Pressure is ${band} (${pressure}); likely constraint: ${constraint}.`;
    }

    severityRank(value) { return ({ critical: 4, high: 3, watch: 2, normal: 1 }[value] || 0); }
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    destroy() { clearTimeout(this.refreshTimer); this.unsubscribers.forEach(unsubscribe => unsubscribe()); }
  }

  window.BlueCurrentPredictiveServiceEngine = BlueCurrentPredictiveServiceEngine;
})();
