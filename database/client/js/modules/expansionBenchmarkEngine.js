(function () {
  "use strict";

  class BlueCurrentExpansionBenchmarkEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("ExpansionBenchmarkEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.history = Array.isArray(appState.get("expansionBenchmarkHistory")) ? appState.get("expansionBenchmarkHistory") : [];
      this.timer = null;
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 220);
      };
      [
        "post-launch-value:updated",
        "portfolio-performance:updated",
        "outcome-intelligence:updated",
        "performance-learning:updated",
        "deployment-readiness:updated",
        "state:changed"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const postLaunch = state.postLaunchValue || {};
      const portfolio = state.portfolioPerformance || {};
      const outcomes = state.outcomeIntelligence || {};
      const learning = state.performanceLearning || {};
      const locations = this.buildLocations(state.postLaunchLocations, state.portfolioPerformanceLocations);
      const benchmarks = this.calculateBenchmarks(locations);
      const playbooks = this.buildPlaybooks(locations, benchmarks);
      const expansionPlan = this.normalizeExpansionPlan(state.expansionPlan, locations, benchmarks);
      const readiness = this.calculateReadiness({ postLaunch, outcomes, learning, locations, expansionPlan });
      const gate = readiness.blockers.length ? "hold" : readiness.score >= 88 ? "expand" : readiness.score >= 72 ? "controlled-expansion" : "stabilize";
      const snapshot = {
        id: `expansion-${Date.now()}`,
        release: "V35.10.0",
        capturedAt: new Date().toISOString(),
        reason,
        score: readiness.score,
        gate,
        summary: this.summary(gate, readiness),
        benchmarks,
        locations,
        playbooks,
        expansionPlan,
        blockers: readiness.blockers,
        watchItems: readiness.watchItems,
        counts: {
          benchmarkLocations: locations.length,
          scalingReady: locations.filter(item => item.readiness === "scaling-ready").length,
          repeatableWins: playbooks.filter(item => item.confidence >= 75).length,
          plannedLocations: expansionPlan.filter(item => item.status !== "complete").length
        },
        nextActions: this.nextActions({ gate, locations, playbooks, expansionPlan, readiness }),
        confidence: Math.round((Number(postLaunch.confidence || 70) + Number(learning.calibrationScore || 70) + Number(outcomes.forecastAccuracy || 70)) / 3)
      };
      this.history.unshift({ capturedAt: snapshot.capturedAt, score: snapshot.score, gate, scalingReady: snapshot.counts.scalingReady });
      this.history = this.history.slice(0, 60);
      this.appState.update({
        expansionBenchmark: snapshot,
        expansionBenchmarkHistory: this.history,
        expansionPlan,
        expansionPlaybooks: playbooks
      });
      this.eventBus.emit("expansion-benchmark:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    buildLocations(postLaunchLocations, portfolioLocations) {
      const post = Array.isArray(postLaunchLocations) ? postLaunchLocations : [];
      const portfolio = Array.isArray(portfolioLocations) ? portfolioLocations : [];
      const ids = new Set([...post.map(item => item.id), ...portfolio.map(item => item.id)]);
      if (!ids.size) ids.add("primary-location");
      return [...ids].map((id, index) => {
        const a = post.find(item => item.id === id) || {};
        const b = portfolio.find(item => item.id === id) || {};
        const rpi = Number(a.rpi ?? b.rpi ?? b.restaurantPerformanceIndex ?? 70);
        const adoption = Number(a.adoptionPercent ?? 0);
        const realizedRevenue = Number(a.realizedRevenue ?? b.realizedRevenue ?? 0);
        const opportunity = Number(b.revenueOpportunity ?? b.remainingOpportunity ?? 0);
        const health = Math.round((Math.min(100, rpi) * .45) + (Math.min(100, adoption) * .35) + ((a.status === "live" ? 100 : a.status === "stabilizing" ? 70 : 40) * .2));
        return {
          id,
          name: a.name || b.name || `Location ${index + 1}`,
          status: a.status || "preparing",
          owner: a.owner || b.owner || "Unassigned",
          rpi,
          adoption,
          realizedRevenue,
          opportunity,
          health,
          readiness: health >= 85 && adoption >= 75 ? "scaling-ready" : health >= 68 ? "stabilizing" : "needs-attention",
          primaryConstraint: b.primaryConstraint || b.constraint || (adoption < 60 ? "User adoption" : rpi < 75 ? "Operating performance" : "Evidence depth")
        };
      }).sort((a,b) => b.health - a.health);
    }

    calculateBenchmarks(locations) {
      const average = key => locations.length ? Math.round(locations.reduce((sum,item)=>sum+Number(item[key]||0),0)/locations.length) : 0;
      const leader = [...locations].sort((a,b)=>b.health-a.health)[0] || null;
      return {
        averageRpi: average("rpi"),
        averageAdoption: average("adoption"),
        totalRealizedRevenue: locations.reduce((sum,item)=>sum+item.realizedRevenue,0),
        averageHealth: average("health"),
        leader: leader ? { id: leader.id, name: leader.name, health: leader.health, rpi: leader.rpi } : null,
        opportunity: locations.reduce((sum,item)=>sum+item.opportunity,0)
      };
    }

    buildPlaybooks(locations, benchmarks) {
      const leader = locations[0];
      const playbooks = [];
      if (leader && leader.adoption >= benchmarks.averageAdoption) playbooks.push({ id:"adoption-rhythm", title:"Replicate the leading adoption rhythm", source:leader.name, domain:"Adoption", confidence:Math.min(95, 60 + Math.round((leader.adoption-benchmarks.averageAdoption)*.8)), expectedImpact:`Raise portfolio adoption toward ${leader.adoption}%`, evidence:`${leader.name} leads with ${leader.adoption}% adoption.` });
      if (leader && leader.rpi >= benchmarks.averageRpi) playbooks.push({ id:"performance-rhythm", title:"Standardize the strongest operating rhythm", source:leader.name, domain:"Performance", confidence:Math.min(94, 65 + Math.round((leader.rpi-benchmarks.averageRpi)*1.2)), expectedImpact:`Lift portfolio RPI toward ${leader.rpi}`, evidence:`${leader.name} leads the portfolio at ${leader.rpi} RPI.` });
      const revenueLeader=[...locations].sort((a,b)=>b.realizedRevenue-a.realizedRevenue)[0];
      if (revenueLeader && revenueLeader.realizedRevenue>0) playbooks.push({ id:"value-realization", title:"Scale the highest-value intervention pattern", source:revenueLeader.name, domain:"Revenue", confidence:82, expectedImpact:`Protect and repeat ${this.money(revenueLeader.realizedRevenue)} in measured value`, evidence:`Largest realized-value contribution in the current rollout.` });
      if (!playbooks.length) playbooks.push({ id:"evidence-first", title:"Build the first repeatable operating playbook", source:"Pilot evidence", domain:"Evidence", confidence:55, expectedImpact:"Create a validated pattern before broader expansion", evidence:"More measured outcomes are required before standardization." });
      return playbooks;
    }

    normalizeExpansionPlan(value, locations, benchmarks) {
      const current = Array.isArray(value) ? value : [];
      if (current.length) return current.map(item => ({ status:"planned", owner:"Unassigned", wave:"Wave 1", ...item }));
      const candidates = locations.filter(item => item.readiness !== "scaling-ready").slice(0,3);
      return candidates.map((item,index)=>({ id:`expansion-${item.id}`, locationId:item.id, locationName:item.name, wave:`Wave ${index+1}`, owner:item.owner, status:"planned", targetRpi:Math.max(benchmarks.averageRpi,80), targetAdoption:Math.max(benchmarks.averageAdoption,75), approved:false }));
    }

    calculateReadiness({ postLaunch, outcomes, learning, locations, expansionPlan }) {
      const blockers=[]; const watchItems=[];
      const health=Number(postLaunch.healthScore||0);
      const accuracy=Number(outcomes.forecastAccuracy||0);
      const calibration=Number(learning.calibrationScore||0);
      const readyLocations=locations.filter(item=>item.readiness==="scaling-ready").length;
      const ownerCoverage=expansionPlan.length ? expansionPlan.filter(item=>item.owner && item.owner!=="Unassigned").length/expansionPlan.length*100 : 100;
      if (Number(postLaunch.counts?.blockingIssues||0)>0) blockers.push("Resolve blocking post-launch issues before expansion.");
      if (health<70) blockers.push("Post-launch health must stabilize before adding locations.");
      if (accuracy<65) watchItems.push("Forecast accuracy needs more measured outcomes.");
      if (calibration<65) watchItems.push("Model calibration remains below the expansion target.");
      if (!readyLocations) watchItems.push("No location has yet reached the scaling-ready benchmark.");
      if (ownerCoverage<100) watchItems.push("Assign an owner to every planned expansion location.");
      const score=Math.max(0,Math.min(100,Math.round((health*.28)+(accuracy*.2)+(calibration*.2)+((readyLocations/Math.max(1,locations.length))*100*.18)+(ownerCoverage*.14)-(blockers.length*18))));
      return { score, blockers, watchItems, ownerCoverage, readyLocations };
    }

    summary(gate, readiness) {
      if (gate==="expand") return "Measured value, adoption, and operating stability support the next controlled expansion wave.";
      if (gate==="controlled-expansion") return "Expansion can proceed selectively while watch conditions remain visible and owned.";
      if (gate==="hold") return `${readiness.blockers.length} blocking condition${readiness.blockers.length===1?"":"s"} must be resolved before expansion.`;
      return "Continue stabilizing the current rollout and deepen repeatable evidence before adding locations.";
    }

    nextActions({ gate, locations, playbooks, expansionPlan, readiness }) {
      const actions=[];
      readiness.blockers.forEach(text=>actions.push({ label:"Clear expansion blocker", action:text }));
      readiness.watchItems.forEach(text=>actions.push({ label:"Strengthen expansion evidence", action:text }));
      expansionPlan.filter(item=>!item.approved).forEach(item=>actions.push({ label:`Approve ${item.locationName} for ${item.wave}`, action:`Owner: ${item.owner} · target RPI ${item.targetRpi}` }));
      playbooks.filter(item=>item.confidence>=75).forEach(item=>actions.push({ label:`Operationalize ${item.title}`, action:`${item.source} · ${item.expectedImpact}` }));
      if (gate==="expand") actions.unshift({ label:"Launch the next controlled expansion wave", action:"Preserve the proven operating playbook, support coverage, and measurement plan." });
      return actions.slice(0,8);
    }

    updatePlan(id, changes={}) {
      const plan=this.normalizeExpansionPlan(this.appState.get("expansionPlan"), this.buildLocations(this.appState.get("postLaunchLocations"), this.appState.get("portfolioPerformanceLocations")), this.calculateBenchmarks(this.buildLocations(this.appState.get("postLaunchLocations"), this.appState.get("portfolioPerformanceLocations"))));
      const next=plan.map(item=>item.id===id?{...item,...changes}:item);
      this.appState.set("expansionPlan",next);
      this.eventBus.emit("expansion-benchmark:plan-updated",{id,changes});
      return this.refresh({reason:"plan-updated"});
    }

    exportManifest() { return { generatedAt:new Date().toISOString(), product:"Blue Current Hospitality OS", release:"V35.10.0", expansionBenchmark:this.appState.get("expansionBenchmark"), expansionPlan:this.appState.get("expansionPlan"), playbooks:this.appState.get("expansionPlaybooks") }; }
    reset() { this.history=[]; this.appState.update({ expansionBenchmark:null, expansionBenchmarkHistory:[], expansionPlan:[], expansionPlaybooks:[] }); }
    money(value) { return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value||0)); }
  }

  window.BlueCurrentExpansionBenchmarkEngine = BlueCurrentExpansionBenchmarkEngine;
})();
