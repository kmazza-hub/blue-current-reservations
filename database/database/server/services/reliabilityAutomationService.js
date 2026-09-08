"use strict";

class ReliabilityAutomationService {
  constructor(database, telemetryService, auditService, realtimeHub) {
    this.database = database;
    this.telemetryService = telemetryService;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
    this.defaultObjectives = [
      {
        id: "slo_api_availability",
        name: "API availability",
        metric: "successRate",
        operator: "gte",
        target: 99.0,
        warning: 99.5,
        unit: "%",
        window: "rolling-service-lifetime",
        runbookId: "runbook_api_availability"
      },
      {
        id: "slo_api_p95",
        name: "API P95 latency",
        metric: "p95LatencyMs",
        operator: "lte",
        target: 1200,
        warning: 800,
        unit: "ms",
        window: "recent-250-requests",
        runbookId: "runbook_api_latency"
      },
      {
        id: "slo_server_errors",
        name: "Server error budget",
        metric: "serverErrors",
        operator: "lte",
        target: 3,
        warning: 1,
        unit: "errors",
        window: "service-lifetime",
        runbookId: "runbook_server_errors"
      },
      {
        id: "slo_open_critical_incidents",
        name: "Critical incident containment",
        metric: "criticalIncidents",
        operator: "lte",
        target: 0,
        warning: 0,
        unit: "incidents",
        window: "current",
        runbookId: "runbook_critical_incident"
      },
      {
        id: "slo_sync_conflicts",
        name: "Synchronization conflict budget",
        metric: "conflicts",
        operator: "lte",
        target: 5,
        warning: 2,
        unit: "conflicts",
        window: "service-lifetime",
        runbookId: "runbook_sync_conflicts"
      }
    ];

    this.runbooks = [
      {
        id: "runbook_api_availability",
        name: "Restore API availability",
        trigger: "API availability falls below target.",
        steps: [
          "Confirm server health and process uptime.",
          "Inspect recent 5xx and authentication failures.",
          "Check database read/write availability.",
          "Open or escalate an incident if degradation persists.",
          "Verify recovery with a fresh observability snapshot."
        ],
        safeActions: ["refresh-telemetry", "declare-incident"]
      },
      {
        id: "runbook_api_latency",
        name: "Reduce API latency",
        trigger: "P95 latency exceeds the service objective.",
        steps: [
          "Identify the slowest recent endpoints.",
          "Inspect request-pipeline queue depth and retries.",
          "Check active realtime clients and storage volume.",
          "Invalidate stale client caches if appropriate.",
          "Verify P95 recovery after the next request window."
        ],
        safeActions: ["refresh-telemetry", "invalidate-client-cache"]
      },
      {
        id: "runbook_server_errors",
        name: "Contain server errors",
        trigger: "Server error budget is consumed.",
        steps: [
          "Review the latest 5xx request records.",
          "Correlate errors with deployments and write operations.",
          "Pause risky automation if the error source is unclear.",
          "Declare a critical incident.",
          "Confirm the error counter stabilizes before resolution."
        ],
        safeActions: ["refresh-telemetry", "declare-critical-incident"]
      },
      {
        id: "runbook_critical_incident",
        name: "Critical incident command",
        trigger: "One or more critical incidents are open.",
        steps: [
          "Confirm incident ownership.",
          "Record impact, affected domains, and current containment.",
          "Pause affected autonomous operations where necessary.",
          "Communicate checkpoints through the incident timeline.",
          "Resolve only after service verification."
        ],
        safeActions: ["refresh-telemetry", "acknowledge-critical-incidents"]
      },
      {
        id: "runbook_sync_conflicts",
        name: "Resolve synchronization conflicts",
        trigger: "Version-conflict budget is exceeded.",
        steps: [
          "Open Synchronization Control & Recovery Center.",
          "Review server and local resource versions.",
          "Resolve each conflict using server-wins, local-wins, or merge.",
          "Replay the queue.",
          "Run synchronization and audit reconciliation."
        ],
        safeActions: ["refresh-telemetry", "declare-incident"]
      }
    ];
  }

  compare(value, objective, threshold) {
    return objective.operator === "gte"
      ? Number(value) >= Number(threshold)
      : Number(value) <= Number(threshold);
  }

  extractMetric(snapshot, objective) {
    const lookup = {
      successRate: snapshot.requests.successRate,
      p95LatencyMs: snapshot.requests.p95LatencyMs,
      serverErrors: snapshot.requests.serverErrors,
      conflicts: snapshot.requests.conflicts,
      criticalIncidents: snapshot.incidents.critical
    };
    return Number(lookup[objective.metric] ?? 0);
  }

  statusFor(value, objective) {
    if (this.compare(value, objective, objective.target)) return "meeting";
    if (this.compare(value, objective, objective.warning)) return "warning";
    return "breached";
  }

