(function () {
  "use strict";

  const DEFAULT_POLICIES = [
    { id: "seating-buffer", name: "Protect kitchen pacing", trigger: "Projected kitchen load ≥ 88%", action: "Apply a 5-minute seating buffer", owner: "Service manager", mode: "approval", enabled: true },
    { id: "guest-recovery", name: "Start proactive guest recovery", trigger: "Projected wait ≥ 14 minutes", action: "Assign recovery owner and prepare guest outreach", owner: "Guest experience lead", mode: "approval", enabled: true },
    { id: "labor-hold", name: "Hold labor posture", trigger: "Demand wave active and pressure ≥ 70", action: "Pause nonessential labor reductions for 30 minutes", owner: "Manager on duty", mode: "approval", enabled: true },
    { id: "portfolio-overflow", name: "Prepare overflow routing", trigger: "Location critical and nearby capacity available", action: "Prepare overflow offer for suitable demand", owner: "Regional operations", mode: "approval", enabled: false }
  ];

  class BlueCurrentAutonomousPolicyEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("AutonomousPolicyEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.policies = appState.get("autonomousPolicies")?.length ? appState.get("autonomousPolicies") : DEFAULT_POLICIES;
      this.history = appState.get("autonomousPolicyHistory") || [];
      this.snapshotValue = null;
      this.bind();
    }

    bind() {
      ["predictive-service:updated", "portfolio-intelligence:updated", "state:reset"].forEach(name => {
        this.eventBus.on(name, () => this.evaluate({ reason: name }));
      });
    }

    evaluate({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const forecast = state.predictiveService || {};
      const portfolio = state.portfolioIntelligence || {};
      const horizons = forecast.horizons || [];
      const peak = horizons.reduce((best, item) => !best || item.pressure > best.pressure ? item : best, null) || {};
      const matches = this.policies.map(policy => ({ ...policy, match: this.match(policy.id, peak, forecast, portfolio) }));
      const candidates = matches.filter(item => item.enabled && item.match.active).map(item => ({
        id: `${item.id}-${Date.now()}`,
        policyId: item.id,
        title: item.name,
        trigger: item.trigger,
        action: item.action,
        owner: item.owner,
        mode: item.mode,
        confidence: item.match.confidence,
        evidence: item.match.evidence,
        status: "pending-approval",
        createdAt: new Date().toISOString()
      }));
      const snapshot = {
        id: `autonomy-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        policies: matches,
        candidates,
        activePolicyCount: matches.filter(item => item.enabled).length,
        matchedPolicyCount: candidates.length,
        governance: "Human approval required",
        headline: candidates.length ? `${candidates.length} policy action${candidates.length === 1 ? "" : "s"} ready for review.` : "No autonomous policy action is currently required."
      };
      this.snapshotValue = snapshot;
      this.appState.update({ autonomousPolicies: this.policies, autonomousPolicySnapshot: snapshot, autonomousPolicyCandidates: candidates, autonomousPolicyHistory: this.history });
      this.eventBus.emit("autonomous-policy:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    match(id, peak, forecast, portfolio) {
      const kitchen = Number(peak.kitchen || forecast.baseline?.kitchen || 0);
      const wait = Number(peak.wait || forecast.baseline?.wait || 0);
      const pressure = Number(peak.pressure || forecast.baseline?.pressure || 0);
      const critical = Number(portfolio.summary?.critical || portfolio.criticalCount || 0);
      if (id === "seating-buffer") return { active: kitchen >= 88, confidence: Math.min(96, 70 + Math.round((kitchen - 80) * 1.6)), evidence: [`Projected kitchen load ${kitchen}%`, `Peak pressure ${pressure}`] };
      if (id === "guest-recovery") return { active: wait >= 14, confidence: Math.min(94, 72 + Math.round(wait - 10)), evidence: [`Projected guest wait ${wait} minutes`, `Forecast pressure ${pressure}`] };
      if (id === "labor-hold") return { active: pressure >= 70, confidence: Math.min(92, 68 + Math.round((pressure - 60) * 0.9)), evidence: [`Peak pressure ${pressure}`, `Demand wave forecast active`] };
      if (id === "portfolio-overflow") return { active: critical > 0, confidence: Math.min(90, 76 + critical * 4), evidence: [`${critical} critical location${critical === 1 ? "" : "s"}`, `Portfolio capacity review available`] };
      return { active: false, confidence: 0, evidence: [] };
    }

    setEnabled(policyId, enabled) {
      this.policies = this.policies.map(policy => policy.id === policyId ? { ...policy, enabled: Boolean(enabled) } : policy);
      return this.evaluate({ reason: "policy-updated" });
    }

    approve(candidateId, note = "") {
      const snapshot = this.snapshotValue || this.evaluate({ reason: "approval-check" });
      const candidate = snapshot.candidates.find(item => item.id === candidateId);
      if (!candidate) return null;
      const record = { ...candidate, status: "approved", note, decidedAt: new Date().toISOString() };
      this.history.unshift(record);
      this.history = this.history.slice(0, 40);
      this.appState.update({ autonomousPolicyHistory: this.history });
      this.eventBus.emit("autonomous-policy:approved", structuredClone(record));
      this.eventBus.emit("orchestration:external-recommendation", { source: "autonomous-policy", recommendation: record });
      return structuredClone(record);
    }

    snapshot() { return structuredClone(this.snapshotValue || this.evaluate({ reason: "initial" })); }
  }

  window.BlueCurrentAutonomousPolicyEngine = BlueCurrentAutonomousPolicyEngine;
})();
