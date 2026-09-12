"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BACKUP_PREFIX = "blue-current-runtime-";
const BACKUP_SUFFIX = ".json";

function sha256(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function backupDirectory(databasePath) {
  return path.join(path.dirname(databasePath), "backups");
}

function backupName(date = new Date()) {
  return `${BACKUP_PREFIX}${timestamp(date)}${BACKUP_SUFFIX}`;
}

function runtimeMarkerPath(databasePath) {
  return `${databasePath}.active.json`;
}

function processIsActive(pid, processProbe = process.kill) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try {
    processProbe(Number(pid), 0);
    return true;
  } catch (error) {
    return error && error.code === "EPERM";
  }
}

function inspectRuntimeActivity(databasePath, options = {}) {
  const markerPath = runtimeMarkerPath(databasePath);
  if (!fs.existsSync(markerPath)) return { active: false, markerPath, reason: "marker-absent" };
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    const active = processIsActive(marker.pid, options.processProbe);
    return { active, markerPath, marker, reason: active ? "runtime-active" : "stale-marker" };
  } catch (error) {
    return { active: true, markerPath, reason: "marker-unreadable", error: error.code || error.name };
  }
}

function claimRuntimeActivity(databasePath) {
  const markerPath = runtimeMarkerPath(databasePath);
  const current = inspectRuntimeActivity(databasePath);
  if (current.active && Number(current.marker?.pid) !== process.pid) {
    const error = new Error(`Runtime database is already owned by process ${current.marker?.pid || "unknown"}.`);
    error.code = "RUNTIME_DATABASE_ACTIVE";
    throw error;
  }
  const marker = { version: 1, pid: process.pid, startedAt: new Date().toISOString(), databasePath };
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), "utf8");
  return marker;
}

function releaseRuntimeActivity(databasePath) {
  const markerPath = runtimeMarkerPath(databasePath);
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    if (Number(marker.pid) !== process.pid) return false;
    fs.unlinkSync(markerPath);
    return true;
  } catch {
    return false;
  }
}

function validateRetention(value) {
  const retention = Number(value ?? 14);
  if (!Number.isInteger(retention) || retention < 3 || retention > 365) {
    const error = new Error("Backup retention must be a whole number from 3 through 365.");
    error.code = "INVALID_BACKUP_RETENTION";
    throw error;
  }
  return retention;
}

function readVerifiedJson(filePath, expectedHash = null) {
  const raw = fs.readFileSync(filePath, "utf8");
  JSON.parse(raw);
  const hash = sha256(raw);
  if (expectedHash && expectedHash !== hash) {
    const error = new Error(`Backup checksum does not match its manifest: ${path.basename(filePath)}`);
    error.code = "BACKUP_CHECKSUM_MISMATCH";
    throw error;
  }
  return { raw, hash, bytes: Buffer.byteLength(raw) };
}

function writeExclusive(filePath, content) {
  const handle = fs.openSync(filePath, "wx");
  try {
    fs.writeFileSync(handle, content, "utf8");
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
}

function listBackups(databasePath) {
  const directory = backupDirectory(databasePath);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.startsWith(BACKUP_PREFIX) &&
      entry.name.endsWith(BACKUP_SUFFIX) && !entry.name.endsWith(`${BACKUP_SUFFIX}.meta.json`))
    .map(entry => {
      const filePath = path.join(directory, entry.name);
      const manifestPath = `${filePath}.meta.json`;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        const verified = readVerifiedJson(filePath, manifest.sha256);
        return { name: entry.name, path: filePath, ok: true, ...verified, raw: undefined, createdAt: manifest.createdAt };
      } catch (error) {
        return { name: entry.name, path: filePath, ok: false, error: error.code || error.name, message: error.message };
      }
    })
    .sort((left, right) => right.name.localeCompare(left.name));
}

function pruneBackups(databasePath, retention) {
  const verifiedRetention = validateRetention(retention);
  const backups = listBackups(databasePath);
  const removed = [];
  for (const backup of backups.slice(verifiedRetention)) {
    fs.unlinkSync(backup.path);
    fs.rmSync(`${backup.path}.meta.json`, { force: true });
    removed.push(backup.name);
  }
  return removed;
}

