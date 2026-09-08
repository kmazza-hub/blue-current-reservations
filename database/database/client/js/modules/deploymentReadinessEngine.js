(function () {
  "use strict";

  class BlueCurrentDeploymentReadinessEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("DeploymentReadinessEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("deploymentReadinessHistory")) ? appState.get("deploymentReadinessHistory") : [];
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 180);
      };
      [
        "pilot-review:updated",
        "pilot-review:decision-recorded",
        "pilot-operations:completed",
        "pilot-release:updated",
        "platform-integration-audit:updated",
        "state:changed"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const review = state.pilotReview || {};
      const decision = state.pilotRolloutDecision || null;
      const release = state.pilotRelease || {};
      const integration = state.platformIntegrationAudit || {};
      const roles = this.normalizeRoles(state.deploymentRoleAssignments);
      const training = this.normalizeTraining(state.deploymentTraining);
      const locations = this.normalizeLocations(state.deploymentLocations, review);
      const checks = this.buildChecks({ review, decision, release, integration, roles, training, locations });
      const readyCount = checks.filter(item => item.status === "ready").length;
      const blockedCount = checks.filter(item => item.status === "blocked").length;
      const watchCount = checks.filter(item => item.status === "watch").length;
      const score = Math.round(checks.reduce((sum, item) => sum + (item.status === "ready" ? item.weight : item.status === "watch" ? item.weight * .45 : 0), 0) / checks.reduce((sum,item)=>sum+item.weight,0) * 100);
      const gate = blockedCount ? "blocked" : score >= 90 && watchCount === 0 ? "go-live-ready" : score >= 75 ? "controlled-launch" : "preparation";
      const snapshot = {
        id: `deployment-readiness-${Date.now()}`,
        release: "V35.8.0",
        capturedAt: new Date().toISOString(),
        reason,
        score,
        gate,
        summary: this.summary(gate, { readyCount, blockedCount, watchCount }),
        checks,
        counts: { ready: readyCount, watch: watchCount, blocked: blockedCount, total: checks.length },
        roles,
        training,
        locations,
        launchWindow: state.deploymentLaunchWindow || null,
        rollbackPlan: state.deploymentRollbackPlan || null,
        nextActions: this.nextActions(checks),
        decision
      };
      this.history.unshift({ capturedAt: snapshot.capturedAt, score, gate, blockedCount });
      this.history = this.history.slice(0, 40);
      this.appState.update({
        deploymentReadiness: snapshot,
        deploymentReadinessHistory: this.history,
        deploymentRoleAssignments: roles,
        deploymentTraining: training,
        deploymentLocations: locations
      });
      this.eventBus.emit("deployment-readiness:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    normalizeRoles(value) {
      const defaults = [
        { id: "executive-sponsor", role: "Executive sponsor", owner: "Unassigned", required: true },
        { id: "deployment-lead", role: "Deployment lead", owner: "Unassigned", required: true },
        { id: "location-manager", role: "Location manager", owner: "Unassigned", required: true },
        { id: "technical-owner", role: "Technical owner", owner: "Unassigned", required: true },
        { id: "support-owner", role: "Launch support owner", owner: "Unassigned", required: true }
      ];
      const current = Array.isArray(value) ? value : [];
      return defaults.map(item => ({ ...item, ...(current.find(entry => entry.id === item.id) || {}) }));
    }

    normalizeTraining(value) {
      const defaults = [
        { id: "manager-command-center", title: "Manager Command Center", audience: "Managers", status: "not-started" },
        { id: "approval-workflows", title: "Approval and escalation workflows", audience: "Managers and leaders", status: "not-started" },
        { id: "shift-operations", title: "Shift operations and handoff", audience: "Operations team", status: "not-started" },
        { id: "executive-review", title: "Executive briefing and ROI review", audience: "Executive sponsors", status: "not-started" },
        { id: "incident-response", title: "Incident response and rollback", audience: "Technical and support owners", status: "not-started" }
      ];
      const current = Array.isArray(value) ? value : [];
      return defaults.map(item => ({ ...item, ...(current.find(entry => entry.id === item.id) || {}) }));
    }

    normalizeLocations(value, review) {
      const current = Array.isArray(value) ? value : [];
      if (current.length) return current;
      return [{ id: review.pilot?.locationId || "primary-location", name: review.pilot?.locationId || "Primary location", status: "planned", launchOwner: "Unassigned" }];
    }

    buildChecks({ review, decision, release, integration, roles, training, locations }) {
      const completedTraining = training.filter(item => item.status === "complete").length;
      const assignedRoles = roles.filter(item => item.owner && item.owner !== "Unassigned").length;
      const launchLocations = locations.filter(item => item.status === "ready" || item.status === "live").length;
      return [
        this.check("rollout-decision", "Executive rollout decision", 14, !!decision && ["expand","extend"].includes(decision.decision), !decision ? "blocked" : decision.decision === "hold" ? "blocked" : "ready", decision ? `${decision.decision} · ${decision.owner}` : "No executive decision recorded"),
        this.check("pilot-evidence", "Pilot evidence package", 13, Number(review.score || 0) >= 75, Number(review.score || 0) >= 85 ? "ready" : Number(review.score || 0) >= 65 ? "watch" : "blocked", `${Number(review.score || 0)}% review score`),
        this.check("release-gate", "V35 release gate", 12, release.gate === "pilot-ready", release.gate === "blocked" ? "blocked" : release.gate === "pilot-ready" ? "ready" : "watch", `${Number(release.score || 0)}% · ${release.gate || "hardening"}`),
        this.check("integration-health", "Runtime integration health", 11, Number(integration.score ?? 100) >= 90, Number(integration.score ?? 100) >= 90 ? "ready" : Number(integration.score ?? 100) >= 75 ? "watch" : "blocked", `${Number(integration.score ?? 100)}% health`),
        this.check("role-ownership", "Named launch ownership", 12, assignedRoles === roles.length, assignedRoles === roles.length ? "ready" : assignedRoles >= Math.ceil(roles.length * .6) ? "watch" : "blocked", `${assignedRoles}/${roles.length} roles assigned`),
        this.check("training", "Operator training completion", 14, completedTraining === training.length, completedTraining === training.length ? "ready" : completedTraining >= 3 ? "watch" : "blocked", `${completedTraining}/${training.length} training modules complete`),
        this.check("location-readiness", "Launch location readiness", 10, launchLocations === locations.length, launchLocations === locations.length ? "ready" : launchLocations > 0 ? "watch" : "blocked", `${launchLocations}/${locations.length} locations ready`),
        this.check("launch-window", "Approved launch window", 7, !!this.appState.get("deploymentLaunchWindow"), this.appState.get("deploymentLaunchWindow") ? "ready" : "watch", this.appState.get("deploymentLaunchWindow") || "Not scheduled"),
        this.check("rollback-plan", "Rollback and support plan", 7, !!this.appState.get("deploymentRollbackPlan"), this.appState.get("deploymentRollbackPlan") ? "ready" : "watch", this.appState.get("deploymentRollbackPlan") ? "Documented" : "Not documented")
      ];
    }

    check(id, label, weight, pass, status, evidence) { return { id, label, weight, pass, status, evidence }; }

    summary(gate, counts) {
      if (gate === "go-live-ready") return "All required controls, owners, training, and launch safeguards are ready for go-live.";
      if (gate === "controlled-launch") return `${counts.watchCount} watch condition${counts.watchCount === 1 ? "" : "s"} remain before a fully cleared launch.`;
      if (gate === "blocked") return `${counts.blockedCount} blocking launch condition${counts.blockedCount === 1 ? "" : "s"} require resolution.`;
      return "Deployment preparation is underway. Assign owners, complete training, and define the launch safeguards.";
    }

    nextActions(checks) {
      return checks.filter(item => item.status !== "ready").sort((a,b) => b.weight-a.weight).map(item => ({ id: item.id, label: item.label, action: this.actionFor(item.id) })).slice(0, 6);
    }

    actionFor(id) {
      return ({
        "rollout-decision": "Record an executive expand or extend decision in the Pilot Review Center.",
        "pilot-evidence": "Close pilot evidence gaps and refresh the executive review package.",
        "release-gate": "Run the release audit and clear every blocking platform check.",
        "integration-health": "Resolve failed or missing runtime modules before launch.",
        "role-ownership": "Assign a named owner to every launch responsibility.",
        "training": "Complete all required operator and leadership training modules.",
        "location-readiness": "Mark each launch location ready after local preflight validation.",
        "launch-window": "Schedule and approve the go-live window.",
        "rollback-plan": "Document rollback criteria, contacts, and recovery steps."
      })[id] || "Resolve this launch requirement.";
    }

    assignRole(id, owner) {
      const roles = this.normalizeRoles(this.appState.get("deploymentRoleAssignments"));
      const role = roles.find(item => item.id === id);
      if (!role) throw new Error("Unknown deployment role.");
      role.owner = String(owner || "").trim() || "Unassigned";
      this.appState.update({ deploymentRoleAssignments: roles });
      this.eventBus.emit("deployment-readiness:role-assigned", structuredClone(role));
      return this.refresh({ reason: "role-assigned" });
    }

    setTraining(id, status) {
      const allowed = ["not-started","in-progress","complete"];
      if (!allowed.includes(status)) throw new Error("Invalid training status.");
      const training = this.normalizeTraining(this.appState.get("deploymentTraining"));
      const item = training.find(entry => entry.id === id);
      if (!item) throw new Error("Unknown training module.");
      item.status = status;
      item.updatedAt = new Date().toISOString();
      this.appState.update({ deploymentTraining: training });
      this.eventBus.emit("deployment-readiness:training-updated", structuredClone(item));
      return this.refresh({ reason: "training-updated" });
    }

    setLocation(id, status, owner) {
      const locations = this.normalizeLocations(this.appState.get("deploymentLocations"), this.appState.get("pilotReview") || {});
      const item = locations.find(entry => entry.id === id);
      if (!item) throw new Error("Unknown launch location.");
      item.status = status;
      if (owner !== undefined) item.launchOwner = String(owner || "").trim() || "Unassigned";
      item.updatedAt = new Date().toISOString();
      this.appState.update({ deploymentLocations: locations });
      this.eventBus.emit("deployment-readiness:location-updated", structuredClone(item));
      return this.refresh({ reason: "location-updated" });
    }

    saveLaunchPlan({ window, rollbackPlan }) {
      this.appState.update({ deploymentLaunchWindow: String(window || "").trim() || null, deploymentRollbackPlan: String(rollbackPlan || "").trim() || null });
      this.eventBus.emit("deployment-readiness:launch-plan-updated", { window, rollbackPlan });
      return this.refresh({ reason: "launch-plan-updated" });
    }

    exportManifest() {
      return {
        product: "Blue Current Hospitality OS",
        release: "V35.8.0",
        generatedAt: new Date().toISOString(),
        deployment: this.appState.get("deploymentReadiness") || this.refresh({ reason: "export" }),
        pilotReview: this.appState.get("pilotReview"),
        rolloutDecision: this.appState.get("pilotRolloutDecision")
      };
    }

    reset() {
      this.history = [];
      this.appState.update({ deploymentReadiness: null, deploymentReadinessHistory: [], deploymentRoleAssignments: [], deploymentTraining: [], deploymentLocations: [], deploymentLaunchWindow: null, deploymentRollbackPlan: null });
      this.eventBus.emit("deployment-readiness:updated", null);
    }
  }

  window.BlueCurrentDeploymentReadinessEngine = BlueCurrentDeploymentReadinessEngine;
})();
