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

  async recoverStalePrepared({ force = false } = {}) {
    const now = Date.now();
    const snapshot = await this.database.read();
    const candidates = (snapshot.mutationIntegrityRecords || []).filter(record =>
      record.status === "prepared" &&
      (force || now - new Date(record.createdAt).getTime() >= this.staleAfterMs)
    );

    if (candidates.length === 0) {
      return {
        version: "68.50.0",
        recoveredAt: new Date().toISOString(),
        recovered: 0,
        committedRecovered: 0,
        failedRecovered: 0,
        reconcileRequired: 0,
        operations: []
      };
    }

    const candidateIds = new Set(candidates.map(item => item.id));
    return this.database.mutate(database => {
      database.mutationIntegrityRecords ||= [];
      database.resourceVersions ||= [];
      database.idempotencyRecords ||= [];

      const recovered = [];
      for (const record of database.mutationIntegrityRecords) {
        if (!candidateIds.has(record.id) || record.status !== "prepared") continue;

        const resourceKey = `${record.organizationId}:${record.path}:${record.entityId || "collection"}`;
        const resource = database.resourceVersions.find(item => item.id === resourceKey);
        const idem = record.idempotencyKey
          ? database.idempotencyRecords.find(item => item.id === record.idempotencyKey)
          : null;

        let outcome = "reconcile-required";
        let responseStatus = idem?.responseStatus || null;
        let resourceVersion = resource?.version || null;
        let recoveryReason = "restart found an unfinished mutation with no durable completion evidence";

        if (idem?.status === "complete") {
          outcome = "committed-recovered";
          recoveryReason = "idempotency record proves the response completed before restart";
        } else if (idem?.status === "failed") {
          outcome = "failed-recovered";
          recoveryReason = "idempotency record proves the operation failed before restart";
        } else if (
          resource &&
          record.expectedVersion !== null &&
          Number(resource.version) > Number(record.expectedVersion)
        ) {
          outcome = "committed-recovered";
          recoveryReason = "resource version advanced beyond the prepared mutation snapshot";
        }

        record.status = "finalized";
        record.outcome = outcome;
        record.responseStatus = responseStatus;
        record.resourceVersion = resourceVersion;
        record.error = outcome === "reconcile-required"
          ? "Restart recovery could not prove commit or failure. Reconcile this operation before retrying."
          : null;
        record.recoveryReason = recoveryReason;
        record.recoveredAt = new Date().toISOString();
        record.updatedAt = record.recoveredAt;
        record.finalizedAt = record.recoveredAt;
        recovered.push({ ...record });
      }

      return {
        version: "68.50.0",
        recoveredAt: new Date().toISOString(),
        recovered: recovered.length,
        committedRecovered: recovered.filter(item => item.outcome === "committed-recovered").length,
        failedRecovered: recovered.filter(item => item.outcome === "failed-recovered").length,
        reconcileRequired: recovered.filter(item => item.outcome === "reconcile-required").length,
        operations: recovered
      };
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
      version: "68.50.0",
      organizationId,
      total: records.length,
      prepared: records.filter(item => item.status === "prepared").length,
      committed: count("committed"),
      rejected: count("rejected"),
      failed: count("failed"),
      committedRecovered: count("committed-recovered"),
      failedRecovered: count("failed-recovered"),
      reconcileRequired: count("reconcile-required"),
      stalePrepared: stalePrepared.length,
      healthy: stalePrepared.length === 0 && count("reconcile-required") === 0,
      recent: records.slice(0, 50)
    };
  }
}

module.exports = ProductionMutationIntegrityService;
