(function () {
  "use strict";

  function createBlueCurrentAiOrchestrationCenterModule(eventBus, appState) {
    const root = document.getElementById("aiOrchestrationCenter");
    if (!root) return null;

    const recommendationEngine = new window.BlueCurrentRecommendationEngine({ eventBus, appState });
    const engine = new window.BlueCurrentOrchestrationEngine({ eventBus, appState, recommendationEngine });
    let selectedId = null;
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const titleCase = value => String(value || "").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());

    function current() {
      const state = engine.snapshot();
      return state.queue.find(item => item.id === selectedId) || state.queue[0] || null;
    }

    function renderQueue(state) {
      const list = byId("aiOrchestrationQueue");
      if (!list) return;
      if (!state.queue.length) {
        list.innerHTML = '<p class="ai-orchestration-empty">No active recommendation. Refresh the operating picture to evaluate current signals.</p>';
        return;
      }
      if (!state.queue.some(item => item.id === selectedId)) selectedId = state.queue[0].id;
      list.innerHTML = state.queue.map(item => `
        <button type="button" class="ai-orchestration-card priority-${escapeHtml(item.priority)} ${item.id === selectedId ? "is-selected" : ""}" data-orchestration-id="${escapeHtml(item.id)}">
          <span>${escapeHtml(titleCase(item.priority))}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.action)}</p>
          <footer><b>${escapeHtml(item.confidence)}% confidence</b><em>${escapeHtml(item.owner)}</em></footer>
        </button>`).join("");
    }

    function renderInspector(item) {
      byId("aiOrchestrationSelectedTitle").textContent = item?.title || "Choose a recommendation";
      byId("aiOrchestrationSelectedAction").textContent = item?.action || "Select an item to review its reasoning and controls.";
      byId("aiOrchestrationOwner").textContent = item?.owner || "—";
      byId("aiOrchestrationConfidence").textContent = item ? `${item.confidence}%` : "—";
      byId("aiOrchestrationImpact").textContent = item?.expectedImpact || "—";
      byId("aiOrchestrationApproval").textContent = item ? (item.approvalRequired ? "Required" : "Policy permitted") : "—";
      const signals = byId("aiOrchestrationSignals");
      if (signals) signals.innerHTML = item?.signals?.map(signal => `<li><span>${escapeHtml(signal.label)}</span><strong>${escapeHtml(signal.value)}</strong></li>`).join("") || "";
      ["aiOrchestrationApprove", "aiOrchestrationSnooze", "aiOrchestrationDismiss"].forEach(id => { if (byId(id)) byId(id).disabled = !item; });
    }

    function renderWorkflows(state) {
      const list = byId("aiOrchestrationWorkflows");
      if (!list) return;
      list.innerHTML = state.activeWorkflows.length ? state.activeWorkflows.slice(0, 4).map(item => `
        <article>
          <span class="status-${escapeHtml(item.status)}">${escapeHtml(titleCase(item.status))}</span>
          <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.owner)} · ${new Date(item.startedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small></div>
          ${item.status === "in-progress" ? `<button type="button" data-workflow-complete="${escapeHtml(item.id)}">Complete</button>` : ""}
        </article>`).join("") : '<p class="ai-orchestration-empty">Approved recommendations will appear here as governed workflows.</p>';
    }

    function renderHistory(state) {
      const list = byId("aiOrchestrationHistory");
      if (!list) return;
      list.innerHTML = state.history.length ? state.history.slice(0, 5).map(item => `
        <article><span>${escapeHtml(titleCase(item.status))}</span><div><strong>${escapeHtml(item.title)}</strong><small>${new Date(item.decidedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small></div></article>`).join("") : '<p class="ai-orchestration-empty">No decisions recorded in this browser yet.</p>';
    }

    function render() {
      const state = engine.snapshot();
      renderQueue(state);
      renderInspector(current());
      renderWorkflows(state);
      renderHistory(state);
      byId("aiOrchestrationQueueCount").textContent = state.queue.length;
      byId("aiOrchestrationWorkflowCount").textContent = state.activeWorkflows.filter(item => item.status === "in-progress").length;
      byId("aiOrchestrationApprovalCount").textContent = state.queue.filter(item => item.approvalRequired).length;
      byId("aiOrchestrationUpdated").textContent = state.lastEvaluatedAt ? `Updated ${new Date(state.lastEvaluatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"})}` : "Awaiting operating signals";
    }

    root.addEventListener("click", event => {
      const card = event.target.closest("[data-orchestration-id]");
      if (card) { selectedId = card.dataset.orchestrationId; render(); return; }
      const complete = event.target.closest("[data-workflow-complete]");
      if (complete) { engine.completeWorkflow(complete.dataset.workflowComplete); render(); }
    });

    byId("aiOrchestrationRefresh")?.addEventListener("click", () => { engine.refresh({ reason: "manual" }); render(); });
    byId("aiOrchestrationApprove")?.addEventListener("click", () => { const item = current(); if (item) { engine.decide(item.id, "approved", byId("aiOrchestrationNote")?.value || ""); selectedId = null; render(); } });
    byId("aiOrchestrationSnooze")?.addEventListener("click", () => { const item = current(); if (item) { engine.decide(item.id, "snoozed"); selectedId = null; render(); } });
    byId("aiOrchestrationDismiss")?.addEventListener("click", () => { const item = current(); if (item) { engine.decide(item.id, "dismissed"); selectedId = null; render(); } });

    ["orchestration:queue-updated", "orchestration:workflow-list-updated"].forEach(name => eventBus.on(name, render));
    render();
    return { engine, recommendationEngine, refresh: () => { engine.refresh({ reason: "module-refresh" }); render(); }, getState: () => engine.snapshot() };
  }

  window.createBlueCurrentAiOrchestrationCenterModule = createBlueCurrentAiOrchestrationCenterModule;
})();
