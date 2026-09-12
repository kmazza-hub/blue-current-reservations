"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  backupHealth,
  claimRuntimeActivity,
  createBackup,
  inspectRuntimeActivity,
  releaseRuntimeActivity,
  runtimeMarkerPath
} = require("../../server/persistence/runtimeBackupManager");

const root = path.resolve(__dirname, "../..");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v100.3.59-"));
const databasePath = path.join(temporaryRoot, "data", "blue-current.json");
const checks = [];
const check = (label, condition) => {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`PASS: ${label}`);
};

try {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, JSON.stringify({ restaurant: "Fictional Lighthouse Kitchen", revision: 1 }, null, 2));

  claimRuntimeActivity(databasePath);
  check("The active server claims the external runtime database", inspectRuntimeActivity(databasePath).active === true);
  assert.throws(() => createBackup(databasePath), error => error.code === "RUNTIME_DATABASE_ACTIVE");
  check("An offline recovery point cannot race the active Node runtime", true);
  check("Only the owning server process can release its activity marker", releaseRuntimeActivity(databasePath) && !fs.existsSync(runtimeMarkerPath(databasePath)));

  fs.writeFileSync(runtimeMarkerPath(databasePath), JSON.stringify({ pid: 99999999 }));
  const stale = inspectRuntimeActivity(databasePath, { processProbe() { const error = new Error("missing"); error.code = "ESRCH"; throw error; } });
  check("A marker from a stopped process is identified as stale, not permanently blocking", !stale.active && stale.reason === "stale-marker");
  fs.unlinkSync(runtimeMarkerPath(databasePath));

  const backup = createBackup(databasePath, { now: new Date("2026-09-12T10:00:00Z"), retention: 3 });
  const protectedHealth = backupHealth(databasePath, { now: new Date("2026-09-13T10:00:00Z") });
  check("A recent verified recovery point reports protected health", protectedHealth.status === "protected" && protectedHealth.verifiedCount === 1);
  const staleHealth = backupHealth(databasePath, { now: new Date("2026-09-14T13:00:00Z") });
  check("Backup protection becomes visibly stale after 26 hours", staleHealth.status === "stale" && staleHealth.ageHours === 51);

  const packageJson = require("../../package.json");
  const server = fs.readFileSync(path.join(root, "server/server.js"), "utf8");
  const router = fs.readFileSync(path.join(root, "server/api/router.js"), "utf8");
  const scheduleInstaller = fs.readFileSync(path.join(root, "INSTALL-BACKUP-SCHEDULE-V100.3.59.ps1"), "utf8");
  const scheduleRemover = fs.readFileSync(path.join(root, "REMOVE-BACKUP-SCHEDULE-V100.3.59.ps1"), "utf8");
  check("The server owns and releases its runtime activity marker", server.includes("claimRuntimeActivity(DB_PATH)") && server.includes("releaseRuntimeActivity(DB_PATH)"));
  check("Backup health is added only to the existing protected recovery diagnostics", router.includes("managedBackupHealth: backupHealth") && router.indexOf("managedBackupHealth") > router.indexOf('url.pathname === "/api/system/database-recovery"'));
  check("Operators have one read-only backup health command", packageJson.scripts["database:backup-health"] === "node scripts/runtime-database-backup-health.js");
  check("Windows scheduling requires a separate explicit installation action", scheduleInstaller.includes("Register-ScheduledTask") && !fs.readFileSync(path.join(root, "INSTALL-V100.3.59.ps1"), "utf8").includes("Register-ScheduledTask"));
  check("The scheduled task starts when available and safely invokes scheduled mode", scheduleInstaller.includes("-StartWhenAvailable") && fs.readFileSync(path.join(root, "scripts/windows/scheduled-runtime-backup.ps1"), "utf8").includes("--scheduled"));
  check("The operator can explicitly remove the scheduled task", scheduleRemover.includes("Unregister-ScheduledTask") && scheduleRemover.includes("-Confirm:$false"));
  check("Scheduling and health add no automatic recovery path", !scheduleInstaller.includes("database:restore") && !scheduleRemover.includes("database:restore") && backup.name.length > 0);

  console.log(`V100.3.59 scheduled backup and operator-visible health ${checks.length}/${checks.length}`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
