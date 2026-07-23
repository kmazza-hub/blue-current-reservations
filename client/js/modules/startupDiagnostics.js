(function () {
  "use strict";

  function createStartupDiagnosticsModule(eventBus, appState) {
    const BUILD = "32.4.0";
    const $ = id => document.getElementById(id);
    const setText = (id, value) => { const el = $(id); if (el) el.textContent = String(value); };
    const setClass = (id, value) => { const el = $(id); if (el) el.className = value; };
    let lastReport = null;

    function run() {
      const registry = window.BlueCurrentStartupRegistry;
      const startup = registry?.report?.() || { build: BUILD, counts: {}, modules: {}, durationMs: 0 };
      const api = window.BlueCurrentCloudApi ? new window.BlueCurrentCloudApi("") : null;
      const checks = {
        styles: { ok: Boolean($("authOverlay")), detail: $("authOverlay") ? "Application styles loaded" : "Auth overlay unavailable" },
        cloudApi: { ok: api?.version === BUILD, detail: api ? `V${api.version} API client` : "API client unavailable" },
        auth: { ok: typeof window.createBlueCurrentAuthOrganizationsModule === "function", detail: "Authentication module registered" },
        application: { ok: Boolean(eventBus?.emit && appState?.update), detail: `Core active · ${startup.counts.ready || 0} modules ready` }
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
        (skipped.length ? ` · retired ${skipped.join(", ")}` : "") +
        (blocked.length ? ` · blocked ${blocked.join(", ")}` : ""));
      lastReport = { build: BUILD, checks, startup };
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
    window.addEventListener("load", () => setTimeout(run, 100), { once: true });
    return { run, getResults: () => lastReport ? JSON.parse(JSON.stringify(lastReport)) : null };
  }
  window.createBlueCurrentStartupDiagnosticsModule = createStartupDiagnosticsModule;
})();
