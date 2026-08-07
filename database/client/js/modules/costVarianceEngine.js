(function () {
  "use strict";

  class BlueCurrentCostVarianceEngine {
    constructor({ eventBus, appState }) {
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = appState.get("costVarianceHistory") || [];
      this.bindEvents();
    }

    bindEvents() {
      [
        "margin-intelligence:updated",
        "predictive-service:updated",
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "portfolio-performance:updated",
        "state:reset"
      ].forEach(name => this.eventBus.on(name, () => this.refresh({ reason: name })));
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const margin = state.marginIntelligence || {};
      const assumptions = margin.assumptions || state.marginAssumptions || {};
      const predictive = state.predictiveService || {};
      const performance = state.restaurantPerformance || {};
      const outcomes = state.outcomeIntelligence || {};

      const capturedRevenue = Number(margin.metrics?.captured || performance.opportunity?.captured || state.estimatedRevenue || 0);
      const currentMargin = Number(margin.metrics?.marginPercent || assumptions.targetMarginPercent || 0);
      const targetMargin = Number(assumptions.targetMarginPercent || 18);
      const horizonHours = 4;

      const pressure = Number(predictive.metrics?.pressure || predictive.pressure || 55);
      const kitchenLoad = Number(predictive.metrics?.kitchenLoad || predictive.kitchenLoad || 70);
      const waitMinutes = Number(predictive.metrics?.guestWait || predictive.guestWait || 12);
      const adoption = Number(state.postLaunchValue?.metrics?.adoptionPercent || 72);

      const baselineCosts = {
        food: capturedRevenue * (Number(assumptions.foodCostPercent || 31) / 100),
        labor: capturedRevenue * (Number(assumptions.laborCostPercent || 28) / 100),
        discount: capturedRevenue * (Number(assumptions.discountPercent || 3) / 100),
        waste: capturedRevenue * (Number(assumptions.wastePercent || 2) / 100)
      };

      const forecastFactors = {
        food: 1 + Math.max(0, kitchenLoad - 72) / 500,
        labor: 1 + Math.max(0, pressure - 58) / 420,
        discount: 1 + Math.max(0, waitMinutes - 10) / 95,
        waste: 1 + Math.max(0, kitchenLoad - 68) / 360
      };

      const forecastCosts = Object.fromEntries(
        Object.entries(baselineCosts).map(([key, value]) => [key, Math.round(value * forecastFactors[key])])
      );
      const variances = Object.fromEntries(
        Object.keys(baselineCosts).map(key => [key, Math.round(forecastCosts[key] - baselineCosts[key])])
      );

      const projectedTotalCost = Object.values(forecastCosts).reduce((sum, value) => sum + value, 0);
      const projectedContribution = Math.max(0, capturedRevenue - projectedTotalCost);
      const projectedMargin = capturedRevenue > 0 ? Math.round((projectedContribution / capturedRevenue) * 1000) / 10 : 0;
      const marginVariance = Math.round((projectedMargin - currentMargin) * 10) / 10;
      const profitAtRisk = Math.max(0, Math.round(capturedRevenue * Math.max(0, targetMargin - projectedMargin) / 100));
      const protectedProfit = Math.max(0, Math.round(Object.values(variances).filter(v => v > 0).reduce((a,b)=>a+b,0) * 0.72));

      const drivers = this.buildDrivers({ variances, forecastCosts, baselineCosts });
      const actions = this.buildActions({ drivers, protectedProfit, assumptions, performance, adoption });
      const confidence = this.clamp(Math.round((
        Number(margin.confidence || 68) +
        Number(outcomes.metrics?.forecastAccuracy || outcomes.forecastAccuracy || 66) +
        Number(predictive.confidence || 70)
      ) / 3), 40, 98);

      const score = this.clamp(Math.round(
        100
        - Math.max(0, targetMargin - projectedMargin) * 2.4
        - Math.min(24, profitAtRisk / Math.max(1, capturedRevenue) * 180)
        + Math.min(8, confidence / 14)
      ), 0, 100);
      const status = score >= 88 ? "protected" : score >= 72 ? "watch" : score >= 55 ? "pressure" : "critical";

      const snapshot = {
        id: `cost-variance-${Date.now()}`,
        release: "V35.14.0",
        reason,
        capturedAt: new Date().toISOString(),
        horizonHours,
        score,
        status,
        confidence,
        summary: this.summary({ status, projectedMargin, marginVariance, profitAtRisk }),
        metrics: {
          capturedRevenue: Math.round(capturedRevenue),
          currentMargin,
          projectedMargin,
          marginVariance,
          projectedContribution: Math.round(projectedContribution),
          profitAtRisk,
          protectedProfit,
          targetMargin
        },
        baselineCosts: this.roundObject(baselineCosts),
        forecastCosts,
        variances,
        drivers,
        actions
      };

      this.history = [snapshot, ...this.history].slice(0, 40);
      this.appState.update({
        costVariance: snapshot,
        costVarianceHistory: this.history,
        projectedCostVariance: variances,
        profitProtectionActions: actions
      });
      this.eventBus.emit("cost-variance:updated", structuredClone(snapshot));
      return snapshot;
    }

    buildDrivers({ variances, forecastCosts, baselineCosts }) {
      const labels = { food: "Food cost", labor: "Labor cost", discount: "Discount leakage", waste: "Waste" };
      const owners = { food: "Culinary", labor: "Operations", discount: "Guest experience", waste: "Culinary" };
      return Object.keys(labels).map(key => ({
        id: `variance-${key}`,
        key,
        label: labels[key],
        owner: owners[key],
        baseline: Math.round(baselineCosts[key]),
        forecast: Math.round(forecastCosts[key]),
        variance: Math.round(variances[key]),
        direction: variances[key] > 0 ? "unfavorable" : variances[key] < 0 ? "favorable" : "stable"
      })).sort((a,b) => b.variance - a.variance);
    }

    buildActions({ drivers, protectedProfit, assumptions, performance, adoption }) {
      const map = {
        food: {
          title: "Protect food-cost execution",
          rationale: "Tighten portion, prep, and high-cost-item controls before projected food variance reaches the shift P&L.",
          owner: "Culinary leader"
        },
        labor: {
          title: "Rebalance labor before the demand curve changes",
          rationale: "Align role coverage with the next service window while preserving guest-facing capacity.",
          owner: "Operating manager"
        },
        discount: {
          title: "Replace reactive discounting with governed recovery",
          rationale: "Use service-recovery playbooks and approval boundaries before discount leakage expands.",
          owner: "Guest experience lead"
        },
        waste: {
          title: "Reduce preventable waste exposure",
          rationale: "Adjust prep cadence and production quantities using current demand and kitchen-pressure signals.",
          owner: "Kitchen manager"
        }
      };
      const positive = drivers.filter(item => item.variance > 0);
      return positive.map((driver, index) => {
        const template = map[driver.key];
        const share = positive.reduce((s,d)=>s+d.variance,0) > 0 ? driver.variance / positive.reduce((s,d)=>s+d.variance,0) : 0;
        return {
          id: `profit-protection-${driver.key}`,
          rank: index + 1,
          domain: driver.key,
          title: template.title,
          rationale: template.rationale,
          owner: template.owner,
          expectedProtectedProfit: Math.max(1, Math.round(protectedProfit * share)),
          expectedRpiGain: Math.max(0.2, Math.round((Number(performance.index || performance.score || 78) < 85 ? 1.4 : 0.7) * share * 10) / 10),
          confidence: this.clamp(Math.round(64 + adoption / 5 - index * 3), 45, 95),
          requiresApproval: true
        };
      });
    }

    approveAction(actionId) {
      const snapshot = this.appState.get("costVariance") || this.refresh();
      const action = snapshot.actions?.find(item => item.id === actionId);
      if (!action) return false;
      this.eventBus.emit("cost-variance:action-approved", structuredClone(action));
      this.eventBus.emit("executive-workflow:create-requested", {
        source: "cost-variance",
        title: action.title,
        owner: action.owner,
        expectedProfit: action.expectedProtectedProfit,
        expectedRpiGain: action.expectedRpiGain,
        requiresApproval: true
      });
      return true;
    }

    summary({ status, projectedMargin, marginVariance, profitAtRisk }) {
      const movement = marginVariance < 0 ? `${Math.abs(marginVariance).toFixed(1)} points below the current margin` : `${marginVariance.toFixed(1)} points above the current margin`;
      if (status === "protected") return `Cost posture is protected. Projected contribution margin is ${projectedMargin.toFixed(1)}%, ${movement}.`;
      if (status === "watch") return `Margin remains manageable, but projected cost movement puts ${this.money(profitAtRisk)} of profit at risk.`;
      return `Corrective action is recommended. Projected contribution margin is ${projectedMargin.toFixed(1)}% with ${this.money(profitAtRisk)} of profit at risk.`;
    }

    roundObject(object) {
      return Object.fromEntries(Object.entries(object).map(([key,value]) => [key, Math.round(value)]));
    }

    money(value) {
      return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value||0));
    }

    reset() {
      this.history = [];
      this.appState.update({ costVariance: null, costVarianceHistory: [], projectedCostVariance: {}, profitProtectionActions: [] });
    }

    clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  }

  window.BlueCurrentCostVarianceEngine = BlueCurrentCostVarianceEngine;
})();
