"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  backupDirectory,
  createBackup,
  listBackups,
  restoreBackup
} = require("../../server/persistence/runtimeBackupManager");

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v100.3.58-"));
const databasePath = path.join(temporaryRoot, "data", "blue-current.json");
const checks = [];
const check = (label, condition) => {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`PASS: ${label}`);
};

try {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, JSON.stringify({ restaurant: "Fictional Harbor Grill", revision: 1 }, null, 2));
  const original = fs.readFileSync(databasePath, "utf8");
  const first = createBackup(databasePath, { now: new Date("2026-09-12T12:00:00Z"), retention: 3 });
  check("A timestamped backup is stored beside the external runtime data, not in source", first.path.startsWith(backupDirectory(databasePath)) && first.name.includes("20260912T120000Z"));
  check("Every accepted backup has a checksum manifest", fs.existsSync(`${first.path}.meta.json`) && first.manifest.sha256.length === 64);
  check("A backup is re-read and verified before it is reported successful", listBackups(databasePath)[0].ok === true);

  fs.writeFileSync(databasePath, JSON.stringify({ restaurant: "Fictional Harbor Grill", revision: 2 }, null, 2));
  assert.throws(() => restoreBackup(databasePath, first.name), error => error.code === "RECOVERY_APPROVAL_REQUIRED");
  check("Recovery cannot run without the exact explicit operator confirmation", JSON.parse(fs.readFileSync(databasePath, "utf8")).revision === 2);
  assert.throws(() => restoreBackup(databasePath, "../outside.json", { confirm: "RESTORE ../outside.json" }), error => error.code === "INVALID_BACKUP_NAME");
  check("Recovery candidates cannot escape the managed backup directory", true);

  const restored = restoreBackup(databasePath, first.name, {
    confirm: `RESTORE ${first.name}`,
    retention: 3,
    now: new Date("2026-09-12T12:01:00Z")
  });
  check("Approved recovery restores the verified candidate", fs.readFileSync(databasePath, "utf8") === original && restored.sha256 === first.manifest.sha256);
  check("Recovery first preserves the displaced operating database", fs.existsSync(restored.displacedPrimary) && JSON.parse(fs.readFileSync(restored.displacedPrimary, "utf8")).revision === 2);
  check("Recovery also creates a verified pre-restore safety backup", listBackups(databasePath).some(item => item.name === restored.safetyBackup && item.ok));

  const corrupt = createBackup(databasePath, { now: new Date("2026-09-12T12:02:00Z"), retention: 3 });
  fs.writeFileSync(corrupt.path, "{not-json");
  assert.throws(() => restoreBackup(databasePath, corrupt.name, { confirm: `RESTORE ${corrupt.name}` }), SyntaxError);
  check("Invalid or checksum-mismatched backup content fails closed", fs.readFileSync(databasePath, "utf8") === original);

  createBackup(databasePath, { now: new Date("2026-09-12T12:03:00Z"), retention: 3 });
  createBackup(databasePath, { now: new Date("2026-09-12T12:04:00Z"), retention: 3 });
  const unrelated = path.join(backupDirectory(databasePath), "operator-notes.txt");
  fs.writeFileSync(unrelated, "preserve me");
  createBackup(databasePath, { now: new Date("2026-09-12T12:05:00Z"), retention: 3 });
  check("Bounded retention keeps only the configured managed backup count", listBackups(databasePath).length === 3);
  check("Retention never removes unrelated files", fs.readFileSync(unrelated, "utf8") === "preserve me");

  const packageJson = require("../../package.json");
  check("V100.3.58 exposes deliberate backup and recovery commands", packageJson.scripts["database:backup"] && packageJson.scripts["database:restore"]);
  console.log(`V100.3.58 runtime backup and safe recovery ${checks.length}/${checks.length}`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
