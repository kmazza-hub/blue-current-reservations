"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TRANSIENT_WINDOWS_ERRORS = new Set([
  "EPERM", "EBUSY", "EACCES", "ENOTEMPTY", "EMFILE", "ENFILE"
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clone(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

class DatabaseService {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
    this.maxWriteAttempts = Number(options.maxWriteAttempts || 7);
    this.maxReadAttempts = Number(options.maxReadAttempts || 7);
    this.baseRetryDelayMs = Number(options.baseRetryDelayMs || 25);
    this.orphanMaxAgeMs = Number(options.orphanMaxAgeMs || 10 * 60 * 1000);
    this.logger = options.logger || console;

    // V43.8.1: maintain one process-local snapshot and coalesce the initial disk
    // read. The server is the sole writer for this JSON database, so repeated API
    // reads should not reopen the file hundreds of times during startup fan-out.
    this.snapshot = null;
    this.snapshotLoadedAt = null;
    this.inFlightRead = null;
    this.stats = {
      diskReads: 0,
      coalescedReads: 0,
      cacheReads: 0,
      writes: 0,
      retries: 0,
      lastError: null
    };
  }

  _recordError(error) {
    this.stats.lastError = error ? {
      code: error.code || error.name || "ERROR",
      message: String(error.message || error),
      at: new Date().toISOString()
    } : null;
  }

  _isTransient(error) {
    return Boolean(error && TRANSIENT_WINDOWS_ERRORS.has(error.code));
  }

  async _retry(label, operation, maxAttempts = this.maxWriteAttempts) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        this._recordError(error);
        if (!this._isTransient(error) || attempt >= maxAttempts) throw error;
        this.stats.retries += 1;
        const delay = Math.min(1000, this.baseRetryDelayMs * (2 ** (attempt - 1)));
        this.logger.warn?.(
          `[database] ${label} blocked by ${error.code}; retry ${attempt}/${maxAttempts} in ${delay}ms.`
        );
        await sleep(delay);
      }
    }
    throw lastError;
  }

  async _readDisk() {
    this.stats.diskReads += 1;
    const raw = await this._retry(
      "database read",
      () => fs.promises.readFile(this.filePath, "utf8"),
      this.maxReadAttempts
    );
    return JSON.parse(raw);
  }

  async _loadSnapshot() {
    if (this.snapshot) {
      this.stats.cacheReads += 1;
      return this.snapshot;
    }

    if (this.inFlightRead) {
      this.stats.coalescedReads += 1;
      return this.inFlightRead;
    }

    this.inFlightRead = (async () => {
      try {
        const database = await this._readDisk();
        this.snapshot = database;
        this.snapshotLoadedAt = new Date().toISOString();
        this._recordError(null);
        return database;
      } finally {
        this.inFlightRead = null;
      }
    })();

    return this.inFlightRead;
  }

  async read() {
    // Every consumer receives its own object, preventing accidental mutation of
    // the shared process snapshot while eliminating repeated file opens.
    return clone(await this._loadSnapshot());
  }

  async reload() {
    this.snapshot = null;
    this.snapshotLoadedAt = null;
    return this.read();
  }

  diagnostics() {
    return {
      filePath: this.filePath,
      snapshotLoaded: Boolean(this.snapshot),
      snapshotLoadedAt: this.snapshotLoadedAt,
      inFlightRead: Boolean(this.inFlightRead),
      ...this.stats
    };
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

  async _pathExists(target) {
    try {
      await fs.promises.access(target, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async _writeDurableFile(target, content) {
    const handle = await this._retry(
      "open temporary database file",
      () => fs.promises.open(target, "w"),
      this.maxWriteAttempts
    );
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close().catch(() => undefined);
    }
  }

  async _cleanupOrphans() {
    const directory = path.dirname(this.filePath);
    const prefix = `${path.basename(this.filePath)}.`;
    const now = Date.now();
    let entries = [];
    try {
      entries = await this._retry(
        "orphan scan",
        () => fs.promises.readdir(directory, { withFileTypes: true }),
        this.maxReadAttempts
      );
    } catch {
      return;
    }

    // Deliberately sequential: Promise.all(stat/unlink) across many temp files can
    // itself create an EMFILE storm on Windows/OneDrive.
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.startsWith(prefix) ||
          !(entry.name.endsWith(".tmp") || entry.name.endsWith(".fallback"))) continue;
      const target = path.join(directory, entry.name);
      try {
        const stat = await fs.promises.stat(target);
        if (now - stat.mtimeMs >= this.orphanMaxAgeMs) {
          await fs.promises.unlink(target);
        }
      } catch {
        // Cleanup is best effort and must never make the database unavailable.
      }
    }
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
      // Publish the new snapshot only after persistence succeeds.
      this.snapshot = clone(data);
      this.snapshotLoadedAt = new Date().toISOString();
      this.stats.writes += 1;
      this._recordError(null);
      return { data, mode };
    } catch (error) {
      this._recordError(error);
      this.logger.error?.(
        `[database] Write failed for ${this.filePath}: ${error.code || error.name || "ERROR"} ${error.message}`
      );
      throw error;
    }
  }

  write(data) {
    return this._enqueue(async () => {
      const result = await this._writeImmediate(clone(data));
      return clone(result.data);
    });
  }

  mutate(mutator) {
    return this._enqueue(async () => {
      // Use the process snapshot as the mutation base. The mutation queue makes
      // this serial and therefore prevents read/write races between API modules.
      const database = clone(await this._loadSnapshot());
      const result = await mutator(database);
      await this._writeImmediate(database);
      return clone(result);
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
