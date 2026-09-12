"use strict";

const path = require("path");
const { resolveRuntimeDatabase } = require("../server/persistence/runtimeDatabase");
const { backupHealth, listBackups } = require("../server/persistence/runtimeBackupManager");

const root = path.resolve(__dirname, "..");
const runtime = resolveRuntimeDatabase({ root });
const health = backupHealth(runtime.path);

console.log(`Runtime database: ${runtime.path}`);
console.log(`Backup protection: ${health.status.toUpperCase()}`);
console.log(`Latest verified: ${health.latestVerifiedBackup || "none"}`);
console.log(`Latest age: ${health.ageHours === null ? "unavailable" : `${health.ageHours} hours`}`);
console.log(`Verified / invalid: ${health.verifiedCount} / ${health.invalidCount}`);
console.log(`Runtime active: ${health.runtimeActive ? "yes" : "no"}`);
for (const backup of listBackups(runtime.path).filter(item => !item.ok)) {
  console.log(`INVALID: ${backup.name} (${backup.error})`);
}
if (health.status !== "protected" || health.invalidCount > 0) process.exitCode = 2;
