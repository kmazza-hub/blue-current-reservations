(function () {
  "use strict";

  class BlueCurrentMarginIntelligenceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("MarginIntelligenceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.timer = null;
      this.history = Array.isArray(appState.get("marginIntelligenceHistory")) ? appState.get("marginIntelligenceHistory") : [];
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 220);
      };
      [
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "portfolio-performance:updated",
        "enterprise-value-plan:updated",
        "performance-governance:updated",
        "state:changed"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const performance = state.restaurantPerformance || {};
      const outcomes = state.outcomeIntelligence || {};
      const portfolio = state.portfolioPerformance || {};
      const valuePlan = state.enterpriseValuePlan || {};
      const assumptions = this.normalizeAssumptions(state.marginAssumptions, state);
      const revenue = Number(performance.opportunity?.available || state.estimatedRevenue || portfolio.metrics?.revenueAvailable || 0);
      const captured = Number(performance.opportunity?.captured || Math.max(0, revenue - Number(performance.opportunity?.remaining || 0)));
      const revenueOpportunity = Number(performance.opportunity?.remaining || portfolio.metrics?.remainingOpportunity || 0);
      const cost = this.calculateCosts(captured, assumptions);
      const margin = Math.max(0, captured - cost.total);
      const marginPercent = captured > 0 ? Math.round((margin / captured) * 1000) / 10 : 0;
      const leakage = this.buildLeakage({ revenueOpportunity, captured, assumptions, state });
      const actions = this.buildActions(leakage, assumptions, performance);
      const realizedRevenue = Number(outcomes.metrics?.realizedRevenue || outcomes.realizedRevenue || 0);
      const realizedProfit = Math.round(realizedRevenue * (marginPercent / 100));
      const confidence = Math.max(40, Math.min(98, Math.round((
        Number(performance.confidence || 70) +
        Number(outcomes.forecastAccuracy || outcomes.metrics?.forecastAccuracy || 65) +
        Number(valuePlan.confidence || 65)
      ) / 3)));
      const score = this.calculateScore({ marginPercent, leakage, assumptions, confidence });
      const status = score >= 88 ? "strong" : score >= 72 ? "watch" : score >= 55 ? "pressure" : "critical";
      const snapshot = {
        id: `margin-intelligence-${Date.now()}`,
        release: "V35.13.0",
        capturedAt: new Date().toISOString(),
        reason,
        score,
        status,
        confidence,
        summary: this.summary(status, marginPercent, leakage),
        assumptions,
        metrics: {
          revenue,
          captured,
          grossMargin: margin,
          marginPercent,
          totalCost: cost.total,
          laborCost: cost.labor,
          foodCost: cost.food,
          discountCost: cost.discounts,
          wasteCost: cost.waste,
          profitOpportunity: leakage.reduce((sum, item) => sum + item.profitImpact, 0),
          realizedProfit
        },
        leakage,
        actions,
        nextActions: actions.slice(0, 3).map(item => item.title)
      };
      this.history.unshift({
        capturedAt: snapshot.capturedAt,
        score,
        marginPercent,
        profitOpportunity: snapshot.metrics.profitOpportunity
      });
      this.history = this.history.slice(0, 60);
      this.appState.update({
        marginIntelligence: snapshot,
        marginIntelligenceHistory: this.history,
        marginAssumptions: assumptions
      });
      this.eventBus.emit("margin-intelligence:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    normalizeAssumptions(value, state) {
      const current = value && typeof value === "object" ? value : {};
      return {
        foodCostPercent: this.clamp(Number(current.foodCostPercent ?? state.foodCostPercent ?? 30), 10, 60),
        laborCostPercent: this.clamp(Number(current.laborCostPercent ?? state.laborCostPercent ?? 31), 10, 60),
        discountPercent: this.clamp(Number(current.discountPercent ?? 3), 0, 25),
        wastePercent: this.clamp(Number(current.wastePercent ?? 2.5), 0, 20),
        targetMarginPercent: this.clamp(Number(current.targetMarginPercent ?? 18), 1, 50)
      };
    }

    calculateCosts(revenue, assumptions) {
      const food = Math.round(revenue * assumptions.foodCostPercent / 100);
      const labor = Math.round(revenue * assumptions.laborCostPercent / 100);
      const discounts = Math.round(revenue * assumptions.discountPercent / 100);
      const waste = Math.round(revenue * assumptions.wastePercent / 100);
      return { food, labor, discounts, waste, total: food + labor + discounts + waste };
    }

    buildLeakage({ revenueOpportunity, captured, assumptions, state }) {
      const wait = Number(state.guestWaitMinutes || state.operationalContext?.guestWait || 12);
      const kitchen = Number(state.kitchenLoad || state.operationalContext?.kitchenLoad || 72);
      const occupancy = Number(state.occupancyPercent || state.operationalContext?.occupancyPercent || 74);
      return [
        {
          id: "labor",
          label: "Labor deployment",
          amount: Math.round(captured * Math.max(0, assumptions.laborCostPercent - 28) / 100),
          profitImpact: Math.round(captured * Math.max(0, assumptions.laborCostPercent - 28) / 100),
          signal: `${assumptions.laborCostPercent}% labor cost`,
          owner: "Operations"
        },
        {
          id: "food",
          label: "Food cost and waste",
          amount: Math.round(captured * (Math.max(0, assumptions.foodCostPercent - 28) + assumptions.wastePercent) / 100),
          profitImpact: Math.round(captured * (Math.max(0, assumptions.foodCostPercent - 28) + assumptions.wastePercent) / 100),
          signal: `${assumptions.foodCostPercent}% food cost · ${assumptions.wastePercent}% waste`,
          owner: "Kitchen"
        },
        {
          id: "discounts",
          label: "Discount leakage",
          amount: Math.round(captured * assumptions.discountPercent / 100),
          profitImpact: Math.round(captured * Math.max(0, assumptions.discountPercent - 1.5) / 100),
          signal: `${assumptions.discountPercent}% of captured revenue`,
          owner: "Management"
        },
        {
          id: "capacity",
          label: "Uncaptured demand",
          amount: Math.round(revenueOpportunity),
          profitImpact: Math.round(revenueOpportunity * Math.max(0.08, assumptions.targetMarginPercent / 100)),
          signal: `${occupancy}% occupancy · ${wait} min wait · ${kitchen}% kitchen load`,
          owner: "Front of house"
        }
      ].sort((a, b) => b.profitImpact - a.profitImpact);
    }

    buildActions(leakage, assumptions, performance) {
      const templates = {
        labor: "Rebalance labor to the next demand window",
        food: "Review prep, portion, and waste controls",
        discounts: "Tighten discount authorization and tracking",
        capacity: "Capture available demand without exceeding service constraints"
      };
      return leakage.filter(item => item.profitImpact > 0).map((item, index) => ({
        id: `margin-action-${item.id}`,
        rank: index + 1,
        title: templates[item.id],
        owner: item.owner,
        expectedProfit: item.profitImpact,
        expectedRpiGain: Number(((item.profitImpact / Math.max(1, performance.opportunity?.available || 30000)) * 100).toFixed(1)),
        confidence: Math.max(55, Math.min(96, 86 - index * 4)),
        rationale: item.signal,
        requiresApproval: true
      }));
    }

    calculateScore({ marginPercent, leakage, assumptions, confidence }) {
      const marginScore = this.clamp(55 + (marginPercent - assumptions.targetMarginPercent) * 2.2, 0, 100);
      const leakagePenalty = this.clamp(leakage.reduce((sum, item) => sum + item.profitImpact, 0) / 45, 0, 35);
      return Math.round(this.clamp(marginScore * 0.72 + confidence * 0.28 - leakagePenalty, 0, 100));
    }

    summary(status, marginPercent, leakage) {
      const opportunity = leakage.reduce((sum, item) => sum + item.profitImpact, 0);
      const prefix = status === "strong" ? "Margin performance is strong." : status === "watch" ? "Margin performance is stable with recoverable leakage." : status === "pressure" ? "Margin pressure requires focused intervention." : "Margin performance is at risk.";
      return `${prefix} Current modeled contribution margin is ${marginPercent}%, with approximately $${Math.round(opportunity).toLocaleString()} in profit opportunity.`;
    }

    updateAssumptions(changes = {}) {
      const current = this.normalizeAssumptions(this.appState.get("marginAssumptions"), this.appState.getState());
      this.appState.set("marginAssumptions", { ...current, ...changes });
      return this.refresh({ reason: "assumptions-updated" });
    }

    approveAction(actionId) {
      const snapshot = this.appState.get("marginIntelligence") || this.refresh();
      const action = snapshot.actions?.find(item => item.id === actionId);
      if (!action) return false;
      this.eventBus.emit("margin-intelligence:action-approved", structuredClone(action));
      this.eventBus.emit("executive-workflow:create-requested", {
        source: "margin-intelligence",
        title: action.title,
        owner: action.owner,
        expectedProfit: action.expectedProfit,
        expectedRpiGain: action.expectedRpiGain,
        requiresApproval: true
      });
      return true;
    }

    reset() {
      this.history = [];
      this.appState.update({ marginIntelligence: null, marginIntelligenceHistory: [], marginAssumptions: null });
    }

    clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  }

  window.BlueCurrentMarginIntelligenceEngine = BlueCurrentMarginIntelligenceEngine;
})();
