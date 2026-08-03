(function () {
  "use strict";

  function createBlueCurrentOutcomeIntelligenceCenterModule(eventBus, appState) {
    const root = document.getElementById("outcomeIntelligenceCenter");
    if (!root || !window.BlueCurrentOutcomeIntelligenceEngine) return null;
    const engine = new window.BlueCurrentOutcomeIntelligenceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

    function render(snapshot = engine.summary()) {
      const totals = snapshot.totals;
      byId("outcomeIntelligenceActive").textContent = totals.activeCount;
      byId("outcomeIntelligenceMeasured").textContent = totals.measuredCount;
      byId("outcomeIntelligenceRevenue").textContent = money(totals.realizedRevenue);
      byId("outcomeIntelligenceRpi").textContent = `+${totals.rpiRecovered.toFixed(1)}`;
      byId("outcomeIntelligenceAccuracy").textContent = totals.measuredCount ? `${totals.forecastAccuracy}%` : "—";
      byId("outcomeIntelligenceUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("outcomeIntelligenceActiveList").innerHTML = snapshot.active.length ? snapshot.active.map(item => `<article class="outcome-intelligence-item">
        <div><small>${esc(item.owner)} · due ${new Date(item.dueAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small><strong>${esc(item.title)}</strong><p>Baseline ${item.baseline.rpi.toFixed(1)} RPI · projected +${item.projected.rpiGain.toFixed(1)} and ${money(item.projected.revenue)}</p></div>
        <button type="button" data-complete-outcome="${esc(item.id)}">Measure result</button>
      </article>`).join("") : `<p class="outcome-intelligence-empty">Approve a Performance Command Center action to begin measuring its result.</p>`;
      byId("outcomeIntelligenceHistory").innerHTML = snapshot.measured.length ? snapshot.measured.map(item => `<article class="outcome-intelligence-result" data-tone="${esc(item.actual?.outcome || "partial")}">
        <span>${esc(item.actual?.outcome || "measured")}</span><div><small>${new Date(item.completedAt).toLocaleDateString()} · ${item.actual?.accuracy || 0}% forecast accuracy</small><strong>${esc(item.title)}</strong><p>${money(item.actual?.revenue)} realized · ${item.actual?.rpiGain >= 0 ? "+" : ""}${Number(item.actual?.rpiGain || 0).toFixed(1)} RPI</p></div>
      </article>`).join("") : `<p class="outcome-intelligence-empty">Measured outcomes will appear here with realized revenue, RPI movement, and forecast accuracy.</p>`;
    }

    root.addEventListener("click", event => {
      const button = event.target.closest("[data-complete-outcome]");
      if (!button) return;
      const result = engine.completeMeasurement(button.dataset.completeOutcome, { note: "Measured by manager from the Outcome Intelligence Center." });
      if (result) {
        const status = byId("outcomeIntelligenceStatus");
        status.textContent = `${result.title}: ${money(result.actual.revenue)} realized, ${result.actual.rpiGain >= 0 ? "+" : ""}${result.actual.rpiGain.toFixed(1)} RPI.`;
        setTimeout(() => { status.textContent = ""; }, 5000);
      }
      render(engine.summary());
    });
    byId("outcomeIntelligenceRefresh")?.addEventListener("click", () => render(engine.publish()));
    eventBus.on("outcome-intelligence:updated", render);
    render(engine.publish());
    return { engine, refresh: () => render(engine.publish()), getState: () => engine.summary() };
  }

  window.createBlueCurrentOutcomeIntelligenceCenterModule = createBlueCurrentOutcomeIntelligenceCenterModule;
})();
