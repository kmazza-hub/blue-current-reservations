"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const scripts = [
  "scripts/maintenance/certify-v100.3.74-visible-sign-out.js",
  "scripts/maintenance/test-v100.3.75-workspace-operating-truth-continuity.js"
];

for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("\nV100.3.75 WORKSPACE AND OPERATING-TRUTH CONTINUITY CERTIFIED");
