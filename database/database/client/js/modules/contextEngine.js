(function () {
  "use strict";

  class BlueCurrentOperationalContextEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("OperationalContextEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.samples = [];
      this.maxSamples = 48;
    }

    capture(overrides = {}) {
      const state = this.appState.getState();
      const now = new Date();
      const hour = now.getHours();
      const occupancy = this.#number(overrides.occupancyPercent, state.occupancyPercent, 0);
      const kitchenLoad = this.#number(overrides.kitchenLoad, state.kitchenLoad, 72);
      const waitlistCount = this.#number(overrides.waitlistCount, state.waitlistCount, 0);
      const atRiskTables = this.#number(overrides.atRiskTables, state.atRiskTables, 0);
      const laborPercent = this.#number(overrides.laborPercent, state.laborPercent, 18);
      const reservationCount = Array.isArray(state.reservations) ? state.reservations.length : 0;
      const servicePeriod = hour < 11 ? "pre-service" : hour < 16 ? "lunch" : hour < 22 ? "dinner" : "close";
      const pressureScore = Math.max(0, Math.min(100, Math.round(
        kitchenLoad * 0.36 + occupancy * 0.27 + Math.min(waitlistCount * 5, 20) + Math.min(atRiskTables * 6, 18) + Math.max(laborPercent - 18, 0) * 2
      )));

      const snapshot = {
        capturedAt: now.toISOString(),
        servicePeriod,
        occupancyPercent: occupancy,
        kitchenLoad,
        waitlistCount,
        atRiskTables,
        laborPercent,
        reservationCount,
        pressureScore,
        pressureBand: pressureScore >= 82 ? "critical" : pressureScore >= 66 ? "elevated" : pressureScore >= 45 ? "watch" : "stable",
        specialEvent: Boolean(overrides.specialEvent ?? state.specialEvent),
        weatherInfluence: overrides.weatherInfluence || state.weatherInfluence || "not-connected",
        vipGuestPresent: Boolean(overrides.vipGuestPresent ?? state.vipGuestPresent),
        trend: this.#trend(kitchenLoad, occupancy)
      };

      this.samples.unshift(snapshot);
      this.samples = this.samples.slice(0, this.maxSamples);
      this.appState.update({ operationalContext: snapshot, operationalContextHistory: this.samples.slice(0, 12) });
      this.eventBus.emit("context:captured", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    explain(context) {
      const reasons = [];
      if (context.kitchenLoad >= 86) reasons.push(`Kitchen utilization is ${context.kitchenLoad}%`);
      if (context.atRiskTables >= 2) reasons.push(`${context.atRiskTables} tables are at risk`);
      if (context.waitlistCount >= 4) reasons.push(`${context.waitlistCount} parties are waiting`);
      if (context.occupancyPercent >= 82) reasons.push(`Dining room occupancy is ${context.occupancyPercent}%`);
      if (context.laborPercent >= 20.5) reasons.push(`Projected labor is ${context.laborPercent.toFixed(1)}%`);
      if (context.vipGuestPresent) reasons.push("A VIP guest is currently in service");
      if (context.specialEvent) reasons.push("Special-event operating rules are active");
      if (!reasons.length) reasons.push("Operating pressure remains within the current plan");
      return reasons;
    }

    score({ impact = 50, urgency = 50, confidence = 80, affectedGuests = 0, expiresInMinutes = 30 }) {
      const timeSensitivity = Math.max(0, Math.min(100, 100 - expiresInMinutes * 2));
      return Math.round(
        impact * 0.28 + urgency * 0.24 + confidence * 0.22 + Math.min(affectedGuests * 7, 100) * 0.14 + timeSensitivity * 0.12
      );
    }

    #trend(kitchenLoad, occupancy) {
      const prior = this.samples[0];
      if (!prior) return "baseline";
      const delta = (kitchenLoad - prior.kitchenLoad) + (occupancy - prior.occupancyPercent) * 0.5;
      return delta >= 5 ? "rising" : delta <= -5 ? "easing" : "steady";
    }

    #number(...values) {
      for (const value of values) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
      }
      return 0;
    }
  }

  window.BlueCurrentOperationalContextEngine = BlueCurrentOperationalContextEngine;
})();
