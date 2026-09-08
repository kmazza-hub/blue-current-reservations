(function () {
  "use strict";

  class BlueCurrentRoleExperienceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("RoleExperienceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.timer = null;
      this.unsubscribers = [];
      ["unified-command:updated", "guided-shift:updated", "operator-copilot:updated", "restaurant-performance:updated", "executive-briefing:updated", "platform-integration:audit-completed", "state:reset"].forEach(name => this.unsubscribers.push(eventBus.on(name, () => this.schedule(name))));
    }
    schedule(reason) { clearTimeout(this.timer); this.timer = setTimeout(() => this.refresh({ reason }), 90); }
    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const role = state.roleExperienceRole || state.unifiedCommandRole || "manager";
      const command = state.unifiedCommand || {};
      const guided = state.guidedShift || {};
      const copilot = state.operatorCopilot || {};
      const performance = state.restaurantPerformance || {};
      const executive = state.executiveBriefing || {};
      const integration = state.platformIntegrationAudit || {};
      const snapshot = {
        id: `role-experience-${Date.now()}`,
        capturedAt: new Date().toISOString(), reason, role,
        profile: this.profile(role),
        headline: this.headline(role, command, guided, executive, integration),
        primaryMetrics: this.metrics(role, command, performance, executive, integration),
        visibleSections: this.sections(role),
        density: state.roleExperienceDensity || "comfortable",
        actionCount: Number(copilot.bundle?.actionCount || 0),
        attentionCount: Number(guided.unacknowledged || 0) + Number(command.pendingApprovals || 0)
      };
      this.snapshotValue = snapshot;
      const history = Array.isArray(state.roleExperienceHistory) ? state.roleExperienceHistory : [];
      this.appState.update({ roleExperience: snapshot, unifiedCommandRole: role, roleExperienceHistory: [snapshot, ...history].slice(0, 50) });
      this.eventBus.emit("role-experience:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }
    setRole(role) {
      if (!["manager", "executive", "technical"].includes(role)) return this.snapshot();
      this.appState.update({ roleExperienceRole: role, unifiedCommandRole: role });
      this.eventBus.emit("role-experience:changed", { role, changedAt: new Date().toISOString() });
      return this.refresh({ reason: "role-changed" });
    }
    setDensity(density) {
      if (!["comfortable", "compact"].includes(density)) return this.snapshot();
      this.appState.update({ roleExperienceDensity: density });
      this.eventBus.emit("role-experience:density-changed", { density });
      return this.refresh({ reason: "density-changed" });
    }
    profile(role) {
      return {
        manager: { label: "Shift manager", promise: "Actions, handoffs, and live operating pressure." },
        executive: { label: "Executive leader", promise: "Performance, profit, portfolio risk, and measured value." },
        technical: { label: "Platform operator", promise: "Runtime health, evidence, diagnostics, and integration status." }
      }[role];
    }
    headline(role, command, guided, executive, integration) {
      if (role === "executive") return `RPI ${Number(command.rpi || 0).toFixed(1)} · ${this.money(command.profitOpportunity || 0)} modeled profit opportunity · ${Number(command.pendingApprovals || 0)} decision${Number(command.pendingApprovals || 0) === 1 ? "" : "s"} pending.`;
      if (role === "technical") return `Integration health ${Math.round(integration.healthScore || 0)} · ${Number(integration.issueCount || 0)} runtime issue${Number(integration.issueCount || 0) === 1 ? "" : "s"} · evidence remains available for drill-down.`;
      return `${Number(guided.unacknowledged || 0)} event${Number(guided.unacknowledged || 0) === 1 ? "" : "s"} need acknowledgement and ${Number(guided.openHandoffs || 0)} handoff${Number(guided.openHandoffs || 0) === 1 ? "" : "s"} remain open.`;
    }
    metrics(role, command, performance, executive, integration) {
      if (role === "executive") return [
        ["Restaurant performance", Number(command.rpi || performance.rpi || 0).toFixed(1)],
        ["Profit opportunity", this.money(command.profitOpportunity || 0)],
        ["Measured value", this.money(command.measuredRevenue || executive.realizedRevenue || 0)],
        ["Leadership confidence", `${Math.round(executive.confidence || command.confidence || 0)}%`]
      ];
      if (role === "technical") return [
        ["Integration health", `${Math.round(integration.healthScore || 0)}%`],
        ["Runtime issues", String(integration.issueCount || 0)],
        ["Loaded modules", String(integration.loadedModuleCount || 0)],
        ["Duplicate scripts", String(integration.duplicateScriptCount || 0)]
      ];
      return [
        ["RPI", Number(command.rpi || 0).toFixed(1)],
        ["Kitchen load", `${Math.round(command.kitchenLoad || 0)}%`],
        ["Guest wait", `${Math.round(command.guestWait || 0)} min`],
        ["Approvals", String(command.pendingApprovals || 0)]
      ];
    }
    sections(role) {
      if (role === "executive") return ["unifiedCommandCenter", "operatorCopilotCenter", "executiveBriefingCenter", "portfolioPerformanceCenter", "marginIntelligenceCenter"];
      if (role === "technical") return ["unifiedCommandCenter", "platformIntegrationAudit", "startupDiagnostics", "reliabilitySloRunbooks", "observabilityDashboard"];
      return ["unifiedCommandCenter", "guidedShiftCenter", "operatorCopilotCenter", "commandActionInboxCenter", "shiftCloseoutCenter"];
    }
    snapshot() { return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" })); }
    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0); }
  }
  window.BlueCurrentRoleExperienceEngine = BlueCurrentRoleExperienceEngine;
})();
