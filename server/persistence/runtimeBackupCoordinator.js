"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createBackupFromContent } = require("./runtimeBackupManager");

const LOCAL_BACKUP_CONFIG = path.join("config", "runtime-backup.local.json");

function readConfiguration(root) {
  const configurationPath = path.join(root, LOCAL_BACKUP_CONFIG);
  if (!fs.existsSync(configurationPath)) return null;
  const configuration = JSON.parse(fs.readFileSync(configurationPath, "utf8").replace(/^\uFEFF/, ""));
  if (typeof configuration.token !== "string" || configuration.token.length < 32) {
    const error = new Error(`${LOCAL_BACKUP_CONFIG} requires a token of at least 32 characters.`);
    error.code = "INVALID_RUNTIME_BACKUP_CONFIGURATION";
    throw error;
  }
  return configuration;
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isDirectLoopback(request) {
  const address = String(request.socket?.remoteAddress || "");
  const host = String(request.headers?.host || "").split(":")[0].replace(/^\[|\]$/g, "");
  const loopbackAddress = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
  const loopbackHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return loopbackAddress && loopbackHost && !request.headers?.["x-forwarded-for"];
}

class RuntimeBackupCoordinator {
  constructor({ root, databasePath, database }) {
    this.databasePath = databasePath;
    this.database = database;
    this.configuration = readConfiguration(root);
  }

  handles(request) {
    return request.method === "POST" && String(request.url || "").split("?")[0] === "/api/local/runtime-backup";
  }

  async handle(request, response) {
    if (!this.configuration || !isDirectLoopback(request) ||
        !secureEqual(request.headers?.["x-blue-current-backup-token"], this.configuration.token)) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "Not found." }));
      return;
    }
    const raw = await this.database.snapshotForBackup();
    const result = createBackupFromContent(this.databasePath, raw, {
      retention: Number(this.configuration.retention || 14),
      source: "server-coordinated-scheduled-backup"
    });
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true, name: result.name, sha256: result.manifest.sha256, pruned: result.removed.length }));
  }
}

module.exports = { LOCAL_BACKUP_CONFIG, RuntimeBackupCoordinator, isDirectLoopback, readConfiguration };
