(function () {
  "use strict";

  class BlueCurrentPilotReviewEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PilotReviewEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("pilotReviewHistory")) ? appState.get("pilotReviewHistory") : [];
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 180);
      };
      [
        "pilot-operations:updated",
        "pilot-operations:completed",
        "pilot-release:updated",
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "executive-briefing:updated",
        "portfolio-performance:updated",
        "performance-learning:updated",
        "platform-integration-audit:updated"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const session = state.pilotOperationsSession || {};
      const release = state.pilotRelease || {};
      const performance = state.restaurantPerformance || {};
      const outcomes = state.outcomeIntelligence || {};
      const learning = state.performanceLearning || {};
      const integration = state.platformIntegrationAudit || {};
      const measured = Array.isArray(outcomes.measured) ? outcomes.measured : [];
      const totals = outcomes.totals || {};
      const issues = Array.isArray(session.issues) ? session.issues : [];
      const openIssues = issues.filter(item => item.status === "open");
      const blockingIssues = openIssues.filter(item => item.severity === "blocking");
      const checkpoints = Array.isArray(session.checkpoints) ? session.checkpoints : [];
      const passed = checkpoints.filter(item => item.status === "passed").length;
      const watched = checkpoints.filter(item => item.status === "watch").length;
      const projectedRevenue = measured.reduce((sum, item) => sum + Number(item.projected?.revenue || 0), 0);
      const realizedRevenue = Number(totals.realizedRevenue || measured.reduce((sum, item) => sum + Number(item.actual?.revenue || 0), 0));
      const realizationRate = projectedRevenue > 0 ? Math.round(realizedRevenue / projectedRevenue * 100) : 0;
      const validationScore = Number(session.validationScore || 0);
      const releaseScore = Number(release.score || 0);
      const rpi = Number(performance.overall || state.restaurantPerformanceIndex || 0);
      const forecastAccuracy = Number(totals.forecastAccuracy || 0);
      const successRate = Number(totals.successRate || 0);
      const calibrationScore = Number(learning.calibration?.score || 0);
      const integrationScore = Number(integration.score ?? 100);
      const score = this.calculateScore({
        session,
        validationScore,
        releaseScore,
        rpi,
        measuredCount: Number(totals.measuredCount || measured.length),
        forecastAccuracy,
        successRate,
        calibrationScore,
        integrationScore,
        blockingIssues: blockingIssues.length,
        openIssues: openIssues.length
      });
      const recommendation = this.recommend({
        session,
        score,
        validationScore,
        releaseScore,
        measuredCount: Number(totals.measuredCount || measured.length),
        successRate,
        blockingIssues: blockingIssues.length
      });
      const existingDecision = state.pilotRolloutDecision || null;
      const snapshot = {
        id: `pilot-review-${Date.now()}`,
        release: "V35.7.0",
        capturedAt: new Date().toISOString(),
        reason,
        status: existingDecision ? "decision-recorded" : session.status === "complete" ? "ready-for-review" : "collecting-evidence",
        score,
        recommendation,
        decision: existingDecision,
        pilot: {
          id: session.id || null,
          status: session.status || "not-started",
          locationId: session.locationId || state.selectedLocationId || "primary-location",
          lead: session.lead || "Pilot Lead",
          shift: session.shift || "Dinner service",
          validationScore,
          checkpoints: { passed, watched, total: checkpoints.length },
          openIssues: openIssues.length,
          blockingIssues: blockingIssues.length
        },
        performance: {
          rpi,
          band: performance.band || "baseline",
          trend: Number(performance.trend || 0),
          remainingOpportunity: Number(performance.opportunity?.remaining || state.restaurantPerformanceOpportunity?.remaining || 0)
        },
        outcomes: {
          measuredCount: Number(totals.measuredCount || measured.length),
          activeCount: Number(totals.activeCount || 0),
          projectedRevenue: Math.round(projectedRevenue),
          realizedRevenue: Math.round(realizedRevenue),
          realizationRate,
          rpiRecovered: Number(totals.rpiRecovered || 0),
          forecastAccuracy,
          successRate
        },
        assurance: {
          releaseScore,
          releaseGate: release.gate || "hardening",
          calibrationScore,
          integrationScore
        },
        evidence: this.buildEvidence({ session, release, performance, outcomes, learning, integration, openIssues }),
        risks: this.buildRisks({ session, release, outcomes, learning, integration, openIssues }),
        nextActions: this.nextActions(recommendation, { session, openIssues, outcomes, release })
      };

      this.history.unshift({ capturedAt: snapshot.capturedAt, score, recommendation: recommendation.code, status: snapshot.status });
      this.history = this.history.slice(0, 40);
      this.appState.update({
        pilotReview: snapshot,
        pilotReviewHistory: this.history,
        pilotRolloutRecommendation: recommendation
      });
      this.eventBus.emit("pilot-review:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    calculateScore(input) {
      const measuredEvidence = Math.min(100, input.measuredCount * 25);
      const completion = input.session.status === "complete" ? 100 : input.session.status === "active" ? 55 : 20;
      let score = (
        completion * .12 +
        input.validationScore * .20 +
        input.releaseScore * .14 +
        input.rpi * .10 +
        measuredEvidence * .14 +
        input.forecastAccuracy * .08 +
        input.successRate * .08 +
        input.calibrationScore * .07 +
        input.integrationScore * .07
      );
      score -= input.blockingIssues * 18;
      score -= Math.max(0, input.openIssues - input.blockingIssues) * 3;
      return Math.max(0, Math.min(100, Math.round(score)));
    }

    recommend(input) {
      if (input.blockingIssues > 0 || input.releaseScore < 70) {
        return { code: "hold", label: "Hold rollout", tone: "blocked", confidence: 94, rationale: "Blocking controls or platform-readiness gaps remain unresolved." };
      }
      if (input.session.status !== "complete") {
        return { code: "continue", label: "Continue pilot", tone: "watch", confidence: 90, rationale: "Complete the controlled pilot and close every required validation checkpoint." };
      }
      if (input.score >= 88 && input.validationScore >= 85 && input.measuredCount >= 3 && input.successRate >= 60) {
        return { code: "expand", label: "Approve phased rollout", tone: "ready", confidence: Math.min(97, Math.round((input.score + input.validationScore) / 2)), rationale: "The pilot demonstrates controlled execution, measurable value, and sufficient operating evidence for phased expansion." };
      }
      return { code: "extend", label: "Extend controlled pilot", tone: "controlled", confidence: 88, rationale: "The platform is stable enough to continue, but more measured outcomes or stronger validation evidence are required before expansion." };
    }

    recordDecision({ decision, owner = "Executive Sponsor", note = "" } = {}) {
      const allowed = ["expand", "extend", "hold"];
      if (!allowed.includes(decision)) throw new Error("Choose expand, extend, or hold.");
      const review = this.appState.get("pilotReview") || this.refresh({ reason: "decision-preflight" });
      const record = {
        id: `rollout-decision-${Date.now()}`,
        decision,
        owner: String(owner || "Executive Sponsor").trim(),
        note: String(note || "").trim(),
        recordedAt: new Date().toISOString(),
        reviewScore: review.score,
        recommendedDecision: review.recommendation.code,
        recommendationAligned: decision === review.recommendation.code || (decision === "extend" && review.recommendation.code === "continue")
      };
      this.appState.update({ pilotRolloutDecision: record });
      this.eventBus.emit("pilot-review:decision-recorded", structuredClone(record));
      return this.refresh({ reason: "decision-recorded" });
    }

    buildEvidence({ session, release, performance, outcomes, learning, integration, openIssues }) {
      const totals = outcomes.totals || {};
      return [
        { label: "Pilot validation", value: `${Number(session.validationScore || 0)}/100`, status: Number(session.validationScore || 0) >= 85 ? "ready" : "watch" },
        { label: "Release readiness", value: `${Number(release.score || 0)}/100 · ${release.gate || "hardening"}`, status: release.gate === "pilot-ready" ? "ready" : release.gate === "blocked" ? "blocked" : "watch" },
        { label: "Restaurant Performance Index", value: `${Number(performance.overall || 0).toFixed(1)} · ${performance.band || "baseline"}`, status: Number(performance.overall || 0) >= 80 ? "ready" : "watch" },
        { label: "Measured decisions", value: `${Number(totals.measuredCount || outcomes.measured?.length || 0)} outcomes`, status: Number(totals.measuredCount || outcomes.measured?.length || 0) >= 3 ? "ready" : "watch" },
        { label: "Realized revenue", value: `$${Number(totals.realizedRevenue || 0).toLocaleString()}`, status: Number(totals.realizedRevenue || 0) > 0 ? "ready" : "watch" },
        { label: "Forecast accuracy", value: `${Number(totals.forecastAccuracy || 0)}%`, status: Number(totals.forecastAccuracy || 0) >= 70 ? "ready" : "watch" },
        { label: "Calibration", value: `${Number(learning.calibration?.score || 0)}/100`, status: Number(learning.calibration?.score || 0) >= 65 ? "ready" : "watch" },
        { label: "Runtime integration", value: `${Number(integration.score ?? 100)}/100`, status: Number(integration.score ?? 100) >= 90 ? "ready" : "watch" },
        { label: "Open pilot issues", value: `${openIssues.length}`, status: openIssues.some(item => item.severity === "blocking") ? "blocked" : openIssues.length ? "watch" : "ready" }
      ];
    }

    buildRisks({ session, release, outcomes, learning, integration, openIssues }) {
      const risks = [];
      if (session.status !== "complete") risks.push("Pilot validation session is not complete.");
      openIssues.forEach(item => risks.push(`${item.severity === "blocking" ? "Blocking" : "Watch"}: ${item.title}`));
      if (Number(outcomes.totals?.measuredCount || outcomes.measured?.length || 0) < 3) risks.push("Fewer than three measured decisions are available for rollout confidence.");
      if (Number(outcomes.totals?.forecastAccuracy || 0) < 70) risks.push("Forecast accuracy is below the 70% pilot target.");
      if (Number(learning.calibration?.score || 0) < 65) risks.push("Model calibration remains below the pilot target.");
      if (Number(integration.score ?? 100) < 90) risks.push("Runtime integration health is below the 90% target.");
      if (release.gate === "blocked") risks.push("The V35 release gate is blocked.");
      return risks.length ? risks.slice(0, 8) : ["No material rollout blockers are currently identified."];
    }

    nextActions(recommendation, { session, openIssues, outcomes, release }) {
      const actions = [];
      if (openIssues.some(item => item.severity === "blocking")) actions.push("Resolve every blocking pilot issue and rerun the affected validation checkpoint.");
      if (session.status !== "complete") actions.push("Complete the Pilot Operations validation sequence and export the final evidence record.");
      if (Number(outcomes.totals?.measuredCount || outcomes.measured?.length || 0) < 3) actions.push("Measure at least three governed decisions across demand, service, or labor.");
      if (release.gate !== "pilot-ready") actions.push("Run the V35 release audit until the platform reaches pilot-ready status.");
      if (!actions.length && recommendation.code === "expand") actions.push("Approve a phased rollout with named locations, owners, rollback criteria, and weekly outcome reviews.");
      if (!actions.length && recommendation.code === "extend") actions.push("Extend the controlled pilot for one additional service cycle and focus on weak evidence domains.");
      if (!actions.length && recommendation.code === "hold") actions.push("Hold rollout until the identified control and evidence gaps are resolved.");
      return actions.slice(0, 6);
    }

    exportPackage() {
      const review = this.appState.get("pilotReview") || this.refresh({ reason: "export" });
      return {
        product: "Blue Current Hospitality OS",
        release: "V35.7.0",
        generatedAt: new Date().toISOString(),
        review,
        pilotRecord: this.appState.get("pilotOperationsSession"),
        releaseManifest: this.appState.get("pilotReleaseManifest"),
        executiveBriefing: this.appState.get("executiveBriefing")
      };
    }

    reset() {
      this.history = [];
      this.appState.update({ pilotReview: null, pilotReviewHistory: [], pilotRolloutRecommendation: null, pilotRolloutDecision: null });
      this.eventBus.emit("pilot-review:updated", null);
    }
  }

  window.BlueCurrentPilotReviewEngine = BlueCurrentPilotReviewEngine;
})();
