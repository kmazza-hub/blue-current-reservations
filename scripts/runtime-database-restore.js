"use strict";

const path = require("path");
const { resolveRuntimeDatabase } = require("../server/persistence/runtimeDatabase");
const { listBackups, restoreBackup } = require("../server/persistence/runtimeBackupManager");

const root = path.resolve(__dirname, "..");
const runtime = resolveRuntimeDatabase({ root });
const nameArgument = process.argv.find(argument => argument.startsWith("--name="));
const confirmArgument = process.argv.find(argument => argument.startsWith("--confirm="));
const name = nameArgument ? nameArgument.slice("--name=".length) : null;

if (!name) {
  console.log(`Runtime database: ${runtime.path}`);
  console.log("Verified recovery candidates:");
  for (const backup of listBackups(runtime.path)) {
    console.log(`${backup.ok ? "VERIFIED" : "INVALID"}  ${backup.name}${backup.createdAt ? `  ${backup.createdAt}` : ""}`);
  }
  console.log('\nNo data changed. To restore, stop the server and supply --name plus --confirm="RESTORE <exact-name>".');
  process.exit(0);
}

const result = restoreBackup(runtime.path, name, {
  confirm: confirmArgument ? confirmArgument.slice("--confirm=".length) : null,
  retention: 14
});
console.log(`Restored runtime database from: ${result.restoredFrom}`);
console.log(`Recovery SHA-256: ${result.sha256}`);
console.log(`Pre-restore safety backup: ${result.safetyBackup}`);
console.log(`Displaced primary retained at: ${result.displacedPrimary}`);
