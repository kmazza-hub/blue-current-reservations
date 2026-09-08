(function () {
  "use strict";

  function createStartupDiagnosticsModule(eventBus, appState) {
    const dom = window.BlueCurrentDOM || { byId: id => document.getElementById(id), setText: (id,v) => { const e=document.getElementById(id); if(e)e.textContent=String(v); } };
    const checks = {};

    function setStatus(id, ok, detail) {
      const element = dom.byId(id);
      if (!element) return;
      element.textContent = detail;
      element.className = ok ? "ok" : "error";
    }

    function run() {
      const report = window.BlueCurrentStartupRegistry?.report?.() || window.BlueCurrentStartupReport || null;
      const Api = window.BlueCurrentCloudApi;
      let api = null;
      try { api = Api ? new Api("") : null; } catch (_) {}

      checks.styles = { ok: Boolean(document.styleSheets.length), detail: document.styleSheets.length ? `${document.styleSheets.length} stylesheets loaded` : "Styles unavailable" };
      checks.cloudApi = { ok: Boolean(api && api.version === "32.3.0"), detail: api ? `V${api.version} compatible` : "Cloud API unavailable" };
      checks.auth = { ok: Boolean(window.createBlueCurrentAuthOrganizationsModule && dom.byId("authLoginForm")), detail: "Authentication surface ready" };
      checks.application = { ok: Boolean(eventBus?.emit && appState?.update), detail: "Event Bus and App State active" };
      checks.modules = { ok: Boolean(report && report.failed === 0), detail: report ? `${report.ready}/${report.total} ready · ${report.skipped} intentionally skipped` : "Registry report pending" };

      setStatus("diagStyles", checks.styles.ok, checks.styles.detail);
      setStatus("diagCloudApi", checks.cloudApi.ok, checks.cloudApi.detail);
      setStatus("diagAuth", checks.auth.ok, checks.auth.detail);
      setStatus("diagApplication", checks.application.ok, checks.application.detail);

      const passed = Object.values(checks).filter(c => c.ok).length;
      const total = Object.keys(checks).length;
      dom.setText("startupDiagnosticsSummary", passed === total ? "Core startup healthy" : `${passed}/${total} checks passed`);
      const dot = dom.byId("startupDiagnosticsDot"); if (dot) dot.className = passed === total ? "ok" : "error";
      dom.setText("diagCompatibility", report ? `V32.3.0 · ${report.failed} failed modules · startup ${report.durationMs} ms` : "Waiting for startup report");

      const result = { build: "32.3.0", checks: JSON.parse(JSON.stringify(checks)), report };
      eventBus?.emit?.("diagnostics:complete", result);
      return result;
    }

    dom.on?.("startupDiagnosticsToggle", "click", () => {
      const panel = dom.byId("startupDiagnosticsPanel");
      if (!panel) return;
      const open = panel.classList.toggle("open");
      dom.byId("startupDiagnosticsToggle")?.setAttribute("aria-expanded", String(open));
    });

    window.addEventListener("load", () => setTimeout(run, 150), { once: true });
    return { run, getResults: () => JSON.parse(JSON.stringify(checks)) };
  }

  window.createBlueCurrentStartupDiagnosticsModule = createStartupDiagnosticsModule;
})();
