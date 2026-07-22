(function () {
  "use strict";

  class ModuleRegistry {
    constructor({ build, eventBus }) {
      this.build = build;
      this.eventBus = eventBus;
      this.startedAt = performance.now();
      this.modules = new Map();
      this.instances = new Map();
      this.completed = false;
    }

    register(name, factoryOrInstance, dependencies = [], options = {}) {
      if (!name || typeof name !== "string") throw new TypeError("Module name is required.");
      if (this.modules.has(name)) {
        const existing = this.modules.get(name);
        console.warn(`[Blue Current] Duplicate module registration ignored: ${name}`);
        return this.instances.get(name) || null;
      }

      const missing = dependencies.filter(dep => this.modules.get(dep)?.status !== "ready");
      const started = performance.now();
      let instance = null;
      let error = null;
      let status = "ready";

      if (options.skipped) status = "skipped";
      else if (missing.length) status = "blocked";
      else {
        try {
          instance = typeof factoryOrInstance === "function" ? factoryOrInstance() : factoryOrInstance;
          if (!instance) status = options.optional ? "skipped" : "failed";
        } catch (caught) {
          error = caught;
          status = "failed";
          console.error(`[Blue Current] Module failed: ${name}`, caught);
        }
      }

      const record = {
        name,
        status,
        ready: status === "ready",
        dependencies: [...dependencies],
        missing,
        optional: Boolean(options.optional),
        reason: options.reason || error?.message || (status === "failed" ? "Module factory returned no instance" : ""),
        durationMs: Math.round((performance.now() - started) * 10) / 10,
        registeredAt: new Date().toISOString()
      };

      this.modules.set(name, record);
      if (instance) this.instances.set(name, instance);
      this.eventBus?.emit("startup:module-registered", { ...record });
      return instance;
    }

    skip(name, reason, dependencies = []) {
      return this.register(name, null, dependencies, { skipped: true, optional: true, reason });
    }

    get(name) { return this.instances.get(name) || null; }
    getRecord(name) { return this.modules.get(name) || null; }
    snapshot() { return Object.fromEntries([...this.modules.entries()].map(([key, value]) => [key, { ...value }])); }

    report() {
      const modules = this.snapshot();
      const counts = Object.values(modules).reduce((acc, module) => {
        acc[module.status] = (acc[module.status] || 0) + 1;
        return acc;
      }, {});
      return {
        build: this.build,
        completed: this.completed,
        durationMs: Math.round(performance.now() - this.startedAt),
        counts,
        modules
      };
    }

    complete() {
      if (this.completed) return this.report();
      this.completed = true;
      const report = this.report();
      this.eventBus?.emit("startup:complete", report);
      return report;
    }
  }

  class ErrorBoundary {
    constructor({ eventBus, build }) {
      this.eventBus = eventBus;
      this.build = build;
      this.errors = [];
      this.bound = false;
    }

    capture(error, context = {}) {
      const normalized = {
        build: this.build,
        message: error?.message || String(error),
        stack: error?.stack || "",
        context,
        occurredAt: new Date().toISOString()
      };
      this.errors.push(normalized);
      if (this.errors.length > 50) this.errors.shift();
      this.eventBus?.emit("platform:error", normalized);
      return normalized;
    }

    bind() {
      if (this.bound) return;
      this.bound = true;
      window.addEventListener("error", event => this.capture(event.error || event.message, { source: "window.error", filename: event.filename, line: event.lineno }));
      window.addEventListener("unhandledrejection", event => this.capture(event.reason || "Unhandled rejection", { source: "unhandledrejection" }));
    }

    report() { return this.errors.map(item => ({ ...item })); }
  }

  function createPlatform({ build, eventBus }) {
    const errors = new ErrorBoundary({ eventBus, build });
    errors.bind();
    const registry = new ModuleRegistry({ build, eventBus });
    return {
      build,
      registry,
      errors,
      safeText(id, value) {
        const element = document.getElementById(id);
        if (!element) return false;
        element.textContent = String(value);
        return true;
      },
      diagnostics() {
        return { build, startup: registry.report(), errors: errors.report(), generatedAt: new Date().toISOString() };
      }
    };
  }

  window.BlueCurrentPlatform = { create: createPlatform, ModuleRegistry, ErrorBoundary };
})();
