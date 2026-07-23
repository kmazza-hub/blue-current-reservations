(function () {
  "use strict";

  class ModuleRegistry {
    constructor(eventBus) {
      this.eventBus = eventBus;
      this.records = new Map();
      this.startedAt = performance.now();
    }

    register(name, factoryOrInstance, dependencies = [], options = {}) {
      const missing = dependencies.filter(dep => !this.records.get(dep)?.ready);
      const requiredElement = options.elementId || null;
      const elementMissing = requiredElement && !document.getElementById(requiredElement);
      let instance = null;
      let error = null;

      if (!missing.length && !elementMissing) {
        try {
          instance = typeof factoryOrInstance === "function" ? factoryOrInstance() : factoryOrInstance;
        } catch (caught) {
          error = caught;
          console.error(`[Blue Current] ${name} failed to initialize`, caught);
        }
      }

      const record = {
        name,
        ready: Boolean(instance) && !error,
        status: error ? "failed" : (missing.length || elementMissing || !factoryOrInstance ? "skipped" : "ready"),
        dependencies,
        missing,
        requiredElement,
        reason: error?.message || (elementMissing ? `Missing view #${requiredElement}` : missing.length ? `Missing dependencies: ${missing.join(", ")}` : !factoryOrInstance ? "Factory unavailable" : null),
        durationMs: Math.round((performance.now() - this.startedAt) * 100) / 100,
        instance
      };
      this.records.set(name, record);
      this.eventBus?.emit?.("startup:module-registered", { ...record, instance: undefined });
      return instance;
    }

    alias(name, targetName) {
      const target = this.records.get(targetName);
      const record = target ? { ...target, name, aliasOf: targetName } : { name, ready: false, status: "skipped", reason: `Alias target ${targetName} unavailable` };
      this.records.set(name, record);
      return target?.instance || null;
    }

    snapshot() {
      return Object.fromEntries([...this.records].map(([name, record]) => [name, { ...record, instance: undefined }]));
    }

    report() {
      const records = [...this.records.values()];
      return {
        build: "32.3.0",
        total: records.length,
        ready: records.filter(r => r.ready).length,
        skipped: records.filter(r => r.status === "skipped").length,
        failed: records.filter(r => r.status === "failed").length,
        durationMs: Math.round((performance.now() - this.startedAt) * 100) / 100,
        modules: this.snapshot()
      };
    }
  }

  window.BlueCurrentModuleRegistry = ModuleRegistry;
})();
