(function () {
  "use strict";

  class BlueCurrentRecommendationEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("RecommendationEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.sequence = 0;
    }

    evaluate(context = {}) {
      const state = this.appState.getState();
      const now = new Date().toISOString();
      const recommendations = [];
      const occupancy = Number(context.occupancyPercent ?? state.occupancyPercent ?? 0);
      const kitchenLoad = Number(context.kitchenLoad ?? state.kitchenLoad ?? 72);
      const waitlist = Number(context.waitlistCount ?? state.waitlistCount ?? 0);
      const atRiskTables = Number(context.atRiskTables ?? state.atRiskTables ?? 0);
      const laborPercent = Number(context.laborPercent ?? state.laborPercent ?? 18);

      if (kitchenLoad >= 86 || atRiskTables >= 3) {
        recommendations.push(this.#create({
          type: "service-pacing",
          priority: kitchenLoad >= 92 ? "critical" : "high",
          title: "Protect kitchen throughput",
          action: `Delay the next seating wave by ${kitchenLoad >= 92 ? 6 : 4} minutes and notify the host lead.`,
          owner: "Service Manager",
          confidence: Math.min(97, 76 + Math.round((kitchenLoad - 80) * 1.5) + atRiskTables),
          expectedImpact: "Reduce ticket congestion and protect quoted times",
          expiresInMinutes: 15,
          approvalRequired: true,
          signals: [
            { label: "Kitchen utilization", value: `${kitchenLoad}%` },
            { label: "At-risk tables", value: String(atRiskTables) },
            { label: "Current occupancy", value: `${occupancy}%` }
          ],
          createdAt: now
        }));
      }

      if (waitlist >= 4 && occupancy >= 82) {
        recommendations.push(this.#create({
          type: "guest-demand",
          priority: waitlist >= 8 ? "high" : "medium",
          title: "Recover flexible guest demand",
          action: "Offer the next two flexible parties a later seating window with immediate SMS confirmation.",
          owner: "Host Lead",
          confidence: Math.min(95, 78 + waitlist),
          expectedImpact: `Protect up to ${Math.min(waitlist, 4)} reservations from abandonment`,
          expiresInMinutes: 20,
          approvalRequired: false,
          signals: [
            { label: "Waitlist parties", value: String(waitlist) },
            { label: "Occupancy", value: `${occupancy}%` },
            { label: "Guest response window", value: "20 minutes" }
          ],
          createdAt: now
        }));
      }

      if (laborPercent >= 20.5 && occupancy < 72) {
        recommendations.push(this.#create({
          type: "labor",
          priority: "medium",
          title: "Rebalance late-shift coverage",
          action: "Review one early release after the next reservation wave while preserving host and expo coverage.",
          owner: "General Manager",
          confidence: 84,
          expectedImpact: "Improve labor efficiency without reducing guest coverage",
          expiresInMinutes: 45,
          approvalRequired: true,
          signals: [
            { label: "Projected labor", value: `${laborPercent.toFixed(1)}%` },
            { label: "Occupancy", value: `${occupancy}%` },
            { label: "Control", value: "Manager approval required" }
          ],
          createdAt: now
        }));
      }

      if (!recommendations.length) {
        recommendations.push(this.#create({
          type: "monitor",
          priority: "low",
          title: "Maintain the current operating plan",
          action: "No intervention is required. Continue monitoring service pace and the next demand wave.",
          owner: "Blue Current",
          confidence: 91,
          expectedImpact: "Preserve stable service execution",
          expiresInMinutes: 30,
          approvalRequired: false,
          signals: [
            { label: "Occupancy", value: `${occupancy}%` },
            { label: "Kitchen utilization", value: `${kitchenLoad}%` },
            { label: "Waitlist", value: String(waitlist) }
          ],
          createdAt: now
        }));
      }

      this.eventBus.emit("orchestration:recommendations-generated", {
        recommendations: structuredClone(recommendations),
        context: { occupancy, kitchenLoad, waitlist, atRiskTables, laborPercent },
        generatedAt: now
      });
      return recommendations;
    }

    #create(input) {
      this.sequence += 1;
      return {
        id: `bcr_${Date.now()}_${this.sequence}`,
        status: "pending",
        ...input,
        expiresAt: new Date(Date.now() + input.expiresInMinutes * 60000).toISOString()
      };
    }
  }

  window.BlueCurrentRecommendationEngine = BlueCurrentRecommendationEngine;
})();
