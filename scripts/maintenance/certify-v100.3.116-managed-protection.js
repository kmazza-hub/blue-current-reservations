"use strict";
const { spawnSync } = require("node:child_process"), path = require("node:path");
const root = path.resolve(__dirname, "../..");
for (const file of [
  "scripts/check-release-data.js",
  "scripts/maintenance/test-v100.3.116-managed-protection.js",
  "scripts/maintenance/test-v100.3.116-hosted-backup-runtime.js",
  "scripts/maintenance/test-v100.3.58-runtime-backup-safe-recovery.js",
  "scripts/maintenance/test-v100.3.59-scheduled-backup-health.js",
  "scripts/maintenance/test-v100.3.60-server-coordinated-backup.js",
  "scripts/maintenance/certify-v100.3.115-return-navigation.js"
]) {
  const result = spawnSync(process.execPath, [path.join(root, file)], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("V100.3.116 certification passed — managed backups, recursive release protection, current CI; activation remains gated.");
