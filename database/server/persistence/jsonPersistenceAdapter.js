"use strict";

const DatabaseService = require("../services/databaseService");

class JsonPersistenceAdapter {
  constructor(filePath, options = {}) {
    this.driver = "json";
    this.topology = "single-node-durable-json";
    this.capabilities = Object.freeze({
      transactions: true,
      atomicMultiCollectionMutation: true,
      durableWrites: true,
      verifiedBackups: true,
      automaticRecovery: true,
      concurrentMultiNodeWriters: false,
      rowLevelLocking: false,
      databaseConstraints: false,
      managedFailover: false
    });
    this.database = new DatabaseService(filePath, options);
  }

  read() { return this.database.read(); }
  reload() { return this.database.reload(); }
  write(data) { return this.database.write(data); }
  mutate(mutator) { return this.database.mutate(mutator); }
  list(collection, predicate) { return this.database.list(collection, predicate); }
  get(collection, id) { return this.database.get(collection, id); }
  create(collection, entity) { return this.database.create(collection, entity); }
  insert(collection, entity) { return this.database.insert(collection, entity); }
  update(collection, id, patch) { return this.database.update(collection, id, patch); }
  delete(collection, id) { return this.database.delete(collection, id); }
  diagnostics() {
    return {
      driver: this.driver,
      topology: this.topology,
      capabilities: this.capabilities,
      ...this.database.diagnostics()
    };
  }
  awaitIdle() { return this.database.awaitIdle(); }
  checkpointBackup(source) { return this.database.checkpointBackup(source); }
  verifyBackups() { return this.database.verifyBackups(); }
  recoverFromBackup(reason) { return this.database.recoverFromBackup(reason); }
}

module.exports = JsonPersistenceAdapter;
