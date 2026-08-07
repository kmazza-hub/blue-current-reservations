"use strict";

class SyncReconciliationService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  resourceKey(organizationId, path, entityId = "collection") {
    return `${organizationId}:${path}:${entityId}`;
  }

  async currentVersion(key) {
    const record = await this.database.get("resourceVersions", key);
    return record?.version || 0;
  }

  async prepare({ organizationId, path, entityId, expectedVersion }) {
    const key = this.resourceKey(organizationId, path, entityId);
    const currentVersion = await this.currentVersion(key);
    if (
      expectedVersion !== null &&
      expectedVersion !== undefined &&
      Number(expectedVersion) !== Number(currentVersion)
    ) {
      return {
        ok: false,
        conflict: true,
        key,
        currentVersion,
        expectedVersion: Number(expectedVersion)
      };
    }
    return { ok: true, key, currentVersion };
  }

  async commit({ key, organizationId, path, entityId, actor, payload }) {
    const result = await this.database.mutate(database => {
      database.resourceVersions ||= [];
      let record = database.resourceVersions.find(item => item.id === key);
      if (!record) {
        record = {
          id: key,
          organizationId,
          path,
          entityId: entityId || null,
          version: 0,
          createdAt: new Date().toISOString()
        };
        database.resourceVersions.push(record);
      }
      record.version += 1;
      record.updatedAt = new Date().toISOString();
      record.lastPayload = payload;
      record.lastActor = actor;
      return { ...record };
    });

    await this.auditService.record({
      organizationId,
      actor,
      action: `Version ${result.version} committed for ${path}`,
      category: "synchronization"
    });
    this.realtimeHub.publish("sync:resource-versioned", result);
    return result;
  }

  async reconcile(organizationId, clientEntries = []) {
    const database = await this.database.read();
    const serverVersions = (database.resourceVersions || []).filter(
      item => item.organizationId === organizationId
    );
    const serverByKey = new Map(serverVersions.map(item => [item.id, item]));
    const differences = clientEntries.map(entry => {
      const key = entry.key || this.resourceKey(
        organizationId,
        entry.path || "unknown",
        entry.entityId || "collection"
      );
      const server = serverByKey.get(key);
      const clientVersion = Number(entry.version || 0);
      const serverVersion = Number(server?.version || 0);
      return {
        key,
        path: entry.path || server?.path || null,
        entityId: entry.entityId || server?.entityId || null,
        clientVersion,
        serverVersion,
        status: clientVersion === serverVersion
          ? "aligned"
          : clientVersion < serverVersion
            ? "client-behind"
            : "client-ahead",
        serverState: server?.lastPayload || null
      };
    });

    return {
      reconciledAt: new Date().toISOString(),
      organizationId,
      aligned: differences.filter(item => item.status === "aligned").length,
      clientBehind: differences.filter(item => item.status === "client-behind").length,
      clientAhead: differences.filter(item => item.status === "client-ahead").length,
      differences,
      serverVersions
    };
  }
}

module.exports = SyncReconciliationService;
