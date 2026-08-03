(function () {
  "use strict";

  class BlueCurrentOutcomeIntelligenceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("OutcomeIntelligenceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.pending = Array.isArray(appState.get("outcomeMeasurements")) ? appState.get("outcomeMeasurements") : [];
      this.history = Array.isArray(appState.get("outcomeIntelligenceHistory")) ? appState.get("outcomeIntelligenceHistory") : [];
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      this.unsubscribers.push(this.eventBus.on("restaurant-performance:action-approved", payload => this.startMeasurement(payload)));
      this.unsubscribers.push(this.eventBus.on("executive-workflow:completed", payload => this.completeFromWorkflow(payload)));
      this.unsubscribers.push(this.eventBus.on("restaurant-performance:updated", () => this.publish()));
      this.unsubscribers.push(this.eventBus.on("state:reset", () => this.reset()));
    }

    startMeasurement(payload = {}) {
      const action = payload.action || {};
      if (!action.id) return null;
      const performance = payload.performance || this.appState.get("restaurantPerformance") || {};
      const existing = this.pending.find(item => item.actionId === action.id && item.status === "measuring");
      if (existing) return existing;
      const measurement = {
        id: `outcome-${Date.now()}-${action.id}`,
        actionId: action.id,
        title: action.title || "Operational action",
        owner: action.owner || "Manager on duty",
        status: "measuring",
        startedAt: payload.approvedAt || new Date().toISOString(),
        dueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        baseline: {
          rpi: Number(performance.overall || this.appState.get("restaurantPerformanceIndex") || 0),
          opportunity: Number(performance.opportunity?.remaining || this.appState.get("restaurantPerformanceOpportunity")?.remaining || 0),
          financial: Number(performance.scores?.financial || 0),
          guest: Number(performance.scores?.guest || 0),
          operations: Number(performance.scores?.operations || 0)
        },
        projected: {
          revenue: Number(action.revenueImpact || 0),
          rpiGain: Number(action.projectedRpiGain || 0),
          confidence: Number(action.confidence || 0)
        },
        actual: null,
        evidence: [`Approved by ${action.owner || "manager"}`, action.instruction || "Operational intervention approved."].filter(Boolean)
      };
      this.pending.unshift(measurement);
      this.persist("measurement-started", measurement);
      return structuredClone(measurement);
    }

    completeMeasurement(id, { actualRevenue, actualRpi, note = "" } = {}) {
      const item = this.pending.find(entry => entry.id === id);
      if (!item || item.status !== "measuring") return null;
      const current = this.appState.get("restaurantPerformance") || {};
      const endingRpi = Number.isFinite(Number(actualRpi)) ? Number(actualRpi) : Number(current.overall || item.baseline.rpi);
      const rpiGain = Number((endingRpi - item.baseline.rpi).toFixed(1));
      const revenue = Number.isFinite(Number(actualRevenue)) ? Math.max(0, Number(actualRevenue)) : Math.max(0, Math.round(item.projected.revenue * this.estimateRealization(item, current)));
      const revenueAccuracy = item.projected.revenue > 0 ? Math.max(0, 100 - Math.abs(revenue - item.projected.revenue) / item.projected.revenue * 100) : 100;
      const rpiAccuracy = item.projected.rpiGain > 0 ? Math.max(0, 100 - Math.abs(rpiGain - item.projected.rpiGain) / item.projected.rpiGain * 100) : 100;
      const accuracy = Math.round((revenueAccuracy * .6) + (rpiAccuracy * .4));
      const outcome = revenue >= item.projected.revenue * .8 || rpiGain >= item.projected.rpiGain * .8 ? "successful" : revenue >= item.projected.revenue * .4 || rpiGain > 0 ? "partial" : "underperformed";
      item.status = "measured";
      item.completedAt = new Date().toISOString();
      item.actual = { revenue: Math.round(revenue), rpiGain, endingRpi, accuracy, outcome, note };
      item.evidence.push(note || `Measured against current Restaurant Performance Index ${endingRpi.toFixed(1)}.`);
      this.history.unshift(structuredClone(item));
      this.history = this.history.slice(0, 100);
      this.persist("measurement-completed", item);
      this.eventBus.emit("bluecurrent:decision-outcome-recorded", structuredClone(item));
      this.eventBus.emit("decision-outcome-recorded", structuredClone(item));
      return structuredClone(item);
    }

    completeFromWorkflow(payload = {}) {
      const actionId = payload.actionId || payload.workflow?.sourceActionId || payload.workflow?.metadata?.actionId;
      const item = this.pending.find(entry => entry.status === "measuring" && (!actionId || entry.actionId === actionId));
      if (item) this.completeMeasurement(item.id, { note: "Outcome closed from completed executive workflow." });
    }

    estimateRealization(item, current) {
      const confidence = Math.max(.45, Math.min(.98, item.projected.confidence / 100 || .7));
      const rpiDelta = Math.max(-5, Number(current.overall || item.baseline.rpi) - item.baseline.rpi);
      return Math.max(.25, Math.min(1.15, confidence * .7 + Math.max(0, rpiDelta) * .08));
    }

    summary() {
      const measured = this.history;
      const active = this.pending.filter(item => item.status === "measuring");
      const realizedRevenue = measured.reduce((sum, item) => sum + Number(item.actual?.revenue || 0), 0);
      const rpiRecovered = measured.reduce((sum, item) => sum + Number(item.actual?.rpiGain || 0), 0);
      const forecastAccuracy = measured.length ? Math.round(measured.reduce((sum, item) => sum + Number(item.actual?.accuracy || 0), 0) / measured.length) : 0;
      const successRate = measured.length ? Math.round(measured.filter(item => item.actual?.outcome === "successful").length / measured.length * 100) : 0;
      return {
        capturedAt: new Date().toISOString(),
        active,
        measured: measured.slice(0, 12),
        totals: { measuredCount: measured.length, activeCount: active.length, realizedRevenue: Math.round(realizedRevenue), rpiRecovered: Number(rpiRecovered.toFixed(1)), forecastAccuracy, successRate }
      };
    }

    persist(reason, subject) {
      const snapshot = this.summary();
      this.appState.update({
        outcomeMeasurements: this.pending.slice(0, 50),
        outcomeIntelligence: snapshot,
        outcomeIntelligenceHistory: this.history.slice(0, 50)
      });
      this.eventBus.emit("outcome-intelligence:updated", { reason, subject: structuredClone(subject), ...structuredClone(snapshot) });
    }

    publish() {
      const snapshot = this.summary();
      this.appState.update({ outcomeIntelligence: snapshot });
      this.eventBus.emit("outcome-intelligence:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    reset() {
      this.pending = [];
      this.history = [];
      this.persist("reset", null);
    }
  }

  window.BlueCurrentOutcomeIntelligenceEngine = BlueCurrentOutcomeIntelligenceEngine;
})();
