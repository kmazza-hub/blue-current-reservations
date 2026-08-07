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
      const admissionDb = await this.database.read();
      const admissionPolicy = admissionDb.liveBackpressurePolicies?.[`${organizationId}:${source}`] || null;
      if (admissionPolicy?.mode === "protect") {
        const cutoff = Date.now() - 60000;
        const eventsPerMinute = (admissionDb.liveEvents || []).filter(item => item.organizationId === organizationId && item.source === source && new Date(item.receivedAt).getTime() >= cutoff).length;
        if (eventsPerMinute >= Number(admissionPolicy.hardLimitPerMinute || 300)) {
          const pressureError = new Error(`Connector ${source} is above its protected hard limit (${eventsPerMinute}/${admissionPolicy.hardLimitPerMinute} events/min). Event preserved for recovery.`);
          pressureError.statusCode = 429;
          throw pressureError;
        }
      }
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
        db.liveSourceCheckpoints ||= {};
        const checkpointKey = `${organizationId}:${source}`;
        const previousCheckpoint = db.liveSourceCheckpoints[checkpointKey] || { organizationId, source, sequence: 0 };
        db.liveSourceCheckpoints[checkpointKey] = {
          ...previousCheckpoint, organizationId, source, connectorType: connector.type,
          sequence: Number(previousCheckpoint.sequence || 0) + 1, lastEventId: event.id,
          lastSourceEventId: sourceEventId, lastOccurredAt: event.occurredAt, lastReceivedAt: event.receivedAt,
          schemaVersion: event.schemaVersion, adapterId: event.adapterId || null, updatedAt: event.receivedAt
        };
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

  async sourceCheckpoints(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const db = await this.database.read();
    const stored = db.liveSourceCheckpoints || {};
    const now = Date.now();
    const checkpoints = connectors.map(connector => {
      const checkpoint = stored[`${organizationId}:${connector.id}`] || null;
      const last = checkpoint?.lastReceivedAt || connector.lastEventAt || null;
      const ageSeconds = last ? Math.max(0, Math.round((now - new Date(last).getTime()) / 1000)) : null;
      const freshness = ageSeconds == null ? "awaiting-data" : ageSeconds <= 300 ? "fresh" : ageSeconds <= 900 ? "watch" : "stale";
      return {
        organizationId, source: connector.id, name: connector.name, type: connector.type, mode: connector.mode,
        sequence: Number(checkpoint?.sequence || 0), lastEventId: checkpoint?.lastEventId || null,
        lastSourceEventId: checkpoint?.lastSourceEventId || null, lastOccurredAt: checkpoint?.lastOccurredAt || null,
        lastReceivedAt: last, schemaVersion: checkpoint?.schemaVersion || null, adapterId: checkpoint?.adapterId || null,
        ageSeconds, freshness, updatedAt: checkpoint?.updatedAt || connector.updatedAt || null
      };
    });
    const active = checkpoints.filter(item => item.sequence > 0);
    return {
      organizationId, checkpointCount: checkpoints.length, activeCheckpoints: active.length,
      fresh: checkpoints.filter(item => item.freshness === "fresh").length,
      watch: checkpoints.filter(item => item.freshness === "watch").length,
      stale: checkpoints.filter(item => item.freshness === "stale").length,
      checkpoints, generatedAt: new Date().toISOString()
    };
  }

  async replayWindow(organizationId, options = {}) {
    const source = String(options.source || "").trim();
    const minutes = Math.max(1, Math.min(Number(options.minutes) || 15, 240));
    const limit = Math.max(1, Math.min(Number(options.limit) || 100, 500));
    const cutoff = Date.now() - minutes * 60 * 1000;
    const db = await this.database.read();
    let events = (db.liveEvents || []).filter(item => item.organizationId === organizationId && new Date(item.receivedAt).getTime() >= cutoff);
    if (source) events = events.filter(item => item.source === source);
    events = events.slice(0, limit);
    return { organizationId, source: source || "all", minutes, limit, count: events.length, events, generatedAt: new Date().toISOString() };
  }

  async publishReplayWindow(organizationId, actor, options = {}) {
    const window = await this.replayWindow(organizationId, options);
    const replayId = `replay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ordered = [...window.events].reverse();
    ordered.forEach((event, index) => this.realtimeHub.publish("live-event-replay", { ...event, replay: true, replayId, replaySequence: index + 1 }));
    await this.auditService.record({ organizationId, actor, action: `Live replay published: ${replayId} (${ordered.length} events)`, category: "live-integration" });
    return { replayId, source: window.source, minutes: window.minutes, count: ordered.length, publishedAt: new Date().toISOString() };
  }

  async reasoningFeed(organizationId) {
    const [snapshot, status, delivery, checkpoints] = await Promise.all([
      this.operatingSnapshot(organizationId), this.status(organizationId), this.deliveryMetrics(organizationId), this.sourceCheckpoints(organizationId)
    ]);
    const configured = status.sources.filter(item => item.endpoint);
    const required = configured.length ? configured : status.sources.filter(item => item.mode === "live");
    const staleRequired = required.filter(item => {
      const checkpoint = checkpoints.checkpoints.find(cp => cp.source === item.id);
      return !checkpoint || ["watch", "stale", "awaiting-data"].includes(checkpoint.freshness);
    });
    const blockers = [];
    if (snapshot.status !== "live") blockers.push("Operating snapshot is not fresh.");
    if ((delivery.totals?.openDeadLetters || 0) > 0) blockers.push(`${delivery.totals.openDeadLetters} open dead-letter event(s).`);
    if (staleRequired.length) blockers.push(`${staleRequired.length} configured/live source(s) are not fresh.`);
    const score = Math.max(0, 100 - blockers.length * 20 - Math.min(20, (delivery.totals?.rejected || 0) * 2));
    const feed = {
      organizationId, score, status: blockers.length === 0 ? "trusted-live" : score >= 70 ? "conditional" : "blocked",
      safeToReason: blockers.length === 0, blockers, snapshot, checkpoints, delivery, generatedAt: new Date().toISOString()
    };
    this.realtimeHub.publish("live-reasoning-feed", feed);
    return feed;
  }

  async streamReconciliation(organizationId) {
    const [connectors, checkpoints] = await Promise.all([
      this.listConnectors(organizationId),
      this.sourceCheckpoints(organizationId)
    ]);
    const db = await this.database.read();
    const events = (db.liveEvents || []).filter(item => item.organizationId === organizationId);
    const sources = connectors.map(connector => {
      const sourceEvents = events.filter(event => event.source === connector.id);
      const checkpoint = checkpoints.checkpoints.find(item => item.source === connector.id) || null;
      const newest = sourceEvents[0] || null;
      const checkpointEventExists = !checkpoint?.lastEventId || sourceEvents.some(event => event.id === checkpoint.lastEventId);
      const lastEventMatches = !checkpoint?.lastEventId || checkpoint.lastEventId === newest?.id;
      let orderViolations = 0;
      for (let i = 1; i < sourceEvents.length; i += 1) {
        const previous = new Date(sourceEvents[i - 1].receivedAt).getTime();
        const current = new Date(sourceEvents[i].receivedAt).getTime();
        if (Number.isFinite(previous) && Number.isFinite(current) && previous < current) orderViolations += 1;
      }
      const issues = [];
      if (checkpoint?.sequence > 0 && !checkpointEventExists) issues.push("Checkpoint event is not present in the retained event window.");
      if (checkpoint?.sequence > 0 && !lastEventMatches) issues.push("Checkpoint does not match the newest retained source event.");
      if (orderViolations) issues.push(`${orderViolations} retained event ordering violation(s).`);
      if (connector.mode === "live" && connector.endpoint && !checkpoint?.sequence) issues.push("Configured live source has no accepted checkpoint.");
      const score = Math.max(0, 100 - issues.length * 25);
      return {
        source: connector.id, name: connector.name, type: connector.type, retainedEvents: sourceEvents.length,
        checkpointSequence: Number(checkpoint?.sequence || 0), lastEventId: newest?.id || null, checkpointEventId: checkpoint?.lastEventId || null,
        orderViolations, score, status: issues.length === 0 ? "reconciled" : score >= 75 ? "watch" : "mismatch", issues
      };
    });
    const mismatches = sources.filter(item => item.status !== "reconciled");
    const score = sources.length ? Math.round(sources.reduce((sum, item) => sum + item.score, 0) / sources.length) : 100;
    const result = {
      organizationId, score, status: mismatches.length === 0 ? "reconciled" : score >= 80 ? "watch" : "mismatch",
      mismatchCount: mismatches.length, sources, generatedAt: new Date().toISOString()
    };
    this.realtimeHub.publish("live-stream-reconciliation", result);
    return result;
  }

  async backpressureStatus(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const db = await this.database.read();
    db.liveBackpressurePolicies ||= {};
    const events = (db.liveEvents || []).filter(item => item.organizationId === organizationId);
    const now = Date.now();
    const sources = connectors.map(connector => {
      const policy = db.liveBackpressurePolicies[`${organizationId}:${connector.id}`] || { mode: "observe", softLimitPerMinute: 120, hardLimitPerMinute: 300 };
      const lastMinute = events.filter(event => event.source === connector.id && now - new Date(event.receivedAt).getTime() <= 60000).length;
      const pressure = lastMinute >= Number(policy.hardLimitPerMinute || 300) ? "critical" : lastMinute >= Number(policy.softLimitPerMinute || 120) ? "high" : "normal";
      return { source: connector.id, name: connector.name, mode: policy.mode || "observe", softLimitPerMinute: Number(policy.softLimitPerMinute || 120), hardLimitPerMinute: Number(policy.hardLimitPerMinute || 300), eventsPerMinute: lastMinute, pressure };
    });
    const critical = sources.filter(item => item.pressure === "critical").length;
    const high = sources.filter(item => item.pressure === "high").length;
    return { organizationId, status: critical ? "critical" : high ? "watch" : "normal", criticalSources: critical, highSources: high, sources, generatedAt: new Date().toISOString() };
  }

  async saveBackpressurePolicy(organizationId, actor, input = {}) {
    const source = String(input.source || "").trim();
    if (!source) throw new Error("source is required.");
    const connectors = await this.listConnectors(organizationId);
    if (!connectors.some(item => item.id === source)) throw new Error(`Unknown connector: ${source}`);
    const mode = input.mode === "protect" ? "protect" : "observe";
    const soft = Math.max(10, Math.min(Number(input.softLimitPerMinute) || 120, 5000));
    const hard = Math.max(soft + 1, Math.min(Number(input.hardLimitPerMinute) || 300, 10000));
    const policy = { organizationId, source, mode, softLimitPerMinute: soft, hardLimitPerMinute: hard, updatedAt: new Date().toISOString(), updatedBy: actor };
    await this.database.mutate(db => { db.liveBackpressurePolicies ||= {}; db.liveBackpressurePolicies[`${organizationId}:${source}`] = policy; return policy; });
    await this.auditService.record({ organizationId, actor, action: `Live backpressure policy saved: ${source} (${mode})`, category: "live-integration" });
    this.realtimeHub.publish("live-backpressure-policy", policy);
    return policy;
  }

  async twinSyncStatus(organizationId) {
    const db = await this.database.read();
    const current = db.liveTwinSynchronization?.[organizationId] || null;
    return current || { organizationId, version: 0, status: "not-synchronized", trusted: false, blockers: ["Live twin has not been synchronized yet."], generatedAt: new Date().toISOString() };
  }

  async synchronizeTwin(organizationId, actor) {
    const [feed, reconciliation, pressure, snapshot] = await Promise.all([
      this.reasoningFeed(organizationId),
      this.streamReconciliation(organizationId),
      this.backpressureStatus(organizationId),
      this.operatingSnapshot(organizationId)
    ]);
    const blockers = [];
    if (!feed.safeToReason) blockers.push(...(feed.blockers || []));
    if (reconciliation.status === "mismatch") blockers.push(`${reconciliation.mismatchCount} source reconciliation mismatch(es).`);
    if (pressure.status === "critical") blockers.push(`${pressure.criticalSources} source(s) are above the hard backpressure limit.`);
    const trusted = blockers.length === 0;
    const twin = {
      organizationId,
      operationalState: {
        revenue: snapshot.revenue, closedChecks: snapshot.closedChecks, seatedCovers: snapshot.seatedCovers,
        reservationsCreated: snapshot.reservationsCreated, openKitchenTickets: snapshot.openKitchenTickets,
        employeesOnClock: snapshot.employeesOnClock, lastEventAt: snapshot.lastEventAt, freshnessSeconds: snapshot.freshnessSeconds
      },
      evidence: { reasoningFeedScore: feed.score, reconciliationScore: reconciliation.score, backpressureStatus: pressure.status },
      trusted, blockers, synchronizedAt: new Date().toISOString(), synchronizedBy: actor
    };
    const hash = crypto.createHash("sha256").update(JSON.stringify({ operationalState: twin.operationalState, trusted, blockers })).digest("hex").slice(0, 16);
    const saved = await this.database.mutate(db => {
      db.liveTwinSynchronization ||= {};
      const previous = db.liveTwinSynchronization[organizationId] || { version: 0, hash: null };
      const version = previous.hash === hash ? Number(previous.version || 0) : Number(previous.version || 0) + 1;
      const next = { ...twin, version, hash, status: trusted ? "synchronized" : "blocked", generatedAt: new Date().toISOString() };
      db.liveTwinSynchronization[organizationId] = next;
      return next;
    });
    await this.auditService.record({ organizationId, actor, action: `Live operational twin synchronized: v${saved.version} (${saved.status})`, category: "live-integration" });
    this.realtimeHub.publish("live-twin-synchronized", saved);
    return saved;
  }

  async provenanceLedger(organizationId, limit = 100) {
    const db = await this.database.read();
    const connectors = (db.liveConnectors || []).filter(item => item.organizationId === organizationId);
    const connectorMap = new Map(connectors.map(item => [item.id, item]));
    const events = (db.liveEvents || []).filter(item => item.organizationId === organizationId).slice(0, Math.max(1, Math.min(Number(limit) || 100, 500)));
    const records = events.map(event => {
      const connector = connectorMap.get(event.source) || null;
      const lineage = [
        `source:${event.source}`,
        event.adapterId ? `adapter:${event.adapterId}` : `adapter:canonical`,
        `contract:${event.type}@${event.schemaVersion || "1.0"}`,
        `event:${event.id}`
      ];
      return {
        eventId: event.id, source: event.source, sourceName: connector?.name || event.source, sourceType: connector?.type || null,
        connectorMode: connector?.mode || null, eventType: event.type, schemaVersion: event.schemaVersion || null,
        adapterId: event.adapterId || null, sourceEventId: event.sourceEventId || null, fingerprint: event.fingerprint || null,
        occurredAt: event.occurredAt || null, receivedAt: event.receivedAt || null, replayedFrom: event.replayedFrom || null,
        validationStatus: event.validation?.status || "unknown", lineage
      };
    });
    const withAdapter = records.filter(item => item.adapterId).length;
    const withSourceId = records.filter(item => item.sourceEventId).length;
    const accepted = records.filter(item => item.validationStatus === "accepted").length;
    const score = records.length ? Math.round(((accepted / records.length) * 50) + ((withSourceId / records.length) * 30) + ((withAdapter / records.length) * 20)) : 0;
    return {
      organizationId, score, status: records.length === 0 ? "awaiting-data" : score >= 90 ? "traceable" : score >= 70 ? "controlled" : "incomplete",
      eventCount: records.length, withAdapter, withSourceId, accepted, records, generatedAt: new Date().toISOString()
    };
  }

  async sourcePromotionStatus(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const db = await this.database.read();
    const stored = db.liveSourcePromotion || {};
    const checkpoints = await this.sourceCheckpoints(organizationId);
    const reconciliation = await this.streamReconciliation(organizationId);
    const pressure = await this.backpressureStatus(organizationId);
    const checkpointMap = new Map((checkpoints.checkpoints || []).map(item => [item.source, item]));
    const reconciliationMap = new Map((reconciliation.sources || []).map(item => [item.source, item]));
    const pressureMap = new Map((pressure.sources || []).map(item => [item.source, item]));
    const sources = connectors.map(connector => {
      const key = `${organizationId}:${connector.id}`;
      const promotion = stored[key] || { stage: connector.mode === "live" ? "live" : "sandbox" };
      const cp = checkpointMap.get(connector.id);
      const rec = reconciliationMap.get(connector.id);
      const bp = pressureMap.get(connector.id);
      const blockers = [];
      if (!connector.endpoint) blockers.push("Connector endpoint is not configured.");
      if (!cp?.sequence) blockers.push("No accepted source checkpoint exists.");
      if (cp && !["fresh", "watch"].includes(cp.freshness)) blockers.push(`Checkpoint freshness is ${cp.freshness}.`);
      if (rec && rec.status === "mismatch") blockers.push("Source reconciliation is mismatched.");
      if (bp && bp.pressure === "critical") blockers.push("Connector is above its hard backpressure threshold.");
      const readinessScore = Math.max(0, 100 - blockers.length * 25);
      return {
        source: connector.id, name: connector.name, type: connector.type, endpointConfigured: !!connector.endpoint,
        stage: promotion.stage || "sandbox", readinessScore, blockers, updatedAt: promotion.updatedAt || connector.updatedAt || null,
        updatedBy: promotion.updatedBy || null
      };
    });
    return { organizationId, sources, generatedAt: new Date().toISOString() };
  }

  async promoteSource(organizationId, actor, input = {}) {
    const source = String(input.source || "").trim();
    const stage = ["sandbox", "pilot", "live"].includes(input.stage) ? input.stage : "sandbox";
    if (!source) throw new Error("source is required.");
    const current = await this.sourcePromotionStatus(organizationId);
    const item = current.sources.find(entry => entry.source === source);
    if (!item) throw new Error(`Unknown connector: ${source}`);
    if (["pilot", "live"].includes(stage) && item.readinessScore < 75) {
      const error = new Error(`Source ${source} is not ready for ${stage}. Resolve blockers first.`);
      error.statusCode = 409; throw error;
    }
    if (stage === "live" && item.blockers.length) {
      const error = new Error(`Source ${source} cannot move live while blockers remain.`);
      error.statusCode = 409; throw error;
    }
    const record = { organizationId, source, stage, note: String(input.note || "").trim(), updatedAt: new Date().toISOString(), updatedBy: actor };
    await this.database.mutate(db => {
      db.liveSourcePromotion ||= {}; db.liveSourcePromotion[`${organizationId}:${source}`] = record;
      db.liveConnectors ||= [];
      const connector = db.liveConnectors.find(entry => entry.organizationId === organizationId && entry.id === source);
      if (connector) { connector.mode = stage === "live" ? "live" : "sandbox"; connector.updatedAt = record.updatedAt; }
      return record;
    });
    await this.auditService.record({ organizationId, actor, action: `Live source promotion: ${source} -> ${stage}`, category: "live-integration" });
    this.realtimeHub.publish("live-source-promotion", record);
    return { ...item, ...record };
  }

  async liveEvidenceCertification(organizationId, actor = null, persist = false) {
    const [status, provenance, reconciliation, pressure, feed, twin, promotion] = await Promise.all([
      this.status(organizationId), this.provenanceLedger(organizationId, 200), this.streamReconciliation(organizationId),
      this.backpressureStatus(organizationId), this.reasoningFeed(organizationId), this.twinSyncStatus(organizationId), this.sourcePromotionStatus(organizationId)
    ]);
    const controls = [
      { id: "source-health", label: "Live source health", pass: status.configuredConnectors > 0 && status.healthyConnectors > 0 && status.staleConnectors === 0, detail: `${status.healthyConnectors}/${status.connectorCount} healthy · ${status.configuredConnectors} configured` },
      { id: "provenance", label: "Event provenance", pass: provenance.eventCount > 0 && provenance.score >= 70, detail: `${provenance.score}% traceability` },
      { id: "reconciliation", label: "Stream reconciliation", pass: reconciliation.status !== "mismatch", detail: `${reconciliation.score}% reconciled` },
      { id: "backpressure", label: "Backpressure containment", pass: pressure.status !== "critical", detail: pressure.status },
      { id: "reasoning-feed", label: "Reasoning evidence gate", pass: !!feed.safeToReason, detail: `${feed.score}% evidence` },
      { id: "live-twin", label: "Trusted live twin", pass: !!twin.trusted, detail: twin.status || "not-synchronized" },
      { id: "source-promotion", label: "Controlled source promotion", pass: promotion.sources.every(item => item.stage !== "live" || item.blockers.length === 0), detail: `${promotion.sources.filter(item => item.stage === "live").length} live source(s)` }
    ];
    const score = Math.round(controls.reduce((sum, item) => sum + (item.pass ? 100 : 0), 0) / controls.length);
    const blockers = controls.filter(item => !item.pass).map(item => `${item.label}: ${item.detail}`);
    const certificate = {
      id: `LEC-${Date.now().toString(36).toUpperCase()}`, organizationId, score,
      status: score === 100 ? "certified" : score >= 70 ? "conditional" : "blocked", trusted: score === 100, blockers, controls,
      issuedAt: new Date().toISOString(), issuedBy: actor || null, build: "42.17.0-live-evidence-certification"
    };
    if (persist) {
      await this.database.mutate(db => { db.liveEvidenceCertification ||= {}; db.liveEvidenceCertification[organizationId] = certificate; return certificate; });
      await this.auditService.record({ organizationId, actor, action: `Live evidence certification: ${certificate.status} (${certificate.score}%)`, category: "live-integration" });
      this.realtimeHub.publish("live-evidence-certification", certificate);
    }
    return certificate;
  }


  async connectorAuthBindings(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const db = await this.database.read();
    const bindings = db.liveConnectorAuthBindings || {};
    return {
      organizationId,
      bindings: connectors.map(connector => {
        const stored = bindings[`${organizationId}:${connector.id}`] || {};
        const secretEnv = stored.secretEnv || null;
        const authType = stored.authType || "none";
        return {
          source: connector.id, name: connector.name, type: connector.type,
          authType, adapterId: stored.adapterId || null,
          secretEnv, secretAvailable: secretEnv ? !!process.env[secretEnv] : authType === "none",
          signatureHeader: stored.signatureHeader || "x-blue-current-signature",
          updatedAt: stored.updatedAt || null, updatedBy: stored.updatedBy || null,
          webhookPath: `/api/live/webhooks/${encodeURIComponent(organizationId)}/${encodeURIComponent(connector.id)}`
        };
      }),
      generatedAt: new Date().toISOString()
    };
  }

  async saveConnectorAuthBinding(organizationId, actor, input = {}) {
    const source = String(input.source || "").trim();
    if (!source) throw new Error("source is required.");
    const connectors = await this.listConnectors(organizationId);
    if (!connectors.some(item => item.id === source)) throw new Error(`Unknown connector: ${source}`);
    const authType = ["none", "hmac-sha256"].includes(input.authType) ? input.authType : "hmac-sha256";
    const secretEnv = authType === "none" ? null : String(input.secretEnv || "").trim();
    if (secretEnv && !/^[A-Z][A-Z0-9_]{2,127}$/.test(secretEnv)) throw new Error("secretEnv must be an uppercase environment-variable name.");
    if (authType !== "none" && !secretEnv) throw new Error("secretEnv is required for signed webhook authentication.");
    const adapterId = String(input.adapterId || "").trim() || null;
    if (adapterId && !this.adapterProfile(adapterId)) throw new Error(`Unknown adapter profile: ${adapterId}`);
    const signatureHeader = String(input.signatureHeader || "x-blue-current-signature").trim().toLowerCase();
    if (!/^[a-z0-9-]{3,80}$/.test(signatureHeader)) throw new Error("signatureHeader is invalid.");
    const record = { organizationId, source, authType, secretEnv, adapterId, signatureHeader, updatedAt: new Date().toISOString(), updatedBy: actor };
    await this.database.mutate(db => { db.liveConnectorAuthBindings ||= {}; db.liveConnectorAuthBindings[`${organizationId}:${source}`] = record; return record; });
    await this.auditService.record({ organizationId, actor, action: `Live connector auth binding saved: ${source} (${authType})`, category: "live-integration" });
    this.realtimeHub.publish("live-connector-auth-binding", { ...record, secretAvailable: secretEnv ? !!process.env[secretEnv] : true });
    return { ...record, secretAvailable: secretEnv ? !!process.env[secretEnv] : true };
  }

  secureCompareSignature(expected, supplied) {
    const normalize = value => String(value || "").trim().replace(/^sha256=/i, "").toLowerCase();
    const a = normalize(expected), b = normalize(supplied);
    if (!a || !b || a.length !== b.length || !/^[a-f0-9]+$/.test(a) || !/^[a-f0-9]+$/.test(b)) return false;
    try { return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex")); } catch { return false; }
  }

  async ingestSignedWebhook(organizationId, source, signature, rawBody, body = {}) {
    const bindings = await this.connectorAuthBindings(organizationId);
    const binding = bindings.bindings.find(item => item.source === source);
    if (!binding) { const error = new Error("Webhook source is not configured."); error.statusCode = 404; throw error; }
    if (binding.authType !== "hmac-sha256") { const error = new Error("Signed webhook authentication is not enabled for this source."); error.statusCode = 409; throw error; }
    if (!binding.secretEnv || !process.env[binding.secretEnv]) { const error = new Error(`Webhook secret environment variable is unavailable: ${binding.secretEnv || "(not configured)"}`); error.statusCode = 503; throw error; }
    const expected = crypto.createHmac("sha256", process.env[binding.secretEnv]).update(String(rawBody || "")).digest("hex");
    if (!this.secureCompareSignature(expected, signature)) { const error = new Error("Webhook signature verification failed."); error.statusCode = 401; throw error; }
    const actor = `webhook:${source}`;
    let event;
    if (binding.adapterId) {
      event = await this.ingestAdapterEvent(organizationId, actor, binding.adapterId, { connectorId: source, event: body });
    } else {
      event = await this.ingestEvent(organizationId, actor, { ...body, source: body.source || source });
    }
    const receipt = { organizationId, source, eventId: event.id, duplicate: !!event.duplicate, receivedAt: new Date().toISOString(), adapterId: binding.adapterId || null };
    await this.database.mutate(db => { db.liveWebhookIngress ||= []; db.liveWebhookIngress.unshift(receipt); db.liveWebhookIngress = db.liveWebhookIngress.slice(0, 1000); return receipt; });
    this.realtimeHub.publish("live-webhook-ingress", receipt);
    return { ok: true, ...receipt };
  }

  async connectionReadiness(organizationId) {
    const [bindings, promotion, checkpoints, evidence] = await Promise.all([
      this.connectorAuthBindings(organizationId), this.sourcePromotionStatus(organizationId), this.sourceCheckpoints(organizationId), this.liveEvidenceCertification(organizationId)
    ]);
    const checkpointMap = new Map((checkpoints.checkpoints || []).map(item => [item.source, item]));
    const promotionMap = new Map((promotion.sources || []).map(item => [item.source, item]));
    const db = await this.database.read();
    const receipts = (db.liveWebhookIngress || []).filter(item => item.organizationId === organizationId);
    const sources = bindings.bindings.map(binding => {
      const cp = checkpointMap.get(binding.source);
      const promo = promotionMap.get(binding.source);
      const receipt = receipts.find(item => item.source === binding.source) || null;
      const blockers = [];
      if (binding.authType !== "hmac-sha256") blockers.push("Signed webhook authentication is not configured.");
      if (binding.authType === "hmac-sha256" && !binding.secretAvailable) blockers.push("Server-side webhook secret is unavailable.");
      if (!binding.adapterId) blockers.push("No provider adapter is assigned.");
      if (!cp?.sequence) blockers.push("No accepted event checkpoint exists.");
      if (promo?.stage === "live" && promo.blockers?.length) blockers.push("Live source promotion still has blockers.");
      const age = receipt?.receivedAt ? Math.round((Date.now() - new Date(receipt.receivedAt).getTime()) / 1000) : null;
      if (!receipt) blockers.push("No verified webhook receipt exists.");
      else if (age > 900) blockers.push("Last verified webhook receipt is older than 15 minutes.");
      const score = Math.max(0, 100 - blockers.length * 20);
      return { source: binding.source, name: binding.name, score, status: score === 100 ? "ready" : score >= 60 ? "conditional" : "blocked", blockers, authType: binding.authType, secretAvailable: binding.secretAvailable, adapterId: binding.adapterId, lastVerifiedWebhookAt: receipt?.receivedAt || null, promotionStage: promo?.stage || "sandbox", checkpointSequence: cp?.sequence || 0 };
    });
    const score = sources.length ? Math.round(sources.reduce((sum,item)=>sum+item.score,0)/sources.length) : 0;
    return { organizationId, score, status: score === 100 && evidence.trusted ? "launch-ready" : score >= 70 ? "controlled" : "blocked", evidenceCertified: !!evidence.trusted, sources, generatedAt: new Date().toISOString() };
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
