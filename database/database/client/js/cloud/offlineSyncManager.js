(function () {
  "use strict";

  const QUEUE_KEY = "blueCurrentV3431OfflineQueue";
  const CONFLICT_KEY = "blueCurrentV3431SyncConflicts";
  const HISTORY_KEY = "blueCurrentV3431SyncHistory";
  const MAX_QUEUE = 250;
  const MAX_HISTORY = 150;
  const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const NON_QUEUEABLE = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/switch-organization",
    "/api/autonomous-operations/run"
  ];

  const clone = value => value == null || typeof value !== "object"
    ? value
    : typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));

  function read(key, fallback = []) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeBody(body) {
    if (body == null || body === "") return null;
    if (typeof body === "string") {
      try { return JSON.parse(body); }
      catch (_) { return body; }
    }
    return clone(body);
  }

  function bodyForTransport(body) {
    if (body == null) return undefined;
    return typeof body === "string" ? body : JSON.stringify(body);
  }

  class OfflineSyncManager extends EventTarget {
    constructor() {
      super();
      this.queue = Array.isArray(read(QUEUE_KEY)) ? read(QUEUE_KEY) : [];
      this.conflicts = Array.isArray(read(CONFLICT_KEY)) ? read(CONFLICT_KEY) : [];
      this.history = Array.isArray(read(HISTORY_KEY)) ? read(HISTORY_KEY) : [];
      this.syncing = false;
      this.online = navigator.onLine;
      this.transport = null;
      this.timer = null;
      this.metrics = {
        queued: this.queue.length,
        replayed: 0,
        failed: 0,
        conflicts: this.conflicts.length,
        discarded: 0,
        optimisticEvents: 0,
        lastSyncAt: null,
        lastError: null
      };

      addEventListener("online", () => {
        this.online = true;
        this.emit("connectivity", { online: true });
        this.scheduleReplay(250);
      });
      addEventListener("offline", () => {
        this.online = false;
        this.emit("connectivity", { online: false });
      });
      addEventListener("bluecurrent:auth-session-state", event => {
        if (event.detail?.status === "authenticated") this.scheduleReplay(250);
      });
    }

    attachTransport(fn) {
      this.transport = fn;
      this.scheduleReplay(500);
      return this;
    }

    isQueueable(path, method, options = {}) {
      if (options.offlineQueue === false) return false;
      if (!WRITE_METHODS.has(String(method || "GET").toUpperCase())) return false;
      return !NON_QUEUEABLE.some(prefix => path.startsWith(prefix));
    }

    shouldQueue(error) {
      return !navigator.onLine
        || error?.code === "NETWORK_UNAVAILABLE"
        || error?.code === "CIRCUIT_OPEN"
        || error?.status === 503
        || error?.status === 504;
    }

    organizationContext() {
      const auth = window.BlueCurrentAuthSession?.snapshot?.();
      return {
        organizationId: auth?.session?.organizationId || null,
        userId: auth?.session?.user?.id || null,
        role: auth?.session?.role || null
      };
    }

    enqueue(request, error = null) {
      const context = this.organizationContext();
      const idempotencyKey = request.idempotencyKey || uid("idem");
      const item = {
        id: uid("sync"),
        idempotencyKey,
        path: request.path,
        method: String(request.method || "POST").toUpperCase(),
        body: normalizeBody(request.body),
        headers: {
          ...(request.headers || {}),
          "X-Blue-Current-Idempotency-Key": idempotencyKey
        },
        scope: request.scope || "cloud",
        organizationId: context.organizationId,
        userId: context.userId,
        role: context.role,
        entityType: request.entityType || this.inferEntity(request.path),
        entityId: request.entityId || null,
        baseVersion: request.baseVersion || null,
        optimistic: request.optimistic !== false,
        status: "queued",
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastError: error?.message || null
      };

      this.queue.push(item);
      if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
      this.persist();
      this.metrics.queued = this.queue.length;
      this.addHistory("queued", item, error?.message || "Write queued for synchronization.");

      if (item.optimistic) {
        this.metrics.optimisticEvents += 1;
        this.emit("optimistic-write", { item: clone(item) });
      }
      this.emit("queue-changed", this.snapshot());

      return {
        queued: true,
        offline: true,
        syncId: item.id,
        idempotencyKey,
        status: "queued",
        optimistic: item.optimistic,
        message: "Change saved locally and queued for synchronization."
      };
    }

    inferEntity(path) {
      if (path.includes("reservation")) return "reservation";
      if (path.includes("floor") || path.includes("table")) return "floor";
      if (path.includes("staff") || path.includes("workforce") || path.includes("timeclock")) return "workforce";
      if (path.includes("kitchen")) return "kitchen";
      if (path.includes("configuration") || path.includes("polic")) return "configuration";
      if (path.includes("manager-actions")) return "manager-action";
      return "operation";
    }

    addHistory(action, item, detail) {
      this.history.push({
        id: uid("history"),
        action,
        syncId: item?.id || null,
        path: item?.path || null,
        entityType: item?.entityType || null,
        detail,
        createdAt: new Date().toISOString()
      });
      if (this.history.length > MAX_HISTORY) {
        this.history.splice(0, this.history.length - MAX_HISTORY);
      }
      write(HISTORY_KEY, this.history);
    }

    persist() {
      write(QUEUE_KEY, this.queue);
      write(CONFLICT_KEY, this.conflicts);
    }

    scheduleReplay(delay = 500) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.replay().catch(() => {}), delay);
    }

    async replay() {
      if (this.syncing || !navigator.onLine || !this.transport || !this.queue.length) {
        return this.snapshot();
      }
      const auth = window.BlueCurrentAuthSession?.snapshot?.();
      if (!auth?.authenticated) return this.snapshot();

      this.syncing = true;
      this.emit("sync-started", this.snapshot());

      try {
        for (const item of [...this.queue]) {
          if (item.organizationId && item.organizationId !== auth.session?.organizationId) continue;
          await this.replayItem(item);
        }
        this.metrics.lastSyncAt = new Date().toISOString();
        this.metrics.lastError = null;
      } finally {
        this.syncing = false;
        this.metrics.queued = this.queue.length;
        this.metrics.conflicts = this.conflicts.length;
        this.persist();
        this.emit("sync-complete", this.snapshot());
      }
      return this.snapshot();
    }

    async replayItem(item) {
      item.status = "syncing";
      item.attempts += 1;
      item.updatedAt = new Date().toISOString();
      this.persist();
      this.emit("item-syncing", { item: clone(item) });

      try {
        const result = await this.transport(item.path, {
          method: item.method,
          body: bodyForTransport(item.body),
          headers: {
            ...item.headers,
            ...(item.baseVersion ? { "If-Match": String(item.baseVersion) } : {})
          },
          cache: false,
          retries: 1,
          offlineQueue: false,
          scope: "offline-replay"
        });

        this.queue = this.queue.filter(entry => entry.id !== item.id);
        this.metrics.replayed += 1;
        this.addHistory("replayed", item, "Queued write synchronized successfully.");
        this.emit("item-replayed", { item: clone(item), result: clone(result) });
        this.emitEntityUpdate(item, result);
        return result;
      } catch (error) {
        if ([409, 412].includes(Number(error.status))) {
          this.createConflict(item, error);
          return null;
        }

        item.status = "queued";
        item.lastError = error.message;
        item.updatedAt = new Date().toISOString();
        this.metrics.failed += 1;
        this.metrics.lastError = error.message;
        this.addHistory("retry-pending", item, error.message);
        this.emit("item-failed", { item: clone(item), error });

        if (!this.shouldQueue(error)) throw error;
        return null;
      }
    }

    createConflict(item, error) {
      const conflict = {
        id: uid("conflict"),
        syncId: item.id,
        path: item.path,
        method: item.method,
        entityType: item.entityType,
        entityId: item.entityId,
        localBody: clone(item.body),
        serverState: clone(error.payload?.current || error.payload?.serverState || null),
        baseVersion: item.baseVersion,
        serverVersion: error.payload?.version || null,
        reason: error.message,
        strategy: "manual",
        status: "open",
        createdAt: new Date().toISOString()
      };

      this.conflicts.push(conflict);
      this.queue = this.queue.filter(entry => entry.id !== item.id);
      this.metrics.conflicts = this.conflicts.length;
      this.addHistory("conflict", item, error.message);
      this.emit("conflict-created", { conflict: clone(conflict), item: clone(item) });
    }

    resolveConflict(conflictId, strategy, mergedBody = null) {
      const conflict = this.conflicts.find(item => item.id === conflictId);
      if (!conflict || conflict.status !== "open") return null;

      if (strategy === "server-wins") {
        conflict.status = "resolved";
        conflict.strategy = strategy;
        conflict.resolvedAt = new Date().toISOString();
        this.metrics.discarded += 1;
        this.addHistory("conflict-resolved", conflict, "Server state retained.");
        this.persist();
        this.emit("conflict-resolved", { conflict: clone(conflict) });
        return conflict;
      }

      const body = strategy === "merge"
        ? mergedBody
        : conflict.localBody;

      const queued = this.enqueue({
        path: conflict.path,
        method: conflict.method,
        body,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        baseVersion: conflict.serverVersion,
        optimistic: false
      });

      conflict.status = "resolved";
      conflict.strategy = strategy;
      conflict.resolvedAt = new Date().toISOString();
      conflict.replacementSyncId = queued.syncId;
      this.addHistory("conflict-resolved", conflict, `${strategy} selected.`);
      this.persist();
      this.emit("conflict-resolved", { conflict: clone(conflict), queued });
      this.scheduleReplay(100);
      return conflict;
    }

    discard(syncId) {
      const item = this.queue.find(entry => entry.id === syncId);
      if (!item) return false;
      this.queue = this.queue.filter(entry => entry.id !== syncId);
      this.metrics.discarded += 1;
      this.metrics.queued = this.queue.length;
      this.addHistory("discarded", item, "Queued write discarded.");
      this.persist();
      this.emit("queue-changed", this.snapshot());
      return true;
    }

    emitEntityUpdate(item, result) {
      const detail = {
        source: "offline-sync",
        syncId: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        result: clone(result)
      };
      window.dispatchEvent(new CustomEvent(`bluecurrent:${item.entityType}-synced`, { detail }));
      window.dispatchEvent(new CustomEvent("bluecurrent:offline-write-synced", { detail }));
    }

    clearResolvedConflicts() {
      this.conflicts = this.conflicts.filter(item => item.status === "open");
      this.persist();
      this.emit("conflicts-changed", this.snapshot());
    }

    snapshot() {
      return Object.freeze({
        online: navigator.onLine,
        syncing: this.syncing,
        queueDepth: this.queue.length,
        openConflicts: this.conflicts.filter(item => item.status === "open").length,
        queue: clone(this.queue),
        conflicts: clone(this.conflicts),
        history: clone(this.history.slice(-30)),
        metrics: clone({
          ...this.metrics,
          queued: this.queue.length,
          conflicts: this.conflicts.length
        })
      });
    }

    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
      window.dispatchEvent(new CustomEvent(`bluecurrent:offline-${type}`, { detail }));
    }
  }

  window.BlueCurrentOfflineSync = new OfflineSyncManager();
  window.BLUE_CURRENT_OFFLINE_SYNC_VERSION = "34.3.1";
})();