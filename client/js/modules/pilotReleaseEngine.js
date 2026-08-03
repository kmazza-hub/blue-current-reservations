(function () {
  "use strict";

  const REQUIRED_MODULES = [
    { id: "restaurantPerformance", label: "Restaurant Performance", factory: "createBlueCurrentRestaurantPerformanceCenterModule", state: "restaurantPerformance" },
    { id: "outcomeIntelligence", label: "Outcome Intelligence", factory: "createBlueCurrentOutcomeIntelligenceCenterModule", state: "outcomeIntelligence" },
    { id: "executiveBriefing", label: "Executive Briefing", factory: "createBlueCurrentExecutiveBriefingCenterModule", state: "executiveBriefing" },
    { id: "portfolioPerformance", label: "Portfolio Performance", factory: "createBlueCurrentPortfolioPerformanceCenterModule", state: "portfolioPerformance" },
    { id: "performanceLearning", label: "Learning & Calibration", factory: "createBlueCurrentPerformanceLearningCenterModule", state: "performanceLearning" },
    { id: "predictiveService", label: "Predictive Service", factory: "createBlueCurrentPredictiveServiceCenterModule", state: "predictiveService" },
    { id: "autonomousPolicy", label: "Autonomous Policy", factory: "createBlueCurrentAutonomousPolicyCenterModule", state: "autonomousPolicySnapshot" },
    { id: "executiveWorkflow", label: "Executive Workflow", factory: "createBlueCurrentExecutiveWorkflowCenterModule", state: "executiveWorkflowSnapshot" }
  ];

  class BlueCurrentPilotReleaseEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PilotReleaseEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("pilotReleaseHistory")) ? appState.get("pilotReleaseHistory") : [];
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 180);
      };
      [
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "executive-briefing:updated",
        "portfolio-performance:updated",
        "performance-learning:updated",
        "platform-integration-audit:updated",
        "startup:diagnostics-updated"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const modules = this.auditModules(state);
      const safeguards = this.auditSafeguards(state);
      const data = this.auditData(state);
      const experience = this.auditExperience();
      const allChecks = [...modules, ...safeguards, ...data, ...experience];
      const passed = allChecks.filter(check => check.status === "ready").length;
      const blocked = allChecks.filter(check => check.status === "blocked").length;
      const score = Math.round(allChecks.reduce((sum, check) => sum + check.weight * (check.status === "ready" ? 1 : check.status === "watch" ? .55 : 0), 0) / allChecks.reduce((sum, check) => sum + check.weight, 0) * 100);
      const gate = blocked > 0 ? "blocked" : score >= 90 ? "pilot-ready" : score >= 78 ? "controlled-pilot" : "hardening";
      const manifest = this.buildManifest(state, modules);
      const snapshot = {
        id: `pilot-release-${Date.now()}`,
        version: "35.5.0",
        capturedAt: new Date().toISOString(),
        reason,
        score,
        gate,
        passed,
        total: allChecks.length,
        blocked,
        checks: { modules, safeguards, data, experience },
        manifest,
        headline: this.headline(gate, score, blocked),
        nextActions: this.nextActions(allChecks, gate)
      };
      this.history.unshift({ capturedAt: snapshot.capturedAt, score, gate, blocked });
      this.history = this.history.slice(0, 30);
      this.appState.update({
        pilotRelease: snapshot,
        pilotReleaseHistory: this.history,
        pilotReleaseManifest: manifest
      });
      this.eventBus.emit("pilot-release:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    snapshot() {
      return structuredClone(this.appState.get("pilotRelease") || this.refresh({ reason: "initial" }));
    }

    auditModules(state) {
      return REQUIRED_MODULES.map(item => {
        const factoryReady = typeof window[item.factory] === "function";
        const stateReady = Boolean(state[item.state]);
        return {
          id: item.id,
          label: item.label,
          weight: 5,
          status: factoryReady && stateReady ? "ready" : factoryReady ? "watch" : "blocked",
          detail: !factoryReady ? "Module factory missing" : stateReady ? "Loaded and publishing state" : "Loaded; awaiting first operating snapshot"
        };
      });
    }

    auditSafeguards(state) {
      const integrationScore = Number(state.platformIntegrationAudit?.score ?? 100);
      const learning = state.performanceLearning || {};
      const readiness = learning.readiness || state.pilotReadiness || {};
      const approvalsGoverned = document.getElementById("restaurantPerformanceApprove") && document.getElementById("portfolioPerformanceApprove");
      return [
        { id: "integration", label: "Platform integration health", weight: 8, status: integrationScore >= 90 ? "ready" : integrationScore >= 80 ? "watch" : "blocked", detail: `${integrationScore}/100 runtime integration score` },
        { id: "approvals", label: "Human approval gates", weight: 8, status: approvalsGoverned ? "ready" : "blocked", detail: approvalsGoverned ? "Performance and portfolio actions remain governed" : "Required approval controls are missing" },
        { id: "calibration", label: "Calibration safeguards", weight: 7, status: Number(learning.calibration?.score || 0) >= 65 ? "ready" : "watch", detail: `${Number(learning.calibration?.score || 0)}/100 calibration score` },
        { id: "readiness", label: "Pilot readiness checks", weight: 7, status: Number(readiness.score || 0) >= 80 ? "ready" : "watch", detail: `${Number(readiness.score || 0)}% learning-layer readiness` }
      ];
    }

    auditData(state) {
      const measured = Number(state.outcomeIntelligence?.summary?.measured || state.outcomeIntelligence?.measured?.length || 0);
      const rpi = Number(state.restaurantPerformance?.rpi?.score || state.restaurantPerformanceIndex || 0);
      const locations = Array.isArray(state.portfolioPerformanceLocations) ? state.portfolioPerformanceLocations.length : 0;
      return [
        { id: "rpi", label: "Restaurant performance signal", weight: 6, status: rpi > 0 ? "ready" : "watch", detail: rpi > 0 ? `RPI is active at ${Math.round(rpi)}` : "Awaiting an operating pulse" },
        { id: "outcomes", label: "Measured decision evidence", weight: 7, status: measured >= 3 ? "ready" : measured > 0 ? "watch" : "watch", detail: `${measured}/3 minimum measured decisions` },
        { id: "portfolio", label: "Portfolio operating model", weight: 5, status: locations >= 2 ? "ready" : "watch", detail: `${locations} location records available` },
        { id: "brief", label: "Leadership briefing", weight: 5, status: state.executiveBriefing?.capturedAt ? "ready" : "watch", detail: state.executiveBriefing?.capturedAt ? "Current executive brief available" : "Awaiting first synthesized brief" }
      ];
    }

    auditExperience() {
      const requiredIds = [
        "restaurantPerformanceCenter", "outcomeIntelligenceCenter", "executiveBriefingCenter",
        "portfolioPerformanceCenter", "performanceLearningCenter", "pilotReleaseCenter"
      ];
      const missing = requiredIds.filter(id => !document.getElementById(id));
      const duplicateScripts = this.duplicateScripts();
      return [
        { id: "dom", label: "Command-center DOM contract", weight: 6, status: missing.length ? "blocked" : "ready", detail: missing.length ? `Missing: ${missing.join(", ")}` : "All V35 command centers are mounted" },
        { id: "scripts", label: "Single-load script contract", weight: 6, status: duplicateScripts.length ? "blocked" : "ready", detail: duplicateScripts.length ? `Duplicate loads: ${duplicateScripts.join(", ")}` : "No duplicate JavaScript module loads detected" },
        { id: "readability", label: "Readable high-contrast surfaces", weight: 4, status: getComputedStyle(document.documentElement).getPropertyValue("--bc-pilot-ready") === "1" ? "ready" : "watch", detail: "V35 pilot surfaces use opaque, high-contrast presentation" }
      ];
    }

    duplicateScripts() {
      const counts = new Map();
      document.querySelectorAll("script[src]").forEach(script => {
        const src = new URL(script.src, location.href).pathname;
        counts.set(src, (counts.get(src) || 0) + 1);
      });
      return [...counts.entries()].filter(([, count]) => count > 1).map(([src]) => src.split("/").pop());
    }

    buildManifest(state, modules) {
      return {
        product: "Blue Current Hospitality OS",
        release: "V35.5.0",
        track: "Pilot-ready performance platform",
        generatedAt: new Date().toISOString(),
        activeLocation: state.selectedLocationId || "unknown",
        modules: modules.map(item => ({ id: item.id, label: item.label, status: item.status })),
        governance: {
          humanApprovalRequired: true,
          modeledRevenueDisclaimer: true,
          outcomeMeasurementEnabled: Boolean(state.outcomeIntelligence),
          auditHistoryEnabled: true
        }
      };
    }

    headline(gate, score, blocked) {
      if (gate === "pilot-ready") return `V35 is pilot-ready at ${score}/100 with no blocking controls.`;
      if (gate === "controlled-pilot") return `V35 supports a controlled pilot at ${score}/100. Evidence should continue accumulating.`;
      if (gate === "blocked") return `${blocked} blocking issue${blocked === 1 ? "" : "s"} must be resolved before a pilot.`;
      return `V35 remains in hardening at ${score}/100.`;
    }

    nextActions(checks, gate) {
      const actions = checks.filter(check => check.status !== "ready").map(check => `${check.label}: ${check.detail}`);
      if (!actions.length) return ["Freeze the pilot baseline, run the scripted validation, and begin controlled restaurant-user testing."];
      if (gate !== "blocked") actions.push("Continue collecting measured outcomes during the controlled pilot.");
      return actions.slice(0, 6);
    }

    reset() {
      this.history = [];
      this.appState.update({ pilotRelease: null, pilotReleaseHistory: [], pilotReleaseManifest: null });
      this.eventBus.emit("pilot-release:updated", null);
    }
  }

  window.BlueCurrentPilotReleaseEngine = BlueCurrentPilotReleaseEngine;
})();
