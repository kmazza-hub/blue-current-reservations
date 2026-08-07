(function () {
  "use strict";

  class BlueCurrentExecutiveBriefingEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("ExecutiveBriefingEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("executiveBriefingHistory")) ? appState.get("executiveBriefingHistory") : [];
      this.snapshotValue = appState.get("executiveBriefing") || null;
      this.timer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      const schedule = payload => this.scheduleRefresh(payload?.reason || "operational-event");
      [
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "predictive-service:updated",
        "portfolio-intelligence:updated",
        "autonomous-policy:updated",
        "executive-workflow:updated",
        "orchestration:queue-updated"
      ].forEach(name => this.unsubscribers.push(this.eventBus.on(name, schedule)));
      this.unsubscribers.push(this.eventBus.on("state:reset", () => this.reset()));
    }

    scheduleRefresh(reason) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh({ reason }), 140);
    }

    refresh({ reason = "manual", briefingType = "live" } = {}) {
      const state = this.appState.getState();
      const performance = state.restaurantPerformance || {};
      const outcomes = state.outcomeIntelligence || {};
      const predictive = state.predictiveService || {};
      const portfolio = state.portfolioIntelligence || {};
      const workflows = Array.isArray(state.executiveWorkflows) ? state.executiveWorkflows : [];
      const policies = Array.isArray(state.autonomousPolicyCandidates) ? state.autonomousPolicyCandidates : [];
      const orchestration = Array.isArray(state.orchestrationQueue) ? state.orchestrationQueue : [];
      const snapshot = this.buildSnapshot({ state, performance, outcomes, predictive, portfolio, workflows, policies, orchestration, reason, briefingType });
      this.snapshotValue = snapshot;
      this.history.unshift({
        id: snapshot.id,
        capturedAt: snapshot.capturedAt,
        briefingType: snapshot.briefingType,
        headline: snapshot.headline,
        rpi: snapshot.metrics.rpi,
        opportunity: snapshot.metrics.opportunity,
        attentionCount: snapshot.metrics.attentionCount
      });
      this.history = this.history.slice(0, 40);
      this.appState.update({
        executiveBriefing: snapshot,
        executiveBriefingHistory: this.history.slice(0, 24),
        executiveBrief: snapshot.headline
      });
      this.eventBus.emit("executive-briefing:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    buildSnapshot({ state, performance, outcomes, predictive, portfolio, workflows, policies, orchestration, reason, briefingType }) {
      const rpi = Number(performance.overall || state.restaurantPerformanceIndex || 0);
      const opportunity = Number(performance.opportunity?.remaining || state.restaurantPerformanceOpportunity?.remaining || 0);
      const realizedRevenue = Number(outcomes.totals?.realizedRevenue || 0);
      const forecastAccuracy = Number(outcomes.totals?.forecastAccuracy || 0);
      const activeMeasurements = Number(outcomes.totals?.activeCount || 0);
      const pendingApprovals = workflows.filter(item => this.requiresAttention(item)).length + policies.filter(item => item.status === "pending" || item.status === "matched").length + orchestration.filter(item => item.status === "pending-approval").length;
      const riskWindows = Array.isArray(predictive.riskWindows) ? predictive.riskWindows : (Array.isArray(state.predictiveServiceRiskWindows) ? state.predictiveServiceRiskWindows : []);
      const portfolioExceptions = Array.isArray(portfolio.exceptions) ? portfolio.exceptions : (Array.isArray(state.portfolioExceptions) ? state.portfolioExceptions : []);
      const risks = this.buildRisks({ performance, predictive, riskWindows, portfolioExceptions, workflows });
      const wins = this.buildWins({ performance, outcomes, portfolio });
      const priorities = this.buildPriorities({ performance, workflows, policies, orchestration, risks });
      const attentionCount = pendingApprovals + risks.filter(item => item.tone === "critical").length;
      const headline = this.headline({ rpi, opportunity, attentionCount, performance });
      const narrative = this.narrative({ performance, outcomes, predictive, portfolio, priorities, opportunity });
      const confidence = this.confidence({ performance, outcomes, predictive, portfolio });
      return {
        id: `executive-briefing-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        briefingType,
        headline,
        narrative,
        confidence,
        metrics: { rpi, opportunity, realizedRevenue, forecastAccuracy, activeMeasurements, pendingApprovals, attentionCount },
        scores: performance.scores || {},
        wins,
        risks,
        priorities,
        nextBestAction: priorities[0] || null,
        executiveQuestions: [
          { label: "How are we performing?", answer: `${rpi.toFixed(1)} RPI · ${performance.band || "building baseline"}` },
          { label: "Where is value being lost?", answer: `${this.money(opportunity)} modeled opportunity remains this shift.` },
          { label: "What needs attention?", answer: attentionCount ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need leadership attention.` : "No critical leadership intervention is required." },
          { label: "Did recent decisions work?", answer: outcomes.totals?.measuredCount ? `${this.money(realizedRevenue)} realized at ${forecastAccuracy}% forecast accuracy.` : "Outcome measurement is active and building evidence." }
        ]
      };
    }

    requiresAttention(workflow) {
      if (!workflow || ["completed", "cancelled"].includes(workflow.status)) return false;
      const step = Array.isArray(workflow.steps) ? workflow.steps.find(item => item.id === workflow.currentStepId || item.status === "active" || item.status === "pending-approval") : null;
      return workflow.status === "paused" || workflow.status === "awaiting-approval" || step?.approvalRequired === true;
    }

    buildRisks({ performance, riskWindows, portfolioExceptions, workflows }) {
      const risks = [];
      const drivers = Array.isArray(performance.drivers) ? performance.drivers : [];
      drivers.slice(0, 2).forEach(driver => risks.push({ id: `driver-${driver.id}`, title: driver.label, detail: driver.detail, impact: driver.impact, tone: driver.score < 60 ? "critical" : "watch", source: "Restaurant Performance" }));
      riskWindows.slice(0, 2).forEach((risk, index) => risks.push({ id: risk.id || `forecast-${index}`, title: risk.title || risk.label || "Forecast pressure window", detail: risk.detail || risk.reason || "Predictive Service identified an emerging operating constraint.", impact: Number(risk.revenueImpact || 0), tone: risk.severity === "critical" ? "critical" : "watch", source: "Predictive Service" }));
      portfolioExceptions.slice(0, 2).forEach((item, index) => risks.push({ id: item.id || `portfolio-${index}`, title: item.locationName || item.title || "Portfolio exception", detail: item.detail || item.reason || "A location requires portfolio attention.", impact: Number(item.revenueImpact || 0), tone: item.severity === "critical" ? "critical" : "watch", source: "Portfolio Intelligence" }));
      const overdue = workflows.filter(item => item.dueAt && new Date(item.dueAt).getTime() < Date.now() && item.status !== "completed");
      overdue.slice(0, 2).forEach(item => risks.push({ id: `workflow-${item.id}`, title: item.title || "Workflow overdue", detail: `Owned by ${item.owner || "operations"}; SLA has passed.`, impact: 0, tone: "critical", source: "Executive Workflow" }));
      return this.unique(risks).slice(0, 6);
    }

    buildWins({ performance, outcomes, portfolio }) {
      const wins = [];
      const measured = Array.isArray(outcomes.measured) ? outcomes.measured : [];
      measured.filter(item => item.actual?.outcome === "successful").slice(0, 2).forEach(item => wins.push({ title: item.title, detail: `${this.money(item.actual.revenue)} realized · ${Number(item.actual.rpiGain || 0).toFixed(1)} RPI recovered`, source: "Outcome Intelligence" }));
      const scores = performance.scores || {};
      Object.entries({ financial: "Financial performance", guest: "Guest experience", operations: "Operational excellence", ai: "AI effectiveness" }).sort((a,b) => Number(scores[b[0]]||0)-Number(scores[a[0]]||0)).slice(0,2).forEach(([key,label]) => { if (Number(scores[key] || 0) > 0) wins.push({ title: label, detail: `${Number(scores[key]).toFixed(0)} score is supporting current RPI.`, source: "Restaurant Performance" }); });
      if (portfolio.topPerformer) wins.push({ title: portfolio.topPerformer.name || "Top location", detail: portfolio.topPerformer.detail || "Leading the current portfolio operating picture.", source: "Portfolio Intelligence" });
      return wins.slice(0, 4);
    }

    buildPriorities({ performance, workflows, policies, orchestration, risks }) {
      const priorities = [];
      (performance.actions || []).slice(0, 3).forEach(action => priorities.push({ id: action.id, title: action.title, instruction: action.instruction, owner: action.owner, revenueImpact: Number(action.revenueImpact || 0), rpiImpact: Number(action.projectedRpiGain || 0), confidence: Number(action.confidence || 0), approvalRequired: action.approvalRequired !== false, source: "Restaurant Performance" }));
      workflows.filter(item => this.requiresAttention(item)).slice(0, 2).forEach(item => priorities.push({ id: `workflow-${item.id}`, title: item.title || "Advance executive workflow", instruction: item.status === "paused" ? "Resume or reassign the paused workflow." : "Review the current approval checkpoint.", owner: item.owner || "Manager on duty", revenueImpact: Number(item.projectedRevenueImpact || 0), rpiImpact: Number(item.projectedRpiImpact || 0), confidence: Number(item.confidence || 80), approvalRequired: true, source: "Executive Workflow" }));
      policies.filter(item => ["pending", "matched"].includes(item.status)).slice(0, 1).forEach(item => priorities.push({ id: `policy-${item.id}`, title: item.title || "Review policy match", instruction: item.recommendation || "Review the matched autonomous policy before execution.", owner: item.owner || "Manager on duty", revenueImpact: Number(item.revenueImpact || 0), rpiImpact: Number(item.rpiImpact || 0), confidence: Number(item.confidence || 80), approvalRequired: true, source: "Autonomous Policy" }));
      if (!priorities.length && risks.length) priorities.push({ id: "monitor-primary-risk", title: `Monitor ${risks[0].title}`, instruction: risks[0].detail, owner: "Manager on duty", revenueImpact: Number(risks[0].impact || 0), rpiImpact: .4, confidence: 78, approvalRequired: false, source: risks[0].source });
      return this.unique(priorities).sort((a,b) => (b.revenueImpact + b.rpiImpact * 100) - (a.revenueImpact + a.rpiImpact * 100)).slice(0, 5);
    }

    headline({ rpi, opportunity, attentionCount, performance }) {
      const band = performance.band || (rpi >= 80 ? "strong" : rpi >= 68 ? "watch" : "critical");
      if (attentionCount) return `Restaurant performance is ${band}; ${attentionCount} leadership item${attentionCount === 1 ? "" : "s"} require attention.`;
      return `Restaurant performance is ${band}, with ${this.money(opportunity)} of modeled opportunity remaining.`;
    }

    narrative({ performance, outcomes, predictive, portfolio, priorities, opportunity }) {
      const driver = performance.drivers?.[0];
      const next = priorities[0];
      const measured = Number(outcomes.totals?.measuredCount || 0);
      const forecast = predictive.confidence ? `${Number(predictive.confidence).toFixed(0)}% predictive confidence` : "predictive monitoring active";
      const portfolioText = portfolio.totals?.locations ? `${portfolio.totals.locations} locations monitored` : "single-location operating view";
      return `${driver?.label || "Current operations"} is the largest performance constraint. ${next ? `${next.title} is the highest-impact next action.` : "Maintain the current posture."} Blue Current is tracking ${this.money(opportunity)} in remaining opportunity, ${measured} measured decision${measured === 1 ? "" : "s"}, ${forecast}, and a ${portfolioText}.`;
    }

    confidence({ performance, outcomes, predictive, portfolio }) {
      const values = [performance.confidence, outcomes.totals?.forecastAccuracy, predictive.confidence, portfolio.confidence].map(Number).filter(Number.isFinite).filter(value => value > 0);
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 72;
    }

    exportText(snapshot = this.snapshot()) {
      const lines = [
        "BLUE CURRENT EXECUTIVE BRIEFING",
        new Date(snapshot.capturedAt).toLocaleString(),
        "",
        snapshot.headline,
        snapshot.narrative,
        "",
        `RPI: ${snapshot.metrics.rpi.toFixed(1)}`,
        `Opportunity remaining: ${this.money(snapshot.metrics.opportunity)}`,
        `Realized revenue: ${this.money(snapshot.metrics.realizedRevenue)}`,
        `Pending approvals: ${snapshot.metrics.pendingApprovals}`,
        "",
        "PRIORITIES",
        ...snapshot.priorities.map((item, index) => `${index + 1}. ${item.title} — ${item.instruction} (${this.money(item.revenueImpact)}, +${item.rpiImpact.toFixed(1)} RPI)`),
        "",
        "RISKS",
        ...snapshot.risks.map(item => `- ${item.title}: ${item.detail}`)
      ];
      return lines.join("\n");
    }

    snapshot() { return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" })); }
    reset() { this.history = []; this.snapshotValue = null; this.appState.update({ executiveBriefing: null, executiveBriefingHistory: [] }); }
    unique(items) { const seen = new Set(); return items.filter(item => { const key = item.id || item.title; if (seen.has(key)) return false; seen.add(key); return true; }); }
    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0); }
  }

  window.BlueCurrentExecutiveBriefingEngine = BlueCurrentExecutiveBriefingEngine;
})();
