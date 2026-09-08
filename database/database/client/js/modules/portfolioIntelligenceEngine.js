(function () {
  "use strict";

  const LOCATION_BLUEPRINTS = [
    { id: "marina", name: "Marina Grille", market: "Belmar", offset: 0 },
    { id: "wharfside", name: "The Wharfside", market: "Point Pleasant", offset: 9 },
    { id: "rods", name: "Rod's Tavern", market: "Sea Girt", offset: -7 },
    { id: "captains", name: "Captain's Inn", market: "Forked River", offset: 15 },
    { id: "oyster", name: "Oyster Creek", market: "Leeds Point", offset: 5 },
    { id: "atlantic", name: "Atlantic Bar & Grill", market: "Seaside Park", offset: 22 }
  ];

  class BlueCurrentPortfolioIntelligenceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PortfolioIntelligenceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.history = [];
      this.refreshTimer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      const schedule = () => this.scheduleRefresh();
      ["digital-twin:updated", "context:captured", "orchestration:queue-updated", "portfolio:location-selected", "state:reset"].forEach(name => {
        this.unsubscribers.push(this.eventBus.on(name, schedule));
      });
    }

    scheduleRefresh() {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refresh({ reason: "operational-event" }), 100);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const baseTwin = state.operationalDigitalTwin || {};
      const baseContext = state.operationalContext || {};
      const selectedId = state.selectedLocationId || "marina";
      const locations = LOCATION_BLUEPRINTS.map((blueprint, index) => this.buildLocation({ blueprint, index, state, baseTwin, baseContext, selectedId }));
      const ranked = [...locations].sort((a, b) => a.healthScore - b.healthScore || b.pressureScore - a.pressureScore);
      const exceptions = this.buildExceptions(ranked);
      const recommendations = this.buildRecommendations(locations, exceptions);
      const totals = this.aggregate(locations);

      const snapshot = {
        id: `portfolio-intelligence-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        organization: state.organization || { name: "Blue Current Hospitality Group" },
        selectedLocationId: selectedId,
        totals,
        locations,
        exceptions,
        recommendations,
        headline: this.buildHeadline(totals, exceptions, recommendations)
      };

      this.snapshotValue = snapshot;
      this.history.unshift({ capturedAt: snapshot.capturedAt, healthScore: totals.healthScore, criticalLocations: totals.criticalLocations, headline: snapshot.headline });
      this.history = this.history.slice(0, 18);
      this.appState.update({
        portfolioIntelligence: snapshot,
        portfolioIntelligenceHistory: this.history.slice(0, 12),
        portfolioExceptions: exceptions,
        portfolioRecommendations: recommendations
      });
      this.eventBus.emit("portfolio-intelligence:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" }));
    }

    buildLocation({ blueprint, index, state, baseTwin, baseContext, selectedId }) {
      const isSelected = blueprint.id === selectedId || (selectedId === "current-location" && index === 0);
      const wave = ((new Date().getMinutes() + index * 7) % 18) - 9;
      const baseOccupancy = Number(baseContext.occupancyPercent ?? state.occupancyPercent ?? 74);
      const baseKitchen = Number(baseTwin.kitchen?.load ?? baseContext.kitchenLoad ?? state.kitchenLoad ?? 72);
      const basePressure = Number(baseContext.pressureScore ?? 38);
      const occupancy = this.clamp(Math.round(baseOccupancy + blueprint.offset * .55 + wave * .45), 28, 99);
      const kitchenLoad = this.clamp(Math.round(baseKitchen + blueprint.offset * .45 + wave * .55), 24, 99);
      const pressureScore = this.clamp(Math.round(basePressure + blueprint.offset * .7 + wave * .8 + Math.max(0, occupancy - 82) * .55), 5, 100);
      const laborPercent = this.clamp(Number((18.2 + blueprint.offset * .09 + Math.max(0, occupancy - 72) * .045).toFixed(1)), 14.5, 29.9);
      const healthScore = this.clamp(Math.round(100 - pressureScore * .52 - Math.max(0, kitchenLoad - 78) * .45 - Math.max(0, laborPercent - 21) * 2.2), 18, 98);
      const status = healthScore < 48 ? "critical" : healthScore < 68 ? "watch" : "healthy";
      const expectedCovers = Math.round(185 + index * 37 + occupancy * 2.35);
      const revenue = Math.round(expectedCovers * (49 + index * 3.5));
      const waitMinutes = this.clamp(Math.round((occupancy - 65) * .42 + Math.max(0, kitchenLoad - 75) * .28), 0, 48);
      const ticketMinutes = this.clamp(Math.round(8 + kitchenLoad * .12), 9, 24);
      const activeRecommendations = status === "critical" ? 3 : status === "watch" ? 2 : 1;
      const trend = pressureScore > 62 ? "rising" : pressureScore < 34 ? "easing" : "steady";
      return {
        ...blueprint,
        isSelected,
        status,
        healthScore,
        pressureScore,
        occupancy,
        kitchenLoad,
        laborPercent,
        expectedCovers,
        revenue,
        waitMinutes,
        ticketMinutes,
        activeRecommendations,
        trend,
        primaryConstraint: kitchenLoad >= 88 ? "Kitchen throughput" : occupancy >= 92 ? "Dining capacity" : laborPercent >= 23 ? "Labor coverage" : waitMinutes >= 18 ? "Guest wait" : "No critical constraint",
        narrative: this.locationNarrative({ status, occupancy, kitchenLoad, waitMinutes, trend })
      };
    }

    buildExceptions(locations) {
      return locations.filter(location => location.status !== "healthy" || location.pressureScore >= 62).slice(0, 5).map((location, index) => ({
        id: `exception-${location.id}`,
        locationId: location.id,
        locationName: location.name,
        severity: location.status === "critical" ? "critical" : "watch",
        title: location.primaryConstraint,
        detail: location.narrative,
        owner: location.status === "critical" ? "Regional operations" : "Location leadership",
        dueMinutes: location.status === "critical" ? 10 + index * 4 : 25 + index * 7,
        evidence: [`${location.occupancy}% occupancy`, `${location.kitchenLoad}% kitchen load`, `${location.waitMinutes} min guest wait`]
      }));
    }

    buildRecommendations(locations, exceptions) {
      const recommendations = [];
      const constrained = locations.filter(location => location.status !== "healthy").sort((a, b) => b.pressureScore - a.pressureScore);
      const available = locations.filter(location => location.occupancy < 78 && location.healthScore > 72).sort((a, b) => a.occupancy - b.occupancy);
      if (constrained[0] && available[0]) {
        recommendations.push({
          id: "rebalance-demand",
          type: "portfolio-rebalance",
          priority: "high",
          title: `Shift overflow demand toward ${available[0].name}`,
          action: `Route suitable calls and waitlist demand away from ${constrained[0].name} for the next 45 minutes.`,
          confidence: 88,
          expectedImpact: `Protect service at ${constrained[0].name} while using available capacity at ${available[0].name}.`,
          sourceLocationId: constrained[0].id,
          targetLocationId: available[0].id,
          approvalRequired: true
        });
      }
      const kitchenRisk = locations.find(location => location.kitchenLoad >= 88);
      if (kitchenRisk) recommendations.push({
        id: `protect-kitchen-${kitchenRisk.id}`,
        type: "service-protection",
        priority: "high",
        title: `Protect kitchen throughput at ${kitchenRisk.name}`,
        action: "Extend seating intervals and pause discretionary walk-ins until projected load returns below 84%.",
        confidence: 91,
        expectedImpact: "Reduce ticket-time escalation and lower guest-recovery risk.",
        sourceLocationId: kitchenRisk.id,
        approvalRequired: true
      });
      if (!recommendations.length || exceptions.length < 2) recommendations.push({
        id: "portfolio-stable",
        type: "monitor",
        priority: "normal",
        title: "Maintain current portfolio posture",
        action: "Continue monitoring the next demand wave; no cross-location intervention is required.",
        confidence: 84,
        expectedImpact: "Preserve flexibility while current service health remains within policy.",
        sourceLocationId: locations[0]?.id,
        approvalRequired: false
      });
      return recommendations.slice(0, 4);
    }

    aggregate(locations) {
      const sum = key => locations.reduce((total, location) => total + Number(location[key] || 0), 0);
      return {
        locationCount: locations.length,
        healthScore: Math.round(sum("healthScore") / locations.length),
        occupancy: Math.round(sum("occupancy") / locations.length),
        guests: sum("expectedCovers"),
        revenue: sum("revenue"),
        criticalLocations: locations.filter(location => location.status === "critical").length,
        watchLocations: locations.filter(location => location.status === "watch").length,
        activeRecommendations: sum("activeRecommendations")
      };
    }

    buildHeadline(totals, exceptions, recommendations) {
      if (totals.criticalLocations) return `${totals.criticalLocations} location${totals.criticalLocations === 1 ? " requires" : "s require"} regional attention. ${recommendations[0]?.title || "Review portfolio exceptions."}`;
      if (totals.watchLocations) return `${totals.watchLocations} location${totals.watchLocations === 1 ? " is" : "s are"} on watch. Portfolio health remains ${totals.healthScore}/100.`;
      return `All ${totals.locationCount} locations are operating within the healthy band.`;
    }

    locationNarrative({ status, occupancy, kitchenLoad, waitMinutes, trend }) {
      if (status === "critical") return `Pressure is ${trend}; occupancy is ${occupancy}% and kitchen load is ${kitchenLoad}%. Immediate pacing review is recommended.`;
      if (status === "watch") return `The location is stable but constrained. Guest wait is ${waitMinutes} minutes and operating pressure is ${trend}.`;
      return `Service is healthy with ${occupancy}% occupancy and ${kitchenLoad}% kitchen load. Capacity remains manageable.`;
    }

    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    destroy() {
      clearTimeout(this.refreshTimer);
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
    }
  }

  window.BlueCurrentPortfolioIntelligenceEngine = BlueCurrentPortfolioIntelligenceEngine;
})();
