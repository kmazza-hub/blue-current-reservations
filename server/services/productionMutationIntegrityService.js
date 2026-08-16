"use strict";

const crypto = require("crypto");

class ProductionMutationIntegrityService {
  constructor(database, { staleAfterMs = 2 * 60 * 1000, maxRecordsPerOrganization = 2000 } = {}) {
    this.database = database;
    this.staleAfterMs = staleAfterMs;
    this.maxRecordsPerOrganization = maxRecordsPerOrganization;
  }

  async begin({ organizationId, method, path, entityId, userId, actor, idempotencyKey, expectedVersion }) {
    const now = new Date().toISOString();
    const record = {
      id: `mut_${crypto.randomUUID()}`,
      organizationId,
      method,
      path,
      entityId: entityId || null,
      userId: userId || null,
      actor: actor || "Unknown",
      idempotencyKey: idempotencyKey || null,
      expectedVersion: expectedVersion ?? null,
      status: "prepared",
      outcome: null,
      responseStatus: null,
      resourceVersion: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      finalizedAt: null
    };

    return this.database.mutate(database => {
      database.mutationIntegrityRecords ||= [];
      database.mutationIntegrityRecords.push(record);

      const orgRecords = database.mutationIntegrityRecords
        .filter(item => item.organizationId === organizationId)
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (orgRecords.length > this.maxRecordsPerOrganization) {
        const keepIds = new Set(orgRecords.slice(0, this.maxRecordsPerOrganization).map(item => item.id));
        database.mutationIntegrityRecords = database.mutationIntegrityRecords.filter(
          item => item.organizationId !== organizationId || keepIds.has(item.id)
        );
      }
      return { ...record };
    });
  }

  async finalize(operationId, { outcome, responseStatus, resourceVersion = null, error = null }) {
    if (!operationId) return null;
    return this.database.mutate(database => {
      database.mutationIntegrityRecords ||= [];
      const record = database.mutationIntegrityRecords.find(item => item.id === operationId);
      if (!record) return null;
      record.status = "finalized";
      record.outcome = outcome;
      record.responseStatus = responseStatus;
      record.resourceVersion = resourceVersion;
      record.error = error ? String(error) : null;
      record.updatedAt = new Date().toISOString();
      record.finalizedAt = record.updatedAt;
      return { ...record };
    });
  }

  async snapshot(organizationId) {
    const database = await this.database.read();
    const records = (database.mutationIntegrityRecords || [])
      .filter(item => item.organizationId === organizationId)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    const now = Date.now();
    const stalePrepared = records.filter(item =>
      item.status === "prepared" &&
      now - new Date(item.createdAt).getTime() >= this.staleAfterMs
    );

    const count = outcome => records.filter(item => item.outcome === outcome).length;
    return {
      version: "68.0.0",
      organizationId,
      total: records.length,
      prepared: records.filter(item => item.status === "prepared").length,
      committed: count("committed"),
      rejected: count("rejected"),
      failed: count("failed"),
      stalePrepared: stalePrepared.length,
      healthy: stalePrepared.length === 0,
      recent: records.slice(0, 50)
    };
  }
}

module.exports = ProductionMutationIntegrityService;
