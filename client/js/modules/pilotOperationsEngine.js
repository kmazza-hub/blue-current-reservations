(function () {
  "use strict";

  const DEFAULT_CHECKPOINTS = [
    { id: "preflight", label: "Pre-service preflight", owner: "General Manager", evidence: "Staffing, integrations, approvals, and rollback path confirmed" },
    { id: "signal", label: "Live signal validation", owner: "Operations Lead", evidence: "Reservations, floor, kitchen, labor, and RPI signals are current" },
    { id: "decision", label: "Governed decision test", owner: "Manager on Duty", evidence: "One recommendation reviewed and explicitly approved or rejected" },
    { id: "workflow", label: "Workflow execution test", owner: "Department Owner", evidence: "Approved action creates a tracked workflow with ownership and SLA" },
    { id: "outcome", label: "Outcome measurement test", owner: "Pilot Lead", evidence: "Baseline, projected impact, and measured result are captured" },
    { id: "handoff", label: "Shift handoff and review", owner: "Executive Sponsor", evidence: "Briefing, issues, decisions, and next actions are documented" }
  ];

  class BlueCurrentPilotOperationsEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PilotOperationsEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 220);
      };
      [
        "pilot-release:updated",
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "executive-briefing:updated",
        "executive-workflow:updated",
        "platform-integration-audit:updated"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    getSession() {
      return this.appState.get("pilotOperationsSession") || this.createSession();
    }

    createSession() {
      const state = this.appState.getState();
      return {
        id: `pilot-${Date.now()}`,
        status: "draft",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        locationId: state.selectedLocationId || "primary-location",
        lead: "Pilot Lead",
        shift: "Dinner service",
        checkpoints: DEFAULT_CHECKPOINTS.map(item => ({ ...item, status: "pending", completedAt: null, note: "" })),
        issues: [],
        decisions: [],
        validationScore: 0,
        releaseGate: state.pilotRelease?.gate || "hardening",
        summary: "Pilot session is ready to configure."
      };
    }

    start({ lead, shift } = {}) {
      const session = this.getSession();
      if (session.status === "complete") return session;
      session.status = "active";
      session.startedAt = session.startedAt || new Date().toISOString();
      session.lead = String(lead || session.lead || "Pilot Lead").trim();
      session.shift = String(shift || session.shift || "Dinner service").trim();
      this.record(session, "session-started", `${session.shift} pilot started by ${session.lead}.`);
      return this.persist(session, "pilot-operations:started");
    }

    setCheckpoint(id, status, note = "") {
      const session = this.getSession();
      const checkpoint = session.checkpoints.find(item => item.id === id);
      if (!checkpoint) throw new Error(`Unknown pilot checkpoint: ${id}`);
      if (!['pending','passed','watch','blocked'].includes(status)) throw new Error(`Unsupported checkpoint status: ${status}`);
      checkpoint.status = status;
      checkpoint.note = String(note || "").trim();
      checkpoint.completedAt = status === "passed" ? new Date().toISOString() : null;
      this.record(session, "checkpoint-updated", `${checkpoint.label} marked ${status}.`);
      return this.persist(session, "pilot-operations:checkpoint-updated");
    }

    addIssue({ title, severity = "watch", owner = "Pilot Lead", note = "" } = {}) {
      const session = this.getSession();
      const cleanTitle = String(title || "").trim();
      if (!cleanTitle) throw new Error("Issue title is required.");
      const issue = {
        id: `issue-${Date.now()}`,
        title: cleanTitle,
        severity: ["watch", "blocking"].includes(severity) ? severity : "watch",
        owner: String(owner || "Pilot Lead").trim(),
        note: String(note || "").trim(),
        status: "open",
        createdAt: new Date().toISOString(),
        resolvedAt: null
      };
      session.issues.unshift(issue);
      this.record(session, "issue-added", `${issue.severity} issue opened: ${issue.title}.`);
      return this.persist(session, "pilot-operations:issue-added");
    }

    resolveIssue(id) {
      const session = this.getSession();
      const issue = session.issues.find(item => item.id === id);
      if (!issue) return session;
      issue.status = "resolved";
      issue.resolvedAt = new Date().toISOString();
      this.record(session, "issue-resolved", `${issue.title} resolved.`);
      return this.persist(session, "pilot-operations:issue-resolved");
    }

    refresh({ reason = "manual" } = {}) {
      const session = this.getSession();
      session.releaseGate = this.appState.get("pilotRelease")?.gate || session.releaseGate;
      session.lastRefreshReason = reason;
      return this.persist(session, "pilot-operations:updated", false);
    }

    complete() {
      const session = this.getSession();
      const blocking = session.checkpoints.some(item => item.status === "blocked") || session.issues.some(item => item.status === "open" && item.severity === "blocking");
      const pending = session.checkpoints.some(item => item.status === "pending");
      if (blocking || pending) throw new Error("Resolve blocking issues and complete every checkpoint before closing the pilot session.");
      session.status = "complete";
      session.completedAt = new Date().toISOString();
      this.record(session, "session-completed", `Pilot session completed at ${session.validationScore}/100 validation.`);
      return this.persist(session, "pilot-operations:completed");
    }

    calculate(session) {
      const passed = session.checkpoints.filter(item => item.status === "passed").length;
      const watch = session.checkpoints.filter(item => item.status === "watch").length;
      const blocked = session.checkpoints.filter(item => item.status === "blocked").length;
      const openBlocking = session.issues.filter(item => item.status === "open" && item.severity === "blocking").length;
      const base = ((passed + watch * .45) / Math.max(session.checkpoints.length, 1)) * 100;
      const releaseAdjustment = session.releaseGate === "pilot-ready" ? 6 : session.releaseGate === "controlled-pilot" ? 3 : session.releaseGate === "blocked" ? -20 : 0;
      session.validationScore = Math.max(0, Math.min(100, Math.round(base + releaseAdjustment - blocked * 15 - openBlocking * 18)));
      session.summary = this.summary(session, { passed, watch, blocked, openBlocking });
      session.nextAction = this.nextAction(session);
    }

    summary(session, counts) {
      if (session.status === "complete") return `Pilot completed with ${session.validationScore}/100 validation and ${session.issues.filter(item => item.status === "open").length} open issues.`;
      if (counts.openBlocking || counts.blocked) return "Pilot is blocked. Resolve critical validation failures before continuing restaurant use.";
      if (session.status === "draft") return "Configure the pilot lead and shift, then begin the controlled validation run.";
      if (counts.passed === session.checkpoints.length) return "All checkpoints passed. Complete the pilot session and export the validation record.";
      return `${counts.passed}/${session.checkpoints.length} checkpoints passed. Continue the controlled validation sequence.`;
    }

    nextAction(session) {
      const blockingIssue = session.issues.find(item => item.status === "open" && item.severity === "blocking");
      if (blockingIssue) return `Resolve blocking issue: ${blockingIssue.title}`;
      const blockedCheckpoint = session.checkpoints.find(item => item.status === "blocked");
      if (blockedCheckpoint) return `Correct checkpoint: ${blockedCheckpoint.label}`;
      const pending = session.checkpoints.find(item => item.status === "pending");
      if (pending) return `Validate ${pending.label.toLowerCase()}`;
      const watch = session.checkpoints.find(item => item.status === "watch");
      if (watch) return `Review watch condition: ${watch.label}`;
      return session.status === "complete" ? "Review the exported pilot record with the executive sponsor." : "Complete and export the pilot session.";
    }

    record(session, type, detail) {
      session.decisions.unshift({ id: `pilot-event-${Date.now()}-${Math.random().toString(16).slice(2)}`, type, detail, at: new Date().toISOString() });
      session.decisions = session.decisions.slice(0, 80);
    }

    persist(session, eventName, addHistory = true) {
      this.calculate(session);
      const history = Array.isArray(this.appState.get("pilotOperationsHistory")) ? this.appState.get("pilotOperationsHistory") : [];
      if (addHistory) history.unshift({ capturedAt: new Date().toISOString(), status: session.status, validationScore: session.validationScore, nextAction: session.nextAction });
      this.appState.update({
        pilotOperationsSession: session,
        pilotOperationsHistory: history.slice(0, 40),
        pilotOperationsReadiness: { score: session.validationScore, status: session.status, openIssues: session.issues.filter(item => item.status === "open").length }
      });
      this.eventBus.emit(eventName, structuredClone(session));
      this.eventBus.emit("pilot-operations:updated", structuredClone(session));
      return structuredClone(session);
    }

    exportRecord() {
      const session = this.getSession();
      return {
        product: "Blue Current Hospitality OS",
        release: "V35.6.0",
        generatedAt: new Date().toISOString(),
        session
      };
    }

    reset() {
      this.appState.update({ pilotOperationsSession: null, pilotOperationsHistory: [], pilotOperationsReadiness: null });
      this.eventBus.emit("pilot-operations:updated", null);
    }
  }

  window.BlueCurrentPilotOperationsEngine = BlueCurrentPilotOperationsEngine;
})();
