"use strict";

const crypto = require("crypto");
const { validatePersistenceAdapter } = require("./persistenceContract");

function clone(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

class PersistenceGateway {
  constructor(adapter) {
    this.adapter = validatePersistenceAdapter(adapter);
    this.driver = adapter.driver;
    this.topology = adapter.topology || "unknown";
    this.capabilities = Object.freeze({ ...(adapter.capabilities || {}) });
    this.transactions = {
      started: 0,
      committed: 0,
      rolledBack: 0,
      lastTransactionAt: null
    };
  }

  read() { return this.adapter.read(); }
  reload() { return this.adapter.reload(); }
  write(data) { return this.adapter.write(data); }
  mutate(mutator) { return this.adapter.mutate(mutator); }
  list(collection, predicate) { return this.adapter.list(collection, predicate); }
  get(collection, id) { return this.adapter.get(collection, id); }
  create(collection, entity) { return this.adapter.create(collection, entity); }
  insert(collection, entity) { return this.adapter.insert(collection, entity); }
  update(collection, id, patch) { return this.adapter.update(collection, id, patch); }
  delete(collection, id) { return this.adapter.delete(collection, id); }
  awaitIdle() { return this.adapter.awaitIdle(); }
  checkpointBackup(source) { return this.adapter.checkpointBackup(source); }
  verifyBackups() { return this.adapter.verifyBackups(); }
  recoverFromBackup(reason) {
    if (typeof this.adapter.recoverFromBackup !== "function") {
      const error = new Error(`Persistence driver ${this.driver} does not expose file recovery.`);
      error.code = "PERSISTENCE_CAPABILITY_UNAVAILABLE";
      throw error;
    }
    return this.adapter.recoverFromBackup(reason);
  }

  async transaction(work, metadata = {}) {
    if (typeof work !== "function") throw new TypeError("Transaction work must be a function.");
    const transactionId = `tx_${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();
    this.transactions.started += 1;
    this.transactions.lastTransactionAt = startedAt;

    try {
      const result = await this.adapter.mutate(async state => {
        const unit = this._unitOfWork(state, {
          id: transactionId,
          startedAt,
          metadata: clone(metadata)
        });
        return work(unit);
      });
      this.transactions.committed += 1;
      return result;
    } catch (error) {
      this.transactions.rolledBack += 1;
      error.transactionId ||= transactionId;
      throw error;
    }
  }

  _unitOfWork(state, context) {
    const ensure = collection => {
      state[collection] ||= [];
      if (!Array.isArray(state[collection])) {
        throw new TypeError(`Collection ${collection} is not an array-backed entity collection.`);
      }
      return state[collection];
    };

    return Object.freeze({
      ...context,
      driver: this.driver,
      state,
      list: (collection, predicate = () => true) => ensure(collection).filter(predicate),
      get: (collection, id) => ensure(collection).find(item => item.id === id) || null,
      create: (collection, entity) => {
        ensure(collection).push(entity);
        return entity;
      },
      update: (collection, id, patch) => {
        const items = ensure(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = {
          ...items[index],
          ...patch,
          updatedAt: new Date().toISOString()
        };
        return items[index];
      },
      remove: (collection, id) => {
        const items = ensure(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        return items.splice(index, 1)[0];
      },
      collection: collection => ensure(collection)
    });
  }

  diagnostics() {
    return {
      ...this.adapter.diagnostics(),
      gateway: {
        driver: this.driver,
        topology: this.topology,
        capabilities: this.capabilities,
        transactions: { ...this.transactions }
      }
    };
  }
}

module.exports = PersistenceGateway;
