(function () {
  "use strict";

  function createBlueCurrentPilotReleaseCenterModule(eventBus, appState) {
    const root = document.getElementById("pilotReleaseCenter");
    if (!root || !window.BlueCurrentPilotReleaseEngine) return null;
    const engine = new window.BlueCurrentPilotReleaseEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

    function flattenChecks(snapshot) {
      return Object.values(snapshot.checks || {}).flat();
    }

    function render(snapshot = engine.snapshot()) {
      if (!snapshot) return;
      byId("pilotReleaseScore").textContent = snapshot.score;
      byId("pilotReleaseGate").textContent = snapshot.gate.replace(/-/g, " ");
      byId("pilotReleaseGate").dataset.tone = snapshot.gate;
      byId("pilotReleaseHeadline").textContent = snapshot.headline;
      byId("pilotReleaseUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("pilotReleaseReadyCount").textContent = `${snapshot.passed}/${snapshot.total}`;
      byId("pilotReleaseBlockedCount").textContent = snapshot.blocked;
      byId("pilotReleaseVersion").textContent = `V${snapshot.version}`;
      byId("pilotReleaseLocation").textContent = snapshot.manifest.activeLocation;
      const checks = flattenChecks(snapshot);
      byId("pilotReleaseChecks").innerHTML = checks.map(check => `<li data-status="${esc(check.status)}"><span>${check.status === "ready" ? "Ready" : check.status === "blocked" ? "Blocked" : "Watch"}</span><div><strong>${esc(check.label)}</strong><small>${esc(check.detail)}</small></div></li>`).join("");
      byId("pilotReleaseModules").innerHTML = snapshot.manifest.modules.map(module => `<article data-status="${esc(module.status)}"><span>${module.status}</span><strong>${esc(module.label)}</strong></article>`).join("");
      byId("pilotReleaseActions").innerHTML = snapshot.nextActions.map(item => `<li>${esc(item)}</li>`).join("");
    }

    function exportManifest() {
      const snapshot = engine.snapshot();
      const blob = new Blob([JSON.stringify(snapshot.manifest, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `blue-current-${snapshot.manifest.release.toLowerCase()}-manifest.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      byId("pilotReleaseStatus").textContent = "Release manifest downloaded.";
    }

    byId("pilotReleaseRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("pilotReleaseExport")?.addEventListener("click", exportManifest);
    eventBus.on("pilot-release:updated", snapshot => snapshot && render(snapshot));
    setTimeout(() => render(engine.refresh({ reason: "startup-settled" })), 350);
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentPilotReleaseCenterModule = createBlueCurrentPilotReleaseCenterModule;
})();
