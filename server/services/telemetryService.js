"use strict";

class TelemetryService {
  constructor(database, realtimeHub) {
    this.database = database;
    this.realtimeHub = realtimeHub;
    this.startedAt = Date.now();
    this.requests = [];
    this.maxRequests = 1000;
    this.counters = {
      total: 0,
      success: 0,
      clientErrors: 0,
      serverErrors: 0,
      authFailures: 0,
      conflicts: 0,
      idempotencyReplays: 0
    };
  }

  begin(request) {
    return {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      method: request.method,
      path: String(request.url || "").split("?")[0],
      startedAt: Date.now()
    };
  }

  complete(context, status, metadata = {}) {
    const finishedAt = Date.now();
    const latencyMs = Math.max(0, finishedAt - context.startedAt);
    const record = {
      id: context.id,
      method: context.method,
      path: context.path,
      status,
      latencyMs,
      startedAt: new Date(context.startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      organizationId: metadata.organizationId || null,
      userId: metadata.userId || null,
      replayed: Boolean(metadata.replayed),
      error: metadata.error || null
    };

    this.requests.push(record);
    if (this.requests.length > this.maxRequests) {
      this.requests.splice(0, this.requests.length - this.maxRequests);
    }

    this.counters.total += 1;
    if (status >= 200 && status < 400) this.counters.success += 1;
    if (status >= 400 && status < 500) this.counters.clientErrors += 1;
    if (status >= 500) this.counters.serverErrors += 1;
    if (status === 401 || status === 403) this.counters.authFailures += 1;
    if (status === 409 || status === 412) this.counters.conflicts += 1;
    if (metadata.replayed) this.counters.idempotencyReplays += 1;

    if (status >= 500 || latencyMs >= 2000) {
      this.realtimeHub.publish("observability:signal", {
        kind: status >= 500 ? "server-error" : "latency",
        severity: status >= 500 ? "critical" : "warning",
        request: record
      });
    }
    return record;
  }

  percentile(values, percentile) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil(percentile * sorted.length) - 1);
    return sorted[Math.max(0, index)];
  }

  async snapshot() {
    const recent = this.requests.slice(-250);
    const latencies = recent.map(item => item.latencyMs);
    const total = this.counters.total || 1;
    const database = await this.database.read();
    const incidents = database.observabilityIncidents || [];
    const openIncidents = incidents.filter(item => !["resolved", "closed"].includes(item.status));

    return {
      version: "34.5.0",
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      realtimeClients: this.realtimeHub.count(),
      requests: {
        ...this.counters,
        successRate: Math.round(this.counters.success / total * 1000) / 10,
        averageLatencyMs: latencies.length
          ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
          : 0,
        p50LatencyMs: this.percentile(latencies, 0.50),
        p95LatencyMs: this.percentile(latencies, 0.95),
        p99LatencyMs: this.percentile(latencies, 0.99),
        recent: recent.slice(-40).reverse()
      },
      incidents: {
        open: openIncidents.length,
        critical: openIncidents.filter(item => item.severity === "critical").length,
        records: incidents.slice(-50).reverse()
      },
      storage: {
        reservations: (database.reservations || []).length,
        auditLogs: (database.auditLogs || []).length,
        idempotencyRecords: (database.idempotencyRecords || []).length,
        resourceVersions: (database.resourceVersions || []).length
      }
    };
  }

  async createIncident(input, actor) {
    const incident = await this.database.mutate(database => {
      database.observabilityIncidents ||= [];
      const record = {
        id: `incident_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: String(input.title || "Operational incident"),
        description: String(input.description || ""),
        severity: ["info", "warning", "critical"].includes(input.severity)
          ? input.severity
          : "warning",
        status: "open",
        source: input.source || "manual",
        owner: input.owner || actor,
        organizationId: input.organizationId || null,
        createdBy: actor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [{
          action: "created",
          actor,
          detail: input.description || "Incident created.",
          createdAt: new Date().toISOString()
        }]
      };
      database.observabilityIncidents.push(record);
      return record;
    });
    this.realtimeHub.publish("observability:incident-created", incident);
    return incident;
  }

  async updateIncident(id, input, actor) {
    const incident = await this.database.mutate(database => {
      database.observabilityIncidents ||= [];
      const record = database.observabilityIncidents.find(item => item.id === id);
      if (!record) return null;
      if (input.status) record.status = input.status;
      if (input.owner) record.owner = input.owner;
      if (input.severity) record.severity = input.severity;
      record.updatedAt = new Date().toISOString();
      record.timeline ||= [];
      record.timeline.push({
        action: input.status ? `status:${input.status}` : "updated",
        actor,
        detail: input.note || "Incident updated.",
        createdAt: new Date().toISOString()
      });
      return { ...record };
    });
    if (incident) this.realtimeHub.publish("observability:incident-updated", incident);
    return incident;
  }
}

module.exports = TelemetryService;
