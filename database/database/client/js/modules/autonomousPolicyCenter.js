(function () {
  "use strict";
  function createBlueCurrentAutonomousPolicyCenterModule(eventBus, appState) {
    const root = document.getElementById("autonomousPolicyCenter");
    if (!root || !window.BlueCurrentAutonomousPolicyEngine) return null;
    const engine = new window.BlueCurrentAutonomousPolicyEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
    let selectedId = null;

    function render(snapshot = engine.snapshot()) {
      byId("autonomousPolicyUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("autonomousPolicyHeadline").textContent = snapshot.headline;
      byId("autonomousPolicyActiveCount").textContent = snapshot.activePolicyCount;
      byId("autonomousPolicyMatchedCount").textContent = snapshot.matchedPolicyCount;
      byId("autonomousPolicyGovernance").textContent = snapshot.governance;
      byId("autonomousPolicyList").innerHTML = snapshot.policies.map(policy => `
        <article class="autonomous-policy-card ${policy.match.active ? "is-matched" : ""}">
          <div><small>${esc(policy.trigger)}</small><strong>${esc(policy.name)}</strong><p>${esc(policy.action)}</p><span>${esc(policy.owner)} · ${policy.match.confidence}% confidence</span></div>
          <label><input type="checkbox" data-policy-toggle="${esc(policy.id)}" ${policy.enabled ? "checked" : ""}> Enabled</label>
        </article>`).join("");
      if (!snapshot.candidates.some(item => item.id === selectedId)) selectedId = snapshot.candidates[0]?.id || null;
      byId("autonomousPolicyCandidates").innerHTML = snapshot.candidates.length ? snapshot.candidates.map(item => `
        <button type="button" class="autonomous-policy-candidate ${item.id === selectedId ? "is-selected" : ""}" data-policy-candidate="${esc(item.id)}">
          <small>${esc(item.owner)} · ${item.confidence}% confidence</small><strong>${esc(item.title)}</strong><span>${esc(item.action)}</span>
        </button>`).join("") : `<div class="autonomous-policy-empty"><strong>No policy action required</strong><p>The current forecast remains within approved operating guardrails.</p></div>`;
      const selected = snapshot.candidates.find(item => item.id === selectedId);
      byId("autonomousPolicySelectedTitle").textContent = selected?.title || "No action selected";
      byId("autonomousPolicySelectedAction").textContent = selected?.action || "—";
      byId("autonomousPolicySelectedTrigger").textContent = selected?.trigger || "—";
      byId("autonomousPolicySelectedOwner").textContent = selected?.owner || "—";
      byId("autonomousPolicySelectedConfidence").textContent = selected ? `${selected.confidence}%` : "—";
      byId("autonomousPolicySelectedEvidence").innerHTML = selected?.evidence?.map(item => `<li>${esc(item)}</li>`).join("") || "";
      byId("autonomousPolicyApprove").disabled = !selected;
      const history = appState.get("autonomousPolicyHistory") || [];
      byId("autonomousPolicyHistory").innerHTML = history.length ? history.slice(0, 8).map(item => `<article><small>${new Date(item.decidedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small><strong>${esc(item.title)}</strong><span>${esc(item.status)} · ${esc(item.owner)}</span></article>`).join("") : `<p>No approved policy actions yet.</p>`;
    }

    root.addEventListener("change", event => {
      const toggle = event.target.closest("[data-policy-toggle]");
      if (toggle) render(engine.setEnabled(toggle.dataset.policyToggle, toggle.checked));
    });
    root.addEventListener("click", event => {
      const choice = event.target.closest("[data-policy-candidate]");
      if (choice) { selectedId = choice.dataset.policyCandidate; render(engine.snapshot()); }
    });
    byId("autonomousPolicyRefresh")?.addEventListener("click", () => render(engine.evaluate({ reason: "manual" })));
    byId("autonomousPolicyApprove")?.addEventListener("click", () => {
      const record = engine.approve(selectedId, byId("autonomousPolicyNote").value.trim());
      if (!record) return;
      byId("autonomousPolicyStatus").textContent = `Approved: ${record.title}`;
      byId("autonomousPolicyNote").value = "";
      render(engine.evaluate({ reason: "post-approval" }));
    });
    eventBus.on("autonomous-policy:updated", render);
    render(engine.evaluate({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.evaluate({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }
  window.createBlueCurrentAutonomousPolicyCenterModule = createBlueCurrentAutonomousPolicyCenterModule;
})();
