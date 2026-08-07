(function () {
  "use strict";

  class BlueCurrentOperatorCopilotEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("OperatorCopilotEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.snapshotValue = null;
      this.timer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      [
        "unified-command:updated",
        "guided-shift:updated",
        "restaurant-performance:updated",
        "predictive-service:updated",
        "margin-intelligence:updated",
        "cost-variance:updated",
        "executive-workflow:updated",
        "outcome-intelligence:updated",
        "state:reset"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, () => this.scheduleRefresh(name))));
    }

    scheduleRefresh(reason) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh({ reason }), 85);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const command = state.unifiedCommand || {};
      const guided = state.guidedShift || {};
      const actions = this.collectActions(state, command);
      const bundle = this.buildBundle(actions);
      const snapshot = {
        id: `operator-copilot-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        status: this.status(command, guided, bundle),
        briefing: this.briefing(command, guided, bundle),
        bundle,
        prompts: this.prompts(command, guided, bundle),
        approvals: Array.isArray(state.operatorCopilotApprovals) ? state.operatorCopilotApprovals : [],
        dismissed: Array.isArray(state.operatorCopilotDismissed) ? state.operatorCopilotDismissed : [],
        snoozedUntil: state.operatorCopilotSnoozedUntil || null,
        decisionLoad: Number(guided.unacknowledged || 0) + Number(command.pendingApprovals || 0),
        nextBestAction: bundle.actions[0] || null
      };
      this.snapshotValue = snapshot;
      const history = Array.isArray(state.operatorCopilotHistory) ? state.operatorCopilotHistory : [];
      this.appState.update({ operatorCopilot: snapshot, operatorCopilotHistory: [snapshot, ...history].slice(0, 60) });
      this.eventBus.emit("operator-copilot:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    collectActions(state, command) {
      const dismissed = new Set(Array.isArray(state.operatorCopilotDismissed) ? state.operatorCopilotDismissed : []);
      const seen = new Set();
      const sourceActions = [
        ...(Array.isArray(command.actions) ? command.actions : []),
        command.priority,
        ...(Array.isArray(state.restaurantPerformance?.actions) ? state.restaurantPerformance.actions : []),
        ...(Array.isArray(state.costVariance?.actions) ? state.costVariance.actions : []),
        ...(Array.isArray(state.predictiveService?.actions) ? state.predictiveService.actions : [])
      ].filter(Boolean);
      return sourceActions.map((item, index) => {
        const id = item.id || `copilot-action-${index}-${String(item.title || "action").replace(/\W+/g, "-").toLowerCase()}`;
        const revenueImpact = Number(item.revenueImpact || 0);
        const profitImpact = Number(item.profitImpact || item.protectedProfit || Math.round(revenueImpact * 0.42));
        const rpiGain = Number(item.projectedRpiGain || 0);
        const confidence = Math.max(0, Math.min(100, Number(item.confidence || command.confidence || 0)));
        const urgency = /critical|urgent|immediate|now/i.test(`${item.priority || ""} ${item.title || ""} ${item.instruction || ""}`) ? 20 : 0;
        const score = profitImpact + rpiGain * 90 + confidence * 3 + urgency;
        return {
          id,
          title: item.title || "Review operating action",
          instruction: item.instruction || item.action || "Review the current operating condition.",
          owner: item.owner || "Manager",
          confidence,
          revenueImpact,
          profitImpact,
          projectedRpiGain: rpiGain,
          approvalRequired: item.approvalRequired !== false,
          sourceId: item.sourceId || "restaurantPerformanceCenter",
          raw: item.raw || item,
          score
        };
      }).filter(item => !dismissed.has(item.id) && !seen.has(item.id) && seen.add(item.id)).sort((a, b) => b.score - a.score);
    }

    buildBundle(actions) {
      const selected = actions.filter(item => item.approvalRequired).slice(0, 3);
      return {
        id: `bundle-${Date.now()}`,
        actions: selected,
        actionCount: selected.length,
        projectedProfit: selected.reduce((sum, item) => sum + item.profitImpact, 0),
        projectedRevenue: selected.reduce((sum, item) => sum + item.revenueImpact, 0),
        projectedRpiGain: selected.reduce((sum, item) => sum + item.projectedRpiGain, 0),
        averageConfidence: selected.length ? Math.round(selected.reduce((sum, item) => sum + item.confidence, 0) / selected.length) : 0
      };
    }

    status(command, guided, bundle) {
      if (bundle.actionCount > 0 && (Number(command.profitAtRisk || 0) > 0 || Number(guided.unacknowledged || 0) > 0)) return "attention";
      if (bundle.actionCount > 0) return "ready";
      return "clear";
    }

    briefing(command, guided, bundle) {
      if (!bundle.actionCount) return {
        headline: "The shift is stable.",
        message: `RPI is ${Number(command.rpi || 0).toFixed(1)} with no approval bundle requiring action. Blue Current will keep monitoring the next material change.`
      };
      const first = bundle.actions[0];
      return {
        headline: `${bundle.actionCount} action${bundle.actionCount === 1 ? "" : "s"} can improve this shift now.`,
        message: `${first.title} is the highest-value move. Approving the bundle is projected to protect ${this.money(bundle.projectedProfit)} in profit and recover ${bundle.projectedRpiGain.toFixed(1)} RPI points at ${bundle.averageConfidence}% average confidence.`
      };
    }

    prompts(command, guided, bundle) {
      const action = bundle.actions[0];
      return [
        { id: "next", label: "What should I do now?", answer: action ? `${action.title}. ${action.instruction} Expected profit impact: ${this.money(action.profitImpact)} with ${action.confidence}% confidence.` : "Hold the current posture. No material intervention is required." },
        { id: "why", label: "Why this action?", answer: action ? `It ranks first because it combines ${this.money(action.profitImpact)} modeled profit impact, +${action.projectedRpiGain.toFixed(1)} projected RPI recovery, and a ${action.confidence}% confidence score.` : "No action is currently ranked because the operating picture is stable." },
        { id: "risk", label: "What is at risk?", answer: `${this.money(command.profitAtRisk || 0)} modeled profit is currently at risk. ${Number(guided.unacknowledged || 0)} material event${Number(guided.unacknowledged || 0) === 1 ? "" : "s"} still need acknowledgement.` },
        { id: "shift", label: "Summarize the shift", answer: `RPI ${Number(command.rpi || 0).toFixed(1)}. Profit opportunity ${this.money(command.profitOpportunity || 0)}. Guest wait ${Math.round(command.guestWait || 0)} minutes. ${Number(command.pendingApprovals || 0)} approval${Number(command.pendingApprovals || 0) === 1 ? "" : "s"} pending.` }
      ];
    }

    ask(question) {
      const snapshot = this.snapshot();
      const text = String(question || "").trim().toLowerCase();
      const match = snapshot.prompts.find(item => text.includes(item.id) || text.includes(item.label.toLowerCase().split(" ")[0]));
      if (match) return match.answer;
      if (/profit|money|margin/.test(text)) return snapshot.prompts.find(item => item.id === "risk").answer;
      if (/why|reason|evidence/.test(text)) return snapshot.prompts.find(item => item.id === "why").answer;
      if (/next|do|action|recommend/.test(text)) return snapshot.prompts.find(item => item.id === "next").answer;
      return snapshot.prompts.find(item => item.id === "shift").answer;
    }

    approveBundle(actor = "Manager") {
      const snapshot = this.snapshot();
      if (!snapshot.bundle.actionCount) return snapshot;
      const approvedAt = new Date().toISOString();
      snapshot.bundle.actions.forEach(action => {
        this.eventBus.emit("restaurant-performance:action-approved", { action: action.raw || action, performance: this.appState.get("restaurantPerformance"), approvedAt, source: "operator-copilot", actor });
        this.eventBus.emit("portfolio-intelligence:recommendation-approved", { recommendation: { ...(action.raw || action), action: action.instruction, expectedImpact: `${this.money(action.profitImpact)} projected profit and +${action.projectedRpiGain.toFixed(1)} RPI.` }, approvedAt, source: "operator-copilot", actor });
      });
      const state = this.appState.getState();
      const record = { id: snapshot.bundle.id, approvedAt, actor, actionIds: snapshot.bundle.actions.map(item => item.id), projectedProfit: snapshot.bundle.projectedProfit, projectedRpiGain: snapshot.bundle.projectedRpiGain };
      this.appState.update({ operatorCopilotApprovals: [record, ...(state.operatorCopilotApprovals || [])].slice(0, 80) });
      this.eventBus.emit("operator-copilot:bundle-approved", structuredClone(record));
      return this.refresh({ reason: "bundle-approved" });
    }

    dismissAction(id) {
      const state = this.appState.getState();
      const dismissed = Array.from(new Set([id, ...(state.operatorCopilotDismissed || [])])).slice(0, 80);
      this.appState.update({ operatorCopilotDismissed: dismissed });
      this.eventBus.emit("operator-copilot:action-dismissed", { id, dismissedAt: new Date().toISOString() });
      return this.refresh({ reason: "action-dismissed" });
    }

    snooze(minutes = 5) {
      const until = new Date(Date.now() + Math.max(1, Number(minutes) || 5) * 60000).toISOString();
      this.appState.update({ operatorCopilotSnoozedUntil: until });
      this.eventBus.emit("operator-copilot:snoozed", { until });
      return this.refresh({ reason: "copilot-snoozed" });
    }

    snapshot() { return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" })); }
    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0); }
  }

  window.BlueCurrentOperatorCopilotEngine = BlueCurrentOperatorCopilotEngine;
})();
