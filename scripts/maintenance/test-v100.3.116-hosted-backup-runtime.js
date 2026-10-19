"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), { spawn } = require("node:child_process");
const { backupHealth } = require("../../server/persistence/runtimeBackupManager");
const root = path.resolve(__dirname, "../.."), temporary = fs.mkdtempSync(path.join(os.tmpdir(), "bc-backup-runtime-"));
const primary = path.join(temporary, "fictional.json"), port = 29000 + Math.floor(Math.random() * 1000), base = `http://127.0.0.1:${port}`;
fs.copyFileSync(path.join(root, "database/seed/seed.json"), primary);
let child, output = "";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function stop() {
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGTERM");
    let timeout;
    try { await Promise.race([exited, new Promise((_, reject) => { timeout = setTimeout(() => { child.kill("SIGKILL"); reject(Error("Shutdown timed out")); }, 12000); })]); }
    finally { clearTimeout(timeout); }
  }
}
async function start() {
  child = spawn(process.execPath, [path.join(root, "scripts/hosted-start.js")], { cwd: root, env: { ...process.env,
    NODE_ENV: "production", BLUE_CURRENT_ENV: "production", BLUE_CURRENT_DB: primary,
    BLUE_CURRENT_HARBOR_DEMO_DB: path.join(temporary, "fictional-demo.json"),
    BLUE_CURRENT_MANAGED_BACKUPS: "true", BLUE_CURRENT_BACKUP_RETENTION: "3", PORT: String(port),
    BLUE_CURRENT_PUBLIC_URL: "https://fictional.example", BLUE_CURRENT_ALLOWED_ORIGINS: "https://fictional.example", BLUE_CURRENT_INSTANCE_COUNT: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null) throw Error("Fictional hosted start failed: " + output.slice(-1500));
    try { const response = await fetch(base + "/api/health"); if (response.ok) return; } catch {}
    await pause(100);
  }
  throw Error("Fictional hosted startup timed out");
}
(async () => {
  try {
    await start();
    const first = backupHealth(primary);
    assert.equal(first.status, "protected"); assert.equal(first.verifiedCount, 1);
    assert(output.includes("[backup] Managed recovery point verified:"));
    assert.equal((await fetch(base + "/api/system/database-recovery")).status, 401);
    assert.equal((await fetch(base + "/api/harbor-point-live/config")).status, 401);
    await stop(); await start();
    const restarted = backupHealth(primary);
    assert.equal(restarted.status, "protected"); assert.equal(restarted.latestVerifiedBackup, first.latestVerifiedBackup);
    assert.equal(restarted.verifiedCount, 1);
    await stop(); assert(output.includes("[shutdown] Blue Current shutdown complete."));
    console.log("V100.3.116 fictional hosted runtime passed: startup protection, protected diagnostics, restart continuity, graceful shutdown.");
  } finally { await stop(); fs.rmSync(temporary, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
