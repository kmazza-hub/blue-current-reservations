(function () {
  "use strict";

  function createBlueCurrentExecutiveWorkflowCenterModule(eventBus, appState) {
    const root = document.getElementById("executiveWorkflowCenter");
    if (!root || !window.BlueCurrentExecutiveWorkflowEngine) return null;
    const engine = new window.BlueCurrentExecutiveWorkflowEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
    let selectedId = null;

    function timeLeft(dueAt) {
      const minutes = Math.round((new Date(dueAt).getTime() - Date.now()) / 60000);
      if (minutes < 0) return `${Math.abs(minutes)}m overdue`;
      return `${minutes}m remaining`;
    }

    function render(snapshot = engine.snapshot()) {
      const summary = snapshot.summary;
      byId("executiveWorkflowUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("executiveWorkflowActiveCount").textContent = summary.active;
      byId("executiveWorkflowApprovalCount").textContent = summary.awaitingApproval;
      byId("executiveWorkflowPausedCount").textContent = summary.paused;
      byId("executiveWorkflowCompletedCount").textContent = summary.completed;
      byId("executiveWorkflowHeadline").textContent = summary.awaitingApproval ? `${summary.awaitingApproval} workflow approval${summary.awaitingApproval === 1 ? "" : "s"} require attention.` : summary.active ? `${summary.active} governed workflow${summary.active === 1 ? " is" : "s are"} in progress.` : "No active executive workflows.";

      if (!snapshot.workflows.some(item => item.id === selectedId)) selectedId = snapshot.workflows[0]?.id || null;
      byId("executiveWorkflowQueue").innerHTML = snapshot.workflows.length ? snapshot.workflows.map(item => {
        const step = item.steps[item.currentStepIndex];
        return `<button type="button" class="executive-workflow-card ${item.id === selectedId ? "is-selected" : ""} ${item.status === "paused" ? "is-paused" : ""}" data-workflow-id="${esc(item.id)}">
          <small>${esc(item.owner)} · ${esc(timeLeft(item.dueAt))}</small>
          <strong>${esc(item.title)}</strong>
          <span>${esc(step?.title || "Completed")} · ${esc(item.status)}</span>
          <div><i style="width:${Math.round((item.currentStepIndex / item.steps.length) * 100)}%"></i></div>
        </button>`;
      }).join("") : `<div class="executive-workflow-empty"><strong>No active workflows</strong><p>Approved recommendations and policy actions will appear here.</p></div>`;

      const selected = snapshot.workflows.find(item => item.id === selectedId);
      const currentStep = selected?.steps[selected.currentStepIndex];
      byId("executiveWorkflowSelectedTitle").textContent = selected?.title || "Choose a workflow";
      byId("executiveWorkflowSelectedOwner").textContent = selected?.owner || "—";
      byId("executiveWorkflowSelectedStatus").textContent = selected?.status || "—";
      byId("executiveWorkflowSelectedSla").textContent = selected ? timeLeft(selected.dueAt) : "—";
      byId("executiveWorkflowSelectedSource").textContent = selected?.context?.source || "—";
      byId("executiveWorkflowSteps").innerHTML = selected ? selected.steps.map((step, index) => `<article class="executive-workflow-step is-${esc(step.status)}">
        <span>${index + 1}</span><div><small>${esc(step.type)}</small><strong>${esc(step.title)}</strong><p>${step.status === "completed" ? `Completed ${new Date(step.completedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}` : step.status === "active" ? "Current step" : "Pending"}</p></div>
      </article>`).join("") : "";
      byId("executiveWorkflowEvidence").innerHTML = selected?.context?.evidence?.length ? selected.context.evidence.map(item => `<li>${esc(item)}</li>`).join("") : `<li>No supporting evidence attached.</li>`;
      byId("executiveWorkflowAudit").innerHTML = selected?.audit?.length ? selected.audit.slice(0, 8).map(item => `<article><small>${new Date(item.at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small><strong>${esc(item.type.replace(/-/g, " "))}</strong><span>${esc(item.detail)}</span></article>`).join("") : `<p>No audit events yet.</p>`;

      const active = selected?.status === "active";
      byId("executiveWorkflowAdvance").disabled = !active || currentStep?.type === "approval";
      byId("executiveWorkflowApprove").disabled = !active || currentStep?.type !== "approval";
      byId("executiveWorkflowPause").disabled = !selected || selected.status === "completed";
      byId("executiveWorkflowPause").textContent = selected?.status === "paused" ? "Resume workflow" : "Pause workflow";
      byId("executiveWorkflowCurrentStep").textContent = currentStep?.title || "—";
    }

    root.addEventListener("click", event => {
      const item = event.target.closest("[data-workflow-id]");
      if (item) { selectedId = item.dataset.workflowId; render(engine.snapshot()); }
    });
    byId("executiveWorkflowAdvance")?.addEventListener("click", () => { engine.advance(selectedId, byId("executiveWorkflowNote").value.trim()); byId("executiveWorkflowNote").value = ""; render(engine.snapshot()); });
    byId("executiveWorkflowApprove")?.addEventListener("click", () => { engine.approve(selectedId, byId("executiveWorkflowNote").value.trim()); byId("executiveWorkflowNote").value = ""; render(engine.snapshot()); });
    byId("executiveWorkflowPause")?.addEventListener("click", () => {
      const workflow = engine.find(selectedId);
      if (!workflow) return;
      workflow.status === "paused" ? engine.resume(selectedId) : engine.pause(selectedId, byId("executiveWorkflowNote").value.trim());
      render(engine.snapshot());
    });
    byId("executiveWorkflowCreate")?.addEventListener("click", () => { const workflow = engine.create("service-recovery", { source: "manual", evidence: ["Manager-created workflow"] }); selectedId = workflow.id; render(engine.snapshot()); });
    eventBus.on("executive-workflow:updated", render);
    render(engine.snapshot());
    return { engine, refresh: () => render(engine.snapshot()), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentExecutiveWorkflowCenterModule = createBlueCurrentExecutiveWorkflowCenterModule;
})();
