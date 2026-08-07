(function () {
  "use strict";

  class BlueCurrentPerformanceGovernanceEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("PerformanceGovernanceEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.timer = null;
      this.history = Array.isArray(appState.get("performanceGovernanceHistory")) ? appState.get("performanceGovernanceHistory") : [];
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 240);
      };
      [
        "expansion-benchmark:updated",
        "post-launch-value:updated",
        "executive-briefing:updated",
        "outcome-intelligence:updated",
        "performance-learning:updated",
        "pilot-review:updated",
        "state:changed"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const expansion = state.expansionBenchmark || {};
      const postLaunch = state.postLaunchValue || {};
      const briefing = state.executiveBriefing || {};
      const outcomes = state.outcomeIntelligence || {};
      const learning = state.performanceLearning || {};
      const cadence = this.normalizeCadence(state.performanceGovernanceCadence);
      const commitments = this.normalizeCommitments(state.performanceGovernanceCommitments, expansion, briefing);
      const accountability = this.buildAccountability(cadence, commitments);
      const score = this.calculateScore({ expansion, postLaunch, outcomes, learning, cadence, commitments, accountability });
      const blockers = this.buildBlockers({ cadence, commitments, accountability, expansion, postLaunch });
      const watchItems = this.buildWatchItems({ outcomes, learning, cadence, commitments });
      const status = blockers.length ? "blocked" : score >= 88 ? "operating-rhythm" : score >= 72 ? "managed" : "forming";
      const snapshot = {
        id: `governance-${Date.now()}`,
        release: "V35.11.0",
        capturedAt: new Date().toISOString(),
        reason,
        score,
        status,
        summary: this.summary(status, blockers, watchItems),
        metrics: {
          portfolioRpi: Number(expansion.benchmarks?.averageRpi || state.restaurantPerformance?.rpi || 0),
          realizedRevenue: Number(expansion.benchmarks?.totalRealizedRevenue || postLaunch.realizedRevenue || outcomes.realizedRevenue || 0),
          adoption: Number(expansion.benchmarks?.averageAdoption || postLaunch.adoptionPercent || 0),
          forecastAccuracy: Number(outcomes.forecastAccuracy || 0),
          calibration: Number(learning.calibrationScore || 0),
          openCommitments: commitments.filter(item => item.status !== "complete").length
        },
        cadence,
        commitments,
        accountability,
        blockers,
        watchItems,
        nextActions: this.nextActions({ status, cadence, commitments, blockers, watchItems }),
        confidence: Math.round((Number(expansion.confidence || 70) + Number(outcomes.forecastAccuracy || 70) + Number(learning.calibrationScore || 70)) / 3)
      };
      this.history.unshift({ capturedAt: snapshot.capturedAt, score, status, openCommitments: snapshot.metrics.openCommitments });
      this.history = this.history.slice(0, 90);
      this.appState.update({
        performanceGovernance: snapshot,
        performanceGovernanceHistory: this.history,
        performanceGovernanceCadence: cadence,
        performanceGovernanceCommitments: commitments
      });
      this.eventBus.emit("performance-governance:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    normalizeCadence(value) {
      const defaults = [
        { id:"daily-shift", name:"Daily shift review", frequency:"Daily", owner:"Location manager", status:"active", nextReview:this.futureDate(1), focus:"RPI, risks, approvals, guest and kitchen pressure" },
        { id:"weekly-ops", name:"Weekly operating review", frequency:"Weekly", owner:"Regional operator", status:"active", nextReview:this.futureDate(7), focus:"Location benchmark, realized value, adoption, unresolved commitments" },
        { id:"monthly-exec", name:"Monthly executive review", frequency:"Monthly", owner:"Executive sponsor", status:"active", nextReview:this.futureDate(30), focus:"Portfolio value, expansion readiness, model accuracy, strategic decisions" }
      ];
      const current = Array.isArray(value) ? value : [];
      return defaults.map(item => ({ ...item, ...(current.find(entry => entry.id === item.id) || {}) }));
    }

    normalizeCommitments(value, expansion, briefing) {
      const current = Array.isArray(value) ? value : [];
      if (current.length) return current.map(item => ({ priority:"medium", status:"open", owner:"Unassigned", dueDate:this.futureDate(14), ...item }));
      const actions = Array.isArray(expansion.nextActions) ? expansion.nextActions : [];
      const priorities = Array.isArray(briefing.priorities) ? briefing.priorities : [];
      const source = [...actions.slice(0,3).map(item => item.label || item.action), ...priorities.slice(0,2).map(item => item.title || item.label)].filter(Boolean);
      const base = source.length ? source : ["Confirm weekly operating-review ownership", "Close the highest-value performance constraint", "Validate the next measured outcome"];
      return base.slice(0,5).map((title,index) => ({
        id:`governance-commitment-${index+1}`,
        title,
        owner:index===0?"Regional operator":"Unassigned",
        priority:index===0?"high":"medium",
        status:"open",
        dueDate:this.futureDate((index+1)*7),
        evidence:"Evidence required at the next operating review."
      }));
    }

    buildAccountability(cadence, commitments) {
      const owners = new Map();
      cadence.forEach(item => this.addOwner(owners, item.owner, "review", item.status));
      commitments.forEach(item => this.addOwner(owners, item.owner, "commitment", item.status));
      return [...owners.entries()].map(([owner, data]) => ({ owner, reviews:data.reviews, commitments:data.commitments, open:data.open, coverage: owner !== "Unassigned" ? "assigned" : "unassigned" })).sort((a,b)=>b.open-a.open);
    }

    addOwner(map, owner, type, status) {
      const key = owner || "Unassigned";
      const item = map.get(key) || { reviews:0, commitments:0, open:0 };
      if (type === "review") item.reviews += 1; else item.commitments += 1;
      if (!["complete","closed"].includes(status)) item.open += 1;
      map.set(key, item);
    }

    calculateScore({ expansion, postLaunch, outcomes, learning, cadence, commitments, accountability }) {
      const cadenceCoverage = cadence.length ? cadence.filter(item => item.owner && item.owner !== "Unassigned" && item.status === "active").length / cadence.length * 100 : 0;
      const commitmentCoverage = commitments.length ? commitments.filter(item => item.owner && item.owner !== "Unassigned").length / commitments.length * 100 : 100;
      const completion = commitments.length ? commitments.filter(item => item.status === "complete").length / commitments.length * 100 : 100;
      const ownerCoverage = accountability.length ? accountability.filter(item => item.coverage === "assigned").length / accountability.length * 100 : 0;
      const expansionScore = Number(expansion.score || 0);
      const postLaunchScore = Number(postLaunch.healthScore || 0);
      const accuracy = Number(outcomes.forecastAccuracy || 0);
      const calibration = Number(learning.calibrationScore || 0);
      return Math.max(0, Math.min(100, Math.round((cadenceCoverage*.2)+(commitmentCoverage*.18)+(completion*.12)+(ownerCoverage*.1)+(expansionScore*.16)+(postLaunchScore*.1)+(accuracy*.07)+(calibration*.07))));
    }

    buildBlockers({ cadence, commitments, accountability, expansion, postLaunch }) {
      const blockers=[];
      if (cadence.some(item => !item.owner || item.owner === "Unassigned")) blockers.push("Assign an accountable owner to every management review cadence.");
      if (commitments.some(item => item.priority === "high" && (!item.owner || item.owner === "Unassigned"))) blockers.push("Assign owners to all high-priority operating commitments.");
      if (accountability.some(item => item.owner === "Unassigned" && item.open > 0)) blockers.push("Remove unassigned operating work before the next executive review.");
      if (Number(expansion.blockers?.length || 0) > 0) blockers.push("Expansion blockers remain unresolved and must be represented in the operating cadence.");
      if (Number(postLaunch.counts?.blockingIssues || 0) > 0) blockers.push("Blocking post-launch issues remain open.");
      return blockers;
    }

    buildWatchItems({ outcomes, learning, cadence, commitments }) {
      const items=[];
      if (Number(outcomes.forecastAccuracy || 0) < 75) items.push("Forecast accuracy is below the governance target of 75%.");
      if (Number(learning.calibrationScore || 0) < 75) items.push("Model calibration needs additional measured outcomes.");
      if (cadence.some(item => new Date(item.nextReview).getTime() < Date.now())) items.push("One or more management reviews are overdue.");
      if (commitments.filter(item => item.status !== "complete").length > 6) items.push("The open commitment queue is becoming too large for a focused operating rhythm.");
      return items;
    }

    summary(status, blockers, watchItems) {
      if (status === "operating-rhythm") return "Blue Current is running as a repeatable management system with assigned ownership, measured commitments, and a defined executive cadence.";
      if (status === "managed") return "The operating cadence is functioning, with a small number of watch conditions requiring ownership and follow-through.";
      if (status === "blocked") return `${blockers.length} governance blocker${blockers.length===1?"":"s"} must be resolved before the operating cadence is dependable.`;
      return "The management cadence is forming. Complete ownership, review schedules, and measurable commitments before scaling the rhythm.";
    }

    nextActions({ status, cadence, commitments, blockers, watchItems }) {
      const actions=[];
      blockers.forEach(text => actions.push({ label:"Resolve governance blocker", action:text }));
      watchItems.forEach(text => actions.push({ label:"Strengthen operating cadence", action:text }));
      cadence.filter(item => !item.owner || item.owner === "Unassigned").forEach(item => actions.push({ label:`Assign ${item.name}`, action:"Name the accountable operator and confirm the next review date." }));
      commitments.filter(item => item.status !== "complete").sort((a,b)=>a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0).forEach(item => actions.push({ label:item.title, action:`${item.owner} · due ${this.shortDate(item.dueDate)}` }));
      if (status === "operating-rhythm") actions.unshift({ label:"Run the next executive operating review", action:"Use measured outcomes, benchmark movement, and commitment completion to set the next performance priorities." });
      return actions.slice(0,8);
    }

    updateCadence(id, changes={}) {
      const next=this.normalizeCadence(this.appState.get("performanceGovernanceCadence")).map(item=>item.id===id?{...item,...changes}:item);
      this.appState.set("performanceGovernanceCadence",next);
      this.eventBus.emit("performance-governance:cadence-updated",{id,changes});
      return this.refresh({reason:"cadence-updated"});
    }

    updateCommitment(id, changes={}) {
      const next=this.normalizeCommitments(this.appState.get("performanceGovernanceCommitments"),this.appState.get("expansionBenchmark")||{},this.appState.get("executiveBriefing")||{}).map(item=>item.id===id?{...item,...changes}:item);
      this.appState.set("performanceGovernanceCommitments",next);
      this.eventBus.emit("performance-governance:commitment-updated",{id,changes});
      return this.refresh({reason:"commitment-updated"});
    }

    addCommitment(title) {
      const current=this.normalizeCommitments(this.appState.get("performanceGovernanceCommitments"),this.appState.get("expansionBenchmark")||{},this.appState.get("executiveBriefing")||{});
      current.push({ id:`governance-commitment-${Date.now()}`, title, owner:"Unassigned", priority:"medium", status:"open", dueDate:this.futureDate(14), evidence:"Evidence required at the next operating review." });
      this.appState.set("performanceGovernanceCommitments",current);
      return this.refresh({reason:"commitment-added"});
    }

    exportManifest() {
      return { generatedAt:new Date().toISOString(), product:"Blue Current Hospitality OS", release:"V35.11.0", performanceGovernance:this.appState.get("performanceGovernance"), cadence:this.appState.get("performanceGovernanceCadence"), commitments:this.appState.get("performanceGovernanceCommitments") };
    }

    reset() { this.history=[]; this.appState.update({ performanceGovernance:null, performanceGovernanceHistory:[], performanceGovernanceCadence:[], performanceGovernanceCommitments:[] }); }
    futureDate(days) { const date=new Date(); date.setDate(date.getDate()+days); return date.toISOString(); }
    shortDate(value) { const date=new Date(value); return Number.isNaN(date.getTime()) ? "Unscheduled" : date.toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
  }

  window.BlueCurrentPerformanceGovernanceEngine = BlueCurrentPerformanceGovernanceEngine;
})();
