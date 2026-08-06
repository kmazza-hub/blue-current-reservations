"use strict";

class LiveIntegrationService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  contracts() {
    return [
      { type: "check.closed", sourceType: "pos", schemaVersion: "1.0", required: ["locationId", "checkTotal"], optional: ["checkId", "table", "covers", "tax", "tip"] },
      { type: "reservation.created", sourceType: "reservations", schemaVersion: "1.0", required: ["locationId", "reservationId", "covers"], optional: ["guestId", "time", "channel"] },
      { type: "reservation.seated", sourceType: "reservations", schemaVersion: "1.0", required: ["locationId", "reservationId", "covers"], optional: ["table", "guestId"] },
      { type: "ticket.fired", sourceType: "kitchen", schemaVersion: "1.0", required: ["locationId", "ticketId"], optional: ["table", "station", "items"] },
      { type: "ticket.completed", sourceType: "kitchen", schemaVersion: "1.0", required: ["locationId", "ticketId"], optional: ["table", "station", "durationSeconds"] },
      { type: "employee.clocked-in", sourceType: "labor", schemaVersion: "1.0", required: ["locationId", "employeeId"], optional: ["role", "hourlyRate"] },
      { type: "employee.clocked-out", sourceType: "labor", schemaVersion: "1.0", required: ["locationId", "employeeId"], optional: ["role"] },
      { type: "inventory.received", sourceType: "inventory", schemaVersion: "1.0", required: ["locationId", "itemId", "quantity"], optional: ["unit", "cost"] }
    ];
  }

  contractFor(type) {
    return this.contracts().find(item => item.type === type) || null;
  }

  defaults(organizationId) {
    return [
      { id: "toast-pos", name: "Toast POS", type: "pos", mode: "sandbox", endpoint: "", status: "not-configured" },
      { id: "opentable-reservations", name: "OpenTable / Reservations", type: "reservations", mode: "sandbox", endpoint: "", status: "not-configured" },
      { id: "labor-schedule", name: "Labor / Scheduling", type: "labor", mode: "sandbox", endpoint: "", status: "not-configured" },
      { id: "inventory-purchasing", name: "Inventory / Purchasing", type: "inventory", mode: "sandbox", endpoint: "", status: "not-configured" },
      { id: "kitchen-display", name: "Kitchen Display", type: "kitchen", mode: "sandbox", endpoint: "", status: "not-configured" }
    ].map(item => ({ ...item, organizationId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  }

  async ensureDefaults(organizationId) {
    return this.database.mutate(db => {
      db.liveConnectors ||= [];
      const existing = db.liveConnectors.filter(item => item.organizationId === organizationId);
      const known = new Set(existing.map(item => item.id));
      const missing = this.defaults(organizationId).filter(item => !known.has(item.id));
      if (missing.length) db.liveConnectors.push(...missing);
      return db.liveConnectors.filter(item => item.organizationId === organizationId);
    });
  }

  async listConnectors(organizationId) { return this.ensureDefaults(organizationId); }

  async saveConnector(organizationId, actor, input = {}) {
    const id = String(input.id || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const name = String(input.name || "").trim();
    if (!id || !name) throw new Error("Connector id and name are required.");
    const allowedTypes = new Set(["pos", "reservations", "labor", "inventory", "kitchen", "guest", "other"]);
    const type = allowedTypes.has(input.type) ? input.type : "other";
    const mode = input.mode === "live" ? "live" : "sandbox";
    const endpoint = String(input.endpoint || "").trim();
    const connector = await this.database.mutate(db => {
      db.liveConnectors ||= [];
      const index = db.liveConnectors.findIndex(item => item.organizationId === organizationId && item.id === id);
      const previous = index >= 0 ? db.liveConnectors[index] : null;
      const next = { ...(previous || {}), id, name, type, mode, endpoint, organizationId,
        status: endpoint ? (previous?.status === "healthy" ? "healthy" : "configured") : "not-configured",
        updatedAt: new Date().toISOString(), createdAt: previous?.createdAt || new Date().toISOString() };
      if (index >= 0) db.liveConnectors[index] = next; else db.liveConnectors.push(next);
      return next;
    });
    await this.auditService.record({ organizationId, actor, action: `Live connector saved: ${connector.name}`, category: "live-integration" });
    this.realtimeHub.publish("live-connector-updated", connector);
    return connector;
  }

  async testConnector(organizationId, id, actor) {
    const connector = await this.database.mutate(db => {
      db.liveConnectors ||= [];
      const item = db.liveConnectors.find(entry => entry.organizationId === organizationId && entry.id === id);
      if (!item) return null;
      item.lastTestAt = new Date().toISOString();
      item.status = item.endpoint ? "healthy" : "not-configured";
      item.lastError = item.endpoint ? null : "No endpoint configured.";
      item.updatedAt = new Date().toISOString();
      return { ...item };
    });
    if (!connector) return null;
    await this.auditService.record({ organizationId, actor, action: `Live connector tested: ${connector.name}`, category: "live-integration" });
    this.realtimeHub.publish("live-connector-health", connector);
    return connector;
  }

  validatePayload(contract, payload) {
    const missing = (contract?.required || []).filter(field => payload[field] === undefined || payload[field] === null || payload[field] === "");
    if (missing.length) throw new Error(`Missing required fields for ${contract.type}: ${missing.join(", ")}`);
    if (contract?.type === "check.closed" && (!Number.isFinite(Number(payload.checkTotal)) || Number(payload.checkTotal) < 0)) throw new Error("checkTotal must be a non-negative number.");
    if (["reservation.created", "reservation.seated"].includes(contract?.type) && (!Number.isFinite(Number(payload.covers)) || Number(payload.covers) < 1)) throw new Error("covers must be a positive number.");
    if (contract?.type === "inventory.received" && !Number.isFinite(Number(payload.quantity))) throw new Error("quantity must be numeric.");
    return true;
  }

  normalizePayload(type, payload = {}) {
    const normalized = { ...payload };
    if (normalized.location_id && !normalized.locationId) normalized.locationId = normalized.location_id;
    if (normalized.total != null && normalized.checkTotal == null && type === "check.closed") normalized.checkTotal = normalized.total;
    if (normalized.partySize != null && normalized.covers == null) normalized.covers = normalized.partySize;
    if (normalized.reservation_id && !normalized.reservationId) normalized.reservationId = normalized.reservation_id;
    if (normalized.ticket_id && !normalized.ticketId) normalized.ticketId = normalized.ticket_id;
    if (normalized.employee_id && !normalized.employeeId) normalized.employeeId = normalized.employee_id;
    return normalized;
  }

  async deadLetter(organizationId, actor, input, errorMessage, replayOf = null) {
    const record = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organizationId, actor, source: String(input.source || "").trim(), type: String(input.type || "").trim(),
      payload: input.payload && typeof input.payload === "object" ? input.payload : {}, occurredAt: input.occurredAt || null,
      error: errorMessage, status: "open", attempts: replayOf ? 2 : 1, replayOf, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await this.database.mutate(db => { db.liveDeadLetters ||= []; db.liveDeadLetters.unshift(record); db.liveDeadLetters = db.liveDeadLetters.slice(0, 2000); return record; });
    this.realtimeHub.publish("live-event-rejected", record);
    return record;
  }

  async ingestEvent(organizationId, actor, input = {}, options = {}) {
    try {
      const source = String(input.source || "").trim();
      const type = String(input.type || "").trim();
      if (!source || !type) throw new Error("Event source and type are required.");
      if (input.payload != null && (typeof input.payload !== "object" || Array.isArray(input.payload))) throw new Error("Event payload must be a JSON object.");
      const connectors = await this.listConnectors(organizationId);
      const connector = connectors.find(item => item.id === source);
      if (!connector) throw new Error(`Unknown connector: ${source}`);
      const contract = this.contractFor(type);
      if (!contract) throw new Error(`Unsupported canonical event type: ${type}`);
      if (connector.type !== contract.sourceType && connector.type !== "other") throw new Error(`${source} is a ${connector.type} connector but ${type} requires ${contract.sourceType}.`);
      const payload = this.normalizePayload(type, input.payload || {});
      this.validatePayload(contract, payload);
      const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
      if (Number.isNaN(occurredAt.getTime())) throw new Error("occurredAt must be a valid date-time.");
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, organizationId, source, type,
        schemaVersion: contract.schemaVersion, occurredAt: occurredAt.toISOString(), receivedAt: new Date().toISOString(),
        payload, actor, replayedFrom: options.replayedFrom || null, validation: { status: "accepted", contract: type }
      };
      await this.database.mutate(db => {
        db.liveEvents ||= []; db.liveEvents.unshift(event); db.liveEvents = db.liveEvents.slice(0, 5000);
        db.liveConnectors ||= [];
        const item = db.liveConnectors.find(entry => entry.organizationId === organizationId && entry.id === source);
        if (item) { item.lastEventAt = event.receivedAt; item.status = "healthy"; item.lastError = null; item.updatedAt = event.receivedAt; }
        if (options.replayedFrom) {
          db.liveDeadLetters ||= [];
          const dlq = db.liveDeadLetters.find(entry => entry.organizationId === organizationId && entry.id === options.replayedFrom);
          if (dlq) { dlq.status = "replayed"; dlq.replayedEventId = event.id; dlq.updatedAt = event.receivedAt; }
        }
        return event;
      });
      this.realtimeHub.publish("live-event", event);
      const snapshot = await this.operatingSnapshot(organizationId);
      this.realtimeHub.publish("live-operating-snapshot", snapshot);
      return event;
    } catch (error) {
      if (options.skipDeadLetter) throw error;
      const dlq = await this.deadLetter(organizationId, actor, input, error.message, options.replayedFrom || null);
      error.deadLetterId = dlq.id;
      throw error;
    }
  }

  async events(organizationId, limit = 50) {
    const db = await this.database.read();
    return (db.liveEvents || []).filter(item => item.organizationId === organizationId).slice(0, Math.max(1, Math.min(Number(limit) || 50, 200)));
  }

  async deadLetters(organizationId, limit = 50) {
    const db = await this.database.read();
    return (db.liveDeadLetters || []).filter(item => item.organizationId === organizationId).slice(0, Math.max(1, Math.min(Number(limit) || 50, 200)));
  }

  async replayDeadLetter(organizationId, id, actor) {
    const db = await this.database.read();
    const item = (db.liveDeadLetters || []).find(entry => entry.organizationId === organizationId && entry.id === id);
    if (!item) return null;
    if (item.status === "replayed") return { alreadyReplayed: true, deadLetter: item };
    try {
      const event = await this.ingestEvent(organizationId, actor, { source: item.source, type: item.type, payload: item.payload, occurredAt: item.occurredAt }, { replayedFrom: id, skipDeadLetter: true });
      await this.auditService.record({ organizationId, actor, action: `Dead letter replayed: ${id}`, category: "live-integration" });
      return { event };
    } catch (error) {
      await this.database.mutate(database => {
        database.liveDeadLetters ||= [];
        const target = database.liveDeadLetters.find(entry => entry.organizationId === organizationId && entry.id === id);
        if (target) { target.attempts = Number(target.attempts || 1) + 1; target.error = error.message; target.updatedAt = new Date().toISOString(); }
      });
      throw error;
    }
  }

  async operatingSnapshot(organizationId) {
    const events = await this.events(organizationId, 200);
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    const recent = events.filter(event => new Date(event.receivedAt).getTime() >= cutoff);
    const checks = recent.filter(event => event.type === "check.closed");
    const revenue = checks.reduce((sum, event) => sum + (Number(event.payload.checkTotal) || 0), 0);
    const seated = recent.filter(event => event.type === "reservation.seated");
    const seatedCovers = seated.reduce((sum, event) => sum + (Number(event.payload.covers) || 0), 0);
    const tickets = new Map();
    recent.filter(event => event.type === "ticket.fired").forEach(event => tickets.set(event.payload.ticketId, true));
    recent.filter(event => event.type === "ticket.completed").forEach(event => tickets.delete(event.payload.ticketId));
    const onClock = new Set();
    [...recent].reverse().forEach(event => {
      if (event.type === "employee.clocked-in") onClock.add(event.payload.employeeId);
      if (event.type === "employee.clocked-out") onClock.delete(event.payload.employeeId);
    });
    const lastEventAt = events[0]?.receivedAt || null;
    const freshnessSeconds = lastEventAt ? Math.max(0, Math.round((Date.now() - new Date(lastEventAt).getTime()) / 1000)) : null;
    return {
      organizationId, windowHours: 4, revenue: Math.round(revenue * 100) / 100, closedChecks: checks.length,
      seatedCovers, reservationsCreated: recent.filter(event => event.type === "reservation.created").length,
      openKitchenTickets: tickets.size, employeesOnClock: onClock.size, recentEvents: recent.length,
      lastEventAt, freshnessSeconds, status: freshnessSeconds == null ? "awaiting-data" : freshnessSeconds > 300 ? "stale" : "live",
      generatedAt: new Date().toISOString()
    };
  }

  async status(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const events = await this.events(organizationId, 500);
    const dead = await this.deadLetters(organizationId, 500);
    const now = Date.now();
    const recent = events.filter(event => now - new Date(event.receivedAt).getTime() <= 15 * 60 * 1000);
    const sources = connectors.map(connector => {
      const ageMs = connector.lastEventAt ? now - new Date(connector.lastEventAt).getTime() : null;
      const stale = connector.mode === "live" && connector.status === "healthy" && ageMs != null && ageMs > 5 * 60 * 1000;
      return { ...connector, stale, ageSeconds: ageMs == null ? null : Math.max(0, Math.round(ageMs / 1000)) };
    });
    return { organizationId, connectorCount: connectors.length, configuredConnectors: connectors.filter(item => item.endpoint).length,
      healthyConnectors: sources.filter(item => item.status === "healthy" && !item.stale).length, staleConnectors: sources.filter(item => item.stale).length,
      events15m: recent.length, openDeadLetters: dead.filter(item => item.status === "open").length,
      lastEventAt: events[0]?.receivedAt || null, sources, generatedAt: new Date().toISOString() };
  }
}

module.exports = LiveIntegrationService;
