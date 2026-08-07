(function () {
  "use strict";

  function createBlueCurrentExecutiveBriefingCenterModule(eventBus, appState) {
    const root = document.getElementById("executiveBriefingCenter");
    if (!root || !window.BlueCurrentExecutiveBriefingEngine) return null;
    const engine = new window.BlueCurrentExecutiveBriefingEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

    function render(snapshot = engine.snapshot()) {
      byId("executiveBriefingUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("executiveBriefingHeadline").textContent = snapshot.headline;
      byId("executiveBriefingNarrative").textContent = snapshot.narrative;
      byId("executiveBriefingRpi").textContent = snapshot.metrics.rpi.toFixed(1);
      byId("executiveBriefingOpportunity").textContent = money(snapshot.metrics.opportunity);
      byId("executiveBriefingRealized").textContent = money(snapshot.metrics.realizedRevenue);
      byId("executiveBriefingApprovals").textContent = snapshot.metrics.pendingApprovals;
      byId("executiveBriefingConfidence").textContent = `${snapshot.confidence}% confidence`;
      byId("executiveBriefingQuestions").innerHTML = snapshot.executiveQuestions.map(item => `<article><small>${esc(item.label)}</small><strong>${esc(item.answer)}</strong></article>`).join("");
      byId("executiveBriefingPriorities").innerHTML = snapshot.priorities.length ? snapshot.priorities.map((item,index) => `<article class="executive-briefing-priority" data-priority-id="${esc(item.id)}"><span>${index + 1}</span><div><small>${esc(item.source)} · ${esc(item.owner || "Manager on duty")}</small><strong>${esc(item.title)}</strong><p>${esc(item.instruction)}</p></div><b>${money(item.revenueImpact)}<i>+${Number(item.rpiImpact || 0).toFixed(1)} RPI</i></b></article>`).join("") : `<p class="executive-briefing-empty">No priority action is required. Continue monitoring the current performance posture.</p>`;
      byId("executiveBriefingRisks").innerHTML = snapshot.risks.length ? snapshot.risks.map(item => `<article class="executive-briefing-risk" data-tone="${esc(item.tone)}"><span>${esc(item.tone)}</span><div><small>${esc(item.source)}</small><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div></article>`).join("") : `<p class="executive-briefing-empty">No elevated operational risk is currently detected.</p>`;
      byId("executiveBriefingWins").innerHTML = snapshot.wins.length ? snapshot.wins.map(item => `<article><small>${esc(item.source)}</small><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></article>`).join("") : `<p class="executive-briefing-empty">Measured wins will appear as Outcome Intelligence records completed decisions.</p>`;
      const action = snapshot.nextBestAction;
      byId("executiveBriefingNextAction").textContent = action?.title || "Maintain current posture";
      byId("executiveBriefingNextActionDetail").textContent = action?.instruction || "No immediate leadership intervention is required.";
      byId("executiveBriefingNextActionImpact").textContent = action ? `${money(action.revenueImpact)} · +${Number(action.rpiImpact || 0).toFixed(1)} RPI` : "Monitoring";
      byId("executiveBriefingAct").disabled = !action;
      byId("executiveBriefingAct").dataset.actionId = action?.id || "";
    }

    byId("executiveBriefingRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("executiveBriefingExport")?.addEventListener("click", async () => {
      const text = engine.exportText(engine.snapshot());
      try { await navigator.clipboard.writeText(text); byId("executiveBriefingStatus").textContent = "Executive briefing copied to the clipboard."; }
      catch (_) { const blob = new Blob([text], { type: "text/plain" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `blue-current-executive-brief-${new Date().toISOString().slice(0,10)}.txt`; link.click(); URL.revokeObjectURL(link.href); byId("executiveBriefingStatus").textContent = "Executive briefing downloaded."; }
      setTimeout(() => { byId("executiveBriefingStatus").textContent = ""; }, 4500);
    });
    byId("executiveBriefingAct")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const action = snapshot.nextBestAction;
      if (!action) return;
      eventBus.emit("restaurant-performance:action-approved", { action, performance: appState.get("restaurantPerformance"), approvedAt: new Date().toISOString(), source: "executive-briefing" });
      eventBus.emit("executive-briefing:action-selected", { action, briefing: snapshot });
      byId("executiveBriefingStatus").textContent = `${action.title} sent into the governed action and outcome-measurement path.`;
      setTimeout(() => { byId("executiveBriefingStatus").textContent = ""; }, 5000);
    });
    eventBus.on("executive-briefing:updated", render);
    render(engine.refresh({ reason: "startup" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentExecutiveBriefingCenterModule = createBlueCurrentExecutiveBriefingCenterModule;
})();
