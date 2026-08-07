(function () {
  "use strict";

  const TEMPLATES = {
    "service-recovery": {
      title: "Service recovery workflow",
      owner: "Manager on duty",
      slaMinutes: 20,
      steps: [
        { id: "assess", title: "Assess affected guests", type: "task" },
        { id: "approve", title: "Approve recovery response", type: "approval" },
        { id: "coordinate", title: "Coordinate floor and guest outreach", type: "task" },
        { id: "verify", title: "Verify guest recovery outcome", type: "verification" }
      ]
    },
    "kitchen-protection": {
      title: "Kitchen pacing protection",
      owner: "Service manager",
      slaMinutes: 15,
      steps: [
        { id: "confirm", title: "Confirm forecast pressure", type: "task" },
        { id: "approve", title: "Approve pacing intervention", type: "approval" },
        { id: "apply", title: "Apply seating buffer", type: "task" },
        { id: "measure", title: "Measure kitchen recovery", type: "verification" }
      ]
    },
    "portfolio-overflow": {
      title: "Portfolio overflow coordination",
      owner: "Regional operations",
      slaMinutes: 30,
      steps: [
        { id: "review", title: "Review constrained and available locations", type: "task" },
        { id: "approve", title: "Approve overflow offer", type: "approval" },
        { id: "route", title: "Coordinate eligible demand routing", type: "task" },
        { id: "close", title: "Record portfolio outcome", type: "verification" }
      ]
    }
  };

  class BlueCurrentExecutiveWorkflowEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("ExecutiveWorkflowEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.workflows = appState.get("executiveWorkflows") || [];
      this.history = appState.get("executiveWorkflowHistory") || [];
      this.bind();
      if (!this.workflows.length) this.seed();
    }

    bind() {
      this.eventBus.on("autonomous-policy:approved", record => {
        const template = record?.policyId === "portfolio-overflow" ? "portfolio-overflow" : record?.policyId === "guest-recovery" ? "service-recovery" : "kitchen-protection";
        this.create(template, { source: "autonomous-policy", sourceId: record?.id, evidence: record?.evidence || [], note: record?.note || "" });
      });
      this.eventBus.on("predictive-service:approved", record => {
        this.create("kitchen-protection", { source: "predictive-service", sourceId: record?.id, evidence: record?.evidence || [] });
      });
      this.eventBus.on("state:reset", () => this.persist("state-reset"));
    }

    seed() {
      this.create("kitchen-protection", {
        source: "system-demo",
        evidence: ["Projected kitchen load 91%", "Two large parties arriving within 20 minutes"]
      });
    }

    create(templateId, context = {}) {
      const template = TEMPLATES[templateId] || TEMPLATES["service-recovery"];
      const now = new Date();
      const workflow = {
        id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        templateId,
        title: template.title,
        owner: template.owner,
        status: "active",
        currentStepIndex: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dueAt: new Date(now.getTime() + template.slaMinutes * 60000).toISOString(),
        slaMinutes: template.slaMinutes,
        context,
        steps: template.steps.map((step, index) => ({
          ...step,
          status: index === 0 ? "active" : "pending",
          startedAt: index === 0 ? now.toISOString() : null,
          completedAt: null,
          decision: null
        })),
        audit: [{ at: now.toISOString(), type: "created", detail: `Workflow created from ${context.source || "manual"}.` }]
      };
      this.workflows.unshift(workflow);
      this.persist("workflow-created");
      this.eventBus.emit("executive-workflow:created", structuredClone(workflow));
      return structuredClone(workflow);
    }

    advance(workflowId, note = "") {
      const workflow = this.find(workflowId);
      if (!workflow || workflow.status !== "active") return null;
      const step = workflow.steps[workflow.currentStepIndex];
      if (!step || step.type === "approval") return null;
      this.completeStep(workflow, step, note || "Step completed.");
      return this.activateNext(workflow);
    }

    approve(workflowId, note = "") {
      const workflow = this.find(workflowId);
      if (!workflow || workflow.status !== "active") return null;
      const step = workflow.steps[workflow.currentStepIndex];
      if (!step || step.type !== "approval") return null;
      step.decision = "approved";
      this.completeStep(workflow, step, note || "Approval granted.");
      this.eventBus.emit("executive-workflow:approved", { workflowId, stepId: step.id, note });
      return this.activateNext(workflow);
    }

    pause(workflowId, note = "") {
      const workflow = this.find(workflowId);
      if (!workflow || workflow.status !== "active") return null;
      workflow.status = "paused";
      workflow.updatedAt = new Date().toISOString();
      workflow.audit.unshift({ at: workflow.updatedAt, type: "paused", detail: note || "Workflow paused by operator." });
      this.persist("workflow-paused");
      return structuredClone(workflow);
    }

    resume(workflowId) {
      const workflow = this.find(workflowId);
      if (!workflow || workflow.status !== "paused") return null;
      workflow.status = "active";
      workflow.updatedAt = new Date().toISOString();
      workflow.audit.unshift({ at: workflow.updatedAt, type: "resumed", detail: "Workflow resumed." });
      this.persist("workflow-resumed");
      return structuredClone(workflow);
    }

    completeStep(workflow, step, detail) {
      const now = new Date().toISOString();
      step.status = "completed";
      step.completedAt = now;
      workflow.updatedAt = now;
      workflow.audit.unshift({ at: now, type: "step-completed", detail: `${step.title}: ${detail}` });
    }

    activateNext(workflow) {
      const nextIndex = workflow.currentStepIndex + 1;
      if (nextIndex >= workflow.steps.length) {
        workflow.status = "completed";
        workflow.completedAt = new Date().toISOString();
        workflow.updatedAt = workflow.completedAt;
        workflow.audit.unshift({ at: workflow.completedAt, type: "completed", detail: "Workflow completed and evidence recorded." });
        this.history.unshift(structuredClone(workflow));
        this.history = this.history.slice(0, 50);
        this.eventBus.emit("executive-workflow:completed", structuredClone(workflow));
      } else {
        workflow.currentStepIndex = nextIndex;
        workflow.steps[nextIndex].status = "active";
        workflow.steps[nextIndex].startedAt = new Date().toISOString();
      }
      this.persist("workflow-progressed");
      return structuredClone(workflow);
    }

    find(id) { return this.workflows.find(item => item.id === id); }

    snapshot() {
      const now = Date.now();
      const active = this.workflows.filter(item => item.status === "active" || item.status === "paused");
      const overdue = active.filter(item => new Date(item.dueAt).getTime() < now && item.status !== "completed");
      const awaitingApproval = active.filter(item => item.steps[item.currentStepIndex]?.type === "approval" && item.status === "active");
      return {
        capturedAt: new Date().toISOString(),
        workflows: structuredClone(active),
        history: structuredClone(this.history),
        summary: {
          active: active.filter(item => item.status === "active").length,
          paused: active.filter(item => item.status === "paused").length,
          awaitingApproval: awaitingApproval.length,
          overdue: overdue.length,
          completed: this.history.length
        }
      };
    }

    persist(reason) {
      const snapshot = this.snapshot();
      this.appState.update({
        executiveWorkflows: this.workflows,
        executiveWorkflowHistory: this.history,
        executiveWorkflowSnapshot: snapshot
      });
      this.eventBus.emit("executive-workflow:updated", { ...snapshot, reason });
    }
  }

  window.BlueCurrentExecutiveWorkflowEngine = BlueCurrentExecutiveWorkflowEngine;
})();
