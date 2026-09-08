(function () {
  "use strict";

  function createBlueCurrentCostVarianceCenterModule(eventBus, appState) {
    const root = document.getElementById("costVarianceCenter");
    if (!root || !window.BlueCurrentCostVarianceEngine) return null;
    const engine = new window.BlueCurrentCostVarianceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value||0));
    const esc = value => String(value??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

    function render(snapshot = engine.refresh({ reason: "render" })) {
      byId("costVarianceScore").textContent = `${snapshot.score}%`;
      byId("costVarianceStatus").textContent = snapshot.status;
      byId("costVarianceStatus").dataset.tone = snapshot.status;
      byId("costVarianceSummary").textContent = snapshot.summary;
      byId("costVarianceCurrentMargin").textContent = `${snapshot.metrics.currentMargin.toFixed(1)}%`;
      byId("costVarianceProjectedMargin").textContent = `${snapshot.metrics.projectedMargin.toFixed(1)}%`;
      byId("costVarianceMarginDelta").textContent = `${snapshot.metrics.marginVariance >= 0 ? "+" : ""}${snapshot.metrics.marginVariance.toFixed(1)} pts`;
      byId("costVarianceProfitRisk").textContent = money(snapshot.metrics.profitAtRisk);
      byId("costVarianceProtectedProfit").textContent = money(snapshot.metrics.protectedProfit);
      byId("costVarianceConfidence").textContent = `${snapshot.confidence}%`;

      byId("costVarianceForecast").innerHTML = snapshot.drivers.map(item => `
        <article data-direction="${esc(item.direction)}">
          <div><small>${esc(item.owner)}</small><strong>${esc(item.label)}</strong></div>
          <div class="cost-variance-values">
            <span>Baseline <b>${money(item.baseline)}</b></span>
            <span>Forecast <b>${money(item.forecast)}</b></span>
            <span>Variance <b>${item.variance >= 0 ? "+" : ""}${money(item.variance)}</b></span>
          </div>
        </article>`).join("");

      byId("costVarianceActions").innerHTML = snapshot.actions.map(item => `
        <article>
          <div>
            <small>#${item.rank} · ${esc(item.owner)}</small>
            <strong>${esc(item.title)}</strong>
            <span>${esc(item.rationale)}</span>
          </div>
          <div class="cost-variance-action-value">
            <b>${money(item.expectedProtectedProfit)}</b>
            <span>protected profit · +${item.expectedRpiGain} RPI · ${item.confidence}% confidence</span>
          </div>
          <button type="button" data-cost-variance-action="${esc(item.id)}">Approve protection action</button>
        </article>`).join("") || "<p>No material cost-variance action is required.</p>";
    }

    root.addEventListener("click", event => {
      const action = event.target.closest("[data-cost-variance-action]");
      if (action) {
        engine.approveAction(action.dataset.costVarianceAction);
        byId("costVarianceMessage").textContent = "Profit-protection action sent to the governed workflow queue.";
      }
    });

    byId("costVarianceRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual-refresh" })));
    eventBus.on("cost-variance:updated", render);
    render();
    return { refresh: () => render(engine.refresh({ reason: "module-refresh" })), engine };
  }

  window.createBlueCurrentCostVarianceCenterModule = createBlueCurrentCostVarianceCenterModule;
})();
