
(function () {
  "use strict";

  function createStartupDiagnosticsModule(eventBus) {
    const $ = id => document.getElementById(id);
    const results = {
      styles: false,
      cloudApi: false,
      auth: false,
      application: false
    };

    function mark(id, ok, text) {
      const element = $(id);
      if (!element) return;
      element.textContent = text;
      element.className = ok ? "ok" : "error";
    }

    function refreshSummary() {
      const passed = Object.values(results).filter(Boolean).length;
      const total = Object.keys(results).length;
      const allPassed = passed === total;
      $("startupDiagnosticsSummary").textContent =
        allPassed ? "All modules compatible" : `${passed}/${total} checks passed`;
      $("startupDiagnosticsDot").className = allPassed ? "ok" : "checking";
      $("diagCompatibility").textContent = allPassed
        ? "Client assets are synchronized at build V23.0.1."
        : "One or more assets may be stale. Reload the application.";
    }

    function run() {
      const authOverlay = $("authOverlay");
      const overlayStyle = authOverlay ? getComputedStyle(authOverlay) : null;
      results.styles = Boolean(
        overlayStyle &&
        overlayStyle.position === "fixed" &&
        overlayStyle.zIndex !== "auto"
      );
      mark("diagStyles", results.styles,
        results.styles ? "V23.0.1 loaded" : "Styles missing");

      const Api = window.BlueCurrentCloudApi;
      const api = Api ? new Api("") : null;
      results.cloudApi = Boolean(
        api &&
        api.version === "23.0.1" &&
        typeof api.login === "function" &&
        typeof api.me === "function"
      );
      mark("diagCloudApi", results.cloudApi,
        results.cloudApi ? `V${api.version}` : "Incompatible");

      results.auth = typeof window.createBlueCurrentAuthOrganizationsModule === "function";
      mark("diagAuth", results.auth,
        results.auth ? "Module ready" : "Module missing");

      results.application =
        typeof window.createEventBus === "function" &&
        typeof window.createAppState === "function";
      mark("diagApplication", results.application,
        results.application ? "Core ready" : "Core missing");

      refreshSummary();
      eventBus?.emit("diagnostics:complete", { ...results, build: "23.0.1" });
      return { ...results };
    }

    $("startupDiagnosticsToggle")?.addEventListener("click", () => {
      const panel = $("startupDiagnosticsPanel");
      const open = panel.classList.toggle("open");
      $("startupDiagnosticsToggle").setAttribute("aria-expanded", String(open));
    });

    window.addEventListener("load", () => setTimeout(run, 50), { once: true });

    return { run, getResults: () => ({ ...results }) };
  }

  window.createBlueCurrentStartupDiagnosticsModule = createStartupDiagnosticsModule;
})();
