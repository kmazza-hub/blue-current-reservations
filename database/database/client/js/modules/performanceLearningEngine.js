(function () {
  "use strict";

  class BlueCurrentPerformanceLearningEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PerformanceLearningEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("performanceLearningHistory")) ? appState.get("performanceLearningHistory") : [];
      this.unsubscribers = [];
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 120);
      };
      this.unsubscribers.push(this.eventBus.on("outcome-intelligence:updated", () => schedule("outcome-updated")));
      this.unsubscribers.push(this.eventBus.on("restaurant-performance:updated", () => schedule("performance-updated")));
      this.unsubscribers.push(this.eventBus.on("portfolio-performance:updated", () => schedule("portfolio-updated")));
      this.unsubscribers.push(this.eventBus.on("state:reset", () => this.reset()));
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const outcomes = this.collectOutcomes(state);
      const calibration = this.calculateCalibration(outcomes);
      const domains = this.calculateDomains(outcomes);
      const readiness = this.calculateReadiness(state, outcomes, calibration);
      const recommendations = this.buildRecommendations(calibration, domains, readiness);
      const snapshot = {
        id: `performance-learning-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        sampleSize: outcomes.length,
        calibration,
        domains,
        readiness,
        recommendations,
        headline: this.headline(outcomes.length, calibration, readiness)
      };

      this.history.unshift({
        capturedAt: snapshot.capturedAt,
        sampleSize: snapshot.sampleSize,
        calibrationScore: calibration.score,
        readinessScore: readiness.score
      });
      this.history = this.history.slice(0, 36);
      this.appState.update({
        performanceLearning: snapshot,
        performanceLearningHistory: this.history.slice(0, 24),
        recommendationConfidenceAdjustment: calibration.confidenceAdjustment,
        pilotReadiness: readiness
      });
      this.eventBus.emit("performance-learning:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.appState.get("performanceLearning") || this.refresh({ reason: "initial" }));
    }

    collectOutcomes(state) {
      const intelligence = state.outcomeIntelligence || {};
      const measured = Array.isArray(intelligence.measured) ? intelligence.measured : [];
      const history = Array.isArray(state.outcomeIntelligenceHistory) ? state.outcomeIntelligenceHistory : [];
      const merged = [...measured, ...history].filter(item => item && item.actual && item.status === "measured");
      const seen = new Set();
      return merged.filter(item => {
        const key = item.id || `${item.actionId}-${item.completedAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    calculateCalibration(outcomes) {
      if (!outcomes.length) {
        return {
          score: 70,
          forecastAccuracy: 0,
          successRate: 0,
          revenueRealization: 0,
          rpiRealization: 0,
          confidenceAdjustment: 0,
          band: "baseline"
        };
      }
      const accuracy = Math.round(outcomes.reduce((sum, item) => sum + Number(item.actual?.accuracy || 0), 0) / outcomes.length);
      const successPoints = outcomes.reduce((sum, item) => sum + (item.actual?.outcome === "successful" ? 1 : item.actual?.outcome === "partial" ? .5 : 0), 0);
      const successRate = Math.round(successPoints / outcomes.length * 100);
      const projectedRevenue = outcomes.reduce((sum, item) => sum + Number(item.projected?.revenue || 0), 0);
      const actualRevenue = outcomes.reduce((sum, item) => sum + Number(item.actual?.revenue || 0), 0);
      const projectedRpi = outcomes.reduce((sum, item) => sum + Number(item.projected?.rpiGain || 0), 0);
      const actualRpi = outcomes.reduce((sum, item) => sum + Math.max(0, Number(item.actual?.rpiGain || 0)), 0);
      const revenueRealization = projectedRevenue ? Math.round(actualRevenue / projectedRevenue * 100) : 0;
      const rpiRealization = projectedRpi ? Math.round(actualRpi / projectedRpi * 100) : 0;
      const score = this.clamp(Math.round(accuracy * .45 + successRate * .35 + this.clamp(revenueRealization, 0, 110) * .12 + this.clamp(rpiRealization, 0, 110) * .08), 0, 100);
      const confidenceAdjustment = outcomes.length < 3 ? 0 : score >= 88 ? 4 : score >= 78 ? 2 : score >= 62 ? 0 : score >= 48 ? -3 : -6;
      return {
        score,
        forecastAccuracy: accuracy,
        successRate,
        revenueRealization,
        rpiRealization,
        confidenceAdjustment,
        band: score >= 88 ? "trusted" : score >= 72 ? "calibrating" : score >= 55 ? "watch" : "limited"
      };
    }

    calculateDomains(outcomes) {
      const domains = ["demand", "kitchen", "guest", "labor"];
      return domains.map(domain => {
        const terms = {
          demand: /reservation|demand|arrival|capacity|table|patio/i,
          kitchen: /kitchen|ticket|expo|station|course|pacing/i,
          guest: /guest|wait|recovery|vip|service/i,
          labor: /labor|staff|coverage|server|runner|host/i
        };
        const matches = outcomes.filter(item => terms[domain].test(`${item.title || ""} ${item.evidence?.join(" ") || ""}`));
        const accuracy = matches.length ? Math.round(matches.reduce((sum, item) => sum + Number(item.actual?.accuracy || 0), 0) / matches.length) : 0;
        const successful = matches.filter(item => item.actual?.outcome === "successful").length;
        return {
          domain,
          samples: matches.length,
          accuracy,
          successRate: matches.length ? Math.round(successful / matches.length * 100) : 0,
          confidence: matches.length >= 5 ? "established" : matches.length >= 2 ? "emerging" : "limited"
        };
      });
    }

    calculateReadiness(state, outcomes, calibration) {
      const checks = [
        { id: "performance", label: "Restaurant Performance Engine", passed: Boolean(state.restaurantPerformance?.capturedAt) },
        { id: "outcomes", label: "Outcome Intelligence", passed: outcomes.length >= 3, detail: `${outcomes.length}/3 measured decisions` },
        { id: "briefing", label: "Executive Briefing", passed: Boolean(state.executiveBriefing?.capturedAt) },
        { id: "portfolio", label: "Portfolio Performance", passed: Boolean(state.portfolioPerformance?.capturedAt) },
        { id: "calibration", label: "Model calibration", passed: calibration.score >= 65, detail: `${calibration.score}/100` },
        { id: "integration", label: "Platform integration health", passed: Number(state.platformIntegrationAudit?.score || 100) >= 80 }
      ];
      const passed = checks.filter(check => check.passed).length;
      const score = Math.round(passed / checks.length * 100);
      return {
        score,
        band: score >= 90 ? "pilot-ready" : score >= 70 ? "nearly-ready" : "hardening",
        passed,
        total: checks.length,
        checks
      };
    }

    buildRecommendations(calibration, domains, readiness) {
      const items = [];
      if (calibration.forecastAccuracy && calibration.forecastAccuracy < 75) items.push("Increase review of forecast assumptions before widening automated recommendations.");
      domains.filter(domain => domain.samples < 3).forEach(domain => items.push(`Collect more measured ${domain.domain} outcomes to strengthen domain confidence.`));
      if (readiness.score < 90) items.push("Close remaining pilot-readiness checks before enabling a customer-facing pilot.");
      if (!items.length) items.push("Calibration is stable. Continue measuring actions and monitor drift by domain.");
      return items.slice(0, 4);
    }

    headline(sampleSize, calibration, readiness) {
      if (!sampleSize) return "Blue Current is ready to learn once measured outcomes are recorded.";
      return `${sampleSize} measured decisions support a ${calibration.score}/100 calibration score. Pilot readiness is ${readiness.score}/100.`;
    }

    reset() {
      this.history = [];
      this.appState.update({
        performanceLearning: null,
        performanceLearningHistory: [],
        recommendationConfidenceAdjustment: 0,
        pilotReadiness: null
      });
      this.eventBus.emit("performance-learning:updated", null);
    }

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));
    }
  }

  window.BlueCurrentPerformanceLearningEngine = BlueCurrentPerformanceLearningEngine;
})();