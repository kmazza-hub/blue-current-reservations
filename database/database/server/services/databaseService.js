
"use strict";

const fs = require("fs");
const path = require("path");

class DatabaseService {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async read() {
    const raw = await fs.promises.readFile(this.filePath, "utf8");
    return JSON.parse(raw);
  }

  async write(data) {
    const temporary = `${this.filePath}.tmp`;
    await fs.promises.writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
    await fs.promises.rename(temporary, this.filePath);
    return data;
  }

  mutate(mutator) {
    this.queue = this.queue.then(async () => {
      const database = await this.read();
      const result = await mutator(database);
      await this.write(database);
      return result;
    });
    return this.queue;
  }

  async list(collection, predicate = () => true) {
    const database = await this.read();
    return (database[collection] || []).filter(predicate);
  }

  async get(collection, id) {
    const items = await this.list(collection);
    return items.find(item => item.id === id) || null;
  }

  create(collection, entity) {
    return this.mutate(database => {
      database[collection] ||= [];
      database[collection].push(entity);
      return entity;
    });
  }

  update(collection, id, patch) {
    return this.mutate(database => {
      database[collection] ||= [];
      const index = database[collection].findIndex(item => item.id === id);
      if (index === -1) return null;
      database[collection][index] = { ...database[collection][index], ...patch, updatedAt: new Date().toISOString() };
      return database[collection][index];
    });
  }
}

module.exports = DatabaseService;
