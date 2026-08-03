(function () {
  "use strict";

  class BlueCurrentGuidedShiftEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("GuidedShiftEngine requires EventBus and AppState.");
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
        "executive-workflow:updated",
        "outcome-intelligence:updated",
        "reservation:confirmed",
        "table:assigned",
        "occupancy:updated",
        "service:started",
        "service:ended",
        "state:reset"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, () => this.scheduleRefresh(name))));
    }

    scheduleRefresh(reason) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh({ reason }), 90);
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const command = state.unifiedCommand || {};
      const timeline = Array.isArray(command.timeline) ? command.timeline : [];
      const acknowledgements = state.guidedShiftAcknowledgements || {};
      const snoozes = state.guidedShiftSnoozes || {};
      const handoffs = Array.isArray(state.guidedShiftHandoffs) ? state.guidedShiftHandoffs : [];
      const now = Date.now();
      const queue = timeline
        .filter(item => item && item.id)
        .map(item => this.normalizeQueueItem(item, acknowledgements, snoozes, now))
        .filter(item => !item.isSnoozed)
        .sort((a, b) => b.priorityScore - a.priorityScore || new Date(b.occurredAt) - new Date(a.occurredAt));
      const openQueue = queue.filter(item => !item.acknowledged && item.requiresResponse);
      const openHandoffs = handoffs.filter(item => item.status !== "complete");
      const phase = this.phase(state);
      const plan = this.plan(command, openQueue, openHandoffs, phase);
      const noisePenalty = Math.min(55, openQueue.length * 9 + openHandoffs.length * 6 + Number(command.pendingApprovals || 0) * 7);
      const snapshot = {
        id: `guided-shift-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        phase,
        queue,
        openQueue,
        handoffs,
        openHandoffs,
        plan,
        unacknowledged: openQueue.length,
        focusScore: Math.max(0, 100 - noisePenalty),
        nextResponseMinutes: openQueue[0]?.responseMinutes || 0
      };
      this.snapshotValue = snapshot;
      const history = Array.isArray(state.guidedShiftHistory) ? state.guidedShiftHistory : [];
      this.appState.update({ guidedShift: snapshot, guidedShiftHistory: [snapshot, ...history].slice(0, 60) });
      this.eventBus.emit("guided-shift:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    normalizeQueueItem(item, acknowledgements, snoozes, now) {
      const tone = item.tone || "info";
      const priorityScore = tone === "watch" ? 90 : tone === "critical" ? 100 : tone === "success" ? 25 : 50;
      const acknowledged = Boolean(acknowledgements[item.id]);
      const snoozedUntil = snoozes[item.id] || null;
      return {
        ...item,
        acknowledged,
        acknowledgedAt: acknowledgements[item.id]?.acknowledgedAt || null,
        snoozedUntil,
        isSnoozed: snoozedUntil ? new Date(snoozedUntil).getTime() > now : false,
        requiresResponse: tone === "watch" || tone === "critical" || /approval|risk|forecast|cost|workflow/i.test(`${item.title} ${item.detail}`),
        priorityScore: priorityScore + (/approval/i.test(item.title) ? 8 : 0),
        responseMinutes: tone === "critical" ? 2 : tone === "watch" ? 5 : 15
      };
    }

    phase(state) {
      const status = state.serviceStatus || "closed";
      const hour = new Date().getHours();
      if (status === "closed" && hour < 15) return { id: "pre-service", label: "Pre-service", note: "Prepare staffing, reservations, and operating constraints." };
      if (status === "active" || status === "open") return { id: "live-service", label: "Live service", note: "Protect guest flow, kitchen throughput, and profit in real time." };
      if (hour >= 21) return { id: "closeout", label: "Closeout", note: "Measure outcomes and prepare the next shift handoff." };
      return { id: "transition", label: "Shift transition", note: "Confirm readiness and move the team into the next service phase." };
    }

    plan(command, openQueue, openHandoffs, phase) {
      const priority = command.priority || {};
      const first = openQueue[0];
      return {
        now: first ? { title: first.title, detail: first.detail, impact: `${first.responseMinutes} min response window`, sourceId: first.sourceId } : { title: priority.title || "Hold the current posture", detail: priority.instruction || "No urgent intervention is required.", impact: `${this.money(priority.profitImpact || 0)} modeled profit impact`, sourceId: priority.sourceId },
        next: openQueue[1] ? { title: openQueue[1].title, detail: openQueue[1].detail, impact: "Next material event", sourceId: openQueue[1].sourceId } : { title: "Watch the next operating change", detail: `Blue Current is monitoring ${phase.label.toLowerCase()} conditions.`, impact: "Next 15 minutes", sourceId: "unifiedCommandCenter" },
        later: openHandoffs[0] ? { title: `Handoff to ${openHandoffs[0].owner}`, detail: openHandoffs[0].note, impact: "Before shift change", sourceId: "guidedShiftCenter" } : { title: "Prepare the handoff", detail: "Capture unresolved decisions and measured outcomes before the next manager takes over.", impact: "Before shift change", sourceId: "guidedShiftCenter" }
      };
    }

    acknowledge(id, actor = "Manager") {
      const state = this.appState.getState();
      const acknowledgements = { ...(state.guidedShiftAcknowledgements || {}), [id]: { acknowledgedAt: new Date().toISOString(), actor } };
      this.appState.update({ guidedShiftAcknowledgements: acknowledgements });
      this.eventBus.emit("guided-shift:event-acknowledged", { id, actor, acknowledgedAt: acknowledgements[id].acknowledgedAt });
      return this.refresh({ reason: "event-acknowledged" });
    }

    snooze(id, minutes = 5) {
      const state = this.appState.getState();
      const until = new Date(Date.now() + Math.max(1, Number(minutes) || 5) * 60000).toISOString();
      this.appState.update({ guidedShiftSnoozes: { ...(state.guidedShiftSnoozes || {}), [id]: until } });
      this.eventBus.emit("guided-shift:event-snoozed", { id, until });
      return this.refresh({ reason: "event-snoozed" });
    }

    createHandoff({ owner, note }) {
      const cleanOwner = String(owner || "Next manager").trim().slice(0, 80) || "Next manager";
      const cleanNote = String(note || "").trim().slice(0, 420);
      if (!cleanNote) throw new Error("A handoff note is required.");
      const state = this.appState.getState();
      const handoff = { id: `handoff-${Date.now()}`, owner: cleanOwner, note: cleanNote, status: "open", createdAt: new Date().toISOString() };
      const handoffs = [handoff, ...(state.guidedShiftHandoffs || [])].slice(0, 40);
      this.appState.update({ guidedShiftHandoffs: handoffs });
      this.eventBus.emit("guided-shift:handoff-created", structuredClone(handoff));
      return this.refresh({ reason: "handoff-created" });
    }

    completeHandoff(id) {
      const state = this.appState.getState();
      const handoffs = (state.guidedShiftHandoffs || []).map(item => item.id === id ? { ...item, status: "complete", completedAt: new Date().toISOString() } : item);
      this.appState.update({ guidedShiftHandoffs: handoffs });
      this.eventBus.emit("guided-shift:handoff-completed", { id, completedAt: new Date().toISOString() });
      return this.refresh({ reason: "handoff-completed" });
    }

    snapshot() { return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" })); }
    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0); }
  }

  window.BlueCurrentGuidedShiftEngine = BlueCurrentGuidedShiftEngine;
})();