  async configuredObjectives() {
    const database = await this.database.read();
    return Array.isArray(database.serviceLevelObjectives) && database.serviceLevelObjectives.length
      ? database.serviceLevelObjectives
      : this.defaultObjectives;
  }

  async evaluate(organizationId = null) {
    const snapshot = await this.telemetryService.snapshot();
    const objectives = await this.configuredObjectives();
    const evaluations = objectives.map(objective => {
      const value = this.extractMetric(snapshot, objective);
      const status = this.statusFor(value, objective);
      return {
        ...objective,
        value,
        status,
        evaluatedAt: new Date().toISOString()
      };
    });

    const breached = evaluations.filter(item => item.status === "breached");
    const warning = evaluations.filter(item => item.status === "warning");
    const score = Math.max(
      0,
      Math.round(100 - breached.length * 22 - warning.length * 8)
    );

    const result = {
      version: "34.5.1",
      organizationId,
      evaluatedAt: new Date().toISOString(),
      score,
      status: breached.length ? "breached" : warning.length ? "warning" : "meeting",
      objectives: evaluations,
      breached: breached.length,
      warning: warning.length,
      errorBudgetRemaining: Math.max(0, 100 - breached.length * 25 - warning.length * 10),
      runbooks: this.runbooks
    };

    this.realtimeHub.publish("reliability:slo-evaluated", result);
    if (breached.length) {
      this.realtimeHub.publish("reliability:slo-breached", {
        organizationId,
        breached,
        score,
        evaluatedAt: result.evaluatedAt
      });
    }
    return result;
  }

  async saveObjectives(objectives, actor, organizationId) {
    const normalized = objectives.map(item => ({
      ...item,
      id: String(item.id || `slo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
      name: String(item.name || "Service objective"),
      target: Number(item.target),
      warning: Number(item.warning),
      updatedAt: new Date().toISOString(),
      updatedBy: actor
    }));

    await this.database.mutate(database => {
      database.serviceLevelObjectives = normalized;
      return normalized;
    });

    await this.auditService.record({
      organizationId,
      actor,
      action: `Updated ${normalized.length} service-level objectives`,
      category: "reliability"
    });
    this.realtimeHub.publish("reliability:slo-configured", { objectives: normalized });
    return normalized;
  }

  async executeRunbook(runbookId, input, actor, organizationId) {
    const runbook = this.runbooks.find(item => item.id === runbookId);
    if (!runbook) return null;

    const telemetry = await this.telemetryService.snapshot();
    const actions = [];
    const action = input.action || runbook.safeActions[0];

    if (action === "refresh-telemetry") {
      actions.push({ action, status: "complete", detail: "Telemetry snapshot refreshed." });
    }

    if (action === "invalidate-client-cache") {
      actions.push({
        action,
        status: "client-action-required",
        detail: "The client was instructed to invalidate request caches."
      });
      this.realtimeHub.publish("reliability:invalidate-client-cache", {
        organizationId,
        requestedBy: actor
      });
    }

    if (action === "declare-incident" || action === "declare-critical-incident") {
      const severity = action === "declare-critical-incident" ? "critical" : "warning";
      const incident = await this.telemetryService.createIncident({
        title: input.title || `${runbook.name} triggered`,
        description: input.description || runbook.trigger,
        severity,
        source: "automated-runbook",
        owner: input.owner || actor,
        organizationId
      }, actor);
      actions.push({
        action,
        status: "complete",
        detail: `Incident ${incident.id} created.`,
        incidentId: incident.id
      });
    }

    if (action === "acknowledge-critical-incidents") {
      const openCritical = telemetry.incidents.records.filter(
        item => item.severity === "critical" && item.status === "open"
      );
      for (const incident of openCritical) {
        await this.telemetryService.updateIncident(
          incident.id,
          { status: "acknowledged", note: "Acknowledged by automated reliability runbook." },
          actor
        );
      }
      actions.push({
        action,
        status: "complete",
        detail: `${openCritical.length} critical incident(s) acknowledged.`
      });
    }

    const execution = await this.database.mutate(database => {
      database.reliabilityRunbookExecutions ||= [];
      const record = {
        id: `runbook_execution_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        runbookId,
        runbookName: runbook.name,
        action,
        actions,
        actor,
        organizationId,
        status: actions.every(item => item.status === "complete")
          ? "complete"
          : "action-required",
        createdAt: new Date().toISOString()
      };
      database.reliabilityRunbookExecutions.push(record);
      return record;
    });

    await this.auditService.record({
      organizationId,
      actor,
      action: `Executed reliability runbook: ${runbook.name}`,
      category: "reliability"
    });
    this.realtimeHub.publish("reliability:runbook-executed", execution);
    return execution;
  }

  async history() {
    const database = await this.database.read();
    return {
      executions: (database.reliabilityRunbookExecutions || []).slice(-100).reverse(),
      objectives: await this.configuredObjectives()
    };
  }
}

module.exports = ReliabilityAutomationService;
