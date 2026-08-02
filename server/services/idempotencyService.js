"use strict";

class IdempotencyService {
  constructor(database, { ttlMs = 24 * 60 * 60 * 1000 } = {}) {
    this.database = database;
    this.ttlMs = ttlMs;
  }

  key(request, organizationId) {
    const value = request.headers["x-blue-current-idempotency-key"];
    return value ? `${organizationId}:${value}` : null;
  }

  async find(key) {
    if (!key) return null;
    const now = Date.now();
    const record = await this.database.get("idempotencyRecords", key);
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() <= now) return null;
    return record;
  }

  async reserve(key, metadata = {}) {
    if (!key) return null;
    return this.database.mutate(database => {
      database.idempotencyRecords ||= [];
      const existing = database.idempotencyRecords.find(item => item.id === key);
      if (existing) return existing;
      const now = new Date();
      const record = {
        id: key,
        status: "processing",
        method: metadata.method,
        path: metadata.path,
        organizationId: metadata.organizationId,
        userId: metadata.userId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + this.ttlMs).toISOString()
      };
      database.idempotencyRecords.push(record);
      return record;
    });
  }

  async complete(key, status, payload) {
    if (!key) return null;
    return this.database.mutate(database => {
      database.idempotencyRecords ||= [];
      const record = database.idempotencyRecords.find(item => item.id === key);
      if (!record) return null;
      record.status = "complete";
      record.responseStatus = status;
      record.responsePayload = payload;
      record.updatedAt = new Date().toISOString();
      return record;
    });
  }

  async fail(key, status, payload) {
    if (!key) return null;
    return this.database.mutate(database => {
      database.idempotencyRecords ||= [];
      const record = database.idempotencyRecords.find(item => item.id === key);
      if (!record) return null;
      record.status = "failed";
      record.responseStatus = status;
      record.responsePayload = payload;
      record.updatedAt = new Date().toISOString();
      return record;
    });
  }

  async cleanup() {
    const now = Date.now();
    return this.database.mutate(database => {
      database.idempotencyRecords ||= [];
      const before = database.idempotencyRecords.length;
      database.idempotencyRecords = database.idempotencyRecords.filter(
        item => new Date(item.expiresAt).getTime() > now
      );
      return before - database.idempotencyRecords.length;
    });
  }
}

module.exports = IdempotencyService;
