(function () {
  "use strict";

  class BlueCurrentUnifiedCommandEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("UnifiedCommandEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.role = appState.get("unifiedCommandRole") || "manager";
      this.timeline = Array.isArray(appState.get("unifiedCommandTimeline")) ? appState.get("unifiedCommandTimeline") : [];
      this.snapshotValue = null;
      this.timer = null;
      this.unsubscribers = [];
      this.bind();
    }

    bind() {
      const events = [
        "restaurant-performance:updated",
        "outcome-intelligence:updated",
        "executive-briefing:updated",
        "predictive-service:updated",
        "margin-intelligence:updated",
        "cost-variance:updated",
        "executive-workflow:updated",
        "reservation:confirmed",
        "table:assigned",
        "occupancy:updated",
        "state:reset"
      ];
      events.forEach(name => this.unsubscribers.push(this.eventBus.on(name, payload => {
        if (name !== "state:reset") this.recordEvent(name, payload);
        this.scheduleRefresh(name);
      })));
    }

    scheduleRefresh(reason) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh({ reason }), 80);
    }

    setRole(role) {
      if (!["manager", "executive", "technical"].includes(role)) return this.snapshot();
      this.role = role;
      this.appState.update({ unifiedCommandRole: role });
      return this.refresh({ reason: "role-changed" });
    }

    recordEvent(type, payload = {}) {
      const state = this.appState.getState();
      const event = this.describeEvent(type, payload, state);
      if (!event) return;
      const duplicate = this.timeline[0] && this.timeline[0].type === event.type && this.timeline[0].title === event.title && Date.now() - new Date(this.timeline[0].occurredAt).getTime() < 1500;
      if (duplicate) return;
      this.timeline.unshift(event);
      this.timeline = this.timeline.slice(0, 80);
      this.appState.update({ unifiedCommandTimeline: this.timeline });
    }

    describeEvent(type, payload, state) {
      const now = new Date().toISOString();
      const map = {
        "restaurant-performance:updated": () => ({ title: `Restaurant performance ${Number(payload?.overall || state.restaurantPerformanceIndex || 0).toFixed(1)}`, detail: payload?.headline || "Performance picture refreshed.", tone: "info", sourceId: "restaurantPerformanceCenter" }),
        "outcome-intelligence:updated": () => ({ title: "Outcome evidence updated", detail: `${(payload?.summary?.measured || payload?.measured || 0)} decisions measured.`, tone: "success", sourceId: "outcomeIntelligenceCenter" }),
        "executive-briefing:updated": () => ({ title: "Leadership briefing refreshed", detail: payload?.headline || "Priorities and risks synthesized.", tone: "info", sourceId: "executiveBriefingCenter" }),
        "predictive-service:updated": () => ({ title: "Service forecast changed", detail: payload?.headline || payload?.riskWindow?.label || "Forward operating view recalculated.", tone: "watch", sourceId: "predictiveServiceCenter" }),
        "margin-intelligence:updated": () => ({ title: "Profit picture updated", detail: `${this.money(payload?.profitOpportunity || payload?.summary?.profitOpportunity || 0)} modeled profit opportunity.`, tone: "success", sourceId: "marginIntelligenceCenter" }),
        "cost-variance:updated": () => ({ title: "Cost forecast updated", detail: `${this.money(payload?.profitAtRisk || payload?.summary?.profitAtRisk || 0)} profit currently at risk.`, tone: "watch", sourceId: "costVarianceCenter" }),
        "executive-workflow:updated": () => ({ title: "Workflow status changed", detail: payload?.workflow?.title || payload?.title || "Operating workflow advanced.", tone: "info", sourceId: "executiveWorkflowCenter" }),
        "reservation:confirmed": () => ({ title: "Reservation confirmed", detail: `${payload?.reservation?.guestName || payload?.guestName || "Guest"} · party of ${payload?.reservation?.partySize || payload?.partySize || "—"}.`, tone: "success", sourceId: "reservation-operations" }),
        "table:assigned": () => ({ title: `Table ${payload?.tableNumber || "—"} assigned`, detail: `${payload?.guestName || "Guest"} · party of ${payload?.partySize || "—"}.`, tone: "success", sourceId: "live-floor-operations" }),
        "occupancy:updated": () => ({ title: `Occupancy ${Math.round(payload?.occupancyPercent || 0)}%`, detail: "Dining-room utilization changed.", tone: Number(payload?.occupancyPercent || 0) > 90 ? "watch" : "info", sourceId: "operationalDigitalTwinCenter" })
      };
      const entry = map[type]?.();
      return entry ? { id: `uc-event-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, occurredAt: now, ...entry } : null;
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const performance = state.restaurantPerformance || {};
      const margin = state.marginIntelligence || {};
      const variance = state.costVariance || {};
      const predictive = state.predictiveService || {};
      const outcomes = state.outcomeIntelligence || {};
      const workflows = Array.isArray(state.executiveWorkflows) ? state.executiveWorkflows : [];
      const actions = Array.isArray(performance.actions) ? performance.actions : (state.restaurantPerformanceActions || []);
      const priority = this.choosePriority(actions, variance, predictive, workflows);
      const rpi = Number(performance.overall ?? state.restaurantPerformanceIndex ?? 0);
      const revenueOpportunity = Number(performance.opportunity?.remaining ?? state.restaurantPerformanceOpportunity?.remaining ?? 0);
      const profitOpportunity = Number(margin.profitOpportunity ?? margin.summary?.profitOpportunity ?? Math.round(revenueOpportunity * 0.42));
      const profitAtRisk = Number(variance.profitAtRisk ?? variance.summary?.profitAtRisk ?? 0);
      const measuredRevenue = Number(outcomes.summary?.realizedRevenue ?? outcomes.realizedRevenue ?? 0);
      const pendingApprovals = workflows.filter(item => ["pending-approval", "awaiting-approval"].includes(item.status) || item.currentStep?.approvalRequired).length;
      const riskCount = [
        Number(predictive.risks?.length || 0),
        profitAtRisk > 0 ? 1 : 0,
        workflows.filter(item => item.status === "overdue").length
      ].reduce((a,b)=>a+b,0);
      const snapshot = {
        id: `unified-command-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        reason,
        role: this.role,
        rpi,
        band: performance.band || this.band(rpi),
        trend: Number(performance.trend || 0),
        confidence: Number(performance.confidence || state.performanceLearning?.calibrationScore || 0),
        headline: performance.headline || "Blue Current is building the operating picture.",
        revenueOpportunity,
        profitOpportunity,
        profitAtRisk,
        measuredRevenue,
        pendingApprovals,
        riskCount,
        occupancy: Number(state.operationalDigitalTwin?.summary?.occupancyPercent ?? state.occupancyPercent ?? 0),
        kitchenLoad: Number(state.operationalDigitalTwin?.kitchen?.load ?? state.operationalContext?.kitchenLoad ?? state.kitchenLoad ?? 0),
        guestWait: Number(predictive.baseline?.waitMinutes ?? state.operationalContext?.waitMinutes ?? 0),
        priority,
        actions: actions.slice(0, 3),
        timeline: this.buildTimeline(state),
        concierge: this.buildConcierge({ rpi, performance, priority, profitOpportunity, profitAtRisk, pendingApprovals, riskCount, role: this.role }),
        technical: {
          integrationHealth: Number(state.platformIntegrationAudit?.score ?? state.integrationHealthScore ?? 100),
          activeWorkflows: workflows.filter(item => !["completed", "dismissed"].includes(item.status)).length,
          modulesReady: Number(state.pilotRelease?.modulesReady ?? 0)
        }
      };
      this.snapshotValue = snapshot;
      this.appState.update({ unifiedCommand: snapshot, unifiedCommandRole: this.role });
      this.eventBus.emit("unified-command:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    choosePriority(actions, variance, predictive, workflows) {
      const action = actions[0];
      if (action) return { id: action.id, title: action.title, instruction: action.instruction, owner: action.owner || "Manager", confidence: Number(action.confidence || 0), revenueImpact: Number(action.revenueImpact || 0), profitImpact: Math.round(Number(action.revenueImpact || 0) * 0.42), projectedRpiGain: Number(action.projectedRpiGain || 0), sourceId: "restaurantPerformanceCenter", approvalRequired: action.approvalRequired !== false, raw: action };
      const corrective = variance.actions?.[0] || predictive.actions?.[0];
      if (corrective) return { id: corrective.id, title: corrective.title || "Protect service performance", instruction: corrective.instruction || corrective.action || "Review the current operating constraint.", owner: corrective.owner || "Manager", confidence: Number(corrective.confidence || 0), revenueImpact: Number(corrective.revenueImpact || 0), profitImpact: Number(corrective.protectedProfit || corrective.profitImpact || 0), projectedRpiGain: Number(corrective.projectedRpiGain || 0), sourceId: variance.actions?.[0] ? "costVarianceCenter" : "predictiveServiceCenter", approvalRequired: true, raw: corrective };
      const approval = workflows.find(item => item.currentStep?.approvalRequired);
      if (approval) return { id: approval.id, title: approval.title || "Review pending workflow", instruction: approval.currentStep?.instruction || "Review the pending approval checkpoint.", owner: approval.owner || "Manager", confidence: 80, revenueImpact: 0, profitImpact: 0, projectedRpiGain: 0, sourceId: "executiveWorkflowCenter", approvalRequired: true, raw: approval };
      return { id: "hold-course", title: "Maintain the current operating posture", instruction: "No urgent intervention is required. Continue monitoring the shift timeline.", owner: "Manager", confidence: 88, revenueImpact: 0, profitImpact: 0, projectedRpiGain: 0, sourceId: "restaurantPerformanceCenter", approvalRequired: false, raw: null };
    }

    buildTimeline(state) {
      const seeded = [];
      const last = state.lastOperationalEvent;
      if (last?.occurredAt) seeded.push({ id: "last-operational-event", type: last.type || "operational", occurredAt: last.occurredAt, title: this.humanize(last.type || "Operational event"), detail: "Latest committed operating event.", tone: "info", sourceId: "restaurantPerformanceCenter" });
      const outcomeRecords = Array.isArray(state.outcomeIntelligence?.history) ? state.outcomeIntelligence.history : (state.outcomeHistory || []);
      outcomeRecords.slice(0, 4).forEach((item, index) => seeded.push({ id: `outcome-${index}`, type: "outcome", occurredAt: item.completedAt || item.measuredAt || item.createdAt || new Date().toISOString(), title: item.title || item.actionTitle || "Measured decision", detail: `${this.money(item.realizedRevenue || 0)} realized · ${Number(item.actualRpiGain || 0).toFixed(1)} RPI`, tone: "success", sourceId: "outcomeIntelligenceCenter" }));
      return [...this.timeline, ...seeded].sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt)).slice(0, 30);
    }

    buildConcierge(input) {
      const greeting = this.role === "executive" ? "Leadership view" : this.role === "technical" ? "Platform view" : "Manager view";
      const status = input.rpi >= 85 ? "performing strongly" : input.rpi >= 70 ? "stable with clear opportunities" : "under pressure and needs focused action";
      const parts = [`${greeting}: the restaurant is ${status} at ${input.rpi.toFixed(1)} RPI.`];
      if (input.priority) parts.push(`The highest-impact move is “${input.priority.title},” with about ${this.money(input.priority.profitImpact)} modeled profit impact.`);
      if (input.profitAtRisk > 0) parts.push(`${this.money(input.profitAtRisk)} is currently exposed in the near-term cost forecast.`);
      if (input.pendingApprovals) parts.push(`${input.pendingApprovals} approval${input.pendingApprovals === 1 ? "" : "s"} require attention.`);
      if (!input.pendingApprovals && !input.riskCount) parts.push("No critical approval or risk is currently blocking the shift.");
      return { headline: `Good ${this.daypart()}. Here is the operating picture.`, message: parts.join(" "), prompts: ["What changed?", "What should I do next?", "Where are we losing profit?", "Why this recommendation?"] };
    }

    answer(question, snapshot = this.snapshot()) {
      const q = String(question || "").toLowerCase();
      if (q.includes("profit") || q.includes("money") || q.includes("revenue")) return `${this.money(snapshot.profitOpportunity)} modeled profit opportunity remains. ${this.money(snapshot.profitAtRisk)} is currently at risk. The highest-impact action is ${snapshot.priority.title}.`;
      if (q.includes("why") || q.includes("recommend")) return `${snapshot.priority.title} is ranked first because it combines ${snapshot.priority.confidence}% confidence, ${this.money(snapshot.priority.profitImpact)} modeled profit impact, and +${snapshot.priority.projectedRpiGain.toFixed(1)} projected RPI.`;
      if (q.includes("changed") || q.includes("happen")) return snapshot.timeline[0] ? `Latest: ${snapshot.timeline[0].title}. ${snapshot.timeline[0].detail}` : "No new material operating event has been recorded yet.";
      if (q.includes("next") || q.includes("do")) return `${snapshot.priority.instruction} Owner: ${snapshot.priority.owner}. Expected profit impact: ${this.money(snapshot.priority.profitImpact)}.`;
      if (q.includes("kitchen")) return `Kitchen load is ${Math.round(snapshot.kitchenLoad)}%. Guest wait is ${Math.round(snapshot.guestWait)} minutes. ${snapshot.priority.title} is the current highest-ranked intervention.`;
      return snapshot.concierge.message;
    }

    snapshot() { return structuredClone(this.snapshotValue || this.refresh({ reason: "initial" })); }
    band(score) { return score >= 90 ? "Excellent" : score >= 80 ? "Strong" : score >= 70 ? "Stable" : score >= 55 ? "Watch" : "Critical"; }
    humanize(value) { return String(value).replace(/[:_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase()); }
    money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0); }
    daypart() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"; }
  }

  window.BlueCurrentUnifiedCommandEngine = BlueCurrentUnifiedCommandEngine;
})();
