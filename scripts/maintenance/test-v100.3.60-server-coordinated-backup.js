"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const DatabaseService = require("../../server/services/databaseService");
const { createPersistence } = require("../../server/persistence/persistenceFactory");
const { listBackups } = require("../../server/persistence/runtimeBackupManager");
const { LOCAL_BACKUP_CONFIG, RuntimeBackupCoordinator, isDirectLoopback } = require("../../server/persistence/runtimeBackupCoordinator");

const root = path.resolve(__dirname, "../..");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v100.3.60-"));
const databasePath = path.join(temporaryRoot, "data", "blue-current.json");
const token = "fictional-certification-token-1234567890";
const checks = [];
const check = (label, condition) => {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`PASS: ${label}`);
};

function responseRecorder() {
  return {
    status: null,
    body: "",
    writeHead(status) { this.status = status; },
    end(body = "") { this.body = body; }
  };
}

(async () => {
  try {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.mkdirSync(path.join(temporaryRoot, "config"), { recursive: true });
    fs.writeFileSync(databasePath, JSON.stringify({ restaurant: "Fictional Seaside Dining", revision: 1 }, null, 2));
    fs.writeFileSync(path.join(temporaryRoot, LOCAL_BACKUP_CONFIG), JSON.stringify({ token, retention: 3 }));

    const ordered = new DatabaseService(databasePath, { logger: { warn() {}, error() {} } });
    const mutation = ordered.mutate(state => { state.revision = 2; return state; });
    const snapshot = ordered.snapshotForBackup();
    await mutation;
    check("The backup snapshot waits behind an active persistence mutation", JSON.parse(await snapshot).revision === 2);

    const database = createPersistence({ driver: "json", databasePath, options: { logger: { warn() {}, error() {} } } });
    await database.read();
    const coordinator = new RuntimeBackupCoordinator({ root: temporaryRoot, databasePath, database });
    const directRequest = {
      method: "POST",
      url: "/api/local/runtime-backup",
      socket: { remoteAddress: "127.0.0.1" },
      headers: { host: "localhost:8787", "x-blue-current-backup-token": token }
    };
    const directResponse = responseRecorder();
    await coordinator.handle(directRequest, directResponse);
    const result = JSON.parse(directResponse.body);
    check("An approved direct-local request creates a verified online recovery point", directResponse.status === 200 && result.ok && listBackups(databasePath)[0].ok);

    const forwardedRequest = { ...directRequest, headers: { ...directRequest.headers, "x-forwarded-for": "203.0.113.7" } };
    const forwardedResponse = responseRecorder();
    await coordinator.handle(forwardedRequest, forwardedResponse);
    check("Cloudflare-forwarded requests cannot invoke local backup authority", forwardedResponse.status === 404);
    check("Only exact loopback host and socket requests qualify as local", isDirectLoopback(directRequest) && !isDirectLoopback(forwardedRequest));

    const wrongTokenResponse = responseRecorder();
    await coordinator.handle({ ...directRequest, headers: { host: "localhost:8787", "x-blue-current-backup-token": "wrong-token-value-that-is-long-enough" } }, wrongTokenResponse);
    check("An invalid local backup token fails closed without revealing authority", wrongTokenResponse.status === 404);
    check("Rejected backup attempts create no additional recovery points", listBackups(databasePath).length === 1);

    const gatewaySource = fs.readFileSync(path.join(root, "server/persistence/persistenceGateway.js"), "utf8");
    const serverSource = fs.readFileSync(path.join(root, "server/server.js"), "utf8");
    const runnerSource = fs.readFileSync(path.join(root, "scripts/windows/scheduled-runtime-backup.ps1"), "utf8");
    const installerSource = fs.readFileSync(path.join(root, "INSTALL-BACKUP-SCHEDULE-V100.3.60.ps1"), "utf8");
    const ignoreSource = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
    check("Unsupported persistence drivers fail closed instead of copying live files", gatewaySource.includes("PERSISTENCE_CAPABILITY_UNAVAILABLE") && gatewaySource.includes("snapshotForBackup"));
    check("The server owns the coordinator inside its existing request boundary", serverSource.includes("runtimeBackupCoordinator.handles(request)") && serverSource.includes("await runtimeBackupCoordinator.handle(request, response)"));
    check("The scheduled runner falls back from offline mode to local server coordination", runnerSource.includes("$ExitCode -eq 3") && runnerSource.includes("/api/local/runtime-backup"));
    check("Machine-local backup authority is generated only by explicit schedule approval", installerSource.includes("RandomNumberGenerator") && installerSource.includes("Register-ScheduledTask"));
    check("The local backup secret is excluded from Git", ignoreSource.includes("config/runtime-backup.local.json"));
    check("Server-coordinated backup exposes no restore operation", !runnerSource.includes("database:restore") && !serverSource.includes("runtimeBackupCoordinator.restore"));

    console.log(`V100.3.60 server-coordinated online backup ${checks.length}/${checks.length}`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exit(1); });
