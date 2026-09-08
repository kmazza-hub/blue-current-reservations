(function () {
  "use strict";

  function createBlueCurrentPostLaunchValueCenterModule(eventBus, appState) {
    const root = document.getElementById("postLaunchValueCenter");
    if (!root || !window.BlueCurrentPostLaunchValueEngine) return null;
    const engine = new window.BlueCurrentPostLaunchValueEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));

    function render(snapshot = engine.refresh({ reason: "render" })) {
      byId("postLaunchHealthScore").textContent = `${snapshot.healthScore}%`;
      byId("postLaunchGate").textContent = snapshot.gate.replaceAll("-", " ");
      byId("postLaunchGate").dataset.tone = snapshot.gate;
      byId("postLaunchSummary").textContent = snapshot.summary;
      byId("postLaunchAdoptionScore").textContent = `${snapshot.adoptionScore}%`;
      byId("postLaunchRealizedRevenue").textContent = money(snapshot.value.realizedRevenue);
      byId("postLaunchOpenIssues").textContent = String(snapshot.counts.openIssues);
      byId("postLaunchLiveLocations").textContent = `${snapshot.counts.liveLocations}/${snapshot.counts.totalLocations}`;
      byId("postLaunchForecastAccuracy").textContent = `${snapshot.value.forecastAccuracy}%`;
      byId("postLaunchRpiRecovered").textContent = `+${snapshot.value.measuredRpi}`;

      byId("postLaunchAdoption").innerHTML = snapshot.adoption.map(item => `<article><div><strong>${esc(item.group)}</strong><small>${item.activeUsers}/${item.targetUsers} active users · ${item.weeklyActions}/${item.targetActions} weekly actions</small></div><button type="button" data-adoption-id="${esc(item.id)}">Update</button></article>`).join("");
      byId("postLaunchLocations").innerHTML = snapshot.locations.map(item => `<article data-status="${esc(item.status)}"><div><strong>${esc(item.name)}</strong><small>${esc(item.owner)} · ${item.adoptionPercent}% adoption · ${money(item.realizedRevenue)}</small></div><select data-post-launch-location="${esc(item.id)}"><option value="preparing"${item.status==='preparing'?' selected':''}>Preparing</option><option value="stabilizing"${item.status==='stabilizing'?' selected':''}>Stabilizing</option><option value="live"${item.status==='live'?' selected':''}>Live</option><option value="hold"${item.status==='hold'?' selected':''}>Hold</option></select><button type="button" data-location-metrics="${esc(item.id)}">Metrics</button></article>`).join("");
      byId("postLaunchIssues").innerHTML = snapshot.issues.length ? snapshot.issues.map(item => `<article data-severity="${esc(item.severity)}" data-status="${esc(item.status)}"><div><strong>${esc(item.title)}</strong><small>${esc(item.owner)} · ${esc(item.severity)} · ${esc(item.status)}</small></div>${item.status === 'resolved' ? '<span>Resolved</span>' : `<button type="button" data-resolve-issue="${esc(item.id)}">Resolve</button>`}</article>`).join("") : `<article data-severity="low"><div><strong>No post-launch issues recorded</strong><small>Add operational, training, or technical issues as they surface.</small></div></article>`;
      byId("postLaunchActions").innerHTML = snapshot.nextActions.length ? snapshot.nextActions.map((item,index) => `<li><span>${index+1}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.action)}</small></div></li>`).join("") : `<li><span>✓</span><div><strong>Launch value loop is healthy</strong><small>Continue measuring outcomes and prepare the next controlled expansion.</small></div></li>`;
    }

    function status(message, tone="") { const node = byId("postLaunchMessage"); node.textContent = message; node.dataset.tone = tone; }

    root.addEventListener("click", event => {
      const adoptionButton = event.target.closest("[data-adoption-id]");
      if (adoptionButton) {
        const current = engine.normalizeAdoption(appState.get("postLaunchAdoption")).find(item => item.id === adoptionButton.dataset.adoptionId);
        const activeUsers = window.prompt("Active users:", String(current?.activeUsers || 0));
        if (activeUsers === null) return;
        const weeklyActions = window.prompt("Weekly actions:", String(current?.weeklyActions || 0));
        if (weeklyActions === null) return;
        render(engine.updateAdoption(adoptionButton.dataset.adoptionId, { activeUsers, weeklyActions }));
        status("Adoption metrics updated.", "success");
        return;
      }
      const metricsButton = event.target.closest("[data-location-metrics]");
      if (metricsButton) {
        const current = engine.normalizeLocations(appState.get("postLaunchLocations"), appState.get("deploymentLocations")).find(item => item.id === metricsButton.dataset.locationMetrics);
        const adoptionPercent = window.prompt("Location adoption percent:", String(current?.adoptionPercent || 0));
        if (adoptionPercent === null) return;
        const realizedRevenue = window.prompt("Realized revenue:", String(current?.realizedRevenue || 0));
        if (realizedRevenue === null) return;
        const owner = window.prompt("Location owner:", current?.owner || "Unassigned");
        render(engine.updateLocation(metricsButton.dataset.locationMetrics, { adoptionPercent, realizedRevenue, owner }));
        status("Location value metrics updated.", "success");
        return;
      }
      const resolveButton = event.target.closest("[data-resolve-issue]");
      if (resolveButton) {
        render(engine.resolveIssue(resolveButton.dataset.resolveIssue));
        status("Post-launch issue resolved.", "success");
      }
    });

    root.addEventListener("change", event => {
      const select = event.target.closest("[data-post-launch-location]");
      if (!select) return;
      render(engine.updateLocation(select.dataset.postLaunchLocation, { status: select.value }));
      status("Location rollout state updated.", "success");
    });

    byId("postLaunchRefresh")?.addEventListener("click", () => { render(engine.refresh({ reason: "manual-review" })); status("Post-launch health recalculated.", "success"); });
    byId("postLaunchAddIssue")?.addEventListener("click", () => {
      const title = window.prompt("Issue title:", "");
      if (!title) return;
      const severity = window.prompt("Severity: low, watch, high, or blocking", "watch") || "watch";
      const owner = window.prompt("Issue owner:", "Unassigned") || "Unassigned";
      try { render(engine.addIssue({ title, severity, owner })); status("Post-launch issue added.", "success"); }
      catch (error) { status(error.message, "error"); }
    });
    byId("postLaunchExport")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(engine.exportManifest(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `blue-current-post-launch-value-${Date.now()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); status("Post-launch value manifest downloaded.", "success");
    });

    eventBus.on("post-launch-value:updated", snapshot => snapshot && render(snapshot));
    setTimeout(() => render(engine.refresh({ reason: "startup-settled" })), 720);
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => appState.get("postLaunchValue") };
  }

  window.createBlueCurrentPostLaunchValueCenterModule = createBlueCurrentPostLaunchValueCenterModule;
})();
