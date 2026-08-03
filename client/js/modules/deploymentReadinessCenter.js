(function () {
  "use strict";

  function createBlueCurrentDeploymentReadinessCenterModule(eventBus, appState) {
    const root = document.getElementById("deploymentReadinessCenter");
    if (!root || !window.BlueCurrentDeploymentReadinessEngine) return null;
    const engine = new window.BlueCurrentDeploymentReadinessEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

    function render(snapshot = engine.refresh({ reason: "render" })) {
      byId("deploymentReadinessScore").textContent = `${snapshot.score}%`;
      byId("deploymentReadinessGate").textContent = snapshot.gate.replaceAll("-", " ");
      byId("deploymentReadinessGate").dataset.tone = snapshot.gate;
      byId("deploymentReadinessSummary").textContent = snapshot.summary;
      byId("deploymentReadinessReady").textContent = `${snapshot.counts.ready}/${snapshot.counts.total}`;
      byId("deploymentReadinessBlocked").textContent = String(snapshot.counts.blocked);
      byId("deploymentReadinessWatch").textContent = String(snapshot.counts.watch);
      byId("deploymentReadinessChecks").innerHTML = snapshot.checks.map(item => `<article data-status="${esc(item.status)}"><span>${esc(item.status)}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.evidence)}</small></div></article>`).join("");
      byId("deploymentReadinessRoles").innerHTML = snapshot.roles.map(item => `<article><div><small>${esc(item.role)}</small><strong>${esc(item.owner)}</strong></div><button type="button" data-deployment-role="${esc(item.id)}">Assign</button></article>`).join("");
      byId("deploymentReadinessTraining").innerHTML = snapshot.training.map(item => `<article data-status="${esc(item.status)}"><div><strong>${esc(item.title)}</strong><small>${esc(item.audience)}</small></div><select data-training-id="${esc(item.id)}"><option value="not-started"${item.status==='not-started'?' selected':''}>Not started</option><option value="in-progress"${item.status==='in-progress'?' selected':''}>In progress</option><option value="complete"${item.status==='complete'?' selected':''}>Complete</option></select></article>`).join("");
      byId("deploymentReadinessLocations").innerHTML = snapshot.locations.map(item => `<article><div><strong>${esc(item.name)}</strong><small>${esc(item.launchOwner || 'Unassigned')}</small></div><select data-location-id="${esc(item.id)}"><option value="planned"${item.status==='planned'?' selected':''}>Planned</option><option value="ready"${item.status==='ready'?' selected':''}>Ready</option><option value="live"${item.status==='live'?' selected':''}>Live</option><option value="hold"${item.status==='hold'?' selected':''}>Hold</option></select><button type="button" data-location-owner="${esc(item.id)}">Owner</button></article>`).join("");
      byId("deploymentReadinessActions").innerHTML = snapshot.nextActions.length ? snapshot.nextActions.map((item,index) => `<li><span>${index+1}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.action)}</small></div></li>`).join("") : `<li><span>✓</span><div><strong>Go-live controls cleared</strong><small>Maintain launch support coverage and monitor outcome evidence.</small></div></li>`;
      byId("deploymentLaunchWindow").value = snapshot.launchWindow || "";
      byId("deploymentRollbackPlan").value = snapshot.rollbackPlan || "";
    }

    function status(message, tone="") { const node = byId("deploymentReadinessMessage"); node.textContent = message; node.dataset.tone = tone; }

    root.addEventListener("click", event => {
      const roleButton = event.target.closest("[data-deployment-role]");
      if (roleButton) {
        const owner = window.prompt("Assign owner:", "") || "";
        render(engine.assignRole(roleButton.dataset.deploymentRole, owner));
        status("Deployment owner updated.", "success");
        return;
      }
      const locationButton = event.target.closest("[data-location-owner]");
      if (locationButton) {
        const owner = window.prompt("Location launch owner:", "") || "";
        const location = engine.normalizeLocations(appState.get("deploymentLocations"), appState.get("pilotReview") || {}).find(item => item.id === locationButton.dataset.locationOwner);
        render(engine.setLocation(locationButton.dataset.locationOwner, location?.status || "planned", owner));
        status("Location launch owner updated.", "success");
      }
    });

    root.addEventListener("change", event => {
      const training = event.target.closest("[data-training-id]");
      if (training) { render(engine.setTraining(training.dataset.trainingId, training.value)); status("Training status updated.", "success"); return; }
      const location = event.target.closest("[data-location-id]");
      if (location) { render(engine.setLocation(location.dataset.locationId, location.value)); status("Location readiness updated.", "success"); }
    });

    byId("deploymentReadinessRefresh")?.addEventListener("click", () => { render(engine.refresh({ reason: "manual-audit" })); status("Deployment readiness recalculated.", "success"); });
    byId("deploymentReadinessSavePlan")?.addEventListener("click", () => { render(engine.saveLaunchPlan({ window: byId("deploymentLaunchWindow").value, rollbackPlan: byId("deploymentRollbackPlan").value })); status("Launch window and rollback plan saved.", "success"); });
    byId("deploymentReadinessExport")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(engine.exportManifest(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `blue-current-deployment-readiness-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); status("Deployment manifest downloaded.", "success");
    });

    eventBus.on("deployment-readiness:updated", snapshot => snapshot && render(snapshot));
    setTimeout(() => render(engine.refresh({ reason: "startup-settled" })), 620);
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => appState.get("deploymentReadiness") };
  }

  window.createBlueCurrentDeploymentReadinessCenterModule = createBlueCurrentDeploymentReadinessCenterModule;
})();
