"use strict";

const crypto = require("crypto");

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
      const sourceEventId = String(input.sourceEventId || input.externalId || "").trim() || null;
      const fingerprint = this.deliveryFingerprint(source, type, sourceEventId, occurredAt.toISOString(), payload);
      const current = await this.database.read();
      const duplicate = (current.liveEvents || []).find(item => item.organizationId === organizationId && item.fingerprint === fingerprint);
      if (duplicate) {
        await this.recordDeliveryMetric(organizationId, source, "duplicate");
        this.realtimeHub.publish("live-event-duplicate", { source, type, sourceEventId, fingerprint, originalEventId: duplicate.id });
        return { ...duplicate, duplicate: true };
      }
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, organizationId, source, type,
        schemaVersion: contract.schemaVersion, occurredAt: occurredAt.toISOString(), receivedAt: new Date().toISOString(),
        sourceEventId, fingerprint, adapterId: options.adapterId || null,
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
      await this.recordDeliveryMetric(organizationId, source, "accepted");
      if (options.replayedFrom) await this.recordDeliveryMetric(organizationId, source, "replayed");
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


  adapterProfiles() {
    return [
      {
        id: "toast",
        name: "Toast POS mapping profile",
        sourceType: "pos",
        status: "mapping-ready",
        events: ["check.closed"],
        note: "Provider normalization profile. Live provider authentication remains server-side connector configuration."
      },
      {
        id: "opentable",
        name: "OpenTable reservation mapping profile",
        sourceType: "reservations",
        status: "mapping-ready",
        events: ["reservation.created", "reservation.seated"],
        note: "Provider normalization profile. Live provider authentication remains server-side connector configuration."
      },
      {
        id: "generic-kitchen",
        name: "Generic kitchen event profile",
        sourceType: "kitchen",
        status: "mapping-ready",
        events: ["ticket.fired", "ticket.completed"],
        note: "Canonical mapping for KDS or kitchen middleware."
      },
      {
        id: "generic-labor",
        name: "Generic labor event profile",
        sourceType: "labor",
        status: "mapping-ready",
        events: ["employee.clocked-in", "employee.clocked-out"],
        note: "Canonical mapping for labor, scheduling, or time-clock middleware."
      },
      {
        id: "generic-inventory",
        name: "Generic inventory event profile",
        sourceType: "inventory",
        status: "mapping-ready",
        events: ["inventory.received"],
        note: "Canonical mapping for inventory or purchasing middleware."
      }
    ];
  }

  adapterProfile(id) {
    return this.adapterProfiles().find(item => item.id === id) || null;
  }

  normalizeAdapterEvent(adapterId, raw = {}) {
    const profile = this.adapterProfile(adapterId);
    if (!profile) throw new Error(`Unknown adapter profile: ${adapterId}`);
    const rawType = String(raw.eventType || raw.type || raw.event_type || "").trim();
    let type = rawType;
    if (adapterId === "toast") {
      type = rawType === "check.closed" || rawType === "CHECK_CLOSED" || rawType === "closed" ? "check.closed" : rawType;
    } else if (adapterId === "opentable") {
      if (["reservation.created", "CREATED", "created"].includes(rawType)) type = "reservation.created";
      if (["reservation.seated", "SEATED", "seated"].includes(rawType)) type = "reservation.seated";
    } else if (adapterId === "generic-kitchen") {
      if (["ticket.fired", "FIRED", "fired"].includes(rawType)) type = "ticket.fired";
      if (["ticket.completed", "COMPLETED", "completed"].includes(rawType)) type = "ticket.completed";
    } else if (adapterId === "generic-labor") {
      if (["employee.clocked-in", "CLOCKED_IN", "clocked-in"].includes(rawType)) type = "employee.clocked-in";
      if (["employee.clocked-out", "CLOCKED_OUT", "clocked-out"].includes(rawType)) type = "employee.clocked-out";
    } else if (adapterId === "generic-inventory") {
      if (["inventory.received", "RECEIVED", "received"].includes(rawType)) type = "inventory.received";
    }
    if (!profile.events.includes(type)) throw new Error(`${profile.name} does not map event type: ${rawType || "(missing)"}`);

    const p = raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload) ? raw.payload : raw;
    const payload = {};
    if (type === "check.closed") {
      payload.locationId = p.locationId || p.location_id || p.restaurantId || p.restaurant_id || p.locationGuid;
      payload.checkTotal = p.checkTotal ?? p.total ?? p.amount ?? p.totalAmount;
      payload.checkId = p.checkId || p.check_id || p.guid || p.id;
      payload.table = p.table || p.tableName || p.table_name;
      payload.covers = p.covers ?? p.guestCount ?? p.partySize;
      payload.tax = p.tax ?? p.taxAmount;
      payload.tip = p.tip ?? p.tipAmount;
    } else if (type.startsWith("reservation.")) {
      payload.locationId = p.locationId || p.location_id || p.restaurantId || p.restaurant_id;
      payload.reservationId = p.reservationId || p.reservation_id || p.id;
      payload.covers = p.covers ?? p.partySize ?? p.party_size;
      payload.guestId = p.guestId || p.guest_id || p.dinerId;
      payload.time = p.time || p.reservationTime || p.reservation_time;
      payload.table = p.table || p.tableName || p.table_name;
      payload.channel = p.channel || p.source;
    } else if (type.startsWith("ticket.")) {
      payload.locationId = p.locationId || p.location_id || p.restaurantId || p.restaurant_id;
      payload.ticketId = p.ticketId || p.ticket_id || p.id;
      payload.table = p.table || p.tableName || p.table_name;
      payload.station = p.station || p.stationName || p.station_name;
      payload.items = p.items;
      payload.durationSeconds = p.durationSeconds ?? p.duration_seconds;
    } else if (type.startsWith("employee.")) {
      payload.locationId = p.locationId || p.location_id || p.restaurantId || p.restaurant_id;
      payload.employeeId = p.employeeId || p.employee_id || p.id;
      payload.role = p.role || p.job || p.jobTitle;
      payload.hourlyRate = p.hourlyRate ?? p.hourly_rate;
    } else if (type === "inventory.received") {
      payload.locationId = p.locationId || p.location_id || p.restaurantId || p.restaurant_id;
      payload.itemId = p.itemId || p.item_id || p.sku || p.id;
      payload.quantity = p.quantity ?? p.qty;
      payload.unit = p.unit || p.uom;
      payload.cost = p.cost ?? p.unitCost ?? p.unit_cost;
    }

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    return {
      adapterId,
      type,
      sourceEventId: String(raw.sourceEventId || raw.eventId || raw.event_id || raw.id || p.eventId || "").trim() || null,
      occurredAt: raw.occurredAt || raw.timestamp || raw.createdAt || raw.created_at || null,
      payload
    };
  }

  async previewAdapterEvent(adapterId, raw = {}) {
    const normalized = this.normalizeAdapterEvent(adapterId, raw);
    const contract = this.contractFor(normalized.type);
    const payload = this.normalizePayload(normalized.type, normalized.payload);
    this.validatePayload(contract, payload);
    return { ...normalized, payload, contract: { type: contract.type, schemaVersion: contract.schemaVersion, sourceType: contract.sourceType } };
  }

  deliveryFingerprint(source, type, sourceEventId, occurredAt, payload) {
    const basis = sourceEventId
      ? `${source}|${type}|external:${sourceEventId}`
      : `${source}|${type}|${occurredAt || ""}|${JSON.stringify(payload || {})}`;
    return crypto.createHash("sha256").update(basis).digest("hex").slice(0, 32);
  }

  async recordDeliveryMetric(organizationId, source, kind) {
    return this.database.mutate(db => {
      db.liveDeliveryStats ||= {};
      const key = `${organizationId}:${source}`;
      const stat = db.liveDeliveryStats[key] ||= { organizationId, source, accepted: 0, duplicate: 0, rejected: 0, replayed: 0, lastUpdatedAt: null };
      if (Object.prototype.hasOwnProperty.call(stat, kind)) stat[kind] += 1;
      stat.lastUpdatedAt = new Date().toISOString();
      return { ...stat };
    });
  }

  async ingestAdapterEvent(organizationId, actor, adapterId, input = {}) {
    const connectorId = String(input.connectorId || input.source || "").trim();
    if (!connectorId) throw new Error("connectorId is required.");
    const connectors = await this.listConnectors(organizationId);
    const connector = connectors.find(item => item.id === connectorId);
    if (!connector) throw new Error(`Unknown connector: ${connectorId}`);
    const profile = this.adapterProfile(adapterId);
    if (!profile) throw new Error(`Unknown adapter profile: ${adapterId}`);
    if (connector.type !== profile.sourceType && connector.type !== "other") {
      throw new Error(`${connector.name} is a ${connector.type} connector but ${profile.name} expects ${profile.sourceType}.`);
    }
    let mapped;
    try {
      mapped = await this.previewAdapterEvent(adapterId, input.event || input.raw || input);
    } catch (error) {
      await this.recordDeliveryMetric(organizationId, connectorId, "rejected");
      const dead = await this.deadLetter(organizationId, actor, {
        source: connectorId,
        type: String(input?.event?.eventType || input?.event?.type || input?.type || "adapter.unmapped"),
        payload: input.event || input.raw || input,
        occurredAt: input?.event?.occurredAt || input?.occurredAt || null
      }, `Adapter ${adapterId}: ${error.message}`);
      error.deadLetterId = dead.id;
      throw error;
    }
    return this.ingestEvent(organizationId, actor, {
      source: connectorId,
      type: mapped.type,
      sourceEventId: mapped.sourceEventId,
      occurredAt: mapped.occurredAt,
      payload: mapped.payload
    }, { adapterId });
  }

  async deliveryMetrics(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const events = await this.events(organizationId, 1000);
    const dead = await this.deadLetters(organizationId, 1000);
    const db = await this.database.read();
    const stats = db.liveDeliveryStats || {};
    const now = Date.now();
    const sources = connectors.map(connector => {
      const sourceEvents = events.filter(event => event.source === connector.id);
      const sourceDead = dead.filter(item => item.source === connector.id && item.status === "open");
      const persisted = stats[`${organizationId}:${connector.id}`] || {};
      const last = sourceEvents[0] || null;
      const lagSeconds = last ? Math.max(0, Math.round((now - new Date(last.receivedAt).getTime()) / 1000)) : null;
      return {
        id: connector.id,
        name: connector.name,
        type: connector.type,
        accepted: Number(persisted.accepted || sourceEvents.length),
        duplicate: Number(persisted.duplicate || 0),
        rejected: Number(persisted.rejected || sourceDead.length),
        replayed: Number(persisted.replayed || 0),
        openDeadLetters: sourceDead.length,
        lastEventAt: last?.receivedAt || connector.lastEventAt || null,
        lagSeconds,
        status: connector.status === "healthy" && (lagSeconds == null || lagSeconds <= 300) ? "healthy" : connector.status
      };
    });
    const totals = sources.reduce((a, x) => ({
      accepted: a.accepted + x.accepted,
      duplicate: a.duplicate + x.duplicate,
      rejected: a.rejected + x.rejected,
      replayed: a.replayed + x.replayed,
      openDeadLetters: a.openDeadLetters + x.openDeadLetters
    }), { accepted: 0, duplicate: 0, rejected: 0, replayed: 0, openDeadLetters: 0 });
    return { organizationId, totals, sources, generatedAt: new Date().toISOString() };
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
