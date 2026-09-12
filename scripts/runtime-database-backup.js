"use strict";

const path = require("path");
const { resolveRuntimeDatabase } = require("../server/persistence/runtimeDatabase");
const { createBackup, listBackups } = require("../server/persistence/runtimeBackupManager");

const root = path.resolve(__dirname, "..");
const runtime = resolveRuntimeDatabase({ root });
const retentionArgument = process.argv.find(argument => argument.startsWith("--retention="));
const retention = retentionArgument ? Number(retentionArgument.split("=")[1]) : 14;
const result = createBackup(runtime.path, { retention, source: "operator-command" });

console.log(`Runtime database: ${runtime.path}`);
console.log(`Verified backup: ${result.path}`);
console.log(`SHA-256: ${result.manifest.sha256}`);
console.log(`Retention: ${retention} managed backups (${result.removed.length} pruned)`);
console.log(`Verified backup count: ${listBackups(runtime.path).filter(item => item.ok).length}`);
