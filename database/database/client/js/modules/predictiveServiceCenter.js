(function () {
  "use strict";

  function createBlueCurrentPredictiveServiceCenterModule(eventBus, appState) {
    const root = document.getElementById("predictiveServiceCenter");
    if (!root || !window.BlueCurrentPredictiveServiceEngine) return null;
    const engine = new window.BlueCurrentPredictiveServiceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const titleCase = value => String(value || "").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
    let selectedInterventionId = null;

    function renderHorizons(snapshot) {
      const list = byId("predictiveServiceHorizons");
      list.innerHTML = snapshot.horizons.map(item => `
        <article class="predictive-service-horizon band-${escapeHtml(item.band)}">
          <header><span>${item.minutes} min</span><i>${escapeHtml(titleCase(item.band))}</i></header>
          <strong>${item.pressure}</strong><small>pressure score</small>
          <dl><div><dt>Occupancy</dt><dd>${item.occupancy}%</dd></div><div><dt>Kitchen</dt><dd>${item.kitchen}%</dd></div><div><dt>Wait</dt><dd>${item.wait} min</dd></div><div><dt>Tickets</dt><dd>${item.ticket} min</dd></div></dl>
          <p>${escapeHtml(item.constraint)}</p>
        </article>`).join("");
    }

    function renderWindows(snapshot) {
      const list = byId("predictiveServiceRiskWindows");
      list.innerHTML = snapshot.riskWindows.length ? snapshot.riskWindows.map(item => `
        <article class="severity-${escapeHtml(item.severity)}">
          <div><small>Starts in ${item.startsInMinutes} min · ${escapeHtml(item.owner)}</small><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div>
          <span>${escapeHtml(titleCase(item.severity))}</span>
          <ul>${item.evidence.map(evidence => `<li>${escapeHtml(evidence)}</li>`).join("")}</ul>
        </article>`).join("") : `<div class="predictive-service-empty"><strong>No material risk windows</strong><p>The current one-hour forecast remains inside the configured operating band.</p></div>`;
    }

    function renderInterventions(snapshot) {
      const list = byId("predictiveServiceInterventions");
      if (!snapshot.interventions.some(item => item.id === selectedInterventionId)) selectedInterventionId = snapshot.interventions[0]?.id || null;
      list.innerHTML = snapshot.interventions.map(item => `
        <button type="button" class="predictive-service-intervention ${item.id === selectedInterventionId ? "is-selected" : ""}" data-predictive-service-intervention="${escapeHtml(item.id)}">
          <span><small>${escapeHtml(item.owner)} · ${item.confidence}% confidence</small><strong>${escapeHtml(item.title)}</strong></span><i>${escapeHtml(titleCase(item.priority))}</i><p>${escapeHtml(item.action)}</p>
        </button>`).join("");
      renderInspector(snapshot);
    }

    function renderInspector(snapshot) {
      const item = snapshot.interventions.find(candidate => candidate.id === selectedInterventionId) || snapshot.interventions[0];
      byId("predictiveServiceSelectedTitle").textContent = item?.title || "No intervention selected";
      byId("predictiveServiceSelectedAction").textContent = item?.action || "—";
      byId("predictiveServiceSelectedImpact").textContent = item?.expectedImpact || "—";
      byId("predictiveServiceSelectedOwner").textContent = item?.owner || "—";
      byId("predictiveServiceSelectedConfidence").textContent = item ? `${item.confidence}%` : "—";
      byId("predictiveServiceSelectedGovernance").textContent = item?.approvalRequired ? "Manager approval required" : "Advisory only";
      byId("predictiveServiceApprove").disabled = !item;
    }

    function renderEvidence(snapshot) {
      byId("predictiveServiceEvidence").innerHTML = snapshot.evidence.map(item => `<article><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(titleCase(item.status))}</strong><span>${escapeHtml(item.detail)}</span></article>`).join("");
    }

    function render(snapshot = engine.snapshot()) {
      byId("predictiveServiceUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
      byId("predictiveServiceHeadline").textContent = snapshot.headline;
      byId("predictiveServiceConfidence").textContent = `${snapshot.confidence}%`;
      byId("predictiveServiceRiskCount").textContent = snapshot.riskWindows.length;
      byId("predictiveServicePeakPressure").textContent = Math.max(...snapshot.horizons.map(item => item.pressure));
      byId("predictiveServicePeakWindow").textContent = `${[...snapshot.horizons].sort((a,b) => b.pressure-a.pressure)[0]?.minutes || 0} min`;
      byId("predictiveServiceInterventionCount").textContent = snapshot.interventions.length;
      renderHorizons(snapshot);
      renderWindows(snapshot);
      renderInterventions(snapshot);
      renderEvidence(snapshot);
    }

    root.addEventListener("click", event => {
      const button = event.target.closest("[data-predictive-service-intervention]");
      if (!button) return;
      selectedInterventionId = button.dataset.predictiveServiceIntervention;
      render(engine.snapshot());
    });

    byId("predictiveServiceRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("predictiveServiceApprove")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const intervention = snapshot.interventions.find(item => item.id === selectedInterventionId);
      if (!intervention) return;
      eventBus.emit("predictive-service:intervention-approved", { intervention, approvedAt: new Date().toISOString() });
      eventBus.emit("orchestration:external-recommendation", { source: "predictive-service", recommendation: intervention });
      const status = byId("predictiveServiceDecisionStatus");
      status.textContent = `Approved: ${intervention.title}`;
      setTimeout(() => { status.textContent = ""; }, 3500);
    });

    eventBus.on("predictive-service:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentPredictiveServiceCenterModule = createBlueCurrentPredictiveServiceCenterModule;
})();
