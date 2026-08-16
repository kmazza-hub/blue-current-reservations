"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const pkg = require(path.join(root, "package.json"));
const DatabaseService = require(path.join(root, "server/services/databaseService"));
const ProductionMutationIntegrityService = require(path.join(root, "server/services/productionMutationIntegrityService"));

(async () => {
  assert(Number(pkg.version.split(".")[0]) >= 68, `Expected V68 or later, found ${pkg.version}`);

  const router = fs.readFileSync(path.join(root, "server/api/router.js"), "utf8");
  const server = fs.readFileSync(path.join(root, "server/server.js"), "utf8");
  const startup = fs.readFileSync(path.join(root, "client/js/startup-loader.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");

  assert(router.includes('/api/system/database-recovery'));
  assert(server.includes('await database.read();'));
  assert(server.includes('checkpointBackup("startup-verified-primary")'));
  assert(server.includes('recoverStalePrepared({ force: true })'));
  assert(server.includes('Verified recovery backup:'));
  assert(/V(?:68|69)(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bc-v6850-"));
  const dbPath = path.join(dir, "blue-current.json");
  fs.writeFileSync(dbPath, JSON.stringify({ counters: [{ id: "main", value: 1 }] }, null, 2));

  const quiet = { warn() {}, error() {} };
  const database = new DatabaseService(dbPath, { logger: quiet });

  // Establish a verified checkpoint and two committed states so .bak and .bak.prev exist.
  await database.read();
  const checkpoint = await database.checkpointBackup("test-startup");
  assert.equal(checkpoint.ok, true);

  await database.update("counters", "main", { value: 2 });
  await database.update("counters", "main", { value: 3 });

  let verification = await database.verifyBackups();
  assert.equal(verification.ok, true);
  assert(verification.backups.some(item => item.ok && item.target.endsWith(".bak")));
  assert(fs.existsSync(`${dbPath}.bak.meta.json`));
  assert(fs.existsSync(`${dbPath}.bak.prev`));
  assert(fs.existsSync(`${dbPath}.bak.prev.meta.json`));

  // Corrupt primary. A new process-level database instance must recover automatically.
  fs.writeFileSync(dbPath, "{ definitely-not-json ");
  const restarted = new DatabaseService(dbPath, { logger: quiet });
  const recovered = await restarted.read();
  assert.equal(recovered.counters[0].value, 3, "must restore newest verified backup");
  assert.equal(restarted.diagnostics().recoveries, 1);
  assert(restarted.diagnostics().lastRecovery?.source.endsWith(".bak"));

  const archives = fs.readdirSync(dir).filter(name => name.includes(".corrupt."));
  assert(archives.length >= 1, "corrupt primary should be preserved for forensic review");

  // Checksum tampering must invalidate .bak and force fallback to .bak.prev.
  await restarted.update("counters", "main", { value: 4 });
  await restarted.update("counters", "main", { value: 5 });

  const badBackup = JSON.parse(fs.readFileSync(`${dbPath}.bak`, "utf8"));
  badBackup.counters[0].value = 999;
  fs.writeFileSync(`${dbPath}.bak`, JSON.stringify(badBackup, null, 2));
  verification = await restarted.verifyBackups();
  const newest = verification.backups.find(item => item.target.endsWith(".bak"));
  const previous = verification.backups.find(item => item.target.endsWith(".bak.prev"));
  assert.equal(newest.ok, false);
  assert.equal(newest.error, "CHECKSUM_MISMATCH");
  assert.equal(previous.ok, true);

  fs.writeFileSync(dbPath, "{ corrupt-again ");
  const fallback = new DatabaseService(dbPath, { logger: quiet });
  const fallbackRecovered = await fallback.read();
  assert.notEqual(fallbackRecovered.counters[0].value, 999, "tampered backup must never be restored");
  assert(fallback.diagnostics().lastRecovery?.source.endsWith(".bak.prev"));

  // Restart reconciliation: prepared records with proof become committed-recovered;
  // records without proof become reconcile-required rather than silently retried.
  const integrityPath = path.join(dir, "integrity.json");
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  fs.writeFileSync(integrityPath, JSON.stringify({
    mutationIntegrityRecords: [
      {
        id: "mut_committed",
        organizationId: "org_test",
        method: "PATCH",
        path: "/api/tables/1",
        entityId: "1",
        idempotencyKey: "org_test:key1",
        expectedVersion: 2,
        status: "prepared",
        createdAt: old,
        updatedAt: old
      },
      {
        id: "mut_unknown",
        organizationId: "org_test",
        method: "POST",
        path: "/api/reservations",
        entityId: "collection",
        idempotencyKey: null,
        expectedVersion: 0,
        status: "prepared",
        createdAt: old,
        updatedAt: old
      }
    ],
    resourceVersions: [
      {
        id: "org_test:/api/tables/1:1",
        organizationId: "org_test",
        path: "/api/tables/1",
        entityId: "1",
        version: 3
      }
    ],
    idempotencyRecords: [
      {
        id: "org_test:key1",
        status: "complete",
        responseStatus: 200
      }
    ]
  }, null, 2));

  const integrityDb = new DatabaseService(integrityPath, { logger: quiet });
  const integrity = new ProductionMutationIntegrityService(integrityDb, { staleAfterMs: 1 });
  const restartRecovery = await integrity.recoverStalePrepared({ force: true });

  assert.equal(restartRecovery.recovered, 2);
  assert.equal(restartRecovery.committedRecovered, 1);
  assert.equal(restartRecovery.reconcileRequired, 1);

  const snapshot = await integrity.snapshot("org_test");
  assert.equal(snapshot.prepared, 0);
  assert.equal(snapshot.committedRecovered, 1);
  assert.equal(snapshot.reconcileRequired, 1);
  assert.equal(snapshot.healthy, false);

  console.log(JSON.stringify({
    ok: true,
    version: "68.50.0",
    verifiedRollingBackups: true,
    sha256BackupManifest: true,
    corruptPrimaryAutoRecovery: true,
    corruptPrimaryForensicArchive: true,
    checksumMismatchRejected: true,
    previousBackupFallback: true,
    startupReadBeforeListen: true,
    staleMutationRestartRecovery: true,
    ambiguousMutationRequiresReconciliation: true,
    noSilentMutationRetry: true,
    recoveryDiagnosticsEndpoint: true
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
