"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { RuntimeBackupSchedule } = require("../../server/persistence/runtimeBackupSchedule");
const { backupHealth, listBackups, restoreBackup } = require("../../server/persistence/runtimeBackupManager");
const DatabaseService = require("../../server/services/databaseService");
const { findRuntimeArtifacts } = require("../check-release-data");
const root = path.resolve(__dirname, "../.."), temporary = fs.mkdtempSync(path.join(os.tmpdir(), "bc-managed-protection-"));
let count = 0;
function check(label, condition) { assert(condition, label); console.log(`PASS: ${label}`); count++; }
(async () => {
  try {
    const databasePath = path.join(temporary, "fictional.json");
    fs.writeFileSync(databasePath, JSON.stringify({ restaurant: "Fictional Backup Audit", revision: 1 }));
    const database = new DatabaseService(databasePath);
    let time = new Date("2026-10-19T12:00:00Z"), callback, scheduled = 0, cleared = 0;
    const logs = [], logger = { log: text => logs.push(text), error: text => logs.push(text) };
    const options = { databasePath, database, env: { BLUE_CURRENT_MANAGED_BACKUPS: "true", BLUE_CURRENT_BACKUP_RETENTION: "3" },
      now: () => time, logger, setTimer: fn => { callback = fn; scheduled++; return { unref() {} }; }, clearTimer: () => cleared++ };
    const schedule = new RuntimeBackupSchedule(options);
    const mutation = database.mutate(state => { state.revision = 2; return state; });
    await schedule.start(); await mutation;
    check("Startup creates a checksum-verified dated recovery point", backupHealth(databasePath, { now: time }).status === "protected");
    check("Scheduled snapshot follows queued writes", JSON.parse(fs.readFileSync(listBackups(databasePath)[0].path)).revision === 2);
    check("Backup files are private to the owning user", (fs.statSync(listBackups(databasePath)[0].path).mode & 0o777) === 0o600);
    check("A retry timer is installed without holding the process open", scheduled === 1);
    await callback();
    check("Fresh recovery points are reused between scheduled polls", listBackups(databasePath).length === 1);
    await schedule.stop();
    check("Shutdown cancels scheduling", cleared === 1 && schedule.stopped);
    const restarted = new RuntimeBackupSchedule(options);
    await restarted.start(); await restarted.stop();
    check("Restart reuses a fresh verified backup", listBackups(databasePath).length === 1);
    for (let i = 1; i <= 4; i++) { time = new Date(time.getTime() + 6 * 3600000); await schedule.run(); }
    check("Six-hour snapshots enforce bounded retention", listBackups(databasePath).length === 3);
    const candidate = listBackups(databasePath)[0];
    fs.appendFileSync(candidate.path, "tampered");
    check("Tampered recovery points are rejected", listBackups(databasePath).some(item => !item.ok));
    // Move beyond the next newest valid point so the scheduler replaces corrupt evidence.
    time = new Date(time.getTime() + 6 * 3600000); await schedule.run();
    check("Schedule creates new verified evidence after corruption", backupHealth(databasePath, { now: time }).latestVerifiedAt === time.toISOString());
    let release;
    const blocked = new RuntimeBackupSchedule({ ...options, database: { snapshotForBackup: () => new Promise(resolve => { release = resolve; }) } });
    time = new Date(time.getTime() + 6 * 3600000);
    const first = blocked.run(), second = blocked.run();
    check("Concurrent timer requests share one snapshot", first === second);
    let stopped = false; const stopping = blocked.stop().then(() => { stopped = true; });
    await Promise.resolve(); check("Shutdown waits for an in-flight recovery point", !stopped);
    release(JSON.stringify({ restaurant: "Fictional Backup Audit", revision: 3 })); await stopping;
    let failures = 0;
    time = new Date(time.getTime() + 6 * 3600000);
    const failed = new RuntimeBackupSchedule({ ...options, database: { snapshotForBackup: async () => { failures++; throw new Error("fictional-secret-payload"); } } });
    await failed.start();
    check("Backup failure is contained and another poll is scheduled", failures === 1 && failed.timer && !failed.stopped);
    check("Failure logging never dumps snapshot content", !logs.some(text => text.includes("fictional-secret-payload")));
    await failed.stop();
    const disabled = new RuntimeBackupSchedule({ ...options, env: {} }); await disabled.start();
    check("Development has no implicit backup schedule", disabled.stopped && !disabled.timer);
    assert.throws(() => new RuntimeBackupSchedule({ ...options, env: { BLUE_CURRENT_MANAGED_BACKUPS: "true", BLUE_CURRENT_BACKUP_RETENTION: "2" } }));
    check("Invalid retention fails before scheduling", true);
    // Restore only a disposable fictional database, never the hosted database.
    time = new Date(time.getTime() + 6 * 3600000);
    const name = listBackups(databasePath).find(item => item.ok).name;
    const restored = restoreBackup(databasePath, name, { confirm: `RESTORE ${name}`, now: time, retention: 3 });
    check("A scheduled recovery point restores in isolation with a safety copy", restored.ok && JSON.parse(fs.readFileSync(databasePath)).restaurant === "Fictional Backup Audit");
    const fixture = path.join(temporary, "release"); fs.mkdirSync(path.join(fixture, "nested/database/data"), { recursive: true });
    fs.writeFileSync(path.join(fixture, "nested/database/data/guests.json"), "{}");
    fs.writeFileSync(path.join(fixture, "runtime-backup.local.json"), "{}");
    fs.writeFileSync(path.join(fixture, ".env"), "fictional=1");
    check("Release scan rejects nested runtime folders and local authority", findRuntimeArtifacts(fixture).length === 3);
    check("Current source has no runtime database payload", findRuntimeArtifacts(root).length === 0);
    const docker = fs.readFileSync(path.join(root, "deploy/hosted-pilot/Dockerfile"), "utf8");
    check("Hosted image runs recursive release guard and enables scheduling", docker.includes("RUN node scripts/check-release-data.js") && docker.includes("BLUE_CURRENT_MANAGED_BACKUPS=true"));
    console.log(`V100.3.116 managed protection ${count}/${count}`);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
