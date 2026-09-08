(function () {
  "use strict";

  const SESSION_CACHE_KEY = "blueCurrentV3430RequestCache";
  const DEFAULT_TIMEOUT_MS = 12000;
  const DEFAULT_TTL_MS = 30000;
  const MAX_SESSION_ENTRIES = 80;
  const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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

  function parseSessionCache() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  class RequestPipeline extends EventTarget {
    constructor() {
      super();
      this.queue = [];
      this.active = 0;
      this.maxConcurrent = 6;
      this.sequence = 0;
      this.inflight = new Map();
      this.memoryCache = new Map();
      this.sessionCache = parseSessionCache();
      this.controllers = new Map();
      this.circuits = new Map();
      this.modules = new Map();
      this.startupPhases = [];
      this.metrics = {
        requested: 0,
        completed: 0,
        failed: 0,
        retried: 0,
        deduplicated: 0,
        cancelled: 0,
        timedOut: 0,
        cacheHits: 0,
        cacheMisses: 0,
        staleHits: 0,
        totalLatencyMs: 0,
        maxQueueDepth: 0
      };
      this.registerDefaults();
      this.bindInvalidationEvents();
    }

    registerDefaults() {
      [
        ["Authentication", []],
        ["Bootstrap", ["Authentication"]],
        ["Reservations", ["Bootstrap"]],
        ["Floor", ["Bootstrap", "Reservations"]],
        ["Kitchen", ["Bootstrap", "Floor"]],
        ["Staff", ["Bootstrap"]],
        ["Service Coordination", ["Reservations", "Floor", "Kitchen", "Staff"]],
        ["Executive", ["Reservations", "Staff"]],
        ["AI Brain", ["Reservations", "Floor", "Kitchen", "Staff"]],
        ["Autonomous Operations", ["AI Brain", "Executive"]]
      ].forEach(([name, dependencies]) => this.registerModule(name, { dependencies }));
    }

    bindInvalidationEvents() {
      const invalidate = event => {
        const detail = event.detail || {};
        const domain = detail.domain || detail.type || "";
        this.invalidate(domain ? value => value.includes(String(domain).toLowerCase()) : null);
      };
      [
        "bluecurrent:reservation-created",
        "bluecurrent:reservation-updated",
        "bluecurrent:table-updated",
        "bluecurrent:staff-updated",
        "bluecurrent:kitchen-updated",
        "bluecurrent:configuration-updated",
        "bluecurrent:auth-session-expired"
      ].forEach(name => window.addEventListener(name, invalidate));
    }

    registerModule(name, options = {}) {
      this.modules.set(name, {
        name,
        dependencies: Array.isArray(options.dependencies) ? [...options.dependencies] : [],
        owns: Array.isArray(options.owns) ? [...options.owns] : [],
        status: options.status || "registered",
        registeredAt: new Date().toISOString()
      });
      this.emit("module-registered", { module: this.modules.get(name) });
      return this.modules.get(name);
    }

    resolveDependencies(names = [...this.modules.keys()]) {
      const ordered = [];
      const visiting = new Set();
      const visited = new Set();

      const visit = name => {
        if (visited.has(name)) return;
        if (visiting.has(name)) throw new Error(`Circular module dependency detected at ${name}.`);
        visiting.add(name);
        const module = this.modules.get(name);
        (module?.dependencies || []).forEach(visit);
        visiting.delete(name);
        visited.add(name);
        if (module) ordered.push(name);
      };

      names.forEach(visit);
      return ordered;
    }

    markStartupPhase(name, status, detail = {}) {
      const entry = {
        name,
        status,
        detail,
        at: new Date().toISOString(),
        sequence: this.startupPhases.length + 1
      };
      this.startupPhases.push(entry);
      this.emit("startup-phase", entry);
      return entry;
    }

    policyFor(path, method) {
      const read = method === "GET";
      if (!read) return { ttlMs: 0, session: false, staleWhileRevalidate: false };
      if (path === "/api/health") return { ttlMs: 10000, session: false, staleWhileRevalidate: true };
      if (path === "/api/bootstrap") return { ttlMs: 15000, session: true, staleWhileRevalidate: true };
      if (/configuration|feature-flags|organizations|users/.test(path)) {
        return { ttlMs: 60000, session: true, staleWhileRevalidate: true };
      }
      if (/floor|reservations|staff|kitchen|operations|command-center/.test(path)) {
        return { ttlMs: 8000, session: false, staleWhileRevalidate: true };
      }
      return { ttlMs: DEFAULT_TTL_MS, session: false, staleWhileRevalidate: false };
    }

    cacheKey(request) {
      return `${request.method}:${request.path}:${stable(request.body || null)}:${request.scope || "default"}`;
    }

    readCache(key, policy) {
      const now = Date.now();
      const memory = this.memoryCache.get(key);
      const session = policy.session ? this.sessionCache[key] : null;
      const entry = memory || session;
      if (!entry) {
        this.metrics.cacheMisses += 1;
        return null;
      }
      const ageMs = now - entry.createdAt;
      const fresh = ageMs <= entry.ttlMs;
      if (fresh) this.metrics.cacheHits += 1;
      else if (policy.staleWhileRevalidate) this.metrics.staleHits += 1;
      else this.metrics.cacheMisses += 1;
      return { ...entry, ageMs, fresh };
    }

    writeCache(key, value, policy) {
      if (!policy.ttlMs) return;
      const entry = {
        value: clone(value),
        createdAt: Date.now(),
        ttlMs: policy.ttlMs
      };
      this.memoryCache.set(key, entry);
      if (policy.session) {
        this.sessionCache[key] = entry;
        const keys = Object.keys(this.sessionCache);
        if (keys.length > MAX_SESSION_ENTRIES) {
          keys.sort((a, b) => this.sessionCache[a].createdAt - this.sessionCache[b].createdAt)
            .slice(0, keys.length - MAX_SESSION_ENTRIES)
            .forEach(oldKey => delete this.sessionCache[oldKey]);
        }
        try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(this.sessionCache)); }
        catch (_) {}
      }
    }

    invalidate(predicate = null) {
      const shouldDelete = key => !predicate || predicate(key.toLowerCase());
      [...this.memoryCache.keys()].filter(shouldDelete).forEach(key => this.memoryCache.delete(key));
      Object.keys(this.sessionCache).filter(shouldDelete).forEach(key => delete this.sessionCache[key]);
      try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(this.sessionCache)); }
      catch (_) {}
      this.emit("cache-invalidated", {});
    }

    cancel(key, reason = "Obsolete request cancelled.") {
      const controller = this.controllers.get(key);
      if (!controller) return false;
      controller.abort(reason);
      this.metrics.cancelled += 1;
      this.emit("request-cancelled", { key, reason });
      return true;
    }

    circuitFor(scope) {
      if (!this.circuits.has(scope)) {
        this.circuits.set(scope, { failures: 0, openedAt: 0, state: "closed" });
      }
      return this.circuits.get(scope);
    }

    checkCircuit(scope) {
      const circuit = this.circuitFor(scope);
      if (circuit.state !== "open") return;
      if (Date.now() - circuit.openedAt > 15000) {
        circuit.state = "half-open";
        return;
      }
      const error = new Error("Request circuit is temporarily open.");
      error.name = "BlueCurrentCircuitOpenError";
      error.code = "CIRCUIT_OPEN";
      throw error;
    }

    updateCircuit(scope, success) {
      const circuit = this.circuitFor(scope);
      if (success) {
        circuit.failures = 0;
        circuit.state = "closed";
        return;
      }
      circuit.failures += 1;
      if (circuit.failures >= 4) {
        circuit.state = "open";
        circuit.openedAt = Date.now();
        this.emit("circuit-opened", { scope });
      }
    }

    execute(config, transport) {
      const request = {
        id: ++this.sequence,
        path: config.path,
        method: String(config.method || "GET").toUpperCase(),
        body: config.body || null,
        priority: Number.isFinite(config.priority) ? config.priority : 50,
        timeoutMs: config.timeoutMs || DEFAULT_TIMEOUT_MS,
        retries: Number.isFinite(config.retries) ? config.retries : 2,
        cache: config.cache !== false,
        forceRefresh: Boolean(config.forceRefresh),
        staleWhileRevalidate: config.staleWhileRevalidate,
        scope: config.scope || "cloud",
        signal: config.signal || null,
        transport
      };
      const key = this.cacheKey(request);
      const policy = {
        ...this.policyFor(request.path, request.method),
        ...(config.cachePolicy || {})
      };
      if (request.staleWhileRevalidate != null) {
        policy.staleWhileRevalidate = request.staleWhileRevalidate;
      }

      this.metrics.requested += 1;
      this.checkCircuit(request.scope);

      if (request.cache && request.method === "GET" && !request.forceRefresh) {
        const cached = this.readCache(key, policy);
        if (cached?.fresh) return Promise.resolve(clone(cached.value));
        if (cached && policy.staleWhileRevalidate) {
          this.enqueue({ ...request, forceRefresh: true }, key, policy).catch(() => {});
          return Promise.resolve(clone(cached.value));
        }
      }

      if (this.inflight.has(key)) {
        this.metrics.deduplicated += 1;
        return this.inflight.get(key);
      }

      return this.enqueue(request, key, policy);
    }

    enqueue(request, key, policy) {
      const promise = new Promise((resolve, reject) => {
        this.queue.push({ request, key, policy, resolve, reject, enqueuedAt: performance.now() });
        this.queue.sort((a, b) => b.request.priority - a.request.priority || a.request.id - b.request.id);
        this.metrics.maxQueueDepth = Math.max(this.metrics.maxQueueDepth, this.queue.length);
        this.emit("queue-changed", { depth: this.queue.length, active: this.active });
        this.drain();
      });
      this.inflight.set(key, promise);
      promise.finally(() => this.inflight.delete(key)).catch(() => {});
      return promise;
    }

    drain() {
      while (this.active < this.maxConcurrent && this.queue.length) {
        const item = this.queue.shift();
        this.active += 1;
        this.run(item).finally(() => {
          this.active -= 1;
          this.emit("queue-changed", { depth: this.queue.length, active: this.active });
          this.drain();
        });
      }
    }

    async run(item) {
      const { request, key, policy, resolve, reject } = item;
      const started = performance.now();
      const controller = new AbortController();
      this.controllers.set(key, controller);

      if (request.signal) {
        if (request.signal.aborted) controller.abort(request.signal.reason);
        else request.signal.addEventListener("abort", () => controller.abort(request.signal.reason), { once: true });
      }

      try {
        let attempt = 0;
        while (true) {
          let timer;
          try {
            timer = setTimeout(() => {
              this.metrics.timedOut += 1;
              controller.abort("Request timeout.");
            }, request.timeoutMs);

            const result = await request.transport({
              signal: controller.signal,
              attempt,
              requestId: request.id
            });
            clearTimeout(timer);
            this.updateCircuit(request.scope, true);
            this.writeCache(key, result, policy);
            if (request.method !== "GET") this.invalidate();
            this.metrics.completed += 1;
            this.metrics.totalLatencyMs += performance.now() - started;
            this.emit("request-complete", {
              id: request.id,
              path: request.path,
              method: request.method,
              latencyMs: performance.now() - started,
              attempts: attempt + 1
            });
            resolve(clone(result));
            return;
          } catch (error) {
            clearTimeout(timer);
            const status = Number(error.status || 0);
            const transient = error.name === "BlueCurrentNetworkError"
              || error.name === "AbortError"
              || TRANSIENT_STATUS.has(status);
            const retryable = transient && attempt < request.retries && !controller.signal.aborted;

            if (!retryable) {
              this.metrics.failed += 1;
              this.metrics.totalLatencyMs += performance.now() - started;
              this.updateCircuit(request.scope, false);
              this.emit("request-failed", {
                id: request.id,
                path: request.path,
                method: request.method,
                code: error.code || error.name || "UNKNOWN",
                attempts: attempt + 1
              });
              reject(error);
              return;
            }

            attempt += 1;
            this.metrics.retried += 1;
            const jitter = Math.floor(Math.random() * 180);
            const delay = Math.min(3000, 250 * (2 ** (attempt - 1)) + jitter);
            this.emit("request-retry", {
              id: request.id,
              path: request.path,
              attempt,
              delay
            });
            await sleep(delay);
          }
        }
      } finally {
        this.controllers.delete(key);
      }
    }

    batch(requests, transportFactory, options = {}) {
      const priority = options.priority ?? 45;
      return Promise.all(requests.map(item => this.execute({
        ...item,
        priority: item.priority ?? priority
      }, transportFactory(item))));
    }

    metricsSnapshot() {
      const totalFinished = this.metrics.completed + this.metrics.failed;
      const cacheAttempts = this.metrics.cacheHits + this.metrics.cacheMisses + this.metrics.staleHits;
      return Object.freeze({
        ...this.metrics,
        queueDepth: this.queue.length,
        activeRequests: this.active,
        inflightRequests: this.inflight.size,
        averageLatencyMs: totalFinished
          ? Math.round(this.metrics.totalLatencyMs / totalFinished)
          : 0,
        successRate: totalFinished
          ? Math.round(this.metrics.completed / totalFinished * 100)
          : 100,
        cacheHitRatio: cacheAttempts
          ? Math.round((this.metrics.cacheHits + this.metrics.staleHits) / cacheAttempts * 100)
          : 0,
        circuits: [...this.circuits.entries()].map(([scope, value]) => ({ scope, ...value })),
        registeredModules: this.modules.size,
        dependencyOrder: this.resolveDependencies(),
        startupPhases: clone(this.startupPhases)
      });
    }

    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
      window.dispatchEvent(new CustomEvent(`bluecurrent:pipeline-${type}`, { detail }));
    }
  }

  window.BlueCurrentRequestPipeline = new RequestPipeline();
  window.BLUE_CURRENT_REQUEST_PIPELINE_VERSION = "34.3.0";
})();