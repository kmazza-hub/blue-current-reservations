(function () {
  "use strict";

  const LEDGER_KEY = "blueCurrentV3432AuditLedger";
  const CHECKPOINT_KEY = "blueCurrentV3432AuditCheckpoint";
  const MAX_ENTRIES = 1000;

  const clone = value => value == null || typeof value !== "object"
    ? value
    : typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

  function stable(value) {
    if (value == null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return `FNV1A-${(value >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
  }

  function read(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function uid(prefix) {
    if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  class AuditReconciliationLedger extends EventTarget {
    constructor() {
      super();
      this.entries = Array.isArray(read(LEDGER_KEY, [])) ? read(LEDGER_KEY, []) : [];
      this.checkpoint = read(CHECKPOINT_KEY, {
        localHead: null,
        cloudHead: null,
        reconciledAt: null,
        status: "unverified"
      });
      this.metrics = {
        appended: this.entries.length,
        verified: 0,
        integrityFailures: 0,
        reconciliations: 0,
        discrepancies: 0,
        exports: 0,
        lastVerifiedAt: null
      };
      this.bindSources();
      this.verify();
    }

    context() {
      const auth = window.BlueCurrentAuthSession?.snapshot?.();
      return {
        organizationId: auth?.session?.organizationId || null,
        userId: auth?.session?.user?.id || null,
        userEmail: auth?.session?.user?.email || null,
        role: auth?.session?.role || null
      };
    }

    sanitize(value) {
      if (value == null) return value;
      const cloned = clone(value);
      const redact = object => {
        if (!object || typeof object !== "object") return;
        Object.keys(object).forEach(key => {
          if (/token|password|authorization|secret/i.test(key)) {
            object[key] = "[REDACTED]";
          } else if (object[key] && typeof object[key] === "object") {
            redact(object[key]);
          }
        });
      };
      redact(cloned);
      return cloned;
    }

    append(type, action, payload = {}, options = {}) {
      const previous = this.entries[this.entries.length - 1] || null;
      const context = this.context();
      const body = {
        id: uid("audit"),
        sequence: previous ? previous.sequence + 1 : 1,
        type,
        action,
        domain: options.domain || payload.domain || payload.entityType || "platform",
        organizationId: options.organizationId || context.organizationId,
        userId: options.userId || context.userId,
        userEmail: context.userEmail,
        role: context.role,
        source: options.source || "client",
        severity: options.severity || "info",
        payload: this.sanitize(payload),
        previousHash: previous?.hash || "GENESIS",
        createdAt: new Date().toISOString()
      };
      body.hash = hash(stable(body));

      this.entries.push(body);
      if (this.entries.length > MAX_ENTRIES) {
        this.entries.splice(0, this.entries.length - MAX_ENTRIES);
        this.rechain();
      }
      this.metrics.appended += 1;
      this.persist();
      this.emit("entry-appended", { entry: clone(body) });
      return body;
    }

    rechain() {
      this.entries = this.entries.map((entry, index) => {
        const previousHash = index ? this.entries[index - 1].hash : "GENESIS";
        const body = { ...entry, sequence: index + 1, previousHash };
        delete body.hash;
        body.hash = hash(stable(body));
        return body;
      });
    }

    persist() {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(this.entries));
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(this.checkpoint));
    }

    verify() {
      let previousHash = "GENESIS";
      const failures = [];

      this.entries.forEach((entry, index) => {
        const body = { ...entry };
        const storedHash = body.hash;
        delete body.hash;
        const expected = hash(stable(body));
        if (
          storedHash !== expected ||
          entry.previousHash !== previousHash ||
          entry.sequence !== index + 1
        ) {
          failures.push({
            id: entry.id,
            sequence: entry.sequence,
            storedHash,
            expectedHash: expected,
            previousHash: entry.previousHash,
            expectedPreviousHash: previousHash
          });
        }
        previousHash = storedHash;
      });

      this.metrics.verified = this.entries.length - failures.length;
      this.metrics.integrityFailures = failures.length;
      this.metrics.lastVerifiedAt = new Date().toISOString();
      this.checkpoint.localHead = this.entries.at(-1)?.hash || null;
      this.checkpoint.status = failures.length ? "integrity-failure" : "verified";
      this.persist();

      const result = {
        valid: failures.length === 0,
        entries: this.entries.length,
        failures,
        headHash: this.checkpoint.localHead,
        verifiedAt: this.metrics.lastVerifiedAt
      };
      this.emit("verified", result);
      return result;
    }

    reconcile(cloudState = {}) {
      const verification = this.verify();
      const cloudEntries = Array.isArray(cloudState.auditLogs)
        ? cloudState.auditLogs
        : Array.isArray(cloudState.entries)
          ? cloudState.entries
          : [];

      const localIds = new Set(this.entries.map(entry => entry.payload?.cloudAuditId || entry.id));
      const cloudIds = new Set(cloudEntries.map(entry => entry.id));
      const missingLocally = cloudEntries.filter(entry => !localIds.has(entry.id));
      const pendingCloud = this.entries.filter(entry =>
        entry.source !== "cloud" &&
        entry.payload?.cloudAuditId == null &&
        ["write", "offline-sync", "configuration", "authentication"].includes(entry.type)
      );

      this.checkpoint = {
        localHead: verification.headHash,
        cloudHead: cloudState.headHash || cloudEntries.at(-1)?.hash || cloudEntries.at(-1)?.id || null,
        reconciledAt: new Date().toISOString(),
        status: verification.valid && !missingLocally.length
          ? pendingCloud.length ? "pending-cloud" : "reconciled"
          : "discrepancy",
        missingLocally: missingLocally.length,
        pendingCloud: pendingCloud.length
      };

      this.metrics.reconciliations += 1;
      if (this.checkpoint.status === "discrepancy") this.metrics.discrepancies += 1;
      this.persist();

      const result = {
        ...clone(this.checkpoint),
        verification,
        missingLocally: clone(missingLocally),
        pendingCloud: clone(pendingCloud)
      };
      this.append("reconciliation", "ledger-reconciled", {
        status: result.status,
        missingLocally: missingLocally.length,
        pendingCloud: pendingCloud.length,
        cloudHead: result.cloudHead
      }, { source: "system" });
      this.emit("reconciled", result);
      return result;
    }

    importCloudEntries(entries = []) {
      let imported = 0;
      const existing = new Set(this.entries.map(entry => entry.payload?.cloudAuditId));
      entries.forEach(entry => {
        if (!entry?.id || existing.has(entry.id)) return;
        this.append("cloud-audit", entry.action || "cloud-audit-imported", {
          cloudAuditId: entry.id,
          actor: entry.actor,
          resource: entry.resource,
          detail: entry.detail || null,
          cloudCreatedAt: entry.createdAt
        }, {
          source: "cloud",
          organizationId: entry.organizationId,
          severity: entry.severity || "info"
        });
        imported += 1;
      });
      return imported;
    }

    bindSources() {
      const bindings = [
        ["bluecurrent:auth-session-state", "authentication", "session-state-changed"],
        ["bluecurrent:auth-session-expired", "authentication", "session-expired"],
        ["bluecurrent:pipeline-request-complete", "api", "request-completed"],
        ["bluecurrent:pipeline-request-failed", "api", "request-failed"],
        ["bluecurrent:pipeline-circuit-opened", "api", "circuit-opened"],
        ["bluecurrent:offline-optimistic-write", "write", "optimistic-write"],
        ["bluecurrent:offline-item-replayed", "offline-sync", "write-replayed"],
        ["bluecurrent:offline-conflict-created", "offline-sync", "conflict-created"],
        ["bluecurrent:offline-conflict-resolved", "offline-sync", "conflict-resolved"],
        ["bluecurrent:bootstrap-hydrated", "bootstrap", "state-hydrated"],
        ["bluecurrent:configuration-updated", "configuration", "configuration-updated"],
        ["bluecurrent:reservation-created", "reservation", "reservation-created"],
        ["bluecurrent:autonomy-certification-issued", "governance", "certification-issued"],
        ["bluecurrent:autonomy-certification-renewed", "governance", "certification-renewed"],
        ["bluecurrent:autonomy-certificate-suspended", "governance", "certificate-suspended"]
      ];

      bindings.forEach(([eventName, type, action]) => {
        window.addEventListener(eventName, event => {
          this.append(type, action, event.detail || {}, {
            severity: /failed|expired|conflict|suspended|circuit/.test(action) ? "warning" : "info"
          });
        });
      });
    }

    query(filters = {}) {
      return this.entries.filter(entry => {
        if (filters.type && entry.type !== filters.type) return false;
        if (filters.domain && entry.domain !== filters.domain) return false;
        if (filters.organizationId && entry.organizationId !== filters.organizationId) return false;
        if (filters.userId && entry.userId !== filters.userId) return false;
        if (filters.since && new Date(entry.createdAt) < new Date(filters.since)) return false;
        if (filters.until && new Date(entry.createdAt) > new Date(filters.until)) return false;
        return true;
      }).map(clone);
    }

    exportPackage(filters = {}) {
      const entries = this.query(filters);
      const verification = this.verify();
      const auditPackage = {
        packageId: uid("audit_package"),
        generatedAt: new Date().toISOString(),
        version: "34.3.2",
        filters,
        checkpoint: clone(this.checkpoint),
        verification,
        metrics: clone(this.metrics),
        entries
      };
      this.metrics.exports += 1;
      this.append("audit", "audit-package-exported", {
        packageId: auditPackage.packageId,
        entryCount: entries.length,
        valid: verification.valid
      }, { source: "system" });
      return auditPackage;
    }

    download(filters = {}) {
      const auditPackage = this.exportPackage(filters);
      const blob = new Blob([JSON.stringify(auditPackage, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${auditPackage.packageId}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return auditPackage;
    }

    snapshot() {
      return Object.freeze({
        entries: this.entries.length,
        headHash: this.entries.at(-1)?.hash || null,
        checkpoint: clone(this.checkpoint),
        metrics: clone(this.metrics),
        recent: clone(this.entries.slice(-20))
      });
    }

    clear(options = {}) {
      if (!options.confirmed) throw new Error("Audit ledger clear requires confirmed: true.");
      this.entries = [];
      this.checkpoint = {
        localHead: null,
        cloudHead: null,
        reconciledAt: null,
        status: "cleared"
      };
      this.persist();
      this.emit("cleared", {});
    }

    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
      window.dispatchEvent(new CustomEvent(`bluecurrent:audit-${type}`, { detail }));
    }
  }

  window.BlueCurrentAuditLedger = new AuditReconciliationLedger();
  window.BLUE_CURRENT_AUDIT_LEDGER_VERSION = "34.3.2";
})();