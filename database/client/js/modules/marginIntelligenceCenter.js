(function () {
  "use strict";

  function createBlueCurrentMarginIntelligenceCenterModule(eventBus, appState) {
    const root = document.getElementById("marginIntelligenceCenter");
    if (!root || !window.BlueCurrentMarginIntelligenceEngine) return null;
    const engine = new window.BlueCurrentMarginIntelligenceEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value||0));
    const esc = value => String(value??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

    function render(snapshot = engine.refresh({ reason: "render" })) {
      byId("marginIntelligenceScore").textContent = `${snapshot.score}%`;
      byId("marginIntelligenceStatus").textContent = snapshot.status;
      byId("marginIntelligenceStatus").dataset.tone = snapshot.status;
      byId("marginIntelligenceSummary").textContent = snapshot.summary;
      byId("marginCapturedRevenue").textContent = money(snapshot.metrics.captured);
      byId("marginGrossMargin").textContent = money(snapshot.metrics.grossMargin);
      byId("marginPercent").textContent = `${snapshot.metrics.marginPercent}%`;
      byId("marginProfitOpportunity").textContent = money(snapshot.metrics.profitOpportunity);
      byId("marginRealizedProfit").textContent = money(snapshot.metrics.realizedProfit);
      byId("marginConfidence").textContent = `${snapshot.confidence}%`;
      byId("marginCostBreakdown").innerHTML = [
        ["Food", snapshot.metrics.foodCost],
        ["Labor", snapshot.metrics.laborCost],
        ["Discounts", snapshot.metrics.discountCost],
        ["Waste", snapshot.metrics.wasteCost]
      ].map(([label,value]) => `<article><small>${label}</small><strong>${money(value)}</strong></article>`).join("");
      byId("marginLeakageList").innerHTML = snapshot.leakage.map(item => `<article><div><small>${esc(item.owner)}</small><strong>${esc(item.label)}</strong><span>${esc(item.signal)}</span></div><div><b>${money(item.profitImpact)}</b><span>profit opportunity</span></div></article>`).join("");
      byId("marginActionList").innerHTML = snapshot.actions.map(item => `<article><div><small>#${item.rank} · ${esc(item.owner)}</small><strong>${esc(item.title)}</strong><span>${esc(item.rationale)}</span></div><div class="margin-action-value"><b>${money(item.expectedProfit)}</b><span>projected profit · ${item.confidence}% confidence</span></div><button type="button" data-margin-action="${esc(item.id)}">Approve action</button></article>`).join("") || "<p>No material margin actions are required.</p>";
      const a = snapshot.assumptions;
      byId("marginFoodCost").value = a.foodCostPercent;
      byId("marginLaborCost").value = a.laborCostPercent;
      byId("marginDiscounts").value = a.discountPercent;
      byId("marginWaste").value = a.wastePercent;
      byId("marginTarget").value = a.targetMarginPercent;
    }

    root.addEventListener("click", event => {
      const action = event.target.closest("[data-margin-action]");
      if (action) {
        engine.approveAction(action.dataset.marginAction);
        byId("marginIntelligenceMessage").textContent = "Action sent to the governed workflow queue.";
      }
    });
    byId("marginIntelligenceRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual-refresh" })));
    byId("marginAssumptionsApply")?.addEventListener("click", () => render(engine.updateAssumptions({
      foodCostPercent: Number(byId("marginFoodCost").value),
      laborCostPercent: Number(byId("marginLaborCost").value),
      discountPercent: Number(byId("marginDiscounts").value),
      wastePercent: Number(byId("marginWaste").value),
      targetMarginPercent: Number(byId("marginTarget").value)
    })));
    eventBus.on("margin-intelligence:updated", render);
    render();
    return { refresh: () => render(engine.refresh({ reason: "module-refresh" })), engine };
  }

  window.createBlueCurrentMarginIntelligenceCenterModule = createBlueCurrentMarginIntelligenceCenterModule;
})();
