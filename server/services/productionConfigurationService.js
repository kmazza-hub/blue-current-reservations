"use strict";

const path = require("path");

class ProductionConfigurationService {
  constructor({ root, databasePath, port, environment = process.env } = {}) {
    this.root = root;
    this.databasePath = databasePath;
    this.port = Number(port);
    this.environment = environment;
    this.mode = String(
      environment.BLUE_CURRENT_ENV || environment.NODE_ENV || "development"
    ).trim().toLowerCase();
    this.lastReport = null;
  }

  _number(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
    const raw = this.environment[name];
    const value = raw == null || raw === "" ? fallback : Number(raw);
    return {
      name,
      configured: raw != null && raw !== "",
      raw: raw == null ? null : String(raw),
      value,
      valid: Number.isFinite(value) && value >= min && value <= max,
      min,
      max
    };
  }

  _configuredOrigins() {
    return String(this.environment.BLUE_CURRENT_ALLOWED_ORIGINS || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);
  }

  _isCloudSyncedDatabase() {
    return /(?:^|[\\/])(OneDrive|Dropbox|Google Drive)(?:[\\/]|$)/i.test(
      String(this.databasePath || "")
    );
  }

  _staticChecks() {
    const checks = [];
    const push = (id, ok, severity, detail) => checks.push({ id, ok: Boolean(ok), severity, detail });

    const nodeMajor = Number(process.versions.node.split(".")[0] || 0);
    push("node-runtime", nodeMajor >= 18, "error", `Node ${process.versions.node}; requires Node 18 or newer.`);

    push(
      "runtime-mode",
      ["development", "test", "staging", "production"].includes(this.mode),
      "error",
      `Runtime mode is ${this.mode}.`
    );

    push(
      "port",
      Number.isInteger(this.port) && this.port >= 1 && this.port <= 65535,
      "error",
      `PORT resolves to ${this.port}.`
    );

    const numericPolicies = [
      this._number("BLUE_CURRENT_MAX_BODY_BYTES", 1_000_000, { min: 16_384, max: 25_000_000 }),
      this._number("BLUE_CURRENT_RATE_WINDOW_MS", 60_000, { min: 1_000, max: 3_600_000 }),
      this._number("BLUE_CURRENT_RATE_LIMIT", 600, { min: 10, max: 100_000 }),
      this._number("BLUE_CURRENT_AUTH_RATE_LIMIT", 20, { min: 3, max: 10_000 }),
      this._number("BLUE_CURRENT_WEBHOOK_RATE_LIMIT", 180, { min: 10, max: 100_000 }),
      this._number("BLUE_CURRENT_SESSION_HOURS", 12, { min: 1, max: 168 }),
      this._number("BLUE_CURRENT_SESSION_IDLE_MINUTES", 120, { min: 5, max: 1_440 }),
      this._number("BLUE_CURRENT_SESSION_TOUCH_MINUTES", 5, { min: 1, max: 60 }),
      this._number("BLUE_CURRENT_MAX_ACTIVE_SESSIONS", 10, { min: 1, max: 100 }),
      this._number("BLUE_CURRENT_FAILED_LOGIN_THRESHOLD", 5, { min: 3, max: 50 }),
      this._number("BLUE_CURRENT_FAILED_LOGIN_WINDOW_MINUTES", 15, { min: 1, max: 1_440 }),
      this._number("BLUE_CURRENT_LOGIN_LOCK_MINUTES", 15, { min: 1, max: 1_440 }),
      this._number("BLUE_CURRENT_REVOKED_SESSION_RETENTION_HOURS", 168, { min: 1, max: 8_760 })
    ];
    for (const policy of numericPolicies) {
      push(
        `policy:${policy.name}`,
        policy.valid,
        "error",
        `${policy.name}=${policy.value}; accepted range ${policy.min}-${policy.max}.`
      );
    }

    const origins = this._configuredOrigins();
    const wildcard = origins.some(origin => origin === "*" || origin.includes("*"));
    push("cors-no-wildcard", !wildcard, "error", wildcard ? "Wildcard CORS origin is forbidden." : "No wildcard CORS origin configured.");

    const invalidOrigins = [];
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (!["http:", "https:"].includes(parsed.protocol)) invalidOrigins.push(origin);
      } catch {
        invalidOrigins.push(origin);
      }
    }
    push(
      "cors-origin-format",
      invalidOrigins.length === 0,
      "error",
      invalidOrigins.length ? `Invalid origins: ${invalidOrigins.join(", ")}` : `${origins.length} explicit origin(s) configured.`
    );

    if (this.mode === "production") {
      push(
        "production-origins-explicit",
        origins.length > 0,
        "error",
        origins.length ? "Explicit production origin allowlist configured." : "BLUE_CURRENT_ALLOWED_ORIGINS is required in production."
      );
      const insecure = origins.filter(origin => {
        try { return new URL(origin).protocol !== "https:"; } catch { return true; }
      });
      push(
        "production-origins-https",
        insecure.length === 0,
        "error",
        insecure.length ? `Production origins must use HTTPS: ${insecure.join(", ")}` : "All explicit production origins use HTTPS."
      );
      push(
        "production-database-not-cloud-sync",
        !this._isCloudSyncedDatabase(),
        "error",
        this._isCloudSyncedDatabase()
          ? "Production database path is inside a desktop cloud-sync folder."
          : "Production database path is outside known desktop cloud-sync folders."
      );
    } else {
      push(
        "development-database-cloud-sync",
        true,
        "info",
        this._isCloudSyncedDatabase()
          ? "Development database is in a cloud-synced folder; Windows file locks may occur."
          : "Development database is outside known cloud-sync folders."
      );
    }

    // The current single-node JSON persistence layer is intentionally surfaced
    // as a deployment constraint rather than silently represented as multi-node safe.
    push(
      "persistence-topology",
      false,
      "warning",
      "Current persistence is durable single-node JSON with verified recovery; do not run multiple writers against one database file."
    );

    return checks;
  }

  async validate(database = null) {
    const checks = this._staticChecks();

    if (database) {
      const snapshot = await database.read();
      const users = snapshot.users || [];
      const plaintextUsers = users.filter(user => user.password);
      checks.push({
        id: "no-plaintext-user-passwords",
        ok: plaintextUsers.length === 0,
        severity: "error",
        detail: plaintextUsers.length
          ? `${plaintextUsers.length} user record(s) still contain plaintext password fields.`
          : "No plaintext user password fields found."
      });

      const connectors = snapshot.liveConnectors || [];
      const bindings = snapshot.liveConnectorAuthBindings || {};
      const liveConnectors = connectors.filter(connector => connector.mode === "live");
      const connectorIssues = [];

      for (const connector of liveConnectors) {
        if (connector.endpoint) {
          try {
            const endpoint = new URL(connector.endpoint);
            if (this.mode === "production" && endpoint.protocol !== "https:") {
              connectorIssues.push(`${connector.id}: endpoint is not HTTPS`);
            }
          } catch {
            connectorIssues.push(`${connector.id}: endpoint is invalid`);
          }
        }

        const binding = bindings[`${connector.organizationId}:${connector.id}`] || {};
        if (binding.authType && binding.authType !== "none") {
          if (!binding.secretEnv) {
            connectorIssues.push(`${connector.id}: ${binding.authType} has no secret environment variable`);
          } else if (!this.environment[binding.secretEnv]) {
            connectorIssues.push(`${connector.id}: environment secret ${binding.secretEnv} is unavailable`);
          }
        }
      }

      checks.push({
        id: "live-connector-secret-readiness",
        ok: connectorIssues.length === 0,
        severity: this.mode === "production" ? "error" : "warning",
        detail: connectorIssues.length
          ? connectorIssues.join("; ")
          : `${liveConnectors.length} live connector(s) have valid endpoint/secret references.`
      });

      const exposedSecretKeys = [];
      const inspect = (value, trail = "") => {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          const next = trail ? `${trail}.${key}` : key;
          if (
            /(?:password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)$/i.test(key) &&
            !/(?:passwordHash|tokenHash|secretEnv|previousSecretEnv)$/i.test(key) &&
            typeof child === "string" && child.length > 0
          ) exposedSecretKeys.push(next);
          if (child && typeof child === "object") inspect(child, next);
        }
      };
      inspect(snapshot);
      checks.push({
        id: "no-obvious-plaintext-secrets",
        ok: exposedSecretKeys.length === 0,
        severity: "error",
        detail: exposedSecretKeys.length
          ? `Potential plaintext secret fields: ${exposedSecretKeys.slice(0,10).join(", ")}`
          : "No obvious plaintext secret-value fields detected in persisted state."
      });
    }

    const errors = checks.filter(check => !check.ok && check.severity === "error");
    const warnings = checks.filter(check => !check.ok && check.severity === "warning");
    const report = {
      version: "70.0.0",
      mode: this.mode,
      generatedAt: new Date().toISOString(),
      ready: errors.length === 0,
      pilotReady: errors.length === 0,
      productionReady: this.mode === "production" && errors.length === 0 && warnings.length === 0,
      errors: errors.length,
      warnings: warnings.length,
      databasePath: this.databasePath,
      databaseTopology: "single-node-durable-json",
      explicitOrigins: this._configuredOrigins(),
      checks
    };
    this.lastReport = report;
    return report;
  }

  async assertReady(database = null) {
    const report = await this.validate(database);
    if (!report.ready) {
      const error = new Error(
        `Production configuration validation failed: ${report.errors} error(s).`
      );
      error.code = "CONFIGURATION_NOT_READY";
      error.report = report;
      throw error;
    }
    return report;
  }

  snapshot() {
    return this.lastReport || {
      version: "70.0.0",
      mode: this.mode,
      generatedAt: null,
      ready: false,
      pilotReady: false,
      productionReady: false,
      errors: null,
      warnings: null,
      databasePath: this.databasePath,
      databaseTopology: "single-node-durable-json",
      explicitOrigins: this._configuredOrigins(),
      checks: []
    };
  }
}

module.exports = ProductionConfigurationService;
