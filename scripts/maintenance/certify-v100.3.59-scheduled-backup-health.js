"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const scripts = [
  "scripts/validate.js",
  "scripts/maintenance/test-v100.3.54-authentication-handshake.js",
  "scripts/maintenance/test-v100.3.55-first-class-operating-lifecycle.js",
  "scripts/maintenance/test-v100.3.56-runtime-database-separation.js",
  "scripts/maintenance/test-v100.3.57-fullscreen-floor-operational-parity.js",
  "scripts/maintenance/test-v100.3.58-runtime-backup-safe-recovery.js",
  "scripts/maintenance/test-v100.3.59-scheduled-backup-health.js"
];

for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`PILOT CERTIFICATION BLOCKED: ${script}`);
    process.exit(result.status || 1);
  }
}

console.log("\nV100.3.59 SCHEDULED BACKUP AND OPERATOR-VISIBLE HEALTH CERTIFIED");
