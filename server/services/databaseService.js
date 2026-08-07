"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TRANSIENT_WINDOWS_ERRORS = new Set(["EPERM", "EBUSY", "EACCES", "ENOTEMPTY"]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class DatabaseService {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
    this.maxWriteAttempts = Number(options.maxWriteAttempts || 7);
    this.baseRetryDelayMs = Number(options.baseRetryDelayMs || 25);
    this.orphanMaxAgeMs = Number(options.orphanMaxAgeMs || 10 * 60 * 1000);
    this.logger = options.logger || console;
  }

  async read() {
    const raw = await fs.promises.readFile(this.filePath, "utf8");
    return JSON.parse(raw);
  }

  _enqueue(operation) {
    // A failed persistence operation must not poison every later database mutation.
    const run = () => Promise.resolve().then(operation);
    this.queue = this.queue.then(run, run);
    return this.queue;
  }

  _uniquePath(kind) {
    const nonce = crypto.randomBytes(4).toString("hex");
    return `${this.filePath}.${process.pid}.${Date.now()}.${nonce}.${kind}`;
  }

  _isTransient(error) {
    return Boolean(error && TRANSIENT_WINDOWS_ERRORS.has(error.code));
  }

  async _retry(label, operation) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxWriteAttempts; attempt += 1) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        if (!this._isTransient(error) || attempt >= this.maxWriteAttempts) throw error;
        const delay = Math.min(1000, this.baseRetryDelayMs * (2 ** (attempt - 1)));
        this.logger.warn?.(
          `[database] ${label} blocked by ${error.code}; retry ${attempt}/${this.maxWriteAttempts} in ${delay}ms.`
        );
        await sleep(delay);
      }
    }
    throw lastError;
  }

  async _pathExists(target) {
    try {
      await fs.promises.access(target, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async _writeDurableFile(target, content) {
    const handle = await fs.promises.open(target, "w");
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  async _cleanupOrphans() {
    const directory = path.dirname(this.filePath);
    const prefix = `${path.basename(this.filePath)}.`;
    const now = Date.now();
    let entries = [];
    try {
      entries = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(entries
      .filter(entry => entry.isFile() && entry.name.startsWith(prefix) && (entry.name.endsWith(".tmp") || entry.name.endsWith(".fallback")))
      .map(async entry => {
        const target = path.join(directory, entry.name);
        try {
          const stat = await fs.promises.stat(target);
          if (now - stat.mtimeMs >= this.orphanMaxAgeMs) {
            await fs.promises.unlink(target);
          }
        } catch {
          // Cleanup is best effort and must never make the database unavailable.
        }
      }));
  }

  async _refreshBackup() {
    if (!(await this._pathExists(this.filePath))) return;
    const backupPath = `${this.filePath}.bak`;
    await this._retry("backup", () => fs.promises.copyFile(this.filePath, backupPath));
  }

  async _replaceFromTemporary(temporary) {
    try {
      await this._retry("atomic rename", () => fs.promises.rename(temporary, this.filePath));
      return "rename";
    } catch (renameError) {
      if (!this._isTransient(renameError)) throw renameError;

      // Windows/OneDrive/AV can hold the destination open long enough to make
      // rename-over-existing fail. Preserve the last known-good file, then use
      // a retried copy replacement as a controlled fallback.
      this.logger.warn?.(
        `[database] Atomic rename remained blocked (${renameError.code}); using safe copy fallback.`
      );
      await this._refreshBackup();
      await this._retry("copy fallback", () => fs.promises.copyFile(temporary, this.filePath));
      await fs.promises.unlink(temporary).catch(() => undefined);
      return "copy-fallback";
    }
  }

  async _writeImmediate(data) {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    await this._cleanupOrphans();

    const temporary = this._uniquePath("tmp");
    const content = JSON.stringify(data, null, 2);

    try {
      await this._writeDurableFile(temporary, content);
      const mode = await this._replaceFromTemporary(temporary);
      return { data, mode };
    } catch (error) {
      this.logger.error?.(
        `[database] Write failed for ${this.filePath}: ${error.code || error.name || "ERROR"} ${error.message}`
      );
      // Keep a failed temp file briefly for diagnosis; orphan cleanup removes it later.
      throw error;
    }
  }

  write(data) {
    return this._enqueue(async () => {
      const result = await this._writeImmediate(data);
      return result.data;
    });
  }

  mutate(mutator) {
    return this._enqueue(async () => {
      const database = await this.read();
      const result = await mutator(database);
      await this._writeImmediate(database);
      return result;
    });
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