function createBackup(databasePath, options = {}) {
  if (!path.isAbsolute(databasePath)) throw new TypeError("Runtime database path must be absolute.");
  const activity = inspectRuntimeActivity(databasePath, options);
  if (activity.active && !options.allowActive) {
    const error = new Error("Runtime database is active. Stop Blue Current before creating this recovery point.");
    error.code = "RUNTIME_DATABASE_ACTIVE";
    throw error;
  }
  const primary = readVerifiedJson(databasePath);
  const directory = backupDirectory(databasePath);
  fs.mkdirSync(directory, { recursive: true });
  const name = backupName(options.now);
  const target = path.join(directory, name);
  const manifest = {
    version: 1,
    kind: "blue-current-runtime-backup",
    databaseFile: path.basename(databasePath),
    backupFile: name,
    sha256: primary.hash,
    bytes: primary.bytes,
    createdAt: (options.now || new Date()).toISOString(),
    source: options.source || "operator-approved"
  };
  writeExclusive(target, primary.raw);
  try {
    writeExclusive(`${target}.meta.json`, JSON.stringify(manifest, null, 2));
    readVerifiedJson(target, manifest.sha256);
  } catch (error) {
    fs.rmSync(target, { force: true });
    fs.rmSync(`${target}.meta.json`, { force: true });
    throw error;
  }
  const removed = pruneBackups(databasePath, options.retention);
  return { ok: true, name, path: target, manifest, removed };
}

function backupHealth(databasePath, options = {}) {
  const now = options.now || new Date();
  const staleAfterHours = Number(options.staleAfterHours ?? 26);
  const backups = listBackups(databasePath);
  const verified = backups.filter(item => item.ok);
  const invalid = backups.filter(item => !item.ok);
  const latest = verified[0] || null;
  const latestAt = latest?.createdAt ? new Date(latest.createdAt) : null;
  const ageHours = latestAt && !Number.isNaN(latestAt.getTime())
    ? Math.max(0, (now.getTime() - latestAt.getTime()) / 3_600_000)
    : null;
  const status = !latest ? "unprotected" : ageHours > staleAfterHours ? "stale" : "protected";
  return {
    status,
    checkedAt: now.toISOString(),
    staleAfterHours,
    latestVerifiedBackup: latest ? latest.name : null,
    latestVerifiedAt: latest?.createdAt || null,
    ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
    verifiedCount: verified.length,
    invalidCount: invalid.length,
    runtimeActive: inspectRuntimeActivity(databasePath, options).active
  };
}

function resolveCandidate(databasePath, name) {
  if (!name || path.basename(name) !== name || !name.startsWith(BACKUP_PREFIX) || !name.endsWith(BACKUP_SUFFIX)) {
    const error = new Error("Recovery candidate must be the exact name of a managed Blue Current runtime backup.");
    error.code = "INVALID_BACKUP_NAME";
    throw error;
  }
  return path.join(backupDirectory(databasePath), name);
}

function restoreBackup(databasePath, name, options = {}) {
  if (options.confirm !== `RESTORE ${name}`) {
    const error = new Error(`Recovery requires explicit confirmation: RESTORE ${name}`);
    error.code = "RECOVERY_APPROVAL_REQUIRED";
    throw error;
  }
  const activity = inspectRuntimeActivity(databasePath, options);
  if (activity.active) {
    const error = new Error("Runtime database is active. Stop Blue Current before recovery.");
    error.code = "RUNTIME_DATABASE_ACTIVE";
    throw error;
  }
  const candidate = resolveCandidate(databasePath, name);
  const manifest = JSON.parse(fs.readFileSync(`${candidate}.meta.json`, "utf8"));
  const verified = readVerifiedJson(candidate, manifest.sha256);
  const safety = createBackup(databasePath, {
    retention: options.retention,
    source: `pre-restore:${name}`,
    now: options.now
  });
  const staged = `${databasePath}.${process.pid}.${Date.now()}.restore.tmp`;
  const displaced = `${databasePath}.pre-restore.${Date.now()}.json`;
  try {
    writeExclusive(staged, verified.raw);
    readVerifiedJson(staged, verified.hash);
    fs.renameSync(databasePath, displaced);
    try {
      fs.renameSync(staged, databasePath);
    } catch (error) {
      fs.renameSync(displaced, databasePath);
      throw error;
    }
    readVerifiedJson(databasePath, verified.hash);
    return { ok: true, restoredFrom: name, sha256: verified.hash, safetyBackup: safety.name, displacedPrimary: displaced };
  } finally {
    fs.rmSync(staged, { force: true });
  }
}

module.exports = {
  BACKUP_PREFIX,
  backupHealth,
  backupDirectory,
  claimRuntimeActivity,
  createBackup,
  inspectRuntimeActivity,
  listBackups,
  releaseRuntimeActivity,
  runtimeMarkerPath,
  restoreBackup
};
