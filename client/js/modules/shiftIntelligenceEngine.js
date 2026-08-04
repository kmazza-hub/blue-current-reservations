(function () {
  "use strict";

  class BlueCurrentShiftIntelligenceEngine {
    constructor({ eventBus, appState }) {
      this.eventBus = eventBus;
      this.appState = appState;
      this.off = [];
      this.refreshing = false;

      [
        "state:updated",
        "trusted-dataset:updated",
        "predictive-overlay:updated",
        "kitchen-throughput:updated",
        "labor-deployment:updated"
      ].forEach((name) => {
        this.off.push(eventBus.on(name, () => this.refresh(name)));
      });
    }

    n(value, fallback = 0) {
      value = Number(value);
      return Number.isFinite(value) ? value : fallback;
    }

    state() {
      return this.appState.get("shiftIntelligence") || { history: [] };
    }

    calculate(reason = "manual") {
      // AppState.update emits state:updated synchronously. Without this guard,
      // the engine immediately re-enters calculate() and overflows the stack.
      if (this.refreshing) return this.state();
      this.refreshing = true;

      try {
        const s = this.appState.getState();
        const occupancy = this.n(s.occupancyPercent, 0);
        const kitchen = this.n(
          s.kitchenThroughput?.load ?? s.predictiveOverlay?.kitchenLoad ?? s.kitchenLoad,
          Math.min(96, occupancy + 6)
        );
        const wait = this.n(
          s.guestWaitMinutes ?? s.predictiveOverlay?.guestWait,
          Math.max(3, Math.round((occupancy - 60) / 2.5))
        );
        const labor = this.n(
          s.laborDeployment?.laborPercent ?? s.marginIntelligence?.laborCostPercent,
          31
        );
        const reservations = this.n(s.reservationsToday, 0);
        const expected = this.n(s.guestsExpected, 0);
        const serviceQuality = this.n(
          s.serviceQuality?.score,
          Math.max(45, 100 - wait * 2 - Math.max(0, kitchen - 82))
        );
        const peakMinutes = kitchen >= 88 ? 10 : occupancy >= 85 ? 20 : 35;
        const recommendations = [];
        const push = (id, title, detail, impact, confidence, urgency, owner, action) =>
          recommendations.push({ id, title, detail, impact, confidence, urgency, owner, action });

        if (kitchen >= 84) {
          push(
            "pace-seating",
            "Pace seating for the next demand wave",
            `Kitchen load is ${Math.round(kitchen)}%. Hold the next seating wave for ${kitchen >= 92 ? 5 : 3} minutes.`,
            Math.round((kitchen - 78) * 18),
            Math.min(96, 70 + (kitchen - 80)),
            kitchen >= 92 ? "critical" : "high",
            "Manager",
            "Delay the next seating wave"
          );
        }
        if (wait >= 14) {
          push(
            "open-capacity",
            "Open guest-flow capacity",
            `Average wait is ${Math.round(wait)} minutes. Activate available patio, bar, or host capacity.`,
            Math.round(wait * 22),
            Math.min(94, 72 + wait),
            wait >= 20 ? "critical" : "high",
            "Floor manager",
            "Open available seating capacity"
          );
        }
        if (labor >= 35) {
          push(
            "labor-balance",
            "Rebalance labor deployment",
            `Labor is modeled at ${labor.toFixed(1)}%. Shift one flexible role toward the current bottleneck before adding hours.`,
            Math.round((labor - 30) * 45),
            86,
            "watch",
            "Shift lead",
            "Reassign one flexible team member"
          );
        }
        if (serviceQuality < 78) {
          push(
            "protect-quality",
            "Protect service quality",
            `Service-quality score is ${Math.round(serviceQuality)}. Resolve the oldest guest-risk item before pursuing additional volume.`,
            Math.round((80 - serviceQuality) * 14),
            90,
            serviceQuality < 65 ? "critical" : "high",
            "Guest experience lead",
            "Resolve the oldest guest-risk item"
          );
        }
        if (!recommendations.length) {
          push(
            "capture-demand",
            "Capture the next safe demand window",
            `Operations are stable. Occupancy is ${Math.round(occupancy)}% with ${Math.round(wait)}-minute waits.`,
            Math.max(120, Math.round((100 - occupancy) * 12)),
            82,
            "opportunity",
            "Manager",
            "Open the next safe reservation window"
          );
        }

        const weights = { critical: 4, high: 3, watch: 2, opportunity: 1 };
        const ranked = recommendations.sort(
          (a, b) => (weights[b.urgency] || 0) - (weights[a.urgency] || 0) || b.impact - a.impact
        );
        const score = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              serviceQuality * 0.35 +
                (100 - Math.max(0, kitchen - 70) * 2) * 0.25 +
                (100 - Math.max(0, wait - 5) * 3) * 0.2 +
                (100 - Math.abs(labor - 30) * 3) * 0.2
            )
          )
        );
        const previous = this.state();
        const value = {
          reason,
          capturedAt: new Date().toISOString(),
          score,
          status: score >= 85 ? "strong" : score >= 70 ? "watch" : "attention",
          occupancy,
          kitchenLoad: kitchen,
          guestWait: wait,
          laborPercent: labor,
          serviceQuality,
          reservations,
          expectedGuests: expected,
          peakMinutes,
          recommendations: ranked,
          topAction: ranked[0],
          history: [
            ...(previous.history || []),
            { at: new Date().toISOString(), score, kitchen, wait }
          ].slice(-80)
        };

        this.appState.update({ shiftIntelligence: value });
        this.eventBus.emit("shift-intelligence:updated", structuredClone(value));
        return value;
      } finally {
        this.refreshing = false;
      }
    }

    refresh(reason = "refresh") {
      return this.calculate(reason);
    }

    approve(id) {
      const value = this.calculate("approval");
      const item = value.recommendations.find((entry) => entry.id === id);
      if (!item) return null;
      this.eventBus.emit("executive-workflow:requested", {
        source: "shift-intelligence",
        title: item.title,
        detail: item.detail,
        owner: item.owner,
        modeledProfitImpact: item.impact,
        confidence: item.confidence,
        action: item.action,
        requiresApproval: true
      });
      this.eventBus.emit("shift-intelligence:approved", item);
      return item;
    }

    destroy() {
      this.off.forEach((dispose) => dispose?.());
    }
  }

  window.BlueCurrentShiftIntelligenceEngine = BlueCurrentShiftIntelligenceEngine;
})();
