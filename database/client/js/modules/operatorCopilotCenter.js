(function () {
  "use strict";

  function createBlueCurrentOperatorCopilotCenterModule(eventBus, appState) {
    const root = document.getElementById("operatorCopilotCenter");
    if (!root || !window.BlueCurrentOperatorCopilotEngine) return null;
    const engine = new window.BlueCurrentOperatorCopilotEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);

    function render(snapshot = engine.snapshot()) {
      byId("operatorCopilotUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("operatorCopilotState").textContent = snapshot.status === "attention" ? "Needs attention" : snapshot.status === "ready" ? "Ready to act" : "Shift stable";
      byId("operatorCopilotState").dataset.tone = snapshot.status;
      byId("operatorCopilotHeadline").textContent = snapshot.briefing.headline;
      byId("operatorCopilotMessage").textContent = snapshot.briefing.message;
      byId("operatorCopilotActionCount").textContent = snapshot.bundle.actionCount;
      byId("operatorCopilotProfit").textContent = money(snapshot.bundle.projectedProfit);
      byId("operatorCopilotRpi").textContent = `+${snapshot.bundle.projectedRpiGain.toFixed(1)}`;
      byId("operatorCopilotConfidence").textContent = `${snapshot.bundle.averageConfidence}%`;
      byId("operatorCopilotApproveAll").disabled = snapshot.bundle.actionCount === 0;
      byId("operatorCopilotApproveAll").textContent = snapshot.bundle.actionCount ? `Approve ${snapshot.bundle.actionCount} action${snapshot.bundle.actionCount === 1 ? "" : "s"}` : "No action required";
      renderActions(snapshot);
      renderPrompts(snapshot);
    }

    function renderActions(snapshot) {
      byId("operatorCopilotActions").innerHTML = snapshot.bundle.actions.length ? snapshot.bundle.actions.map((action, index) => `<article class="operator-copilot-action"><span>${index + 1}</span><div><strong>${esc(action.title)}</strong><p>${esc(action.instruction)}</p><small>${esc(action.owner)} · ${action.confidence}% confidence</small></div><dl><div><dt>Profit</dt><dd>${money(action.profitImpact)}</dd></div><div><dt>RPI</dt><dd>+${action.projectedRpiGain.toFixed(1)}</dd></div></dl><div class="operator-copilot-action-buttons"><button type="button" data-copilot-open="${esc(action.sourceId)}">Evidence</button><button type="button" data-copilot-dismiss="${esc(action.id)}">Dismiss</button></div></article>`).join("") : `<p class="operator-copilot-empty">No operator action is required right now.</p>`;
    }

    function renderPrompts(snapshot) {
      byId("operatorCopilotPrompts").innerHTML = snapshot.prompts.map(prompt => `<button type="button" data-copilot-prompt="${esc(prompt.id)}">${esc(prompt.label)}</button>`).join("");
    }

    function answer(question) {
      byId("operatorCopilotAnswer").textContent = engine.ask(question);
      byId("operatorCopilotQuestion").value = "";
    }

    root.addEventListener("click", event => {
      const prompt = event.target.closest("[data-copilot-prompt]");
      if (prompt) return answer(prompt.dataset.copilotPrompt);
      const dismiss = event.target.closest("[data-copilot-dismiss]");
      if (dismiss) return render(engine.dismissAction(dismiss.dataset.copilotDismiss));
      const source = event.target.closest("[data-copilot-open]")?.dataset.copilotOpen;
      if (source) {
        document.body.classList.remove("blue-current-command-mode");
        document.body.classList.add("blue-current-full-platform-mode");
        window.setTimeout(() => document.getElementById(source)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    });

    byId("operatorCopilotAsk")?.addEventListener("click", () => answer(byId("operatorCopilotQuestion").value));
    byId("operatorCopilotQuestion")?.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); answer(event.currentTarget.value); } });
    byId("operatorCopilotRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("operatorCopilotSnooze")?.addEventListener("click", () => { render(engine.snooze(5)); byId("operatorCopilotStatus").textContent = "Copilot snoozed for 5 minutes."; setTimeout(() => { byId("operatorCopilotStatus").textContent = ""; }, 3500); });
    byId("operatorCopilotApproveAll")?.addEventListener("click", () => { const before = engine.snapshot(); render(engine.approveBundle("Manager")); byId("operatorCopilotStatus").textContent = before.bundle.actionCount ? `Approved ${before.bundle.actionCount} action${before.bundle.actionCount === 1 ? "" : "s"}.` : "No action required."; setTimeout(() => { byId("operatorCopilotStatus").textContent = ""; }, 4500); });

    eventBus.on("operator-copilot:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentOperatorCopilotCenterModule = createBlueCurrentOperatorCopilotCenterModule;
})();
