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
          previousSecretEnv: stored.previousSecretEnv || null,
          previousSecretAvailable: stored.previousSecretEnv ? !!process.env[stored.previousSecretEnv] : false,
          rotationExpiresAt: stored.rotationExpiresAt || null,
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
    const bodyText = String(rawBody || "");
    const expected = crypto.createHmac("sha256", process.env[binding.secretEnv]).update(bodyText).digest("hex");
    let verificationKey = this.secureCompareSignature(expected, signature) ? "current" : null;
    const previousAllowed = binding.previousSecretEnv && binding.previousSecretAvailable && (!binding.rotationExpiresAt || Date.now() <= new Date(binding.rotationExpiresAt).getTime());
    if (!verificationKey && previousAllowed) {
      const previousExpected = crypto.createHmac("sha256", process.env[binding.previousSecretEnv]).update(bodyText).digest("hex");
      if (this.secureCompareSignature(previousExpected, signature)) verificationKey = "previous";
    }
    if (!verificationKey) { const error = new Error("Webhook signature verification failed."); error.statusCode = 401; throw error; }
    const quarantine = await this.providerQuarantineStatus(organizationId);
    const quarantineRecord = quarantine.sources.find(item => item.source === source);
    if (quarantineRecord?.quarantined) {
      const error = new Error(`Provider source is quarantined: ${quarantineRecord.reason || "operator hold"}`);
      error.statusCode = 423;
      throw error;
    }
    const actor = `webhook:${source}`;
    let event;
    if (binding.adapterId) {
      event = await this.ingestAdapterEvent(organizationId, actor, binding.adapterId, { connectorId: source, event: body });
    } else {
      event = await this.ingestEvent(organizationId, actor, { ...body, source: body.source || source });
    }
    const receipt = { organizationId, source, eventId: event.id, duplicate: !!event.duplicate, verified: true, verificationKey, receivedAt: new Date().toISOString(), adapterId: binding.adapterId || null };
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

  async recordWebhookFailure(organizationId, source, error) {
    const receipt = { organizationId, source, eventId: null, duplicate: false, verified: false, verificationKey: null, receivedAt: new Date().toISOString(), error: String(error?.message || error || "Webhook rejected") };
    await this.database.mutate(db => { db.liveWebhookIngress ||= []; db.liveWebhookIngress.unshift(receipt); db.liveWebhookIngress = db.liveWebhookIngress.slice(0, 1000); return receipt; });
    this.realtimeHub.publish("live-webhook-ingress", receipt);
    return receipt;
  }

  async webhookReceiptLedger(organizationId, limit = 200) {
    const db = await this.database.read();
    const receipts = (db.liveWebhookIngress || []).filter(item => item.organizationId === organizationId).slice(0, Math.max(1, Math.min(1000, Number(limit) || 200)));
    const verified = receipts.filter(item => item.verified !== false).length;
    const rejected = receipts.filter(item => item.verified === false).length;
    const previousKey = receipts.filter(item => item.verificationKey === "previous").length;
    return { organizationId, receiptCount: receipts.length, verified, rejected, previousKey, status: rejected ? "watch" : receipts.length ? "controlled" : "awaiting-data", receipts, generatedAt: new Date().toISOString() };
  }

  async rotateConnectorSecret(organizationId, actor, input = {}) {
    const source = String(input.source || "").trim();
    const currentSecretEnv = String(input.currentSecretEnv || "").trim();
    const previousSecretEnv = String(input.previousSecretEnv || "").trim() || null;
    const graceMinutes = Math.max(0, Math.min(10080, Number(input.graceMinutes) || 0));
    if (!source || !currentSecretEnv) throw new Error("source and currentSecretEnv are required.");
    if (!/^[A-Z][A-Z0-9_]{2,127}$/.test(currentSecretEnv) || (previousSecretEnv && !/^[A-Z][A-Z0-9_]{2,127}$/.test(previousSecretEnv))) throw new Error("Secret environment names must be uppercase environment-variable names.");
    const db = await this.database.read();
    const key = `${organizationId}:${source}`;
    const existing = db.liveConnectorAuthBindings?.[key];
    if (!existing) throw new Error("Create the connector authentication binding before rotating its secret.");
    const rotationExpiresAt = previousSecretEnv && graceMinutes ? new Date(Date.now() + graceMinutes * 60000).toISOString() : null;
    const record = { ...existing, secretEnv: currentSecretEnv, previousSecretEnv, rotationExpiresAt, updatedAt: new Date().toISOString(), updatedBy: actor };
    await this.database.mutate(next => { next.liveConnectorAuthBindings ||= {}; next.liveConnectorAuthBindings[key] = record; return record; });
    await this.auditService.record({ organizationId, actor, action: `Webhook credential rotation updated: ${source}`, category: "live-integration" });
    return { ...record, secretAvailable: !!process.env[currentSecretEnv], previousSecretAvailable: previousSecretEnv ? !!process.env[previousSecretEnv] : false };
  }

  async providerLaunchCertification(organizationId, actor = null, persist = false) {
    const [readiness, ledger, evidence, reconciliation, pressure] = await Promise.all([this.connectionReadiness(organizationId), this.webhookReceiptLedger(organizationId, 250), this.liveEvidenceCertification(organizationId), this.streamReconciliation(organizationId), this.backpressureStatus(organizationId)]);
    const bindings = await this.connectorAuthBindings(organizationId);
    const expiredRotations = bindings.bindings.filter(item => item.previousSecretEnv && item.rotationExpiresAt && Date.now() > new Date(item.rotationExpiresAt).getTime());
    const controls = [
      { id:"provider-readiness", label:"Provider connection readiness", pass: readiness.score >= 80, detail:`${readiness.score}%` },
      { id:"verified-delivery", label:"Verified webhook delivery", pass: ledger.verified > 0 && ledger.rejected === 0, detail:`${ledger.verified} verified · ${ledger.rejected} rejected` },
      { id:"evidence", label:"Trusted live evidence", pass: !!evidence.trusted, detail:`${evidence.score}%` },
      { id:"reconciliation", label:"Stream reconciliation", pass: reconciliation.status !== "mismatch", detail:`${reconciliation.score}%` },
      { id:"backpressure", label:"Backpressure containment", pass: pressure.status !== "critical", detail:pressure.status },
      { id:"rotation", label:"Credential rotation hygiene", pass: expiredRotations.length === 0, detail:expiredRotations.length ? `${expiredRotations.length} expired grace window(s)` : "controlled" }
    ];
    const score = Math.round(controls.reduce((n,c)=>n+(c.pass?100:0),0)/controls.length);
    const blockers = controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const certificate = { id:`PLC-${Date.now().toString(36).toUpperCase()}`, organizationId, score, status:score===100?"certified":score>=67?"conditional":"blocked", blockers, controls, issuedAt:new Date().toISOString(), issuedBy:actor, build:"42.23.0-provider-launch-control" };
    if (persist) await this.database.mutate(db2 => { db2.providerLaunchCertification ||= {}; db2.providerLaunchCertification[organizationId]=certificate; return certificate; });
    return certificate;
  }


  async providerSlaStatus(organizationId) {
    const [connectors, ledger] = await Promise.all([this.listConnectors(organizationId), this.webhookReceiptLedger(organizationId, 1000)]);
    const db = await this.database.read();
    const policies = db.liveProviderSlaPolicies || {};
    const receipts = (ledger.receipts || []).filter(item => item.verified !== false);
    const rejected = (ledger.receipts || []).filter(item => item.verified === false);
    const now = Date.now();
    const sources = connectors.map(connector => {
      const key = `${organizationId}:${connector.id}`;
      const stored = policies[key] || {};
      const expectedIntervalSeconds = Math.max(30, Math.min(86400, Number(stored.expectedIntervalSeconds) || (connector.mode === "live" ? 300 : 900)));
      const warningMultiplier = Math.max(1.25, Math.min(10, Number(stored.warningMultiplier) || 2));
      const criticalMultiplier = Math.max(warningMultiplier, Math.min(20, Number(stored.criticalMultiplier) || 4));
      const latest = receipts.find(item => item.source === connector.id) || null;
      const recentRejects = rejected.filter(item => item.source === connector.id && now - new Date(item.receivedAt).getTime() <= expectedIntervalSeconds * criticalMultiplier * 1000).length;
      const ageSeconds = latest?.receivedAt ? Math.max(0, Math.round((now - new Date(latest.receivedAt).getTime()) / 1000)) : null;
      let status = "awaiting-data";
      if (ageSeconds != null) status = ageSeconds > expectedIntervalSeconds * criticalMultiplier ? "breach" : ageSeconds > expectedIntervalSeconds * warningMultiplier ? "watch" : "healthy";
      if (recentRejects >= 3 && status === "healthy") status = "watch";
      const score = status === "healthy" ? 100 : status === "watch" ? 70 : status === "awaiting-data" ? 40 : 20;
      return { source: connector.id, name: connector.name, mode: connector.mode, expectedIntervalSeconds, warningMultiplier, criticalMultiplier, ageSeconds, recentRejects, lastVerifiedAt: latest?.receivedAt || null, status, score, updatedAt: stored.updatedAt || null, updatedBy: stored.updatedBy || null };
    });
    const score = sources.length ? Math.round(sources.reduce((sum,item)=>sum+item.score,0)/sources.length) : 0;
    const breaches = sources.filter(item => item.status === "breach").length;
    return { organizationId, score, status: breaches ? "breach" : sources.some(item=>item.status==="watch") ? "watch" : sources.every(item=>item.status==="healthy") && sources.length ? "healthy" : "awaiting-data", breaches, sources, generatedAt: new Date().toISOString() };
  }

  async saveProviderSlaPolicy(organizationId, actor, input = {}) {
    const source = String(input.source || "").trim();
    if (!source) throw new Error("source is required.");
    const connectors = await this.listConnectors(organizationId);
    if (!connectors.some(item => item.id === source)) throw new Error(`Unknown connector: ${source}`);
    const expectedIntervalSeconds = Math.max(30, Math.min(86400, Number(input.expectedIntervalSeconds) || 300));
    const warningMultiplier = Math.max(1.25, Math.min(10, Number(input.warningMultiplier) || 2));
    const criticalMultiplier = Math.max(warningMultiplier, Math.min(20, Number(input.criticalMultiplier) || 4));
    const record = { organizationId, source, expectedIntervalSeconds, warningMultiplier, criticalMultiplier, updatedAt: new Date().toISOString(), updatedBy: actor };
    await this.database.mutate(db => { db.liveProviderSlaPolicies ||= {}; db.liveProviderSlaPolicies[`${organizationId}:${source}`] = record; return record; });
    await this.auditService.record({ organizationId, actor, action: `Provider SLA policy updated: ${source}`, category: "live-integration" });
    this.realtimeHub.publish("live-provider-sla-policy", record);
    return record;
  }

  async providerQuarantineStatus(organizationId) {
    const connectors = await this.listConnectors(organizationId);
    const db = await this.database.read();
    const records = db.liveProviderQuarantine || {};
    const sources = connectors.map(connector => {
      const record = records[`${organizationId}:${connector.id}`] || {};
      return { source: connector.id, name: connector.name, quarantined: !!record.quarantined, reason: record.reason || null, since: record.since || null, updatedAt: record.updatedAt || null, updatedBy: record.updatedBy || null };
    });
    return { organizationId, quarantined: sources.filter(item=>item.quarantined).length, status: sources.some(item=>item.quarantined) ? "contained" : "clear", sources, generatedAt: new Date().toISOString() };
  }

  async setProviderQuarantine(organizationId, actor, input = {}) {
    const source = String(input.source || "").trim();
    if (!source) throw new Error("source is required.");
    const connectors = await this.listConnectors(organizationId);
    if (!connectors.some(item => item.id === source)) throw new Error(`Unknown connector: ${source}`);
    const quarantined = input.quarantined !== false;
    const reason = quarantined ? String(input.reason || "Operator hold").trim().slice(0, 240) : null;
    const record = { organizationId, source, quarantined, reason, since: quarantined ? new Date().toISOString() : null, updatedAt: new Date().toISOString(), updatedBy: actor };
    await this.database.mutate(db => { db.liveProviderQuarantine ||= {}; db.liveProviderQuarantine[`${organizationId}:${source}`] = record; return record; });
    await this.auditService.record({ organizationId, actor, action: `${quarantined ? "Provider quarantined" : "Provider resumed"}: ${source}${reason ? ` · ${reason}` : ""}`, category: "live-integration" });
    this.realtimeHub.publish("live-provider-quarantine", record);
    return record;
  }

  async providerOperationsGate(organizationId, actor = null, persist = false) {
    const [launch, sla, quarantine, evidence, readiness] = await Promise.all([
      this.providerLaunchCertification(organizationId), this.providerSlaStatus(organizationId), this.providerQuarantineStatus(organizationId), this.liveEvidenceCertification(organizationId), this.connectionReadiness(organizationId)
    ]);
    const controls = [
      { id:"launch-certification", label:"Provider launch certification", pass: launch.status === "certified", detail:`${launch.score}% · ${launch.status}` },
      { id:"delivery-sla", label:"Provider delivery SLA", pass: sla.status !== "breach" && sla.score >= 70, detail:`${sla.score}% · ${sla.status}` },
      { id:"quarantine", label:"Provider quarantine", pass: quarantine.quarantined === 0, detail:quarantine.quarantined ? `${quarantine.quarantined} source(s) quarantined` : "clear" },
      { id:"live-evidence", label:"Trusted live evidence", pass: !!evidence.trusted, detail:`${evidence.score}% · ${evidence.status}` },
      { id:"connection-readiness", label:"Connection readiness", pass: readiness.score >= 80, detail:`${readiness.score}% · ${readiness.status}` }
    ];
    const score = Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers = controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const gate = { id:`POG-${Date.now().toString(36).toUpperCase()}`, organizationId, score, status: score===100 ? "operational" : score>=60 ? "conditional" : "blocked", trusted: score===100, blockers, controls, issuedAt:new Date().toISOString(), issuedBy:actor, build:"42.26.0-provider-continuity" };
    if (persist) await this.database.mutate(db => { db.providerOperationsGate ||= {}; db.providerOperationsGate[organizationId] = gate; return gate; });
    return gate;
  }


  async providerIncidentLedger(organizationId, actor = null, input = null) {
    if (input && input.action === "record") {
      const source = String(input.source || "").trim();
      const summary = String(input.summary || "Provider continuity incident").trim().slice(0, 240);
      const severity = ["watch","major","critical"].includes(input.severity) ? input.severity : "watch";
      if (!source) throw new Error("source is required.");
      const connectors = await this.listConnectors(organizationId);
      if (!connectors.some(item => item.id === source)) throw new Error(`Unknown connector: ${source}`);
      const record = { id:`PINC-${Date.now().toString(36).toUpperCase()}`, organizationId, source, summary, severity, status:"open", openedAt:new Date().toISOString(), openedBy:actor || "system", resolvedAt:null, resolvedBy:null };
      await this.database.mutate(db => { db.liveProviderIncidents ||= []; db.liveProviderIncidents.unshift(record); db.liveProviderIncidents = db.liveProviderIncidents.slice(0,1000); return record; });
      await this.auditService.record({ organizationId, actor:actor||"system", action:`Provider incident opened: ${source} · ${severity} · ${summary}`, category:"live-integration" });
      this.realtimeHub.publish("live-provider-incident", record);
    }
    if (input && input.action === "resolve") {
      const id=String(input.id||"").trim();
      if (!id) throw new Error("incident id is required.");
      await this.database.mutate(db => { db.liveProviderIncidents ||= []; const record=db.liveProviderIncidents.find(item=>item.organizationId===organizationId&&item.id===id); if(!record) return null; record.status="resolved"; record.resolvedAt=new Date().toISOString(); record.resolvedBy=actor||"system"; return record; });
      await this.auditService.record({ organizationId, actor:actor||"system", action:`Provider incident resolved: ${id}`, category:"live-integration" });
    }
    const [sla, quarantine] = await Promise.all([this.providerSlaStatus(organizationId), this.providerQuarantineStatus(organizationId)]);
    const db=await this.database.read();
    let incidents=(db.liveProviderIncidents||[]).filter(item=>item.organizationId===organizationId);
    const openKeys=new Set(incidents.filter(i=>i.status==="open").map(i=>`${i.source}:${i.summary}`));
    const generated=[];
    for (const source of (sla.sources||[])) {
      if (source.status === "breach") {
        const summary="Provider delivery SLA breach"; const key=`${source.source}:${summary}`;
        if (!openKeys.has(key)) generated.push({source:source.source, summary, severity:"major"});
      }
    }
    for (const source of (quarantine.sources||[])) {
      if (source.quarantined) { const summary="Provider quarantined"; const key=`${source.source}:${summary}`; if(!openKeys.has(key)) generated.push({source:source.source, summary, severity:"critical"}); }
    }
    if (generated.length) {
      await this.database.mutate(db2 => { db2.liveProviderIncidents ||= []; for(const g of generated){db2.liveProviderIncidents.unshift({id:`PINC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5)}`,organizationId,...g,status:"open",openedAt:new Date().toISOString(),openedBy:"system",resolvedAt:null,resolvedBy:null});} db2.liveProviderIncidents=db2.liveProviderIncidents.slice(0,1000); });
      const db3=await this.database.read(); incidents=(db3.liveProviderIncidents||[]).filter(item=>item.organizationId===organizationId);
    }
    const open=incidents.filter(i=>i.status==="open");
    const critical=open.filter(i=>i.severity==="critical").length;
    return { organizationId, count:incidents.length, open:open.length, critical, status:critical?"critical":open.length?"watch":"clear", incidents:incidents.slice(0,200), generatedAt:new Date().toISOString() };
  }

  async providerFailoverPlan(organizationId, actor = null, input = null) {
    if (input && input.action === "save") {
      const primary=String(input.primary||"").trim(), standby=String(input.standby||"").trim();
      if (!primary || !standby || primary===standby) throw new Error("Distinct primary and standby connector IDs are required.");
      const connectors=await this.listConnectors(organizationId);
      if(!connectors.some(i=>i.id===primary) || !connectors.some(i=>i.id===standby)) throw new Error("Both failover connectors must exist.");
      const record={organizationId,primary,standby,mode:input.mode==="manual"?"manual":"approval-required",updatedAt:new Date().toISOString(),updatedBy:actor||"system"};
      await this.database.mutate(db=>{db.liveProviderFailoverPlans||={};db.liveProviderFailoverPlans[`${organizationId}:${primary}`]=record;return record;});
      await this.auditService.record({organizationId,actor:actor||"system",action:`Provider failover plan saved: ${primary} -> ${standby}`,category:"live-integration"});
    }
    const [connectors, readiness, sla, quarantine] = await Promise.all([this.listConnectors(organizationId),this.connectionReadiness(organizationId),this.providerSlaStatus(organizationId),this.providerQuarantineStatus(organizationId)]);
    const db=await this.database.read(); const plans=Object.values(db.liveProviderFailoverPlans||{}).filter(i=>i.organizationId===organizationId);
    const readyMap=new Map((readiness.sources||[]).map(i=>[i.source,i])); const slaMap=new Map((sla.sources||[]).map(i=>[i.source,i])); const qMap=new Map((quarantine.sources||[]).map(i=>[i.source,i]));
    const rows=plans.map(plan=>{const p=connectors.find(i=>i.id===plan.primary),s=connectors.find(i=>i.id===plan.standby);const blockers=[];if(!p)blockers.push("Primary connector missing.");if(!s)blockers.push("Standby connector missing.");if((readyMap.get(plan.standby)?.score||0)<60)blockers.push("Standby connection readiness is below 60%.");if(["breach","awaiting-data"].includes(slaMap.get(plan.standby)?.status))blockers.push("Standby delivery SLA is not healthy enough.");if(qMap.get(plan.standby)?.quarantined)blockers.push("Standby provider is quarantined.");return {...plan,primaryName:p?.name||plan.primary,standbyName:s?.name||plan.standby,score:Math.max(0,100-blockers.length*25),status:blockers.length?"conditional":"ready",blockers};});
    const score=rows.length?Math.round(rows.reduce((a,b)=>a+b.score,0)/rows.length):0;
    return {organizationId,score,status:rows.length?(rows.every(i=>i.status==="ready")?"ready":"conditional"):"not-configured",plans:rows,generatedAt:new Date().toISOString()};
  }

  async providerContinuityCertification(organizationId, actor = null, persist = false) {
    const [operations, incidents, failover, reconciliation, evidence] = await Promise.all([
      this.providerOperationsGate(organizationId), this.providerIncidentLedger(organizationId), this.providerFailoverPlan(organizationId), this.streamReconciliation(organizationId), this.liveEvidenceCertification(organizationId)
    ]);
    const controls=[
      {id:"operations-gate",label:"Provider operations gate",pass:operations.trusted===true,detail:`${operations.score}% · ${operations.status}`},
      {id:"incidents",label:"Open provider incidents",pass:incidents.open===0,detail:incidents.open?`${incidents.open} open · ${incidents.critical} critical`:"clear"},
      {id:"failover",label:"Failover readiness",pass:failover.status==="ready"&&failover.score>=80,detail:`${failover.score}% · ${failover.status}`},
      {id:"reconciliation",label:"Stream reconciliation",pass:reconciliation.score>=80,detail:`${reconciliation.score}% · ${reconciliation.status}`},
      {id:"evidence",label:"Live evidence certification",pass:evidence.trusted===true,detail:`${evidence.score}% · ${evidence.status}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length); const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`PCC-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"continuity-certified":score>=60?"conditional":"blocked",trusted:score===100,blockers,controls,issuedAt:new Date().toISOString(),issuedBy:actor,build:"42.38.0-enterprise-pilot-cutover"};
    if(persist) await this.database.mutate(db=>{db.providerContinuityCertification||={};db.providerContinuityCertification[organizationId]=cert;return cert;});
    return cert;
  }


  async providerRecoveryDrill(organizationId, actor = null, input = null) {
    const [failover, incidents, sla, quarantine, evidence] = await Promise.all([
      this.providerFailoverPlan(organizationId),
      this.providerIncidentLedger(organizationId),
      this.providerSlaStatus(organizationId),
      this.providerQuarantineStatus(organizationId),
      this.liveEvidenceCertification(organizationId)
    ]);
    const requestedPrimary = String(input?.primary || "").trim();
    const plan = (failover.plans || []).find(item => !requestedPrimary || item.primary === requestedPrimary) || (failover.plans || [])[0] || null;
    const controls = [
      { id:"plan", label:"Failover plan available", pass:!!plan, detail:plan ? `${plan.primaryName} -> ${plan.standbyName}` : "no configured plan" },
      { id:"standby", label:"Standby provider readiness", pass:!!plan && plan.status==="ready" && plan.score>=80, detail:plan ? `${plan.score}% · ${plan.status}` : "not available" },
      { id:"incidents", label:"Critical incident containment", pass:incidents.critical===0, detail:incidents.critical ? `${incidents.critical} critical incident(s)` : "controlled" },
      { id:"sla", label:"Delivery SLA condition", pass:sla.status!=="breach", detail:`${sla.score}% · ${sla.status}` },
      { id:"quarantine", label:"Quarantine state", pass:quarantine.quarantined===0 || (plan && !(quarantine.sources||[]).find(x=>x.source===plan.standby)?.quarantined), detail:quarantine.quarantined ? `${quarantine.quarantined} source(s) quarantined` : "clear" },
      { id:"evidence", label:"Trusted live evidence", pass:evidence.trusted===true, detail:`${evidence.score}% · ${evidence.status}` }
    ];
    const score = Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers = controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const drill = {
      id:`PRD-${Date.now().toString(36).toUpperCase()}`, organizationId,
      primary:plan?.primary||requestedPrimary||null, standby:plan?.standby||null,
      score, status:score===100?"rehearsed":score>=67?"conditional":"blocked",
      blockers, controls, simulated:true, executed:false,
      note:String(input?.note||"").trim().slice(0,500),
      runAt:new Date().toISOString(), runBy:actor||null, build:"42.38.0-enterprise-pilot-cutover"
    };
    if (input?.persist) {
      await this.database.mutate(db=>{db.providerRecoveryDrills ||= []; db.providerRecoveryDrills.unshift(drill); db.providerRecoveryDrills=db.providerRecoveryDrills.slice(0,500); return drill;});
      await this.auditService.record({organizationId,actor:actor||"system",action:`Provider recovery drill: ${drill.status} · ${drill.primary||"unassigned"} -> ${drill.standby||"unassigned"}`,category:"live-integration"});
    }
    return drill;
  }

  async providerContinuityTelemetry(organizationId) {
    const [incidents, sla, quarantine, continuity, receipts, failover] = await Promise.all([
      this.providerIncidentLedger(organizationId),
      this.providerSlaStatus(organizationId),
      this.providerQuarantineStatus(organizationId),
      this.providerContinuityCertification(organizationId),
      this.webhookReceiptLedger(organizationId, 500),
      this.providerFailoverPlan(organizationId)
    ]);
    const db = await this.database.read();
    const drills = (db.providerRecoveryDrills || []).filter(item=>item.organizationId===organizationId);
    const cutoff = Date.now() - 24*60*60*1000;
    const recentIncidents = (incidents.incidents||[]).filter(i=>new Date(i.openedAt).getTime()>=cutoff);
    const recentDrills = drills.filter(i=>new Date(i.runAt).getTime()>=cutoff);
    const verifiedRatio = receipts.receiptCount ? Math.round((receipts.verified/receipts.receiptCount)*100) : 0;
    const scoreParts = [
      Math.max(0,100-(incidents.open*15)-(incidents.critical*25)),
      sla.score||0,
      continuity.score||0,
      failover.score||0,
      verifiedRatio
    ];
    const score = Math.round(scoreParts.reduce((a,b)=>a+b,0)/scoreParts.length);
    return {
      organizationId, score,
      status:score>=90?"stable":score>=70?"watch":"degraded",
      incidents24h:recentIncidents.length, openIncidents:incidents.open, criticalIncidents:incidents.critical,
      quarantinedSources:quarantine.quarantined, slaScore:sla.score, continuityScore:continuity.score,
      verifiedWebhookRatio:verifiedRatio, recoveryDrills24h:recentDrills.length,
      latestDrill:drills[0]||null, generatedAt:new Date().toISOString()
    };
  }

  async v42ReleaseCertification(organizationId, actor = null, persist = false) {
    const [continuity, operations, evidence, reconciliation, telemetry, drill] = await Promise.all([
      this.providerContinuityCertification(organizationId),
      this.providerOperationsGate(organizationId),
      this.liveEvidenceCertification(organizationId),
      this.streamReconciliation(organizationId),
      this.providerContinuityTelemetry(organizationId),
      this.providerRecoveryDrill(organizationId, actor, {})
    ]);
    const controls = [
      {id:"continuity",label:"Provider continuity certification",pass:continuity.trusted===true,detail:`${continuity.score}% · ${continuity.status}`},
      {id:"operations",label:"Provider operations gate",pass:operations.trusted===true,detail:`${operations.score}% · ${operations.status}`},
      {id:"evidence",label:"Live evidence certification",pass:evidence.trusted===true,detail:`${evidence.score}% · ${evidence.status}`},
      {id:"reconciliation",label:"Stream reconciliation",pass:reconciliation.score>=80 && reconciliation.status!=="mismatch",detail:`${reconciliation.score}% · ${reconciliation.status}`},
      {id:"telemetry",label:"Continuity telemetry",pass:telemetry.score>=80 && telemetry.status!=="degraded",detail:`${telemetry.score}% · ${telemetry.status}`},
      {id:"recovery-drill",label:"Provider recovery rehearsal",pass:drill.score>=80 && drill.status!=="blocked",detail:`${drill.score}% · ${drill.status}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`V42C-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"v42-complete":score>=67?"conditional":"blocked",trusted:score===100,blockers,controls,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.38.0-enterprise-pilot-cutover"};
    if(persist) await this.database.mutate(db=>{db.v42ReleaseCertification||={};db.v42ReleaseCertification[organizationId]=cert;return cert;});
    return cert;
  }

  async locationSourceBindings(organizationId, actor = null, input = null) {
    if (input && input.action === "save") {
      const locationId = String(input.locationId || "").trim(); const domain = String(input.domain || "").trim().toLowerCase(); const source = String(input.source || "").trim(); const role = input.role === "standby" ? "standby" : "primary";
      const requiredDomains = new Set(["pos","reservations","kitchen","labor","inventory"]);
      if (!locationId || !source || !requiredDomains.has(domain)) throw new Error("locationId, source, and a supported domain are required.");
      const connectors = await this.listConnectors(organizationId); if (!connectors.some(item => item.id === source)) throw new Error(`Unknown connector: ${source}`);
      const record = { organizationId, locationId, domain, source, role, enabled: input.enabled !== false, updatedAt:new Date().toISOString(), updatedBy:actor||"system" };
      await this.database.mutate(db => { db.liveLocationSourceBindings ||= []; const idx = db.liveLocationSourceBindings.findIndex(item => item.organizationId===organizationId && item.locationId===locationId && item.domain===domain && item.role===role); if (idx >= 0) db.liveLocationSourceBindings[idx] = record; else db.liveLocationSourceBindings.push(record); return record; });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Live source binding saved: ${locationId} · ${domain} · ${role} -> ${source}`,category:"live-integration"});
    }
    const db = await this.database.read(); const locations = (db.locations || []).filter(item => !item.organizationId || item.organizationId===organizationId); const fallbackLocations = locations.length ? locations : [{id:"primary-location",name:"Primary Location"}]; const bindings = (db.liveLocationSourceBindings || []).filter(item => item.organizationId===organizationId);
    return { organizationId, locations:fallbackLocations.map(item=>({id:item.id,name:item.name||item.id})), bindings, domains:["pos","reservations","kitchen","labor","inventory"], generatedAt:new Date().toISOString() };
  }

  async liveCoverageMatrix(organizationId) {
    const [bindingState, connectors, operations, evidence] = await Promise.all([this.locationSourceBindings(organizationId),this.listConnectors(organizationId),this.providerOperationsGate(organizationId),this.liveEvidenceCertification(organizationId)]);
    const required = ["pos","reservations","kitchen","labor"]; const connectorMap = new Map(connectors.map(item=>[item.id,item]));
    const rows = (bindingState.locations||[]).map(location => { const domains = required.map(domain => { const candidates=(bindingState.bindings||[]).filter(b=>b.locationId===location.id&&b.domain===domain&&b.enabled); const primary=candidates.find(b=>b.role==="primary")||candidates[0]||null; const standby=candidates.find(b=>b.role==="standby")||null; const provider=primary?connectorMap.get(primary.source):null; const pass=!!primary && !!provider && !["not-configured","error"].includes(provider.status); return {domain,pass,primary:primary?.source||null,standby:standby?.source||null,status:pass?"covered":"missing"}; }); const covered=domains.filter(d=>d.pass).length; const score=Math.round(covered/required.length*100); return {locationId:location.id,locationName:location.name,score,status:score===100?"covered":score>=50?"partial":"uncovered",covered,required:required.length,domains}; });
    const score=rows.length?Math.round(rows.reduce((a,b)=>a+b.score,0)/rows.length):0; return {organizationId,score,status:score===100&&operations.trusted&&evidence.trusted?"ready":score>=60?"conditional":"blocked",operationsTrusted:!!operations.trusted,evidenceTrusted:!!evidence.trusted,locations:rows,generatedAt:new Date().toISOString()};
  }

  async enterpriseLiveReadiness(organizationId, actor = null, persist = false) {
    const [release, coverage, continuity, twin] = await Promise.all([this.v42ReleaseCertification(organizationId),this.liveCoverageMatrix(organizationId),this.providerContinuityCertification(organizationId),this.twinSyncStatus(organizationId)]);
    const controls=[{id:"v42-release",label:"V42 live operations release",pass:release.trusted===true,detail:`${release.score}% · ${release.status}`},{id:"coverage",label:"Location source coverage",pass:coverage.score===100,detail:`${coverage.score}% · ${coverage.status}`},{id:"continuity",label:"Provider continuity",pass:continuity.trusted===true,detail:`${continuity.score}% · ${continuity.status}`},{id:"live-twin",label:"Trusted operational twin",pass:twin.trusted===true,detail:`${twin.score||0}% · ${twin.status||"unknown"}`}];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length); const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`); const cert={id:`ELR-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"enterprise-live-ready":score>=50?"conditional":"blocked",trusted:score===100,blockers,controls,locationCount:(coverage.locations||[]).length,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.38.0-enterprise-pilot-cutover"}; if(persist) await this.database.mutate(db=>{db.enterpriseLiveReadiness||={};db.enterpriseLiveReadiness[organizationId]=cert;return cert;}); return cert;
  }


  async locationCutoverControl(organizationId, actor = null, input = null) {
    const coverage = await this.liveCoverageMatrix(organizationId);
    const connectors = await this.listConnectors(organizationId);
    const evidence = await this.liveEvidenceCertification(organizationId);
    const db = await this.database.read();
    const stored = (db.liveLocationCutovers || []).filter(item => item.organizationId === organizationId);
    const connectorMap = new Map(connectors.map(item => [item.id, item]));

    const evaluateLocation = (location) => {
      const cutover = stored.find(item => item.locationId === location.locationId) || null;
      const primarySources = (location.domains || []).map(item => item.primary).filter(Boolean);
      const healthySources = primarySources.filter(id => {
        const connector = connectorMap.get(id);
        return connector && !["not-configured", "error", "quarantined"].includes(connector.status);
      });
      const controls = [
        { id:"coverage", label:"Required live-domain coverage", pass:location.score === 100, detail:`${location.score}% · ${location.covered}/${location.required}` },
        { id:"sources", label:"Primary source health", pass:primarySources.length >= location.required && healthySources.length === primarySources.length, detail:`${healthySources.length}/${primarySources.length || location.required} healthy` },
        { id:"evidence", label:"Trusted live evidence", pass:evidence.trusted === true, detail:`${evidence.score || 0}% · ${evidence.status || "unknown"}` }
      ];
      const score = Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
      return { locationId:location.locationId, locationName:location.locationName, stage:cutover?.stage || "sandbox", owner:cutover?.owner || null, note:cutover?.note || null, updatedAt:cutover?.updatedAt || null, score, readyForPilot:location.score >= 75 && primarySources.length >= 3, readyForLive:controls.every(c=>c.pass), controls };
    };

    if (input && input.action === "promote") {
      const locationId = String(input.locationId || "").trim();
      const requestedStage = ["sandbox","pilot","live"].includes(input.stage) ? input.stage : "sandbox";
      const location = (coverage.locations || []).find(item => item.locationId === locationId);
      if (!location) throw new Error("Unknown location.");
      const evaluation = evaluateLocation(location);
      if (requestedStage === "pilot" && !evaluation.readyForPilot) throw new Error("Location is not ready for pilot cutover.");
      if (requestedStage === "live" && !evaluation.readyForLive) throw new Error("Location is not ready for live cutover.");
      const record = { organizationId, locationId, stage:requestedStage, owner:actor || "system", note:String(input.note || "").trim(), updatedAt:new Date().toISOString() };
      await this.database.mutate(db2 => { db2.liveLocationCutovers ||= []; const idx=db2.liveLocationCutovers.findIndex(item=>item.organizationId===organizationId&&item.locationId===locationId); if(idx>=0) db2.liveLocationCutovers[idx]=record; else db2.liveLocationCutovers.push(record); return record; });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Live location cutover: ${locationId} -> ${requestedStage}`,category:"live-integration"});
      return this.locationCutoverControl(organizationId);
    }

    return { organizationId, evidenceTrusted:!!evidence.trusted, locations:(coverage.locations || []).map(evaluateLocation), generatedAt:new Date().toISOString() };
  }

  async portfolioLiveTelemetry(organizationId) {
    const [coverage, cutover, readiness, status] = await Promise.all([
      this.liveCoverageMatrix(organizationId),
      this.locationCutoverControl(organizationId),
      this.enterpriseLiveReadiness(organizationId),
      this.status(organizationId)
    ]);
    const rows = (coverage.locations || []).map(location => {
      const state = (cutover.locations || []).find(item => item.locationId === location.locationId) || {};
      const stageWeight = state.stage === "live" ? 100 : state.stage === "pilot" ? 70 : 30;
      const score = Math.round((location.score * 0.6) + (stageWeight * 0.25) + ((state.readyForLive ? 100 : state.readyForPilot ? 70 : 30) * 0.15));
      return { locationId:location.locationId, locationName:location.locationName, coverageScore:location.score, cutoverStage:state.stage || "sandbox", readinessScore:state.score || 0, score, status:score>=90?"operational":score>=65?"pilot-ready":"building" };
    });
    const score = rows.length ? Math.round(rows.reduce((sum,row)=>sum+row.score,0)/rows.length) : 0;
    return { organizationId, score, status:score>=90&&readiness.trusted?"healthy":score>=65?"controlled":"building", enterpriseTrusted:!!readiness.trusted, connectorCount:status.connectorCount||0, events15m:status.events15m||0, locations:rows, generatedAt:new Date().toISOString() };
  }

  async enterprisePilotCutoverCertification(organizationId, actor = null, persist = false) {
    const [release, readiness, telemetry, cutover] = await Promise.all([
      this.v42ReleaseCertification(organizationId),
      this.enterpriseLiveReadiness(organizationId),
      this.portfolioLiveTelemetry(organizationId),
      this.locationCutoverControl(organizationId)
    ]);
    const locations = cutover.locations || [];
    const pilotOrLive = locations.filter(item => ["pilot","live"].includes(item.stage)).length;
    const controls = [
      { id:"v42-release", label:"V42 live-operations release", pass:release.trusted===true, detail:`${release.score||0}% · ${release.status||"unknown"}` },
      { id:"enterprise-readiness", label:"Enterprise live readiness", pass:readiness.trusted===true, detail:`${readiness.score||0}% · ${readiness.status||"unknown"}` },
      { id:"portfolio-telemetry", label:"Portfolio live telemetry", pass:telemetry.score>=80, detail:`${telemetry.score||0}% · ${telemetry.status||"unknown"}` },
      { id:"location-cutover", label:"Location pilot cutover", pass:locations.length>0 && pilotOrLive===locations.length, detail:`${pilotOrLive}/${locations.length} locations at pilot/live` }
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`EPC-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"pilot-certified":score>=50?"conditional":"blocked",trusted:score===100,blockers,controls,locationCount:locations.length,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.38.0-enterprise-pilot-cutover"};
    if(persist) await this.database.mutate(db=>{db.enterprisePilotCutoverCertification||={};db.enterprisePilotCutoverCertification[organizationId]=cert;return cert;});
    return cert;
  }

  async pilotSessions(organizationId, actor = null, input = null) {
    const db = await this.database.read();
    const sessions = (db.livePilotSessions || []).filter(item => item.organizationId === organizationId);
    const cutover = await this.locationCutoverControl(organizationId);
    const eligible = (cutover.locations || []).filter(item => ["pilot","live"].includes(item.stage));

    if (input && input.action === "start") {
      const locationId = String(input.locationId || "").trim();
      const location = eligible.find(item => item.locationId === locationId);
      if (!location) throw new Error("Location must be at pilot or live cutover stage before a pilot session can start.");
      const active = sessions.find(item => item.locationId === locationId && item.status === "active");
      if (active) throw new Error("An active pilot session already exists for this location.");
      const status = await this.status(organizationId);
      const session = {
        id:`LPS-${Date.now().toString(36).toUpperCase()}`, organizationId, locationId,
        locationName:location.locationName, status:"active", cutoverStage:location.stage,
        owner:actor || "system", note:String(input.note || "").trim().slice(0,500),
        startedAt:new Date().toISOString(), endedAt:null,
        baseline:{ events15m:status.events15m || 0, lastEventAt:status.lastEventAt || null, evidenceTrusted:!!cutover.evidenceTrusted },
        build:"42.41.0-pilot-runtime-mvp-readiness"
      };
      await this.database.mutate(db2 => { db2.livePilotSessions ||= []; db2.livePilotSessions.unshift(session); db2.livePilotSessions=db2.livePilotSessions.slice(0,1000); return session; });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Live pilot session started: ${locationId}`,category:"live-integration"});
      return this.pilotSessions(organizationId);
    }

    if (input && ["complete","abort"].includes(input.action)) {
      const sessionId = String(input.sessionId || "").trim();
      const target = sessions.find(item => item.id === sessionId && item.status === "active");
      if (!target) throw new Error("Active pilot session not found.");
      const nextStatus = input.action === "complete" ? "completed" : "aborted";
      await this.database.mutate(db2 => { const item=(db2.livePilotSessions||[]).find(x=>x.id===sessionId&&x.organizationId===organizationId); if(!item) throw new Error("Pilot session not found."); item.status=nextStatus; item.endedAt=new Date().toISOString(); item.completedBy=actor||"system"; item.completionNote=String(input.note||"").trim().slice(0,500); return item; });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Live pilot session ${nextStatus}: ${sessionId}`,category:"live-integration"});
      return this.pilotSessions(organizationId);
    }

    const fresh = await this.database.read();
    const rows = (fresh.livePilotSessions || []).filter(item => item.organizationId === organizationId).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
    return { organizationId, sessions:rows, active:rows.filter(x=>x.status==="active").length, completed:rows.filter(x=>x.status==="completed").length, eligibleLocations:eligible.map(x=>({locationId:x.locationId,locationName:x.locationName,stage:x.stage})), generatedAt:new Date().toISOString() };
  }

  async pilotSignalValidation(organizationId) {
    const [sessions, cutover, coverage, telemetry, evidence, status] = await Promise.all([
      this.pilotSessions(organizationId), this.locationCutoverControl(organizationId), this.liveCoverageMatrix(organizationId),
      this.portfolioLiveTelemetry(organizationId), this.liveEvidenceCertification(organizationId), this.status(organizationId)
    ]);
    const active = (sessions.sessions || []).filter(item => item.status === "active");
    const rows = active.map(session => {
      const locationCutover=(cutover.locations||[]).find(x=>x.locationId===session.locationId)||{};
      const locationCoverage=(coverage.locations||[]).find(x=>x.locationId===session.locationId)||{};
      const locationTelemetry=(telemetry.locations||[]).find(x=>x.locationId===session.locationId)||{};
      const controls=[
        {id:"stage",label:"Pilot/live cutover stage",pass:["pilot","live"].includes(locationCutover.stage),detail:locationCutover.stage||"sandbox"},
        {id:"coverage",label:"Required source coverage",pass:(locationCoverage.score||0)===100,detail:`${locationCoverage.score||0}%`},
        {id:"telemetry",label:"Location telemetry readiness",pass:(locationTelemetry.score||0)>=65,detail:`${locationTelemetry.score||0}% · ${locationTelemetry.status||"unknown"}`},
        {id:"evidence",label:"Trusted live evidence",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`},
        {id:"activity",label:"Recent live event activity",pass:(status.events15m||0)>0,detail:`${status.events15m||0} events · 15m`}
      ];
      const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
      return {sessionId:session.id,locationId:session.locationId,locationName:session.locationName,score,status:score===100?"validated":score>=60?"watch":"blocked",controls};
    });
    const score=rows.length?Math.round(rows.reduce((sum,row)=>sum+row.score,0)/rows.length):0;
    return {organizationId,score,status:rows.length===0?"awaiting-session":score===100?"validated":score>=60?"watch":"blocked",activeSessions:active.length,validatedSessions:rows.filter(x=>x.status==="validated").length,locations:rows,generatedAt:new Date().toISOString()};
  }

  async mvpReadinessCertification(organizationId, actor = null, persist = false) {
    const [release, pilot, signals, twin, sessions] = await Promise.all([
      this.v42ReleaseCertification(organizationId), this.enterprisePilotCutoverCertification(organizationId),
      this.pilotSignalValidation(organizationId), this.twinSyncStatus(organizationId), this.pilotSessions(organizationId)
    ]);
    const hasPilotEvidence=(sessions.active||0)+(sessions.completed||0)>0;
    const controls=[
      {id:"v42-release",label:"V42 live-operations release",pass:release.trusted===true,detail:`${release.score||0}% · ${release.status||"unknown"}`},
      {id:"enterprise-pilot",label:"Enterprise pilot cutover",pass:pilot.trusted===true,detail:`${pilot.score||0}% · ${pilot.status||"unknown"}`},
      {id:"pilot-session",label:"Pilot session evidence",pass:hasPilotEvidence,detail:`${sessions.active||0} active · ${sessions.completed||0} completed`},
      {id:"signal-validation",label:"Pilot signal validation",pass:signals.score>=80 && signals.status!=="blocked" && signals.status!=="awaiting-session",detail:`${signals.score||0}% · ${signals.status||"unknown"}`},
      {id:"live-twin",label:"Trusted Operational Twin",pass:twin.trusted===true,detail:`${twin.score||0}% · ${twin.status||"unknown"}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`MVP-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"first-mvp-ready":score>=60?"conditional":"blocked",trusted:score===100,blockers,controls,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.41.0-pilot-runtime-mvp-readiness"};
    if(persist) await this.database.mutate(db=>{db.mvpReadinessCertification||={};db.mvpReadinessCertification[organizationId]=cert;return cert;});
    return cert;
  }


  async pilotSlo(organizationId) {
    const [sessions, signals, status, evidence] = await Promise.all([
      this.pilotSessions(organizationId), this.pilotSignalValidation(organizationId), this.status(organizationId), this.liveEvidenceCertification(organizationId)
    ]);
    const active = (sessions.sessions || []).filter(item => item.status === "active");
    const signalPass = active.length > 0 && signals.score >= 80 && signals.status !== "blocked";
    const freshnessPass = (status.events15m || 0) > 0 && status.staleConnectors === 0;
    const deadLetterPass = (status.openDeadLetters || 0) === 0;
    const evidencePass = evidence.trusted === true;
    const controls = [
      {id:"active-session",label:"Active pilot session",pass:active.length>0,detail:`${active.length} active`},
      {id:"signal-quality",label:"Pilot signal quality",pass:signalPass,detail:`${signals.score||0}% · ${signals.status||"unknown"}`},
      {id:"freshness",label:"Live feed freshness",pass:freshnessPass,detail:`${status.events15m||0} events · 15m · ${status.staleConnectors||0} stale`},
      {id:"recovery",label:"Recovery backlog clear",pass:deadLetterPass,detail:`${status.openDeadLetters||0} open dead letters`},
      {id:"evidence",label:"Trusted live evidence",pass:evidencePass,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const violations=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    return {organizationId,score,status:score===100?"healthy":score>=60?"watch":"breach",activeSessions:active.length,violations,controls,generatedAt:new Date().toISOString()};
  }

  async pilotSupport(organizationId, actor = null, input = null) {
    const db = await this.database.read();
    const current = (db.livePilotSupportIssues || []).filter(item => item.organizationId === organizationId);
    if (input && input.action === "open") {
      const title=String(input.title||"").trim(); if(!title) throw new Error("Support issue title is required.");
      const severity=["watch","major","critical"].includes(input.severity)?input.severity:"watch";
      const issue={id:`PSI-${Date.now().toString(36).toUpperCase()}`,organizationId,locationId:String(input.locationId||"").trim()||null,title:title.slice(0,180),severity,note:String(input.note||"").trim().slice(0,800),status:"open",owner:actor||"system",openedAt:new Date().toISOString(),resolvedAt:null};
      await this.database.mutate(db2=>{db2.livePilotSupportIssues||=[];db2.livePilotSupportIssues.unshift(issue);db2.livePilotSupportIssues=db2.livePilotSupportIssues.slice(0,1000);return issue;});
      await this.auditService.record({organizationId,actor:actor||"system",action:`Pilot support issue opened: ${issue.id}`,category:"live-integration"});
      return this.pilotSupport(organizationId);
    }
    if (input && input.action === "resolve") {
      const id=String(input.id||"").trim(); if(!id) throw new Error("Support issue ID is required.");
      await this.database.mutate(db2=>{const item=(db2.livePilotSupportIssues||[]).find(x=>x.organizationId===organizationId&&x.id===id);if(!item)throw new Error("Pilot support issue not found.");item.status="resolved";item.resolvedAt=new Date().toISOString();item.resolvedBy=actor||"system";item.resolutionNote=String(input.note||"").trim().slice(0,800);return item;});
      await this.auditService.record({organizationId,actor:actor||"system",action:`Pilot support issue resolved: ${id}`,category:"live-integration"});
      return this.pilotSupport(organizationId);
    }
    const fresh=await this.database.read();
    const items=(fresh.livePilotSupportIssues||[]).filter(item=>item.organizationId===organizationId).sort((a,b)=>new Date(b.openedAt)-new Date(a.openedAt));
    const open=items.filter(x=>x.status==="open");
    return {organizationId,open:open.length,critical:open.filter(x=>x.severity==="critical").length,resolved:items.filter(x=>x.status==="resolved").length,status:open.some(x=>x.severity==="critical")?"critical":open.length?"watch":"clear",items,generatedAt:new Date().toISOString()};
  }

  async mvpGoLiveCertification(organizationId, actor = null, persist = false) {
    const [mvp, slo, support, sessions, evidence] = await Promise.all([
      this.mvpReadinessCertification(organizationId), this.pilotSlo(organizationId), this.pilotSupport(organizationId), this.pilotSessions(organizationId), this.liveEvidenceCertification(organizationId)
    ]);
    const completed=(sessions.sessions||[]).filter(x=>x.status==="completed").length;
    const controls=[
      {id:"mvp-readiness",label:"First MVP readiness",pass:mvp.trusted===true,detail:`${mvp.score||0}% · ${mvp.status||"unknown"}`},
      {id:"pilot-slo",label:"Pilot service level",pass:slo.score>=80&&slo.status!=="breach",detail:`${slo.score||0}% · ${slo.status||"unknown"}`},
      {id:"support",label:"Critical pilot issues clear",pass:(support.critical||0)===0,detail:`${support.open||0} open · ${support.critical||0} critical`},
      {id:"completed-pilot",label:"Completed pilot evidence",pass:completed>0,detail:`${completed} completed sessions`},
      {id:"live-evidence",label:"Trusted live evidence",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`MGL-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"mvp-go-live-ready":score>=60?"conditional":"blocked",trusted:score===100,blockers,controls,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.44.0-mvp-go-live-hardening"};
    if(persist) await this.database.mutate(db=>{db.mvpGoLiveCertification||={};db.mvpGoLiveCertification[organizationId]=cert;return cert;});
    return cert;
  }


  async productionRolloutPlan(organizationId, actor = null, input = null) {
    const db = await this.database.read();
    const current = (db.productionRolloutPlans || []).filter(item => item.organizationId === organizationId);
    if (input && input.action === "create") {
      const locationId = String(input.locationId || "").trim();
      if (!locationId) throw new Error("Location ID is required.");
      const cutover = await this.locationCutover(organizationId);
      const loc = (cutover.locations || []).find(item => item.locationId === locationId);
      if (!loc) throw new Error("Location is not available for production rollout.");
      const plan = {
        id:`PRP-${Date.now().toString(36).toUpperCase()}`, organizationId, locationId,
        locationName:loc.locationName || locationId, owner:actor || "system",
        window:String(input.window || "").trim().slice(0,120) || "Controlled service window",
        strategy:["canary","single-location","portfolio"].includes(input.strategy) ? input.strategy : "single-location",
        status:"draft", createdAt:new Date().toISOString(), approvedAt:null, completedAt:null,
        note:String(input.note || "").trim().slice(0,800)
      };
      await this.database.mutate(db2 => { db2.productionRolloutPlans ||= []; db2.productionRolloutPlans.unshift(plan); db2.productionRolloutPlans=db2.productionRolloutPlans.slice(0,500); return plan; });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Production rollout plan created: ${plan.id}`,category:"live-integration"});
      return this.productionRolloutPlan(organizationId);
    }
    if (input && ["approve","complete","cancel"].includes(input.action)) {
      const id=String(input.id||"").trim(); if(!id) throw new Error("Rollout plan ID is required.");
      await this.database.mutate(db2 => {
        const item=(db2.productionRolloutPlans||[]).find(x=>x.organizationId===organizationId&&x.id===id);
        if(!item) throw new Error("Rollout plan not found.");
        if(input.action==="approve"){ item.status="approved"; item.approvedAt=new Date().toISOString(); item.approvedBy=actor||"system"; }
        if(input.action==="complete"){ item.status="completed"; item.completedAt=new Date().toISOString(); item.completedBy=actor||"system"; }
        if(input.action==="cancel"){ item.status="cancelled"; item.cancelledAt=new Date().toISOString(); item.cancelledBy=actor||"system"; }
        return item;
      });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Production rollout plan ${input.action}: ${id}`,category:"live-integration"});
      return this.productionRolloutPlan(organizationId);
    }
    const fresh=await this.database.read();
    const items=(fresh.productionRolloutPlans||[]).filter(item=>item.organizationId===organizationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return {organizationId,total:items.length,draft:items.filter(x=>x.status==="draft").length,approved:items.filter(x=>x.status==="approved").length,completed:items.filter(x=>x.status==="completed").length,items,generatedAt:new Date().toISOString()};
  }

  async rollbackReadiness(organizationId) {
    const [plans, continuity, support, evidence] = await Promise.all([
      this.productionRolloutPlan(organizationId), this.providerContinuityCertification(organizationId),
      this.pilotSupport(organizationId), this.liveEvidenceCertification(organizationId)
    ]);
    const approved=(plans.items||[]).filter(x=>x.status==="approved");
    const controls=[
      {id:"approved-plan",label:"Approved production rollout",pass:approved.length>0,detail:`${approved.length} approved rollout plans`},
      {id:"provider-continuity",label:"Provider continuity",pass:continuity.trusted===true,detail:`${continuity.score||0}% · ${continuity.status||"unknown"}`},
      {id:"critical-support",label:"Critical support issues clear",pass:(support.critical||0)===0,detail:`${support.critical||0} critical issues`},
      {id:"trusted-evidence",label:"Trusted live evidence",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`},
      {id:"rollback-owner",label:"Named rollback ownership",pass:approved.every(x=>!!x.owner),detail:approved.length?`${approved.filter(x=>x.owner).length}/${approved.length} owned`:"No approved rollout"}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    return {organizationId,score,status:score===100?"rollback-ready":score>=60?"conditional":"blocked",trusted:score===100,approvedPlans:approved.length,blockers,controls,generatedAt:new Date().toISOString()};
  }

  async productionReleaseCertification(organizationId, actor = null, persist = false) {
    const [goLive, rollout, rollback, evidence, release] = await Promise.all([
      this.mvpGoLiveCertification(organizationId), this.productionRolloutPlan(organizationId),
      this.rollbackReadiness(organizationId), this.liveEvidenceCertification(organizationId), this.v42ReleaseCertification(organizationId)
    ]);
    const approved=(rollout.items||[]).filter(x=>x.status==="approved").length;
    const controls=[
      {id:"mvp-go-live",label:"MVP go-live readiness",pass:goLive.trusted===true,detail:`${goLive.score||0}% · ${goLive.status||"unknown"}`},
      {id:"rollout-plan",label:"Approved production rollout",pass:approved>0,detail:`${approved} approved plans`},
      {id:"rollback",label:"Rollback readiness",pass:rollback.trusted===true,detail:`${rollback.score||0}% · ${rollback.status||"unknown"}`},
      {id:"live-evidence",label:"Trusted live evidence",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`},
      {id:"v42-release",label:"V42 live operations release",pass:release.trusted===true,detail:`${release.score||0}% · ${release.status||"unknown"}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`PRC-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"production-release-ready":score>=60?"conditional":"blocked",trusted:score===100,blockers,controls,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.47.0-controlled-production-release"};
    if(persist) await this.database.mutate(db=>{db.productionReleaseCertification||={};db.productionReleaseCertification[organizationId]=cert;return cert;});
    return cert;
  }


  async productionObservationSessions(organizationId, actor = null, input = null) {
    if (input && input.action === "start") {
      const release = await this.productionReleaseCertification(organizationId);
      if (!release.trusted) throw new Error("Controlled production release must be trusted before starting production observation.");
      const rollout = await this.productionRolloutPlan(organizationId);
      const locationId = String(input.locationId || "").trim();
      const approved = (rollout.items || []).find(item => item.status === "approved" && (!locationId || item.locationId === locationId));
      if (!approved) throw new Error("An approved production rollout plan is required.");
      const evidence = await this.liveEvidenceCertification(organizationId);
      const snapshot = await this.operatingSnapshot(organizationId);
      const session = {
        id:`POS-${Date.now().toString(36).toUpperCase()}`, organizationId,
        locationId:approved.locationId, locationName:approved.locationName || approved.locationId,
        rolloutPlanId:approved.id, owner:actor || "system", status:"active",
        startedAt:new Date().toISOString(), completedAt:null, abortedAt:null,
        baseline:{evidenceScore:evidence.score||0,evidenceTrusted:!!evidence.trusted,recentEvents:snapshot.recentEvents||0,lastEventAt:snapshot.lastEventAt||null},
        note:String(input.note || "").trim().slice(0,800)
      };
      await this.database.mutate(db => { db.productionObservationSessions ||= []; db.productionObservationSessions.unshift(session); db.productionObservationSessions=db.productionObservationSessions.slice(0,500); return session; });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Production observation started: ${session.id}`,category:"live-integration"});
    }
    if (input && ["complete","abort"].includes(input.action)) {
      const id=String(input.id||"").trim(); if(!id) throw new Error("Observation session ID is required.");
      await this.database.mutate(db => {
        const item=(db.productionObservationSessions||[]).find(x=>x.organizationId===organizationId&&x.id===id);
        if(!item) throw new Error("Production observation session not found.");
        if(input.action==="complete"){item.status="completed";item.completedAt=new Date().toISOString();item.completedBy=actor||"system";}
        if(input.action==="abort"){item.status="aborted";item.abortedAt=new Date().toISOString();item.abortedBy=actor||"system";}
        item.closeNote=String(input.note||"").trim().slice(0,800); return item;
      });
      await this.auditService.record({organizationId,actor:actor||"system",action:`Production observation ${input.action}: ${id}`,category:"live-integration"});
    }
    const db=await this.database.read();
    const items=(db.productionObservationSessions||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
    return {organizationId,total:items.length,active:items.filter(x=>x.status==="active").length,completed:items.filter(x=>x.status==="completed").length,aborted:items.filter(x=>x.status==="aborted").length,items,generatedAt:new Date().toISOString()};
  }

  async productionHealthTelemetry(organizationId) {
    const [sessions, evidence, continuity, reconciliation, status] = await Promise.all([
      this.productionObservationSessions(organizationId), this.liveEvidenceCertification(organizationId),
      this.providerContinuityTelemetry(organizationId), this.streamReconciliation(organizationId), this.status(organizationId)
    ]);
    const active=(sessions.items||[]).filter(x=>x.status==="active");
    const completed=(sessions.items||[]).filter(x=>x.status==="completed");
    const controls=[
      {id:"production-session",label:"Production observation evidence",pass:active.length>0||completed.length>0,detail:`${active.length} active · ${completed.length} completed`},
      {id:"live-evidence",label:"Live evidence trust",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`},
      {id:"continuity",label:"Provider continuity",pass:(continuity.score||0)>=80,detail:`${continuity.score||0}% · ${continuity.status||"unknown"}`},
      {id:"reconciliation",label:"Stream reconciliation",pass:(reconciliation.score||0)>=90,detail:`${reconciliation.score||0}% · ${reconciliation.status||"unknown"}`},
      {id:"freshness",label:"Recent live source activity",pass:(status.events15m||0)>0,detail:`${status.events15m||0} events in 15m · ${status.staleConnectors||0} stale sources`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const violations=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    return {organizationId,score,status:score===100?"healthy":score>=60?"watch":"breach",trusted:score===100,activeSessions:active.length,completedSessions:completed.length,violations,controls,generatedAt:new Date().toISOString()};
  }

  async v42ClosureCertification(organizationId, actor = null, persist = false) {
    const [release, sessions, telemetry, evidence, reconciliation] = await Promise.all([
      this.productionReleaseCertification(organizationId), this.productionObservationSessions(organizationId),
      this.productionHealthTelemetry(organizationId), this.liveEvidenceCertification(organizationId), this.streamReconciliation(organizationId)
    ]);
    const completed=(sessions.items||[]).filter(x=>x.status==="completed").length;
    const controls=[
      {id:"production-release",label:"Controlled production release",pass:release.trusted===true,detail:`${release.score||0}% · ${release.status||"unknown"}`},
      {id:"production-evidence",label:"Completed production observation",pass:completed>0,detail:`${completed} completed sessions`},
      {id:"production-health",label:"Production health telemetry",pass:telemetry.score>=80&&telemetry.status!=="breach",detail:`${telemetry.score||0}% · ${telemetry.status||"unknown"}`},
      {id:"live-evidence",label:"Trusted live evidence",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`},
      {id:"reconciliation",label:"Reconciled live stream",pass:(reconciliation.score||0)>=90,detail:`${reconciliation.score||0}% · ${reconciliation.status||"unknown"}`}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const cert={id:`V42C-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"v42-complete":score>=60?"conditional":"blocked",trusted:score===100,blockers,controls,issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"42.50.0-production-closure"};
    if(persist) await this.database.mutate(db=>{db.v42ClosureCertification||={};db.v42ClosureCertification[organizationId]=cert;return cert;});
    return cert;
  }


  async executiveLiveBrief(organizationId) {
    const [closure, health, snapshot, portfolio, evidence, continuity] = await Promise.all([
      this.v42ClosureCertification(organizationId),
      this.productionHealthTelemetry(organizationId),
      this.operatingSnapshot(organizationId),
      this.portfolioLiveTelemetry(organizationId),
      this.liveEvidenceCertification(organizationId),
      this.providerContinuityTelemetry(organizationId)
    ]);
    const risks = [];
    if (!closure.trusted) risks.push(`V42 closure is ${closure.status || "not complete"}.`);
    if ((health.score || 0) < 80) risks.push(`Production health is ${health.score || 0}%.`);
    if (!evidence.trusted) risks.push(`Live evidence is ${evidence.status || "not trusted"}.`);
    if ((continuity.score || 0) < 80) risks.push(`Provider continuity is ${continuity.score || 0}%.`);
    if ((snapshot.freshnessSeconds ?? 999999) > 300) risks.push("Operating evidence is stale.");
    const score = Math.round([
      closure.trusted ? 100 : closure.score || 0,
      health.score || 0,
      portfolio.score || 0,
      evidence.score || 0,
      continuity.score || 0
    ].reduce((a,b)=>a+b,0) / 5);
    const headline = risks[0] || `Live operations are controlled with ${snapshot.recentEvents || 0} events in the current operating window.`;
    return {
      organizationId,
      score,
      status: score >= 90 && risks.length === 0 ? "executive-ready" : score >= 70 ? "watch" : "attention",
      headline,
      risks,
      snapshot: {
        revenue: snapshot.revenue || 0,
        closedChecks: snapshot.closedChecks || 0,
        seatedCovers: snapshot.seatedCovers || 0,
        openKitchenTickets: snapshot.openKitchenTickets || 0,
        employeesOnClock: snapshot.employeesOnClock || 0,
        recentEvents: snapshot.recentEvents || 0,
        lastEventAt: snapshot.lastEventAt || null
      },
      controls: [
        {id:"v42-closure",label:"V42 production closure",score:closure.score||0,status:closure.status||"unknown",trusted:!!closure.trusted},
        {id:"production-health",label:"Production health",score:health.score||0,status:health.status||"unknown",trusted:!!health.trusted},
        {id:"portfolio",label:"Portfolio live telemetry",score:portfolio.score||0,status:portfolio.status||"unknown",trusted:!!portfolio.enterpriseTrusted},
        {id:"evidence",label:"Live evidence",score:evidence.score||0,status:evidence.status||"unknown",trusted:!!evidence.trusted},
        {id:"continuity",label:"Provider continuity",score:continuity.score||0,status:continuity.status||"unknown",trusted:(continuity.score||0)>=80}
      ],
      generatedAt:new Date().toISOString(),
      build:"43.8.0-executive-performance-control"
    };
  }

  async executiveRiskQueue(organizationId) {
    const [portfolio, coverage, cutover, status, incidents, support] = await Promise.all([
      this.portfolioLiveTelemetry(organizationId),
      this.liveCoverageMatrix(organizationId),
      this.locationCutoverControl(organizationId),
      this.status(organizationId),
      this.providerIncidentLedger(organizationId),
      this.pilotSupport(organizationId)
    ]);
    const openIncidents = (incidents.items || incidents.incidents || []).filter(item => item.status !== "resolved" && item.status !== "closed");
    const openSupport = (support.items || support.issues || []).filter(item => item.status !== "resolved" && item.status !== "closed");
    const rows = (portfolio.locations || []).map(location => {
      const coverageRow=(coverage.locations||[]).find(x=>x.locationId===location.locationId)||{};
      const cutoverRow=(cutover.locations||[]).find(x=>x.locationId===location.locationId)||{};
      let risk = Math.max(0, 100 - (location.score || 0));
      const reasons=[];
      if ((coverageRow.score||0) < 100) { risk += 20; reasons.push(`Source coverage ${coverageRow.score||0}%`); }
      if (!['pilot','live'].includes(cutoverRow.stage)) { risk += 10; reasons.push(`Cutover ${cutoverRow.stage||'sandbox'}`); }
      if ((status.staleConnectors||0) > 0) { risk += Math.min(20, (status.staleConnectors||0)*5); reasons.push(`${status.staleConnectors} stale source(s)`); }
      const relatedIncidents=openIncidents.filter(x=>!x.locationId || x.locationId===location.locationId);
      if (relatedIncidents.length) { risk += Math.min(25, relatedIncidents.length*8); reasons.push(`${relatedIncidents.length} open provider incident(s)`); }
      const relatedSupport=openSupport.filter(x=>!x.locationId || x.locationId===location.locationId);
      if (relatedSupport.length) { risk += Math.min(20, relatedSupport.length*6); reasons.push(`${relatedSupport.length} open support issue(s)`); }
      risk=Math.min(100,Math.round(risk));
      return {
        locationId:location.locationId,
        locationName:location.locationName,
        risk,
        severity:risk>=70?"critical":risk>=40?"watch":"controlled",
        reasons:reasons.length?reasons:["No material live-data exception detected"],
        recommendedAction:risk>=70?"Escalate location and validate provider continuity before further automated reasoning.":risk>=40?"Review source freshness, coverage, and open issues before the next service period.":"Continue monitoring under current controls."
      };
    }).sort((a,b)=>b.risk-a.risk);
    return {organizationId,total:rows.length,critical:rows.filter(x=>x.severity==='critical').length,watch:rows.filter(x=>x.severity==='watch').length,topRisk:rows[0]||null,items:rows,generatedAt:new Date().toISOString()};
  }

  async executiveDecisionGate(organizationId, actor = null, persist = false) {
    const [brief, queue, closure, evidence] = await Promise.all([
      this.executiveLiveBrief(organizationId),
      this.executiveRiskQueue(organizationId),
      this.v42ClosureCertification(organizationId),
      this.liveEvidenceCertification(organizationId)
    ]);
    const top=queue.topRisk;
    const controls=[
      {id:"production-closure",label:"V42 production closure",pass:closure.trusted===true,detail:`${closure.score||0}% · ${closure.status||"unknown"}`},
      {id:"executive-brief",label:"Executive live brief",pass:(brief.score||0)>=80,detail:`${brief.score||0}% · ${brief.status||"unknown"}`},
      {id:"live-evidence",label:"Trusted live evidence",pass:evidence.trusted===true,detail:`${evidence.score||0}% · ${evidence.status||"unknown"}`},
      {id:"risk-control",label:"No uncontrolled critical location risk",pass:(queue.critical||0)===0,detail:`${queue.critical||0} critical · ${queue.watch||0} watch`},
      {id:"human-owner",label:"Human decision ownership",pass:!!actor,detail:actor||"Owner assigned when persisted"}
    ];
    const score=Math.round(controls.reduce((sum,c)=>sum+(c.pass?100:0),0)/controls.length);
    const blockers=controls.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const result={
      id:`EDG-${Date.now().toString(36).toUpperCase()}`,
      organizationId,score,
      status:score===100?"decision-ready":score>=60?"conditional":"blocked",
      trusted:score===100,
      blockers,controls,
      priority:top?{locationId:top.locationId,locationName:top.locationName,risk:top.risk,severity:top.severity,recommendedAction:top.recommendedAction}:null,
      issuedAt:new Date().toISOString(),issuedBy:actor||null,build:"43.8.0-executive-performance-control"
    };
    if(persist) {
      await this.database.mutate(db=>{db.executiveDecisionGate||={};db.executiveDecisionGate[organizationId]=result;return result;});
      await this.auditService.record({organizationId,actor:actor||"system",action:`Executive decision gate persisted: ${result.status}`,category:"executive-intelligence"});
    }
    return result;
  }


  async executiveInsights(organizationId) {
    const [brief, queue, snapshot, health] = await Promise.all([
      this.executiveLiveBrief(organizationId),
      this.executiveRiskQueue(organizationId),
      this.operatingSnapshot(organizationId),
      this.productionHealthTelemetry(organizationId)
    ]);
    const insights=[];
    const top=queue.topRisk;
    if(top){
      insights.push({id:`INS-RISK-${top.locationId||"portfolio"}`,kind:"risk",priority:top.severity==="critical"?"critical":top.severity==="watch"?"high":"normal",title:`${top.locationName||"Portfolio"} carries the highest current operating risk`,summary:top.recommendedAction||"Review the highest-risk location before the next service period.",confidence:Math.max(55,Math.min(98,Math.round(100-(top.risk||0)/3))),locationId:top.locationId||null,evidence:[...(top.reasons||[]),`Executive live score ${brief.score||0}%`],recommendedReview:"Open the location evidence chain and confirm ownership before changing operating policy."});
    }
    if((snapshot.openKitchenTickets||0)>8){
      insights.push({id:"INS-KITCHEN-PRESSURE",kind:"risk",priority:(snapshot.openKitchenTickets||0)>15?"critical":"high",title:"Kitchen throughput pressure is building",summary:`${snapshot.openKitchenTickets||0} live tickets remain open in the current operating window.`,confidence:90,evidence:[`${snapshot.openKitchenTickets||0} open kitchen tickets`,`${snapshot.recentEvents||0} live events in the operating window`],recommendedReview:"Review seating pace and kitchen capacity before adding demand."});
    }
    if((snapshot.revenue||0)>0 && (health.score||0)>=80){
      insights.push({id:"INS-CONTROLLED-REVENUE",kind:"opportunity",priority:"normal",title:"Live revenue is flowing through a controlled operating path",summary:`$${Number(snapshot.revenue||0).toLocaleString()} recorded in the current four-hour window with production health at ${health.score||0}%.`,confidence:92,evidence:[`Production health ${health.score||0}%`,`Live evidence ${brief.controls?.find(c=>c.id==='evidence')?.score||0}%`],recommendedReview:"Use this controlled baseline for shift-to-shift comparison and optimization."});
    }
    if((snapshot.employeesOnClock||0)>0 && (snapshot.seatedCovers||0)>0){
      const coversPerEmployee=(snapshot.seatedCovers||0)/Math.max(1,snapshot.employeesOnClock||0);
      insights.push({id:"INS-LABOR-LEVERAGE",kind:"efficiency",priority:coversPerEmployee<2?"high":"normal",title:"Labor leverage can be evaluated against live covers",summary:`${snapshot.seatedCovers||0} seated covers across ${snapshot.employeesOnClock||0} employees on clock (${coversPerEmployee.toFixed(1)} covers per employee in-window).`,confidence:84,evidence:[`${snapshot.seatedCovers||0} seated covers`,`${snapshot.employeesOnClock||0} employees on clock`],recommendedReview:coversPerEmployee<2?"Review deployment before adding labor.":"Maintain deployment and monitor guest wait and kitchen pressure."});
    }
    if(!insights.length){
      insights.push({id:"INS-EVIDENCE-BUILDING",kind:"readiness",priority:"high",title:"Executive evidence is still building",summary:brief.headline||"Live operating evidence is not yet sufficient for a high-confidence executive insight.",confidence:60,evidence:brief.risks||[],recommendedReview:"Complete the live evidence and production controls before relying on automated recommendations."});
    }
    const priorityOrder={critical:0,high:1,normal:2,low:3};
    insights.sort((a,b)=>(priorityOrder[a.priority]??9)-(priorityOrder[b.priority]??9));
    return {organizationId,count:insights.length,critical:insights.filter(x=>x.priority==="critical").length,high:insights.filter(x=>x.priority==="high").length,topInsight:insights[0]||null,items:insights,generatedAt:new Date().toISOString(),build:"43.8.0-executive-performance-control"};
  }

  async executiveRecommendations(organizationId) {
    const [insights, gate, brief, snapshot] = await Promise.all([
      this.executiveInsights(organizationId),
      this.executiveDecisionGate(organizationId),
      this.executiveLiveBrief(organizationId),
      this.operatingSnapshot(organizationId)
    ]);
    const recs=[];
    for(const insight of insights.items||[]){
      let category="operations", action=insight.recommendedReview, impact="Protect operating control", approval=true;
      if(insight.id==="INS-KITCHEN-PRESSURE"){category="kitchen";action="Reduce seating pressure or add kitchen capacity before accepting additional demand.";impact="Lower ticket accumulation and protect guest pacing";}
      else if(insight.id==="INS-LABOR-LEVERAGE"){category="staffing";action=insight.recommendedReview;impact="Improve labor deployment against live covers";}
      else if(insight.kind==="opportunity"){category="portfolio";action="Use the current controlled window as the benchmark for the next comparable service period.";impact="Create a trusted performance baseline";approval=false;}
      else if(insight.kind==="readiness"){category="governance";action="Resolve live-evidence blockers before approving operating changes.";impact="Prevent decisions from being made on untrusted data";}
      recs.push({id:`REC-${insight.id}`,category,priority:insight.priority,title:insight.title,action,expectedImpact:impact,confidence:insight.confidence,approvalRequired:approval,decisionGateStatus:gate.status||"unknown",locationId:insight.locationId||null,evidence:insight.evidence||[]});
    }
    if((snapshot.freshnessSeconds??0)>300){
      recs.unshift({id:"REC-FRESHNESS",category:"governance",priority:"critical",title:"Pause executive action until live evidence is fresh",action:"Restore live source freshness and rerun the Executive Decision Gate.",expectedImpact:"Avoid acting on stale operating conditions",confidence:99,approvalRequired:true,decisionGateStatus:gate.status||"unknown",locationId:null,evidence:[`Evidence age ${snapshot.freshnessSeconds}s`,brief.headline||""]});
    }
    const priorityOrder={critical:0,high:1,normal:2,low:3};
    recs.sort((a,b)=>(priorityOrder[a.priority]??9)-(priorityOrder[b.priority]??9));
    return {organizationId,count:recs.length,approvalRequired:recs.filter(x=>x.approvalRequired).length,decisionReady:gate.trusted===true,decisionGate:gate.status||"unknown",topRecommendation:recs[0]||null,items:recs,generatedAt:new Date().toISOString(),build:"43.8.0-executive-performance-control"};
  }

  async executiveDecisionWorkspaceV43(organizationId, actor = null, persist = false) {
    const [brief, queue, insights, recommendations, gate] = await Promise.all([
      this.executiveLiveBrief(organizationId),
      this.executiveRiskQueue(organizationId),
      this.executiveInsights(organizationId),
      this.executiveRecommendations(organizationId),
      this.executiveDecisionGate(organizationId)
    ]);
    const checks=[
      {id:"live-brief",label:"Executive live brief",pass:(brief.score||0)>=80,detail:`${brief.score||0}% · ${brief.status||"unknown"}`},
      {id:"insights",label:"Evidence-backed insights",pass:(insights.count||0)>0,detail:`${insights.count||0} insight(s)`},
      {id:"recommendations",label:"Actionable recommendations",pass:(recommendations.count||0)>0,detail:`${recommendations.count||0} recommendation(s)`},
      {id:"decision-gate",label:"Executive decision gate",pass:gate.trusted===true,detail:`${gate.score||0}% · ${gate.status||"unknown"}`},
      {id:"critical-risk",label:"Critical portfolio risk controlled",pass:(queue.critical||0)===0,detail:`${queue.critical||0} critical · ${queue.watch||0} watch`}
    ];
    const score=Math.round(checks.reduce((sum,c)=>sum+(c.pass?100:0),0)/checks.length);
    const blockers=checks.filter(c=>!c.pass).map(c=>`${c.label}: ${c.detail}`);
    const top=recommendations.topRecommendation||null;
    const result={id:`EDW43-${Date.now().toString(36).toUpperCase()}`,organizationId,score,status:score===100?"decision-workspace-ready":score>=60?"conditional":"blocked",trusted:score===100,blockers,checks,headline:brief.headline||"Executive decision workspace",priorityLocation:queue.topRisk?{locationId:queue.topRisk.locationId,locationName:queue.topRisk.locationName,risk:queue.topRisk.risk}:null,recommendedAction:top?{id:top.id,title:top.title,action:top.action,category:top.category,confidence:top.confidence,approvalRequired:top.approvalRequired}:null,insightCount:insights.count||0,recommendationCount:recommendations.count||0,generatedAt:new Date().toISOString(),issuedBy:actor||null,build:"43.8.0-executive-performance-control"};
    if(persist){
      await this.database.mutate(db=>{db.executiveDecisionWorkspaceV43||={};db.executiveDecisionWorkspaceV43[organizationId]=result;return result;});
      await this.auditService.record({organizationId,actor:actor||"system",action:`Executive decision workspace persisted: ${result.status}`,category:"executive-intelligence"});
    }
    return result;
  }


  async executiveKpiStudio(organizationId, actor = null, input = null) {
    const db = await this.database.read();
    const saved = db.executiveKpiStudio?.[organizationId] || {};
    if (input && typeof input === "object") {
      const definition = {
        name: String(input.name || saved.name || "Executive Operating Scorecard").slice(0, 120),
        targets: {
          productionHealth: Math.max(0, Math.min(100, Number(input.targets?.productionHealth ?? saved.targets?.productionHealth ?? 80))),
          maxKitchenTickets: Math.max(0, Number(input.targets?.maxKitchenTickets ?? saved.targets?.maxKitchenTickets ?? 8)),
          minRevenue4h: Math.max(0, Number(input.targets?.minRevenue4h ?? saved.targets?.minRevenue4h ?? 0)),
          maxCriticalLocations: Math.max(0, Number(input.targets?.maxCriticalLocations ?? saved.targets?.maxCriticalLocations ?? 0))
        },
        updatedAt: new Date().toISOString(), updatedBy: actor || "system"
      };
      await this.database.mutate(data => { data.executiveKpiStudio ||= {}; data.executiveKpiStudio[organizationId] = definition; return definition; });
      await this.auditService.record({organizationId, actor:actor||"system", action:`Executive KPI scorecard saved: ${definition.name}`, category:"executive-intelligence"});
    }
    const currentDb = input ? await this.database.read() : db;
    const definition = currentDb.executiveKpiStudio?.[organizationId] || {name:"Executive Operating Scorecard",targets:{productionHealth:80,maxKitchenTickets:8,minRevenue4h:0,maxCriticalLocations:0}};
    const [snapshot, health, queue] = await Promise.all([this.operatingSnapshot(organizationId), this.productionHealthTelemetry(organizationId), this.executiveRiskQueue(organizationId)]);
    const rows = [
      {id:"production-health",label:"Production health",value:Number(health.score||0),unit:"%",target:Number(definition.targets?.productionHealth??80),direction:"min"},
      {id:"revenue-4h",label:"Revenue · 4h",value:Number(snapshot.revenue||0),unit:"$",target:Number(definition.targets?.minRevenue4h??0),direction:"min"},
      {id:"open-kitchen",label:"Open kitchen tickets",value:Number(snapshot.openKitchenTickets||0),unit:"",target:Number(definition.targets?.maxKitchenTickets??8),direction:"max"},
      {id:"critical-locations",label:"Critical locations",value:Number(queue.critical||0),unit:"",target:Number(definition.targets?.maxCriticalLocations??0),direction:"max"},
      {id:"event-freshness",label:"Live event freshness",value:Number(snapshot.freshnessSeconds??999999),unit:"s",target:300,direction:"max"}
    ].map(row => ({...row, pass: row.direction === "min" ? row.value >= row.target : row.value <= row.target}));
    const score = Math.round(rows.reduce((sum,row)=>sum+(row.pass?100:0),0)/rows.length);
    return {organizationId,name:definition.name,score,status:score===100?"on-target":score>=60?"watch":"off-target",targets:definition.targets,passing:rows.filter(x=>x.pass).length,total:rows.length,items:rows,generatedAt:new Date().toISOString(),build:"43.8.0-executive-performance-control"};
  }

  async executiveTimeline(organizationId) {
    const [events, db] = await Promise.all([this.events(organizationId, 80), this.database.read()]);
    const timeline = (events||[]).slice(0,30).map(event => ({id:event.id||`EV-${event.receivedAt}`,at:event.receivedAt||event.occurredAt||new Date().toISOString(),kind:"live-event",title:String(event.type||"Live event").replace(/[._-]/g," "),detail:event.source?`Source ${event.source}`:"Canonical operating event",source:event.source||null}));
    const persisted = [
      ["decision-gate", db.executiveDecisionGate?.[organizationId], "Executive decision gate"],
      ["decision-workspace", db.executiveDecisionWorkspaceV43?.[organizationId], "Executive decision workspace"],
      ["v42-closure", db.v42ClosureCertification?.[organizationId], "V42 production closure"]
    ];
    persisted.forEach(([kind,item,label])=>{if(item) timeline.push({id:`TL-${kind}`,at:item.issuedAt||item.generatedAt||new Date().toISOString(),kind,title:label,detail:`${item.status||"recorded"} · ${item.score||0}%`,priority:item.trusted?"controlled":"watch"});});
    const incidents=(db.providerIncidents||[]).filter(x=>x.organizationId===organizationId).slice(-5);
    incidents.forEach(item=>timeline.push({id:`TL-INC-${item.id}`,at:item.openedAt||item.createdAt||new Date().toISOString(),kind:"incident",title:item.title||"Provider incident",detail:item.note||item.reason||item.status||"Incident recorded",priority:item.severity||"watch"}));
    timeline.sort((a,b)=>new Date(b.at)-new Date(a.at));
    const latest=timeline[0]||null;
    return {organizationId,count:timeline.length,latestAt:latest?.at||null,liveEvents:timeline.filter(x=>x.kind==="live-event").length,decisions:timeline.filter(x=>x.kind.includes("decision")).length,incidents:timeline.filter(x=>x.kind==="incident").length,items:timeline.slice(0,40),generatedAt:new Date().toISOString(),build:"43.8.0-executive-performance-control"};
  }

  async executivePortfolioHealth(organizationId) {
    const [coverage, portfolio, queue] = await Promise.all([this.liveCoverageMatrix(organizationId), this.portfolioLiveTelemetry(organizationId), this.executiveRiskQueue(organizationId)]);
    const coverageMap=new Map((coverage.locations||[]).map(x=>[x.locationId,x]));
    const riskMap=new Map((queue.items||[]).map(x=>[x.locationId,x]));
    const locations=(portfolio.locations||[]).map(location=>{
      const cov=coverageMap.get(location.locationId)||{}; const risk=riskMap.get(location.locationId)||{};
      const score=Math.max(0,Math.min(100,Math.round(((location.score||0)+(cov.score||0)+(100-(risk.risk||0)))/3)));
      return {locationId:location.locationId,locationName:location.locationName,score,status:score>=85?"healthy":score>=65?"watch":"attention",coverage:Number(cov.score||0),risk:Number(risk.risk||0),cutover:location.cutoverStage||location.stage||"sandbox",recommendedAction:risk.recommendedAction||"Continue monitoring current operating controls."};
    }).sort((a,b)=>a.score-b.score);
    const score=locations.length?Math.round(locations.reduce((sum,x)=>sum+x.score,0)/locations.length):0;
    return {organizationId,score,status:score>=85?"portfolio-healthy":score>=65?"watch":"attention",healthy:locations.filter(x=>x.status==="healthy").length,watch:locations.filter(x=>x.status==="watch").length,attention:locations.filter(x=>x.status==="attention").length,lowest:locations[0]||null,locations,generatedAt:new Date().toISOString(),build:"43.8.0-executive-performance-control"};
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
