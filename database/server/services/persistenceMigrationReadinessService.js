"use strict";

const crypto = require("crypto");

class PersistenceMigrationReadinessService {
  constructor(persistence) {
    this.persistence = persistence;
  }

  _shapeFingerprint(value) {
    const walk = item => {
      if (item === null) return "null";
      if (Array.isArray(item)) return item.length ? [walk(item[0])] : [];
      if (typeof item !== "object") return typeof item;
      return Object.fromEntries(Object.keys(item).sort().map(key => [key, walk(item[key])]));
    };
    return crypto.createHash("sha256")
      .update(JSON.stringify(walk(value)))
      .digest("hex")
      .slice(0, 16);
  }

  async snapshot() {
    const state = await this.persistence.read();
    const collections = Object.entries(state)
      .map(([name, value]) => ({
        name,
        kind: Array.isArray(value) ? "collection" : typeof value === "object" && value !== null ? "document" : "scalar",
        records: Array.isArray(value) ? value.length : null,
        shapeFingerprint: this._shapeFingerprint(value)
      }))
      .sort((a,b) => a.name.localeCompare(b.name));

    const arrayCollections = collections.filter(item => item.kind === "collection");
    const objectDocuments = collections.filter(item => item.kind === "document");
    const capabilities = this.persistence.capabilities || {};
    const blockers = [];

    if (!capabilities.transactions) blockers.push("transaction-capability-missing");
    if (!capabilities.atomicMultiCollectionMutation) blockers.push("atomic-multi-collection-mutation-missing");

    return {
      version: "71.0.0",
      generatedAt: new Date().toISOString(),
      activeDriver: this.persistence.driver,
      topology: this.persistence.topology,
      adapterContract: {
        read: true,
        write: true,
        mutate: true,
        list: true,
        get: true,
        create: true,
        update: true,
        transaction: typeof this.persistence.transaction === "function"
      },
      capabilities,
      collections: {
        total: collections.length,
        entityCollections: arrayCollections.length,
        documentStores: objectDocuments.length,
        catalog: collections
      },
      migrationTarget: {
        recommendedClass: "managed-transactional-relational",
        example: "PostgreSQL",
        strategy: "adapter-swap-with-contract-preservation",
        requiresBusinessServiceRewrite: false,
        requiresSchemaMapping: true,
        requiresDataMigration: true,
        requiresDualWriteCutover: true,
        requiresRollbackPlan: true
      },
      blockers,
      migrationReady: blockers.length === 0
    };
  }
}

module.exports = PersistenceMigrationReadinessService;
