"use strict";

const { backupHealth, createBackupFromContent } = require("./runtimeBackupManager");

// The owning server takes a queue-ordered snapshot. This schedule never restores
// data and never opens a public backup endpoint.
class RuntimeBackupSchedule {
  constructor({ databasePath, database, env = process.env, logger = console,
    now = () => new Date(), setTimer = setTimeout, clearTimer = clearTimeout }) {
    this.enabled = String(env.BLUE_CURRENT_MANAGED_BACKUPS || "false") === "true";
    this.databasePath = databasePath;
    this.database = database;
    this.logger = logger;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.intervalHours = Number(env.BLUE_CURRENT_BACKUP_INTERVAL_HOURS || 6);
    this.retention = Number(env.BLUE_CURRENT_BACKUP_RETENTION || 28);
    if (this.enabled && (!Number.isInteger(this.intervalHours) || this.intervalHours < 1 || this.intervalHours > 24 ||
        !Number.isInteger(this.retention) || this.retention < 3 || this.retention > 365)) {
      throw new Error("Managed backups require interval hours 1–24 and retention 3–365.");
    }
    this.stopped = true;
    this.inFlight = null;
    this.timer = null;
  }

  run() {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.capture().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async capture() {
    try {
      const now = this.now();
      const health = backupHealth(this.databasePath, { now });
      if (health.latestVerifiedAt && health.ageHours < this.intervalHours) return { ok: true, skipped: true };
      const raw = await this.database.snapshotForBackup();
      const result = createBackupFromContent(this.databasePath, raw, {
        retention: this.retention, now, source: "server-managed-schedule"
      });
      this.logger.log(`[backup] Managed recovery point verified: ${result.name}`);
      return { ok: true, name: result.name };
    } catch (error) {
      // Report failure without dumping database content or interrupting service.
      this.logger.error(`[backup] Managed recovery point failed (${error.code || error.name}); retry in five minutes.`);
      return { ok: false };
    }
  }

  async start() {
    if (!this.enabled || !this.stopped) return;
    this.stopped = false;
    await this.tick();
  }

  async tick() {
    const result = await this.run();
    if (this.stopped) return;
    // Poll at five minutes to retry failures and retain the six-hour cadence
    // across restarts. A fresh verified backup is reused rather than duplicated.
    this.timer = this.setTimer(() => this.tick(), 5 * 60 * 1000);
    this.timer.unref?.();
    return result;
  }

  async stop() {
    this.stopped = true;
    if (this.timer) this.clearTimer(this.timer);
    if (this.inFlight) await this.inFlight;
  }
}

module.exports = { RuntimeBackupSchedule };
