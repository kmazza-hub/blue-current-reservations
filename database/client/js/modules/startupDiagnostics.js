
(function () {
  "use strict";

  function createStartupDiagnosticsModule(eventBus, appState) {
    const $ = id => document.getElementById(id);
    const checks = {
      styles: { ok: false, detail: "Not checked" },
      cloudApi: { ok: false, detail: "Not checked" },
      auth: { ok: false, detail: "Not checked" },
      application: { ok: false, detail: "Not checked" }
    };

    function updateLine(id, check) {
      const element = $(id);
      if (!element) return;
      element.textContent = check.detail;
      element.className = check.ok ? "ok" : "error";
    }

    function render() {
      updateLine("diagStyles", checks.styles);
      updateLine("diagCloudApi", checks.cloudApi);
      updateLine("diagAuth", checks.auth);
      updateLine("diagApplication", checks.application);

      const passed = Object.values(checks).filter(check => check.ok).length;
      const total = Object.keys(checks).length;
      const allPassed = passed === total;
      $("startupDiagnosticsSummary").textContent =
        allPassed ? "All modules compatible" : `${passed}/${total} checks passed`;
      $("startupDiagnosticsDot").className = allPassed ? "ok" : "error";
      $("diagCompatibility").textContent = allPassed
        ? "Startup dependency graph completed successfully at build V23.0.3."
        : Object.entries(checks)
            .filter(([, check]) => !check.ok)
            .map(([name, check]) => `${name}: ${check.detail}`)
            .join(" · ");
    }

    function run() {
      const authOverlay = $("authOverlay");
      const overlayStyle = authOverlay ? getComputedStyle(authOverlay) : null;
      checks.styles = {
        ok: Boolean(
          overlayStyle &&
          overlayStyle.position === "fixed" &&
          Number.parseInt(overlayStyle.zIndex, 10) >= 10000
        ),
        detail: overlayStyle ? "V23.0.3 loaded" : "Auth styles unavailable"
      };

      const Api = window.BlueCurrentCloudApi;
      let api = null;
      try { api = Api ? new Api("") : null; } catch (_) {}
      const requiredMethods = ["login", "logout", "me", "switchOrganization", "createInvitation"];
      const missingMethods = requiredMethods.filter(name => typeof api?.[name] !== "function");
      checks.cloudApi = {
        ok: Boolean(api && api.version === "23.0.3" && missingMethods.length === 0),
        detail: missingMethods.length
          ? `Missing: ${missingMethods.join(", ")}`
          : api ? `V${api.version} compatible` : "Constructor unavailable"
      };

      checks.auth = {
        ok: Boolean(
          typeof window.createBlueCurrentAuthOrganizationsModule === "function" &&
          document.getElementById("authLoginForm")
        ),
        detail: typeof window.createBlueCurrentAuthOrganizationsModule === "function"
          ? "Module and login form ready"
          : "Authentication module missing"
      };

      checks.application = {
        ok: Boolean(
          window.BlueCurrentEventBus &&
          window.BlueCurrentAppState &&
          eventBus &&
          appState &&
          typeof eventBus.emit === "function" &&
          typeof appState.update === "function"
        ),
        detail: window.BlueCurrentEventBus && window.BlueCurrentAppState
          ? "Event Bus and App State active"
          : "Core constructors unavailable"
      };

      render();
      eventBus?.emit("diagnostics:complete", {
        build: "23.0.3",
        checks: JSON.parse(JSON.stringify(checks))
      });
      return JSON.parse(JSON.stringify(checks));
    }

    $("startupDiagnosticsToggle")?.addEventListener("click", () => {
      const panel = $("startupDiagnosticsPanel");
      const open = panel.classList.toggle("open");
      $("startupDiagnosticsToggle").setAttribute("aria-expanded", String(open));
    });

    window.addEventListener("load", () => setTimeout(run, 100), { once: true });

    return {
      run,
      getResults: () => JSON.parse(JSON.stringify(checks))
    };
  }

  window.createBlueCurrentStartupDiagnosticsModule = createStartupDiagnosticsModule;
})();
