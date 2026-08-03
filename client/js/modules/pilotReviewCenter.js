(function () {
  "use strict";

  function createBlueCurrentPilotReviewCenterModule(eventBus, appState) {
    const root = document.getElementById("pilotReviewCenter");
    if (!root || !window.BlueCurrentPilotReviewEngine) return null;
    const engine = new window.BlueCurrentPilotReviewEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money = value => `$${Math.round(Number(value || 0)).toLocaleString()}`;

    function render(review = engine.refresh({ reason: "render" })) {
      byId("pilotReviewScore").textContent = `${review.score}%`;
      byId("pilotReviewStatus").textContent = review.status.replaceAll("-", " ");
      byId("pilotReviewStatus").dataset.tone = review.recommendation.tone;
      byId("pilotReviewRecommendation").textContent = review.recommendation.label;
      byId("pilotReviewRationale").textContent = review.recommendation.rationale;
      byId("pilotReviewConfidence").textContent = `${review.recommendation.confidence}% confidence`;
      byId("pilotReviewLocation").textContent = review.pilot.locationId;
      byId("pilotReviewValidation").textContent = `${review.pilot.validationScore}%`;
      byId("pilotReviewRpi").textContent = review.performance.rpi.toFixed(1);
      byId("pilotReviewRevenue").textContent = money(review.outcomes.realizedRevenue);
      byId("pilotReviewRealization").textContent = `${review.outcomes.realizationRate}%`;
      byId("pilotReviewAccuracy").textContent = `${review.outcomes.forecastAccuracy}%`;
      byId("pilotReviewEvidence").innerHTML = review.evidence.map(item => `<article data-status="${esc(item.status)}"><span>${esc(item.status)}</span><div><small>${esc(item.label)}</small><strong>${esc(item.value)}</strong></div></article>`).join("");
      byId("pilotReviewRisks").innerHTML = review.risks.map(item => `<li>${esc(item)}</li>`).join("");
      byId("pilotReviewActions").innerHTML = review.nextActions.map((item, index) => `<li><span>${index + 1}</span><strong>${esc(item)}</strong></li>`).join("");
      const decision = review.decision;
      byId("pilotReviewDecisionRecord").innerHTML = decision
        ? `<strong>${esc(decision.decision.toUpperCase())}</strong><span>${esc(decision.owner)} · ${new Date(decision.recordedAt).toLocaleString()}</span>${decision.note ? `<p>${esc(decision.note)}</p>` : ""}`
        : "<strong>No rollout decision recorded</strong><span>Executive sponsor approval remains required.</span>";
    }

    function setStatus(message, tone = "") {
      const node = byId("pilotReviewMessage");
      node.textContent = message;
      node.dataset.tone = tone;
    }

    byId("pilotReviewRefresh")?.addEventListener("click", () => {
      render(engine.refresh({ reason: "manual-review" }));
      setStatus("Pilot review recalculated from current evidence.", "success");
    });

    root.addEventListener("click", event => {
      const button = event.target.closest("[data-rollout-decision]");
      if (!button) return;
      const decision = button.dataset.rolloutDecision;
      const owner = window.prompt("Decision owner:", "Executive Sponsor") || "Executive Sponsor";
      const note = window.prompt("Decision note:", "") || "";
      try {
        render(engine.recordDecision({ decision, owner, note }));
        setStatus(`Rollout decision recorded: ${decision}.`, "success");
      } catch (error) {
        setStatus(error.message, "error");
      }
    });

    byId("pilotReviewExport")?.addEventListener("click", () => {
      const payload = engine.exportPackage();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `blue-current-pilot-review-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus("Executive pilot review package downloaded.", "success");
    });

    eventBus.on("pilot-review:updated", review => review && render(review));
    setTimeout(() => render(engine.refresh({ reason: "startup-settled" })), 520);
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => appState.get("pilotReview") };
  }

  window.createBlueCurrentPilotReviewCenterModule = createBlueCurrentPilotReviewCenterModule;
})();
