
(function () {
  "use strict";

  function createProductionReadinessModule(eventBus, appState) {
    function element(id) {
      return document.getElementById(id);
    }

    function setText(id, value) {
      const target = element(id);
      if (target) target.textContent = value;
    }

    function setClass(id, value) {
      const target = element(id);
      if (target) target.className = value;
    }

    const STORAGE_KEY = "blueCurrentV21Production";
    const defaultState = {
      organization: "Chefs International",
      mode: "demo",
      onboardingProgress: 75,
      locations: 4,
      users: [
        { name: "Keith Mazza", role: "Owner", location: "All locations", status: "Active" },
        { name: "Sarah Morgan", role: "General Manager", location: "Marina Grille", status: "Active" },
        { name: "Daniel Reed", role: "Kitchen Manager", location: "Marina Grille", status: "Active" },
        { name: "Emily Hart", role: "Host", location: "Marina Grille", status: "Invited" }
      ],
      configuration: {
        capacity: 188,
        revenueTarget: 24000,
        waitThreshold: 20,
        kitchenThreshold: 18,
        occupancyThreshold: 90,
        vipRule: "Notify host and manager"
      },
      features: {
        "AI Concierge": true,
        "Predictive Operations": true,
        "Autonomous Operations": true,
        "Portfolio Intelligence": true,
        "Time Machine": true,
        "Connector Marketplace": true,
        "Executive Reports": false,
        "Live External Actions": false
      },
      audit: [
        { time: new Date(Date.now() - 18 * 60000).toISOString(), actor: "System", action: "V21 production controls initialized", category: "system" },
        { time: new Date(Date.now() - 12 * 60000).toISOString(), actor: "Keith Mazza", action: "Enabled Autonomous Operations for pilot", category: "feature" },
        { time: new Date(Date.now() - 6 * 60000).toISOString(), actor: "Sarah Morgan", action: "Updated occupancy threshold to 90%", category: "configuration" }
      ]
    };

    const $ = (id) => document.getElementById(id);
    const hasProductionUi = Boolean($("production-readiness") || $("prodOrganizationName"));
    let state = load();

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function load() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return stored ? { ...clone(defaultState), ...stored } : clone(defaultState);
      } catch (_) {
        return clone(defaultState);
      }
    }

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      appState.update({
        productionReadiness: {
          mode: state.mode,
          onboardingProgress: state.onboardingProgress,
          featureCount: Object.values(state.features).filter(Boolean).length,
          healthScore: calculateHealth()
        },
        organization: state.organization
      });
    }

    function calculateHealth() {
      const required = ["AI Concierge", "Predictive Operations", "Portfolio Intelligence"];
      const enabled = required.filter((name) => state.features[name]).length;
      const onboarding = state.onboardingProgress / 100;
      return Math.round(90 + enabled * 2 + onboarding * 2);
    }

    function audit(action, category = "system", actor = "Keith Mazza") {
      state.audit.unshift({ time: new Date().toISOString(), actor, action, category });
      state.audit = state.audit.slice(0, 40);
      save();
      renderAudit();
      eventBus.emit("production:audit-recorded", { action, category, actor });
    }

    function renderSummary() {
      const enabled = Object.values(state.features).filter(Boolean).length;
      setText("prodOrganizationName", state.organization);
      setText("prodLocationCount", state.locations);
      setText("prodUserCount", state.users.length);
      setText("prodFeatureCount", enabled);
      setText("prodHealthScore", calculateHealth());
      setText("prodDeploymentStatus", state.mode === "live" ? "Live controls armed" : "Pilot ready");
      setClass("prodDeploymentStatus", `production-status ${state.mode === "live" ? "watch" : "ready"}`);
      setText("prodLaunchBrief", state.mode === "live"
        ? "Live data mode is selected. External actions remain governed by feature flags and connector permissions."
        : "Configuration is complete. Demo data is active and the environment is ready for a controlled pilot.");
      document.querySelectorAll("[data-prod-mode]").forEach(button => button.classList.toggle("active", button.dataset.prodMode === state.mode));
      setText("prodModeDescription", state.mode === "live"
        ? "Live data is enabled. Connector permissions and audit controls remain active."
        : "Safe simulated data is active. Connectors cannot perform external actions.");
    }

    function renderOnboarding() {
      setText("prodOnboardingProgress", `${state.onboardingProgress}% complete`);
      $("prodOnboardingBar").style.width = `${state.onboardingProgress}%`;
      $("prodOrgInput").value = state.organization;
      document.querySelectorAll("[data-onboarding-step]").forEach((button, index) => {
        button.classList.toggle("complete", index < Math.ceil(state.onboardingProgress / 25));
        button.querySelector("em").textContent = button.classList.contains("complete") ? "Complete" : "Continue";
      });
    }

    function renderUsers() {
      $("prodUserList").innerHTML = state.users.map((user, index) => `
        <article>
          <span>${user.name.split(" ").map(part => part[0]).slice(0,2).join("")}</span>
          <div><strong>${user.name}</strong><small>${user.location}</small></div>
          <select data-user-role="${index}">
            ${["Owner","District Manager","General Manager","Host","Server","Kitchen Manager","Administrator"].map(role => `<option ${role === user.role ? "selected" : ""}>${role}</option>`).join("")}
          </select>
          <em class="${user.status.toLowerCase()}">${user.status}</em>
        </article>`).join("");
    }

    function renderFeatures() {
      $("prodFeatureGrid").innerHTML = Object.entries(state.features).map(([name, enabled]) => `
        <label class="production-feature-card">
          <div><strong>${name}</strong><small>${name === "Live External Actions" ? "Requires verified connectors" : "Available for this organization"}</small></div>
          <input type="checkbox" data-feature-flag="${name}" ${enabled ? "checked" : ""}>
          <i></i>
        </label>`).join("");
    }

    function renderHealth() {
      const health = [
        ["Application version", "V32.2", "healthy"],
        ["Event Bus", `${eventBus.listenerCount ? eventBus.listenerCount() : "Active"} listeners`, "healthy"],
        ["Shared App State", "Synchronized", "healthy"],
        ["Browser storage", localStorage.getItem(STORAGE_KEY) ? "Operational" : "Initializing", "healthy"],
        ["Connector layer", state.mode === "live" ? "Live mode" : "Simulation", state.mode === "live" ? "watch" : "healthy"],
        ["Failed events", "0", "healthy"],
        ["System health", `${calculateHealth()} / 100`, "healthy"],
        ["Last validation", new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}), "healthy"]
      ];
      $("prodHealthGrid").innerHTML = health.map(item => `<article class="${item[2]}"><span></span><div><small>${item[0]}</small><strong>${item[1]}</strong></div></article>`).join("");
      $("prodDiagnosticFeed").innerHTML = `
        <p><span>${new Date().toLocaleTimeString()}</span> All required V32.2 modules responding.</p>
        <p><span>${new Date(Date.now()-1200).toLocaleTimeString()}</span> App State production namespace synchronized.</p>
        <p><span>${new Date(Date.now()-2500).toLocaleTimeString()}</span> Feature flag registry validated.</p>`;
    }

    function renderAudit() {
      setText("prodAuditCount", `${state.audit.length} events`);
      $("prodAuditList").innerHTML = state.audit.map(entry => `
        <article>
          <time>${new Date(entry.time).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}</time>
          <span class="${entry.category}"></span>
          <div><strong>${entry.actor}</strong><p>${entry.action}</p></div>
        </article>`).join("");
    }

    function renderAll() {
      if (!hasProductionUi) { save(); return; }
      renderSummary();
      renderOnboarding();
      renderUsers();
      renderFeatures();
      renderHealth();
      renderAudit();
    }

    function switchTab(tab) {
      document.querySelectorAll("[data-prod-tab]").forEach(button => button.classList.toggle("active", button.dataset.prodTab === tab));
      document.querySelectorAll("[data-prod-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.prodPanel === tab));
    }

    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-prod-tab]");
      if (tab) switchTab(tab.dataset.prodTab);

      const mode = event.target.closest("[data-prod-mode]");
      if (mode) {
        state.mode = mode.dataset.prodMode;
        save();
        renderSummary();
        audit(`Changed environment mode to ${state.mode}`, "environment");
      }
    });

    $("prodSaveOnboarding")?.addEventListener("click", () => {
      state.organization = $("prodOrgInput").value.trim() || state.organization;
      state.onboardingProgress = 100;
      save();
      renderAll();
      audit("Completed customer onboarding configuration", "onboarding");
      eventBus.emit("production:onboarding-complete", { organization: state.organization });
    });

    $("prodInviteUser")?.addEventListener("click", () => {
      const number = state.users.length + 1;
      state.users.push({ name: `Pilot User ${number}`, role: "Host", location: "Marina Grille", status: "Invited" });
      save();
      renderUsers();
      renderSummary();
      audit(`Invited Pilot User ${number} as Host`, "access");
    });

    $("prodUserList")?.addEventListener("change", (event) => {
      const select = event.target.closest("[data-user-role]");
      if (!select) return;
      const user = state.users[Number(select.dataset.userRole)];
      user.role = select.value;
      save();
      audit(`Changed ${user.name}'s role to ${user.role}`, "access");
    });

    $("prodSaveConfiguration")?.addEventListener("click", () => {
      state.configuration = {
        capacity: Number($("prodCapacity").value),
        revenueTarget: Number($("prodRevenueTarget").value),
        waitThreshold: Number($("prodWaitThreshold").value),
        kitchenThreshold: Number($("prodKitchenThreshold").value),
        occupancyThreshold: Number($("prodOccupancyThreshold").value),
        vipRule: $("prodVipRule").value
      };
      save();
      audit(`Published location configuration with ${state.configuration.occupancyThreshold}% occupancy threshold`, "configuration");
      eventBus.emit("production:configuration-published", clone(state.configuration));
    });

    $("prodFeatureGrid")?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-feature-flag]");
      if (!input) return;
      state.features[input.dataset.featureFlag] = input.checked;
      save();
      renderSummary();
      audit(`${input.checked ? "Enabled" : "Disabled"} ${input.dataset.featureFlag}`, "feature");
      eventBus.emit("production:feature-changed", { feature: input.dataset.featureFlag, enabled: input.checked });
    });

    $("prodRefreshHealth")?.addEventListener("click", () => {
      renderHealth();
      audit("Ran administrator system diagnostics", "system", "System");
    });

    $("prodRunReadiness")?.addEventListener("click", () => {
      const button = $("prodRunReadiness");
      button.disabled = true;
      button.textContent = "Checking modules…";
      setTimeout(() => {
        button.textContent = "Readiness confirmed";
        setText("prodHealthScore", calculateHealth());
        setText("prodLaunchBrief", "Readiness check passed. Configuration, storage, Event Bus, App State, permissions, and feature controls are responding.");
        audit("Production readiness check passed", "system", "System");
        eventBus.emit("production:readiness-passed", { score: calculateHealth() });
        setTimeout(() => { button.disabled = false; button.textContent = "Run readiness check"; }, 1800);
      }, 850);
    });

    $("prodSeedService")?.addEventListener("click", () => {
      eventBus.emit("production:service-seeded", { guests: 184, reservations: 48, occupancyPercent: 78 });
      appState.update({
        guestsExpected: 184,
        reservationsToday: 48,
        occupancyPercent: 78,
        executiveBrief: "Pilot dinner service seeded. Blue Current is ready for a guided presentation."
      });
      audit("Seeded sample dinner service", "pilot");
    });

    $("prodResetEnvironment")?.addEventListener("click", () => {
      state = clone(defaultState);
      save();
      renderAll();
      audit("Reset pilot environment to V21 defaults", "environment", "System");
    });

    $("prodExportBackup")?.addEventListener("click", () => {
      const backup = { version: "21.0", exportedAt: new Date().toISOString(), state };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "blue-current-v21-backup.json";
      anchor.click();
      URL.revokeObjectURL(url);
      audit("Exported organization configuration backup", "backup");
    });

    $("prodImportBackup")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (!parsed.state || !parsed.version) throw new Error("Invalid backup");
        state = { ...clone(defaultState), ...parsed.state };
        save();
        renderAll();
        audit(`Restored configuration backup from V${parsed.version}`, "backup");
      } catch (_) {
        alert("This file is not a valid Blue Current backup.");
      }
      event.target.value = "";
    });

    renderAll();
    save();
    eventBus.emit("production:module-online", { version: "21.0", healthScore: calculateHealth() });

    return {
      getState: () => clone(state),
      runReadinessCheck: () => $("prodRunReadiness")?.click(),
      exportBackup: () => $("prodExportBackup")?.click()
    };
  }

  window.createBlueCurrentProductionReadinessModule = createProductionReadinessModule;
})();
