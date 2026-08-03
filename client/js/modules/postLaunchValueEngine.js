(function () {
  "use strict";

  class BlueCurrentPostLaunchValueEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PostLaunchValueEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("postLaunchValueHistory")) ? appState.get("postLaunchValueHistory") : [];
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 180);
      };
      [
        "deployment-readiness:updated",
        "deployment-readiness:location-updated",
        "outcome-intelligence:updated",
        "restaurant-performance:updated",
        "portfolio-performance:updated",
        "performance-learning:updated",
        "state:changed"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const deployment = state.deploymentReadiness || {};
      const performance = state.restaurantPerformance || {};
      const outcomes = state.outcomeIntelligence || {};
      const portfolio = state.portfolioPerformance || {};
      const learning = state.performanceLearning || {};
      const adoption = this.normalizeAdoption(state.postLaunchAdoption);
      const issues = this.normalizeIssues(state.postLaunchIssues);
      const locations = this.normalizeLocations(state.postLaunchLocations, state.deploymentLocations);
      const value = this.calculateValue({ performance, outcomes, portfolio });
      const adoptionScore = this.calculateAdoptionScore(adoption);
      const issueScore = this.calculateIssueScore(issues);
      const locationScore = this.calculateLocationScore(locations);
      const valueScore = this.calculateValueScore(value);
      const healthScore = Math.round((adoptionScore * .28) + (issueScore * .22) + (locationScore * .22) + (valueScore * .28));
      const blockingIssues = issues.filter(item => item.status !== "resolved" && item.severity === "blocking").length;
      const openIssues = issues.filter(item => item.status !== "resolved").length;
      const gate = blockingIssues ? "intervention-required" : healthScore >= 88 ? "scaling-ready" : healthScore >= 72 ? "stabilizing" : "early-adoption";
      const snapshot = {
        id: `post-launch-${Date.now()}`,
        release: "V35.9.0",
        capturedAt: new Date().toISOString(),
        reason,
        healthScore,
        gate,
        summary: this.summary(gate, { openIssues, blockingIssues }),
        adoptionScore,
        issueScore,
        locationScore,
        valueScore,
        adoption,
        issues,
        locations,
        value,
        counts: {
          openIssues,
          blockingIssues,
          liveLocations: locations.filter(item => item.status === "live").length,
          totalLocations: locations.length,
          trainedUsers: adoption.reduce((sum, item) => sum + Number(item.activeUsers || 0), 0),
          targetUsers: adoption.reduce((sum, item) => sum + Number(item.targetUsers || 0), 0)
        },
        nextActions: this.nextActions({ adoption, issues, locations, value, gate }),
        deploymentGate: deployment.gate || "unknown",
        confidence: Math.round((Number(performance.confidence || 70) + Number(learning.calibrationScore || 70)) / 2)
      };
      this.history.unshift({ capturedAt: snapshot.capturedAt, healthScore, gate, realizedRevenue: value.realizedRevenue, adoptionScore });
      this.history = this.history.slice(0, 60);
      this.appState.update({
        postLaunchValue: snapshot,
        postLaunchValueHistory: this.history,
        postLaunchAdoption: adoption,
        postLaunchIssues: issues,
        postLaunchLocations: locations
      });
      this.eventBus.emit("post-launch-value:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    normalizeAdoption(value) {
      const defaults = [
        { id: "managers", group: "Managers", activeUsers: 0, targetUsers: 4, weeklyActions: 0, targetActions: 20 },
        { id: "hosts", group: "Hosts and reservation team", activeUsers: 0, targetUsers: 8, weeklyActions: 0, targetActions: 40 },
        { id: "operations", group: "Operations leaders", activeUsers: 0, targetUsers: 3, weeklyActions: 0, targetActions: 15 },
        { id: "executives", group: "Executive sponsors", activeUsers: 0, targetUsers: 2, weeklyActions: 0, targetActions: 4 }
      ];
      const current = Array.isArray(value) ? value : [];
      return defaults.map(item => ({ ...item, ...(current.find(entry => entry.id === item.id) || {}) }));
    }

    normalizeIssues(value) {
      return Array.isArray(value) ? value.map(item => ({ status: "open", severity: "watch", owner: "Unassigned", ...item })) : [];
    }

    normalizeLocations(value, deploymentLocations) {
      const current = Array.isArray(value) ? value : [];
      if (current.length) return current;
      const source = Array.isArray(deploymentLocations) && deploymentLocations.length ? deploymentLocations : [{ id: "primary-location", name: "Primary location", status: "planned", launchOwner: "Unassigned" }];
      return source.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status === "live" ? "live" : "preparing",
        owner: item.launchOwner || "Unassigned",
        adoptionPercent: item.status === "live" ? 35 : 0,
        realizedRevenue: 0,
        rpi: null
      }));
    }

    calculateValue({ performance, outcomes, portfolio }) {
      const realizedRevenue = Number(outcomes.cumulativeRealizedRevenue || outcomes.realizedRevenue || 0);
      const measuredRpi = Number(outcomes.cumulativeRpiRecovered || outcomes.rpiRecovered || 0);
      const opportunity = Number(performance.revenueOpportunity || portfolio.remainingOpportunity || 0);
      const captured = Number(performance.revenueCaptured || portfolio.revenueCaptured || 0);
      const forecastAccuracy = Number(outcomes.forecastAccuracy || 0);
      const realizationRate = opportunity > 0 ? Math.min(100, Math.round((realizedRevenue / opportunity) * 100)) : 0;
      return { realizedRevenue, measuredRpi, opportunity, captured, forecastAccuracy, realizationRate };
    }

    calculateAdoptionScore(adoption) {
      if (!adoption.length) return 0;
      const values = adoption.map(item => {
        const userRate = Number(item.targetUsers || 0) ? Math.min(1, Number(item.activeUsers || 0) / Number(item.targetUsers)) : 0;
        const actionRate = Number(item.targetActions || 0) ? Math.min(1, Number(item.weeklyActions || 0) / Number(item.targetActions)) : 0;
        return (userRate * .6) + (actionRate * .4);
      });
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100);
    }

    calculateIssueScore(issues) {
      const open = issues.filter(item => item.status !== "resolved");
      if (!open.length) return 100;
      const penalty = open.reduce((sum, item) => sum + (item.severity === "blocking" ? 35 : item.severity === "high" ? 18 : 8), 0);
      return Math.max(0, 100 - penalty);
    }

    calculateLocationScore(locations) {
      if (!locations.length) return 0;
      const score = locations.reduce((sum, item) => {
        const statusScore = item.status === "live" ? 100 : item.status === "stabilizing" ? 72 : item.status === "hold" ? 20 : 45;
        return sum + ((statusScore * .55) + (Number(item.adoptionPercent || 0) * .45));
      }, 0) / locations.length;
      return Math.round(score);
    }

    calculateValueScore(value) {
      const realization = Math.min(100, Number(value.realizationRate || 0));
      const accuracy = Math.min(100, Number(value.forecastAccuracy || 0));
      const rpiScore = Math.min(100, Math.max(0, Number(value.measuredRpi || 0) * 12));
      return Math.round((realization * .45) + (accuracy * .35) + (rpiScore * .2));
    }

    summary(gate, counts) {
      if (gate === "scaling-ready") return "Launch adoption, platform health, and measured value support controlled expansion.";
      if (gate === "stabilizing") return `${counts.openIssues} open issue${counts.openIssues === 1 ? "" : "s"} remain while adoption and value realization stabilize.`;
      if (gate === "intervention-required") return `${counts.blockingIssues} blocking post-launch issue${counts.blockingIssues === 1 ? "" : "s"} require executive attention.`;
      return "The rollout is live but still building user adoption, evidence, and repeatable operating value.";
    }

    nextActions({ adoption, issues, locations, value, gate }) {
      const actions = [];
      issues.filter(item => item.status !== "resolved").sort((a,b) => this.severityWeight(b.severity)-this.severityWeight(a.severity)).forEach(item => actions.push({ label: `Resolve ${item.title}`, action: `${item.owner || "Assign an owner"} · ${item.severity} severity` }));
      adoption.filter(item => Number(item.activeUsers || 0) < Number(item.targetUsers || 0)).forEach(item => actions.push({ label: `Increase ${item.group} adoption`, action: `${item.activeUsers}/${item.targetUsers} active users` }));
      locations.filter(item => item.status !== "live").forEach(item => actions.push({ label: `Advance ${item.name}`, action: `Current rollout state: ${item.status}` }));
      if (Number(value.forecastAccuracy || 0) < 75) actions.push({ label: "Strengthen forecast calibration", action: "Collect additional measured outcomes before expanding automation." });
      if (gate === "scaling-ready") actions.unshift({ label: "Prepare controlled expansion", action: "Select the next locations and preserve launch support coverage." });
      return actions.slice(0, 7);
    }

    severityWeight(value) { return ({ blocking: 4, high: 3, watch: 2, low: 1 })[value] || 0; }

    updateAdoption(id, values) {
      const adoption = this.normalizeAdoption(this.appState.get("postLaunchAdoption"));
      const item = adoption.find(entry => entry.id === id);
      if (!item) throw new Error("Unknown adoption group.");
      item.activeUsers = Math.max(0, Number(values.activeUsers ?? item.activeUsers));
      item.weeklyActions = Math.max(0, Number(values.weeklyActions ?? item.weeklyActions));
      item.updatedAt = new Date().toISOString();
      this.appState.update({ postLaunchAdoption: adoption });
      this.eventBus.emit("post-launch-value:adoption-updated", structuredClone(item));
      return this.refresh({ reason: "adoption-updated" });
    }

    addIssue({ title, severity = "watch", owner = "Unassigned" }) {
      const cleanTitle = String(title || "").trim();
      if (!cleanTitle) throw new Error("Issue title is required.");
      const issues = this.normalizeIssues(this.appState.get("postLaunchIssues"));
      const issue = { id: `issue-${Date.now()}`, title: cleanTitle, severity, owner: String(owner || "").trim() || "Unassigned", status: "open", createdAt: new Date().toISOString() };
      issues.unshift(issue);
      this.appState.update({ postLaunchIssues: issues });
      this.eventBus.emit("post-launch-value:issue-added", structuredClone(issue));
      return this.refresh({ reason: "issue-added" });
    }

    resolveIssue(id) {
      const issues = this.normalizeIssues(this.appState.get("postLaunchIssues"));
      const item = issues.find(entry => entry.id === id);
      if (!item) throw new Error("Unknown post-launch issue.");
      item.status = "resolved";
      item.resolvedAt = new Date().toISOString();
      this.appState.update({ postLaunchIssues: issues });
      this.eventBus.emit("post-launch-value:issue-resolved", structuredClone(item));
      return this.refresh({ reason: "issue-resolved" });
    }

    updateLocation(id, values) {
      const locations = this.normalizeLocations(this.appState.get("postLaunchLocations"), this.appState.get("deploymentLocations"));
      const item = locations.find(entry => entry.id === id);
      if (!item) throw new Error("Unknown post-launch location.");
      item.status = values.status || item.status;
      item.adoptionPercent = Math.max(0, Math.min(100, Number(values.adoptionPercent ?? item.adoptionPercent)));
      item.realizedRevenue = Math.max(0, Number(values.realizedRevenue ?? item.realizedRevenue));
      if (values.owner !== undefined) item.owner = String(values.owner || "").trim() || "Unassigned";
      item.updatedAt = new Date().toISOString();
      this.appState.update({ postLaunchLocations: locations });
      this.eventBus.emit("post-launch-value:location-updated", structuredClone(item));
      return this.refresh({ reason: "location-updated" });
    }

    exportManifest() {
      return {
        product: "Blue Current Hospitality OS",
        release: "V35.9.0",
        generatedAt: new Date().toISOString(),
        postLaunch: this.appState.get("postLaunchValue") || this.refresh({ reason: "export" }),
        deployment: this.appState.get("deploymentReadiness"),
        outcomes: this.appState.get("outcomeIntelligence"),
        performance: this.appState.get("restaurantPerformance")
      };
    }

    reset() {
      this.history = [];
      this.appState.update({ postLaunchValue: null, postLaunchValueHistory: [], postLaunchAdoption: [], postLaunchIssues: [], postLaunchLocations: [] });
      this.eventBus.emit("post-launch-value:updated", null);
    }
  }

  window.BlueCurrentPostLaunchValueEngine = BlueCurrentPostLaunchValueEngine;
})();
