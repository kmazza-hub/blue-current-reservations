(function () {
  "use strict";

  const STORAGE_KEY = "blueCurrent.aiOrchestration.v34.6.1";

  class BlueCurrentOrchestrationEngine {
    constructor({ eventBus, appState, recommendationEngine }) {
      if (!eventBus || !appState || !recommendationEngine) {
        throw new Error("OrchestrationEngine requires EventBus, AppState, and RecommendationEngine.");
      }
      this.eventBus = eventBus;
      this.appState = appState;
      this.recommendationEngine = recommendationEngine;
      this.state = this.#load();
      this.unsubscribers = [];
      this.#bind();
      this.refresh({ reason: "startup" });
    }

    refresh(context = {}) {
      const generated = this.recommendationEngine.evaluate(context);
      const prior = new Map(this.state.queue.map(item => [item.type, item]));
      this.state.queue = generated.map(item => {
        const existing = prior.get(item.type);
        return existing?.status === "pending" ? { ...item, id: existing.id } : item;
      });
      this.state.lastEvaluatedAt = new Date().toISOString();
      this.state.lastReason = context.reason || "manual";
      this.#commit("orchestration:queue-updated", { reason: this.state.lastReason });
      return this.snapshot();
    }

    decide(id, decision, note = "") {
      const item = this.state.queue.find(entry => entry.id === id);
      if (!item) throw new Error("Recommendation not found.");
      if (!["approved", "dismissed", "snoozed"].includes(decision)) {
        throw new TypeError("Unsupported orchestration decision.");
      }

      const decidedAt = new Date().toISOString();
      const historyItem = { ...item, status: decision, note: String(note || ""), decidedAt };
      this.state.history.unshift(historyItem);
      this.state.history = this.state.history.slice(0, 30);
      this.state.queue = this.state.queue.filter(entry => entry.id !== id);

      if (decision === "approved") {
        this.state.activeWorkflows.unshift({
          id: `workflow_${id}`,
          recommendationId: id,
          title: item.title,
          owner: item.owner,
          status: "in-progress",
          startedAt: decidedAt,
          evidence: ["Manager approval recorded", ...item.signals.map(signal => `${signal.label}: ${signal.value}`)]
        });
        this.state.activeWorkflows = this.state.activeWorkflows.slice(0, 10);
        this.eventBus.emit("orchestration:workflow-started", { recommendation: structuredClone(item) });
      }

      this.eventBus.emit("orchestration:decision-recorded", { recommendation: structuredClone(item), decision, note, decidedAt });
      this.#commit("orchestration:queue-updated", { reason: "decision" });
      return this.snapshot();
    }

    completeWorkflow(id, outcome = "Operating action completed") {
      const workflow = this.state.activeWorkflows.find(item => item.id === id);
      if (!workflow) return false;
      workflow.status = "completed";
      workflow.completedAt = new Date().toISOString();
      workflow.outcome = outcome;
      this.eventBus.emit("orchestration:workflow-completed", structuredClone(workflow));
      this.#commit("orchestration:workflow-list-updated", {});
      return true;
    }

    snapshot() { return structuredClone(this.state); }

    destroy() {
      this.unsubscribers.forEach(unsubscribe => unsubscribe?.());
      this.unsubscribers = [];
    }

    #bind() {
      const reevaluate = payload => this.refresh({ ...(payload || {}), reason: payload?.reason || "operational-event" });
      [
        "service:started",
        "reservation:confirmed",
        "kitchen:ticket-updated",
        "service:flow-updated",
        "floor:table-updated",
        "workforce:loaded"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, reevaluate)));
    }

    #load() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (stored && typeof stored === "object") {
          return {
            queue: Array.isArray(stored.queue) ? stored.queue : [],
            history: Array.isArray(stored.history) ? stored.history : [],
            activeWorkflows: Array.isArray(stored.activeWorkflows) ? stored.activeWorkflows : [],
            lastEvaluatedAt: stored.lastEvaluatedAt || null,
            lastReason: stored.lastReason || "restored"
          };
        }
      } catch (error) {
        console.warn("Blue Current orchestration state could not be restored.", error);
      }
      return { queue: [], history: [], activeWorkflows: [], lastEvaluatedAt: null, lastReason: "new" };
    }

    #commit(eventName, detail) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      const snapshot = this.snapshot();
      this.appState.update({
        orchestrationQueue: snapshot.queue,
        orchestrationHistory: snapshot.history,
        activeOrchestrationWorkflows: snapshot.activeWorkflows,
        orchestrationUpdatedAt: snapshot.lastEvaluatedAt
      });
      this.eventBus.emit(eventName, { ...detail, state: snapshot });
    }
  }

  window.BlueCurrentOrchestrationEngine = BlueCurrentOrchestrationEngine;
})();
