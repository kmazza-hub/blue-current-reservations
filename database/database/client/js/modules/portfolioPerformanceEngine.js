(function () {
  "use strict";

  class BlueCurrentPortfolioPerformanceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PortfolioPerformanceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.history = Array.isArray(appState.get("portfolioPerformanceHistory")) ? appState.get("portfolioPerformanceHistory") : [];
      this.timer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      const schedule = () => this.scheduleRefresh();
      [
        "portfolio-intelligence:updated",
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "executive-briefing:updated",
        "portfolio-intelligence:location-opened",
        "state:reset"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, schedule)));
    }

    scheduleRefresh() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh({ reason: "operational-event" }), 140);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const portfolio = state.portfolioIntelligence || {};
      const restaurant = state.restaurantPerformance || {};
      const outcomes = state.outcomeIntelligence || {};
      const locations = this.buildLocations(portfolio.locations || [], restaurant, outcomes);
      const totals = this.aggregate(locations, portfolio, restaurant, outcomes);
      const opportunities = this.buildOpportunities(locations);
      const selectedId = state.portfolioPerformanceSelectedLocationId || locations[0]?.id || null;
      const selected = locations.find(location => location.id === selectedId) || locations[0] || null;
      const snapshot = {
        id: `portfolio-performance-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        totals,
        locations,
        opportunities,
        selectedLocationId: selected?.id || null,
        selectedLocation: selected,
        headline: this.headline(totals, opportunities)
      };

      this.snapshotValue = snapshot;
      this.history.unshift({
        capturedAt: snapshot.capturedAt,
        rpi: totals.rpi,
        revenueOpportunity: totals.revenueOpportunity,
        locationsAtRisk: totals.locationsAtRisk
      });
      this.history = this.history.slice(0, 36);
      this.appState.update({
        portfolioPerformance: snapshot,
        portfolioPerformanceHistory: this.history.slice(0, 24),
        portfolioPerformanceLocations: locations,
        portfolioPerformanceOpportunities: opportunities,
        portfolioPerformanceSelectedLocationId: selected?.id || null
      });
      this.eventBus.emit("portfolio-performance:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" }));
    }

    selectLocation(locationId) {
      this.appState.set("portfolioPerformanceSelectedLocationId", locationId);
      return this.refresh({ reason: "location-selected" });
    }

    buildLocations(rawLocations, restaurant, outcomes) {
      const baseRpi = Number(restaurant.overall || this.appState.get("restaurantPerformanceIndex") || 78);
      const measured = Array.isArray(outcomes.completed) ? outcomes.completed : Array.isArray(this.appState.get("outcomeMeasurements")) ? this.appState.get("outcomeMeasurements") : [];
      return rawLocations.map((location, index) => {
        const health = Number(location.healthScore || 70);
        const pressure = Number(location.pressureScore || 40);
        const occupancy = Number(location.occupancy || 70);
        const kitchen = Number(location.kitchenLoad || 68);
        const labor = Number(location.laborPercent || 21);
        const locationRpi = this.clamp(Math.round((health * .42) + (baseRpi * .28) + ((100 - pressure) * .18) + ((100 - Math.max(0, kitchen - 72) * 2) * .12)), 25, 98);
        const available = Math.max(0, Number(location.revenue || 0));
        const captureRate = this.clamp(.68 + locationRpi / 420 - Math.max(0, pressure - 55) / 500, .58, .96);
        const captured = Math.round(available * captureRate);
        const opportunity = Math.max(0, available - captured);
        const realized = measured.filter(item => item.locationId === location.id).reduce((sum, item) => sum + Number(item.realizedRevenue || 0), 0);
        const status = locationRpi < 62 ? "critical" : locationRpi < 76 ? "watch" : locationRpi < 88 ? "strong" : "excellent";
        const primaryDriver = kitchen >= 86 ? "Kitchen throughput" : occupancy < 68 ? "Unused capacity" : pressure >= 66 ? "Operating pressure" : labor > 24 ? "Labor efficiency" : "Demand capture";
        return {
          id: location.id || `location-${index + 1}`,
          name: location.name || `Location ${index + 1}`,
          market: location.market || "—",
          rpi: locationRpi,
          status,
          trend: location.trend || "steady",
          revenueAvailable: available,
          revenueCaptured: captured,
          revenueOpportunity: opportunity,
          realizedRevenue: realized,
          occupancy,
          kitchenLoad: kitchen,
          waitMinutes: Number(location.waitMinutes || 0),
          laborPercent: labor,
          pressureScore: pressure,
          primaryDriver,
          projectedRpiRecovery: Number(Math.min(6.5, Math.max(.5, opportunity / 420)).toFixed(1)),
          confidence: this.clamp(Math.round(72 + health * .16 + (location.activeRecommendations ? 3 : 0)), 70, 95)
        };
      }).sort((a, b) => a.rpi - b.rpi || b.revenueOpportunity - a.revenueOpportunity);
    }

    aggregate(locations, portfolio, restaurant, outcomes) {
      const sum = key => locations.reduce((total, item) => total + Number(item[key] || 0), 0);
      const count = Math.max(1, locations.length);
      const rpi = locations.length ? Math.round(sum("rpi") / count) : Number(restaurant.overall || 0);
      const revenueAvailable = sum("revenueAvailable") || Number(portfolio.totals?.revenue || 0);
      const revenueCaptured = sum("revenueCaptured");
      const revenueOpportunity = sum("revenueOpportunity");
      const realizedRevenue = Number(outcomes.realizedRevenue || sum("realizedRevenue") || 0);
      return {
        locationCount: locations.length,
        rpi,
        band: rpi >= 88 ? "excellent" : rpi >= 76 ? "strong" : rpi >= 62 ? "watch" : "critical",
        revenueAvailable,
        revenueCaptured,
        revenueOpportunity,
        realizedRevenue,
        locationsAtRisk: locations.filter(location => ["critical", "watch"].includes(location.status)).length,
        excellentLocations: locations.filter(location => location.status === "excellent").length,
        confidence: locations.length ? Math.round(sum("confidence") / count) : 0
      };
    }

    buildOpportunities(locations) {
      return [...locations]
        .filter(location => location.revenueOpportunity > 0)
        .sort((a, b) => b.revenueOpportunity - a.revenueOpportunity || a.rpi - b.rpi)
        .slice(0, 5)
        .map((location, index) => ({
          id: `portfolio-opportunity-${location.id}`,
          rank: index + 1,
          locationId: location.id,
          locationName: location.name,
          title: `${location.primaryDriver} at ${location.name}`,
          instruction: this.instruction(location),
          revenueImpact: Math.round(location.revenueOpportunity * .46),
          projectedRpiGain: location.projectedRpiRecovery,
          confidence: location.confidence,
          approvalRequired: true
        }));
    }

    instruction(location) {
      if (location.primaryDriver === "Kitchen throughput") return "Protect pacing now and rebalance the next seating wave.";
      if (location.primaryDriver === "Unused capacity") return "Open qualified inventory and recover reservation gaps.";
      if (location.primaryDriver === "Operating pressure") return "Assign a single owner to the highest-pressure service constraint.";
      if (location.primaryDriver === "Labor efficiency") return "Reallocate one flexible role to the highest-value station.";
      return "Increase demand capture while current service quality remains protected.";
    }

    headline(totals, opportunities) {
      const top = opportunities[0];
      if (!top) return `Portfolio RPI is ${totals.rpi}. No material cross-location opportunity is currently modeled.`;
      return `Portfolio RPI is ${totals.rpi}. ${top.locationName} has the largest modeled opportunity at ${this.money(top.revenueImpact)}.`;
    }

    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0); }
    clamp(value, min, max) { return Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min)); }
  }

  window.BlueCurrentPortfolioPerformanceEngine = BlueCurrentPortfolioPerformanceEngine;
})();
