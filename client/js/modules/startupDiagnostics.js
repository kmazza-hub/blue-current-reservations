(function () {
  "use strict";

  function createStartupDiagnosticsModule(eventBus, appState) {
    const BUILD = "94.50.0";
    const $ = id => document.getElementById(id);
    const setText = (id, value) => { const el = $(id); if (el) el.textContent = String(value); };
    const setClass = (id, value) => { const el = $(id); if (el) el.className = value; };
    let lastReport = null;

    function run() {
      const registry = window.BlueCurrentStartupRegistry;
      const startup = registry?.report?.() || { build: BUILD, counts: {}, modules: {}, durationMs: 0 };
      const api = window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null;
      const pipeline = window.BlueCurrentRequestPipeline?.metricsSnapshot?.() || null;
      const offlineSync = window.BlueCurrentOfflineSync?.snapshot?.() || null;
      const auditLedger = window.BlueCurrentAuditLedger?.snapshot?.() || null;
      const checks = {
        styles: { ok: Boolean($("authOverlay")), detail: $("authOverlay") ? "Application styles loaded" : "Auth overlay unavailable" },
        cloudApi: { ok: Boolean(api && api.version), detail: api ? `V${api.version} API client` : "API client unavailable" },
        auth: { ok: typeof window.createBlueCurrentAuthOrganizationsModule === "function", detail: "Authentication module registered" },
        application: {
          ok: Boolean(eventBus?.emit && appState?.update),
          detail: pipeline
            ? `Core active · ${startup.counts.ready || 0} modules · API queue ${pipeline.queueDepth} · offline ${offlineSync?.queueDepth || 0} · audit ${auditLedger?.entries || 0}`
            : `Core active · ${startup.counts.ready || 0} modules ready`
        }
      };
      for (const [name, check] of Object.entries(checks)) {
        const id = { styles:"diagStyles", cloudApi:"diagCloudApi", auth:"diagAuth", application:"diagApplication" }[name];
        setText(id, check.detail); setClass(id, check.ok ? "ok" : "error");
      }
      const passed = Object.values(checks).filter(check => check.ok).length;
      const allPassed = passed === Object.keys(checks).length;
      setText("startupDiagnosticsSummary", allPassed ? `V${BUILD} stable startup` : `${passed}/4 core checks passed`);
      setClass("startupDiagnosticsDot", allPassed ? "ok" : "error");
      const skipped = Object.entries(startup.modules).filter(([,m]) => m.status === "skipped").map(([n]) => n);
      const blocked = Object.entries(startup.modules).filter(([,m]) => m.status === "blocked").map(([n]) => n);
      setText("diagCompatibility", `Build V${BUILD} · ${startup.durationMs}ms · ready ${startup.counts.ready || 0}` +
        (pipeline ? ` · API ${pipeline.averageLatencyMs}ms avg · cache ${pipeline.cacheHitRatio}% · retries ${pipeline.retried} · active ${pipeline.activeRequests}` : "") +
        (offlineSync ? ` · sync queued ${offlineSync.queueDepth} · replayed ${offlineSync.metrics.replayed} · conflicts ${offlineSync.openConflicts}` : "") +
        (auditLedger ? ` · audit ${auditLedger.entries} entries · ${auditLedger.checkpoint.status} · failures ${auditLedger.metrics.integrityFailures}` : "") +
        (skipped.length ? ` · retired ${skipped.join(", ")}` : "") +
        (blocked.length ? ` · blocked ${blocked.join(", ")}` : ""));
      lastReport = { build: BUILD, checks, startup, pipeline, offlineSync, auditLedger };
      eventBus?.emit("diagnostics:complete", lastReport);
      return JSON.parse(JSON.stringify(lastReport));
    }

    $("startupDiagnosticsToggle")?.addEventListener("click", () => {
      const panel = $("startupDiagnosticsPanel");
      if (!panel) return;
      const open = panel.classList.toggle("open");
      $("startupDiagnosticsToggle")?.setAttribute("aria-expanded", String(open));
    });
    eventBus?.on?.("startup:complete", run);
    window.addEventListener("bluecurrent:boot-complete", () => setTimeout(run, 0));
    document.addEventListener("DOMContentLoaded", () => setTimeout(run, 0), { once: true });
    setTimeout(run, 0);
    return { run, getResults: () => lastReport ? JSON.parse(JSON.stringify(lastReport)) : null };
  }
  window.createBlueCurrentStartupDiagnosticsModule = createStartupDiagnosticsModule;
})();
