(function () {
  "use strict";

  function createBlueCurrentPerformanceLearningCenterModule(eventBus, appState) {
    const root = document.getElementById("performanceLearningCenter");
    if (!root || !window.BlueCurrentPerformanceLearningEngine) return null;
    const engine = new window.BlueCurrentPerformanceLearningEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

    function render(snapshot = engine.snapshot()) {
      if (!snapshot) return;
      byId("performanceLearningScore").textContent = snapshot.calibration.score;
      byId("performanceLearningBand").textContent = snapshot.calibration.band;
      byId("performanceLearningBand").dataset.tone = snapshot.calibration.band;
      byId("performanceLearningSamples").textContent = snapshot.sampleSize;
      byId("performanceLearningAccuracy").textContent = snapshot.calibration.forecastAccuracy ? `${snapshot.calibration.forecastAccuracy}%` : "Baseline";
      byId("performanceLearningSuccess").textContent = snapshot.calibration.successRate ? `${snapshot.calibration.successRate}%` : "Baseline";
      byId("performanceLearningAdjustment").textContent = `${snapshot.calibration.confidenceAdjustment >= 0 ? "+" : ""}${snapshot.calibration.confidenceAdjustment}`;
      byId("performanceLearningReadiness").textContent = `${snapshot.readiness.score}%`;
      byId("performanceLearningHeadline").textContent = snapshot.headline;
      byId("performanceLearningUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("performanceLearningDomains").innerHTML = snapshot.domains.map(domain => `<article>
        <div><small>${esc(domain.confidence)} confidence</small><strong>${esc(domain.domain)}</strong></div>
        <dl><div><dt>Samples</dt><dd>${domain.samples}</dd></div><div><dt>Accuracy</dt><dd>${domain.accuracy ? `${domain.accuracy}%` : "—"}</dd></div><div><dt>Success</dt><dd>${domain.successRate ? `${domain.successRate}%` : "—"}</dd></div></dl>
      </article>`).join("");
      byId("performanceLearningChecks").innerHTML = snapshot.readiness.checks.map(check => `<li data-status="${check.passed ? "passed" : "pending"}"><span>${check.passed ? "Ready" : "Pending"}</span><strong>${esc(check.label)}</strong><small>${esc(check.detail || (check.passed ? "Validated" : "Needs verification"))}</small></li>`).join("");
      byId("performanceLearningRecommendations").innerHTML = snapshot.recommendations.map(item => `<li>${esc(item)}</li>`).join("");
    }

    byId("performanceLearningRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    eventBus.on("performance-learning:updated", snapshot => snapshot && render(snapshot));
    render(engine.refresh({ reason: "startup" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentPerformanceLearningCenterModule = createBlueCurrentPerformanceLearningCenterModule;
})();