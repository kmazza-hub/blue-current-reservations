(function () {
  "use strict";

  class BlueCurrentRestaurantPerformanceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("RestaurantPerformanceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.history = Array.isArray(appState.get("restaurantPerformanceHistory")) ? appState.get("restaurantPerformanceHistory") : [];
      this.timer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      const schedule = () => this.scheduleRefresh();
      [
        "context:captured",
        "digital-twin:updated",
        "portfolio-intelligence:updated",
        "predictive-service:updated",
        "orchestration:queue-updated",
        "executive-workflow:updated",
        "autonomous-policy:updated",
        "state:reset"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, schedule)));
    }

    scheduleRefresh() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh({ reason: "operational-event" }), 120);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const inputs = this.collectInputs(state);
      const scores = this.calculateScores(inputs);
      const overall = this.weightedScore(scores);
      const opportunity = this.calculateOpportunity(inputs, scores);
      const drivers = this.buildDrivers(inputs, scores, opportunity);
      const actions = this.buildActions(inputs, scores, opportunity, drivers);
      const prior = this.history[0];
      const trend = prior ? Number((overall - prior.overall).toFixed(1)) : 0;
      const confidence = this.calculateConfidence(state, inputs);
      const snapshot = {
        id: `restaurant-performance-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        overall,
        band: this.band(overall),
        trend,
        confidence,
        scores,
        inputs,
        opportunity,
        drivers,
        actions,
        headline: this.headline(overall, trend, drivers, opportunity)
      };

      this.snapshotValue = snapshot;
      this.history.unshift({ capturedAt: snapshot.capturedAt, overall, scores, opportunity: opportunity.remaining });
      this.history = this.history.slice(0, 48);
      this.appState.update({
        restaurantPerformance: snapshot,
        restaurantPerformanceHistory: this.history.slice(0, 24),
        restaurantPerformanceIndex: overall,
        restaurantPerformanceOpportunity: opportunity,
        restaurantPerformanceActions: actions
      });
      this.eventBus.emit("restaurant-performance:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" }));
    }

    collectInputs(state) {
      const context = state.operationalContext || {};
      const twin = state.operationalDigitalTwin || {};
      const portfolio = state.portfolioIntelligence || {};
      const predictive = state.predictiveService || {};
      const orchestration = state.orchestrationQueue || [];
      const workflows = state.executiveWorkflows || [];
      const workflowHistory = state.executiveWorkflowHistory || [];
      const reservations = state.reservations || [];
      const expectedRevenue = Number(state.estimatedRevenue || portfolio.totals?.revenue || 31800);
      const occupancy = this.clamp(Number(twin.summary?.occupancyPercent ?? context.occupancyPercent ?? state.occupancyPercent ?? 72), 0, 100);
      const kitchenLoad = this.clamp(Number(twin.kitchen?.load ?? context.kitchenLoad ?? state.kitchenLoad ?? 68), 0, 100);
      const pressure = this.clamp(Number(context.pressureScore ?? predictive.baseline?.pressure ?? 42), 0, 100);
      const waitMinutes = this.clamp(Number(context.waitMinutes ?? predictive.baseline?.wait ?? state.waitMinutes ?? 8), 0, 90);
      const laborPercent = this.clamp(Number(context.laborPercent ?? predictive.baseline?.labor ?? state.projectedLabor ?? 21.5), 8, 45);
      const satisfaction = this.clamp(Number(state.guestSatisfaction || 4.6), 1, 5);
      const forecastConfidence = this.clamp(Number(predictive.confidence || state.intelligenceNetwork?.confidence || 78), 0, 100);
      const accepted = orchestration.filter(item => ["approved", "accepted", "executing", "completed"].includes(item.status)).length;
      const dismissed = orchestration.filter(item => ["dismissed", "rejected"].includes(item.status)).length;
      const completedWorkflows = workflowHistory.length || workflows.filter(item => item.status === "completed").length;
      const activeWorkflows = workflows.filter(item => item.status !== "completed").length;
      const reservationVolume = Number(state.reservationsToday || reservations.length || 180);
      const callsAnswered = Number(state.callsAnswered || 0);
      const guestsExpected = Number(state.guestsExpected || reservationVolume * 3.8);
      return { expectedRevenue, occupancy, kitchenLoad, pressure, waitMinutes, laborPercent, satisfaction, forecastConfidence, accepted, dismissed, completedWorkflows, activeWorkflows, reservationVolume, callsAnswered, guestsExpected };
    }

    calculateScores(i) {
      const tableUtilization = this.clamp(100 - Math.abs(82 - i.occupancy) * 1.35, 25, 100);
      const revenueCapture = this.clamp(72 + tableUtilization * .18 - Math.max(0, i.waitMinutes - 8) * .7 - Math.max(0, i.kitchenLoad - 82) * .55, 20, 100);
      const laborEfficiency = this.clamp(100 - Math.abs(20.5 - i.laborPercent) * 4.1, 20, 100);
      const financial = Math.round(revenueCapture * .48 + tableUtilization * .3 + laborEfficiency * .22);

      const waitScore = this.clamp(100 - Math.max(0, i.waitMinutes - 3) * 3.3, 20, 100);
      const satisfactionScore = this.clamp((i.satisfaction / 5) * 100, 20, 100);
      const guest = Math.round(waitScore * .48 + satisfactionScore * .52);

      const kitchenScore = this.clamp(100 - Math.max(0, i.kitchenLoad - 68) * 1.45 - Math.max(0, i.pressure - 58) * .35, 18, 100);
      const flowScore = this.clamp(100 - Math.max(0, i.pressure - 28) * .85, 18, 100);
      const workflowScore = this.clamp(76 + i.completedWorkflows * 3 - i.activeWorkflows * 2, 25, 100);
      const operations = Math.round(kitchenScore * .4 + flowScore * .38 + workflowScore * .22);

      const totalDecisions = i.accepted + i.dismissed;
      const adoption = totalDecisions ? (i.accepted / totalDecisions) * 100 : 72;
      const ai = Math.round(this.clamp(adoption * .42 + i.forecastConfidence * .38 + this.clamp(70 + i.completedWorkflows * 4, 30, 100) * .2, 20, 100));
      return { financial, guest, operations, ai, details: { tableUtilization: Math.round(tableUtilization), revenueCapture: Math.round(revenueCapture), laborEfficiency: Math.round(laborEfficiency), waitScore: Math.round(waitScore), kitchenScore: Math.round(kitchenScore), flowScore: Math.round(flowScore), adoption: Math.round(adoption) } };
    }

    weightedScore(scores) {
      return Number((scores.financial * .34 + scores.guest * .24 + scores.operations * .28 + scores.ai * .14).toFixed(1));
    }

    calculateOpportunity(i, scores) {
      const available = Math.max(1000, i.expectedRevenue);
      const leakageRate = this.clamp((100 - scores.financial) * .0045 + Math.max(0, i.waitMinutes - 6) * .004 + Math.max(0, i.kitchenLoad - 82) * .003, .015, .18);
      const remaining = Math.round(available * leakageRate);
      const captured = Math.max(0, Math.round(available - remaining));
      return {
        available,
        captured,
        remaining,
        leakageRate: Number((leakageRate * 100).toFixed(1)),
        drivers: {
          seating: Math.round(remaining * .28),
          kitchen: Math.round(remaining * .31),
          reservations: Math.round(remaining * .22),
          labor: Math.round(remaining * .19)
        }
      };
    }

    buildDrivers(i, scores, opportunity) {
      const list = [
        { id: "kitchen", label: "Kitchen throughput", score: scores.details.kitchenScore, impact: opportunity.drivers.kitchen, detail: `${i.kitchenLoad}% load · ${i.pressure} pressure` },
        { id: "seating", label: "Table utilization", score: scores.details.tableUtilization, impact: opportunity.drivers.seating, detail: `${i.occupancy}% occupied · ${i.waitMinutes} min wait` },
        { id: "reservations", label: "Demand capture", score: scores.details.revenueCapture, impact: opportunity.drivers.reservations, detail: `${i.reservationVolume} reservations · ${i.callsAnswered} calls answered` },
        { id: "labor", label: "Labor efficiency", score: scores.details.laborEfficiency, impact: opportunity.drivers.labor, detail: `${i.laborPercent}% projected labor` }
      ];
      return list.sort((a, b) => a.score - b.score || b.impact - a.impact);
    }

    buildActions(i, scores, opportunity, drivers) {
      const actions = [];
      if (i.kitchenLoad >= 82 || scores.details.kitchenScore < 76) actions.push(this.action("protect-kitchen", "Protect kitchen throughput", "Add a 4-minute seating buffer for the next demand wave.", opportunity.drivers.kitchen, 92, 2.4, "Floor manager"));
      if (i.occupancy < 78) actions.push(this.action("capture-capacity", "Capture unused dining capacity", "Open available inventory and tighten reservation-gap recovery.", opportunity.drivers.seating, 88, 2.1, "Reservations lead"));
      if (i.waitMinutes >= 12) actions.push(this.action("guest-recovery", "Start proactive guest recovery", "Assign one owner to updates before wait-time pressure increases.", Math.round(opportunity.remaining * .2), 86, 1.6, "Guest experience lead"));
      if (i.laborPercent > 23.5) actions.push(this.action("rebalance-labor", "Rebalance labor coverage", "Move one flexible role toward the highest-pressure station.", opportunity.drivers.labor, 84, 1.4, "Manager on duty"));
      if (!actions.length) actions.push(this.action("hold-posture", "Maintain the current operating posture", "Conditions are balanced. Continue monitoring the next 30-minute window.", Math.round(opportunity.remaining * .12), 90, .6, "Manager on duty"));
      return actions.sort((a, b) => b.projectedRpiGain - a.projectedRpiGain || b.revenueImpact - a.revenueImpact).slice(0, 4);
    }

    action(id, title, instruction, revenueImpact, confidence, projectedRpiGain, owner) {
      return { id, title, instruction, revenueImpact: Math.max(0, revenueImpact), confidence, projectedRpiGain, owner, approvalRequired: id !== "hold-posture" };
    }

    calculateConfidence(state, inputs) {
      let score = 58;
      if (state.operationalContext?.capturedAt) score += 10;
      if (state.operationalDigitalTwin?.capturedAt) score += 10;
      if (state.predictiveService?.capturedAt) score += 8;
      if (state.portfolioIntelligence?.capturedAt) score += 6;
      if (inputs.reservationVolume > 0) score += 4;
      return this.clamp(score, 55, 96);
    }

    headline(overall, trend, drivers, opportunity) {
      const direction = trend > .4 ? `up ${trend.toFixed(1)} points` : trend < -.4 ? `down ${Math.abs(trend).toFixed(1)} points` : "stable";
      return `Performance is ${direction}. ${drivers[0]?.label || "Operations"} is the largest current opportunity, with approximately ${this.money(opportunity.remaining)} remaining this shift.`;
    }

    band(score) { return score >= 90 ? "excellent" : score >= 80 ? "strong" : score >= 68 ? "watch" : "critical"; }
    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0); }
    clamp(value, min, max) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
  }

  window.BlueCurrentRestaurantPerformanceEngine = BlueCurrentRestaurantPerformanceEngine;
})();
