"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  LOCAL_CONFIG,
  resolveRuntimeDatabase,
  ensureRuntimeDatabase
} = require("../../server/persistence/runtimeDatabase");

const projectRoot = path.resolve(__dirname, "../..");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v100.3.56-"));
const checks = [];

function check(label, condition) {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`PASS: ${label}`);
}

try {
  const testRoot = path.join(temporaryRoot, "project");
  const seedPath = path.join(testRoot, "database", "seed", "seed.json");
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, JSON.stringify({ marker: "fictional-certification-seed" }, null, 2));

  const configuredPath = path.join(temporaryRoot, "configured", "database.json");
  fs.mkdirSync(path.dirname(configuredPath), { recursive: true });
  fs.writeFileSync(configuredPath, JSON.stringify({ marker: "configured-live-data" }));
  const environmentRuntime = resolveRuntimeDatabase({
    root: testRoot,
    env: { BLUE_CURRENT_DB: configuredPath }
  });
  check("BLUE_CURRENT_DB remains the highest-priority database authority", environmentRuntime.source === "environment" && environmentRuntime.path === configuredPath);

  const missingConfiguredPath = path.join(temporaryRoot, "missing", "database.json");
  assert.throws(
    () => ensureRuntimeDatabase({ root: testRoot, runtime: { path: missingConfiguredPath, source: "environment" } }),
    error => error.code === "CONFIGURED_RUNTIME_DATABASE_MISSING"
  );
  check("A missing explicitly configured database fails closed", !fs.existsSync(missingConfiguredPath));

  const localPath = path.join(temporaryRoot, "local", "blue-current.json");
  fs.mkdirSync(path.join(testRoot, "config"), { recursive: true });
  fs.writeFileSync(path.join(testRoot, LOCAL_CONFIG), JSON.stringify({ databasePath: localPath }, null, 2));
  const localRuntime = resolveRuntimeDatabase({ root: testRoot, env: {} });
  check("Machine-local configuration selects an absolute external database", localRuntime.source === "local-configuration" && localRuntime.path === localPath);

  const initialized = ensureRuntimeDatabase({ root: testRoot, runtime: localRuntime });
  check("A fresh local database is initialized from the committed seed", initialized.initialized && JSON.parse(fs.readFileSync(localPath, "utf8")).marker === "fictional-certification-seed");

  fs.writeFileSync(localPath, JSON.stringify({ marker: "preserved-operating-data" }));
  const preserved = ensureRuntimeDatabase({ root: testRoot, runtime: localRuntime });
  check("Existing operating data is validated and never overwritten by initialization", !preserved.initialized && JSON.parse(fs.readFileSync(localPath, "utf8")).marker === "preserved-operating-data");

  fs.unlinkSync(path.join(testRoot, LOCAL_CONFIG));
  const platformRuntime = resolveRuntimeDatabase({
    root: testRoot,
    env: { LOCALAPPDATA: path.join(temporaryRoot, "app-data") },
    platform: "win32"
  });
  check("Windows local default is outside the application repository", platformRuntime.source === "platform-default" && !platformRuntime.path.startsWith(testRoot));

  const validationSource = fs.readFileSync(path.join(projectRoot, "scripts", "validate.js"), "utf8");
  const serverSource = fs.readFileSync(path.join(projectRoot, "server", "server.js"), "utf8");
  const ignoreSource = fs.readFileSync(path.join(projectRoot, ".gitignore"), "utf8");
  check("Project validation reads the committed seed instead of live data", validationSource.includes('"database", "seed", "seed.json"') && !validationSource.includes('"database", "data", "blue-current.json"'));
  check("The active server resolves database authority before persistence starts", serverSource.includes("prepareRuntimeDatabase({ root: ROOT })"));
  check("Runtime database and local selection files are excluded from Git", ignoreSource.includes("database/data/blue-current.json") && ignoreSource.includes("config/runtime-database.local.json"));

  console.log(`V100.3.56 runtime database separation ${checks.length}/${checks.length}`);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
