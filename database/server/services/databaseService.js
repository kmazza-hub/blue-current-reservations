"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TRANSIENT_WINDOWS_ERRORS = new Set([
  "EPERM", "EBUSY", "EACCES", "ENOTEMPTY", "EMFILE", "ENFILE", "EEXIST"
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
      backupRefreshes: 0,
      backupVerifications: 0,
      recoveries: 0,
      lastRecovery: null,
      lastBackup: null,
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

  _isCloudSyncedPath() {
    return /(?:^|[\\/])(OneDrive|Dropbox|Google Drive)(?:[\\/]|$)/i.test(this.filePath);
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

  _sha256(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  _backupCandidates() {
    return [`${this.filePath}.bak`, `${this.filePath}.bak.prev`];
  }

  async _validateJsonFile(target, expectedHash = null) {
    try {
      const raw = await this._retry(
        `validate ${path.basename(target)}`,
        () => fs.promises.readFile(target, "utf8"),
        this.maxReadAttempts
      );
      const parsed = JSON.parse(raw);
      const hash = this._sha256(raw);
      if (expectedHash && hash !== expectedHash) {
        return { ok: false, target, error: "CHECKSUM_MISMATCH", hash, expectedHash };
      }
      return { ok: true, target, hash, bytes: Buffer.byteLength(raw), raw, parsed };
    } catch (error) {
      return {
        ok: false,
        target,
        error: error.code || error.name || "INVALID_JSON",
        message: String(error.message || error)
      };
    }
  }

  async checkpointBackup(source = "manual-checkpoint") {
    return this._enqueue(() => this._refreshBackup(source));
  }

  async verifyBackups() {
    const results = [];
    for (const target of this._backupCandidates()) {
      const manifestPath = `${target}.meta.json`;
      let expectedHash = null;
      try {
        const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
        expectedHash = manifest.sha256 || null;
      } catch {
        // Legacy backups without manifests remain recoverable if their JSON parses.
      }
      const result = await this._validateJsonFile(target, expectedHash);
      results.push({ ...result, raw: undefined, parsed: undefined });
    }
    this.stats.backupVerifications += 1;
    return {
      ok: results.some(item => item.ok),
      checkedAt: new Date().toISOString(),
      backups: results
    };
  }

  async _writeBackupManifest(target, raw, source = "database") {
    const manifest = {
      version: 1,
      source,
      databaseFile: path.basename(this.filePath),
      backupFile: path.basename(target),
      sha256: this._sha256(raw),
      bytes: Buffer.byteLength(raw),
      createdAt: new Date().toISOString()
    };
    const temporary = `${target}.meta.${process.pid}.${Date.now()}.tmp`;
    await this._writeDurableFile(temporary, JSON.stringify(manifest, null, 2));
    await this._retry("backup manifest replace", () => fs.promises.copyFile(temporary, `${target}.meta.json`));
    await fs.promises.unlink(temporary).catch(() => undefined);
    return manifest;
  }

  async recoverFromBackup(reason = "primary-read-failure") {
    const candidates = this._backupCandidates();
    for (const target of candidates) {
      let expectedHash = null;
      try {
        const manifest = JSON.parse(await fs.promises.readFile(`${target}.meta.json`, "utf8"));
        expectedHash = manifest.sha256 || null;
      } catch {}

      const verified = await this._validateJsonFile(target, expectedHash);
      if (!verified.ok) continue;

      const archivePath = `${this.filePath}.corrupt.${Date.now()}.json`;
      if (await this._pathExists(this.filePath)) {
        await fs.promises.copyFile(this.filePath, archivePath).catch(() => undefined);
      }

      const temporary = this._uniquePath("recovery");
      try {
        await this._writeDurableFile(temporary, verified.raw);
        const tempCheck = await this._validateJsonFile(temporary, verified.hash);
        if (!tempCheck.ok) throw new Error(`Recovery staging verification failed: ${tempCheck.error}`);

        await this._replaceFromTemporary(temporary, { skipBackup: true });
        this.snapshot = clone(verified.parsed);
        this.snapshotLoadedAt = new Date().toISOString();
        this.stats.recoveries += 1;
        this.stats.lastRecovery = {
          at: this.snapshotLoadedAt,
          reason,
          source: target,
          archivedPrimary: await this._pathExists(archivePath) ? archivePath : null,
          sha256: verified.hash
        };
        this._recordError(null);
        return { ok: true, ...this.stats.lastRecovery };
      } finally {
        await fs.promises.unlink(temporary).catch(() => undefined);
      }
    }

    const error = new Error("Primary database is unavailable and no verified backup can be recovered.");
    error.code = "DATABASE_RECOVERY_UNAVAILABLE";
    throw error;
  }

  async _readDisk() {
    this.stats.diskReads += 1;
    try {
      const raw = await this._retry(
        "database read",
        () => fs.promises.readFile(this.filePath, "utf8"),
        this.maxReadAttempts
      );
      return JSON.parse(raw);
    } catch (error) {
      this._recordError(error);
      this.logger.error?.(
        `[database] Primary read failed (${error.code || error.name || "ERROR"}); attempting verified backup recovery.`
      );
      const recovery = await this.recoverFromBackup(error.code || error.name || "PRIMARY_READ_FAILURE");
      if (!recovery.ok || !this.snapshot) throw error;
      return clone(this.snapshot);
    }
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

  async awaitIdle() {
    try {
      await this.queue;
      return { ok: true, at: new Date().toISOString() };
    } catch (error) {
      return {
        ok: false,
        at: new Date().toISOString(),
        error: error.code || error.name || "DATABASE_QUEUE_ERROR",
        message: String(error.message || error)
      };
    }
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

  async _refreshBackup(source = "database") {
    if (!(await this._pathExists(this.filePath))) return { ok: false, reason: "primary-missing" };

    const primary = await this._validateJsonFile(this.filePath);
    if (!primary.ok) {
      return { ok: false, reason: "primary-invalid", error: primary.error };
    }

    const backupPath = `${this.filePath}.bak`;
    const previousPath = `${this.filePath}.bak.prev`;

    let currentBackupHash = null;
    try {
      const currentManifest = JSON.parse(await fs.promises.readFile(`${backupPath}.meta.json`, "utf8"));
      currentBackupHash = currentManifest.sha256 || null;
    } catch {}
    const currentBackup = await this._validateJsonFile(backupPath, currentBackupHash);
    if (currentBackup.ok) {
      await this._retry("previous backup refresh", () => fs.promises.copyFile(backupPath, previousPath));
      await this._writeBackupManifest(previousPath, currentBackup.raw, "previous-verified-backup");
    }

    const temporary = `${backupPath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await this._writeDurableFile(temporary, primary.raw);
      const staged = await this._validateJsonFile(temporary, primary.hash);
      if (!staged.ok) throw new Error(`Backup staging verification failed: ${staged.error}`);

      await this._retry("backup refresh", () => fs.promises.copyFile(temporary, backupPath));
      const finalCheck = await this._validateJsonFile(backupPath, primary.hash);
      if (!finalCheck.ok) throw new Error(`Backup verification failed: ${finalCheck.error}`);
      const manifest = await this._writeBackupManifest(backupPath, primary.raw, source);

      this.stats.backupRefreshes += 1;
      this.stats.lastBackup = {
        at: new Date().toISOString(),
        path: backupPath,
        sha256: manifest.sha256,
        bytes: manifest.bytes,
        source
      };
      return { ok: true, ...this.stats.lastBackup };
    } finally {
      await fs.promises.unlink(temporary).catch(() => undefined);
    }
  }

  async _replaceFromTemporary(temporary, { skipBackup = false } = {}) {
    try {
      const renameAttempts = this._isCloudSyncedPath() ? 1 : this.maxWriteAttempts;
      await this._retry("atomic rename", () => fs.promises.rename(temporary, this.filePath), renameAttempts);
      return "rename";
    } catch (renameError) {
      if (!this._isTransient(renameError)) throw renameError;

      this.logger.warn?.(
        `[database] Atomic rename remained blocked (${renameError.code}); using safe copy fallback.`
      );
      if (!skipBackup) await this._refreshBackup("pre-copy-fallback");
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

      // Seed the recovery backup before the first replacement. After that, each
      // successful write refreshes the verified backup to the newly committed state.
      if (!(await this._pathExists(`${this.filePath}.bak`))) {
        await this._refreshBackup("pre-write-initial").catch(error => {
          this.logger.warn?.(`[database] Initial backup seed skipped: ${error.message}`);
        });
      }

      const mode = await this._replaceFromTemporary(temporary, { skipBackup: true });

      // Publish the new snapshot only after persistence succeeds.
      this.snapshot = clone(data);
      this.snapshotLoadedAt = new Date().toISOString();
      this.stats.writes += 1;
      this._recordError(null);

      // Refresh the verified backup to the newly committed state. Failure here
      // does not invalidate the primary write; the prior verified backup remains.
      await this._refreshBackup("post-write").catch(error => {
        this.logger.warn?.(`[database] Post-write backup refresh failed: ${error.message}`);
      });

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

  insert(collection, entity) {
    return this.create(collection, entity);
  }

  delete(collection, id) {
    return this.mutate(database => {
      database[collection] ||= [];
      const index = database[collection].findIndex(item => item.id === id);
      if (index === -1) return null;
      return database[collection].splice(index, 1)[0];
    });
  }
}

module.exports = DatabaseService;
