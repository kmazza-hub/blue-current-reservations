(function () {
  "use strict";

  class BlueCurrentEnterpriseValuePlanEngine {
    constructor({ eventBus, appState }) {
      if (!eventBus || !appState) throw new Error("EnterpriseValuePlanEngine requires EventBus and AppState.");
      this.eventBus = eventBus;
      this.appState = appState;
      this.timer = null;
      this.history = Array.isArray(appState.get("enterpriseValuePlanHistory")) ? appState.get("enterpriseValuePlanHistory") : [];
      this.bind();
    }

    bind() {
      const schedule = reason => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh({ reason }), 260);
      };
      [
        "performance-governance:updated",
        "expansion-benchmark:updated",
        "post-launch-value:updated",
        "executive-briefing:updated",
        "outcome-intelligence:updated",
        "restaurant-performance:updated",
        "state:changed"
      ].forEach(name => this.eventBus.on(name, () => schedule(name)));
      this.eventBus.on("state:reset", () => this.reset());
    }

    refresh({ reason = "manual" } = {}) {
      const state = this.appState.getState();
      const governance = state.performanceGovernance || {};
      const expansion = state.expansionBenchmark || {};
      const postLaunch = state.postLaunchValue || {};
      const outcomes = state.outcomeIntelligence || {};
      const performance = state.restaurantPerformance || {};
      const targets = this.normalizeTargets(state.enterpriseValueTargets, { governance, expansion, postLaunch, outcomes, performance });
      const initiatives = this.normalizeInitiatives(state.enterpriseValueInitiatives, governance, expansion);
      const quarters = this.buildQuarterPlan(targets, initiatives);
      const variance = this.calculateVariance(targets);
      const blockers = this.buildBlockers(targets, initiatives, governance, expansion, postLaunch);
      const score = this.calculateScore(targets, initiatives, governance, blockers);
      const status = blockers.length ? "blocked" : score >= 88 ? "plan-ready" : score >= 72 ? "aligned" : "forming";
      const snapshot = {
        id: `enterprise-value-plan-${Date.now()}`,
        release: "V35.12.0",
        capturedAt: new Date().toISOString(),
        reason,
        score,
        status,
        summary: this.summary(status, blockers),
        targets,
        initiatives,
        quarters,
        variance,
        blockers,
        metrics: {
          annualRevenueTarget: targets.find(item => item.id === "revenue")?.target || 0,
          realizedRevenue: targets.find(item => item.id === "revenue")?.actual || 0,
          portfolioRpiTarget: targets.find(item => item.id === "rpi")?.target || 0,
          currentPortfolioRpi: targets.find(item => item.id === "rpi")?.actual || 0,
          adoptionTarget: targets.find(item => item.id === "adoption")?.target || 0,
          currentAdoption: targets.find(item => item.id === "adoption")?.actual || 0,
          openInitiatives: initiatives.filter(item => item.status !== "complete").length
        },
        nextActions: this.nextActions({ targets, initiatives, blockers, status }),
        confidence: Math.max(0, Math.min(100, Math.round((Number(governance.score || 65) + Number(expansion.score || 65) + Number(outcomes.forecastAccuracy || 65)) / 3)))
      };
      this.history.unshift({ capturedAt: snapshot.capturedAt, score, status, revenueGap: variance.revenueGap, rpiGap: variance.rpiGap });
      this.history = this.history.slice(0, 60);
      this.appState.update({
        enterpriseValuePlan: snapshot,
        enterpriseValuePlanHistory: this.history,
        enterpriseValueTargets: targets,
        enterpriseValueInitiatives: initiatives
      });
      this.eventBus.emit("enterprise-value-plan:updated", structuredClone(snapshot));
      return structuredClone(snapshot);
    }

    normalizeTargets(value, context) {
      const current = Array.isArray(value) ? value : [];
      const realizedRevenue = Number(context.expansion.benchmarks?.totalRealizedRevenue || context.postLaunch.realizedRevenue || context.outcomes.realizedRevenue || 0);
      const portfolioRpi = Number(context.expansion.benchmarks?.averageRpi || context.performance.rpi || 0);
      const adoption = Number(context.expansion.benchmarks?.averageAdoption || context.postLaunch.adoptionPercent || 0);
      const forecast = Number(context.outcomes.forecastAccuracy || 0);
      const defaults = [
        { id:"revenue", name:"Annual realized revenue", unit:"currency", target:Math.max(250000, Math.round(realizedRevenue * 4 || 250000)), actual:realizedRevenue, owner:"Executive sponsor", status:"active" },
        { id:"rpi", name:"Portfolio RPI", unit:"score", target:90, actual:portfolioRpi, owner:"Regional operator", status:"active" },
        { id:"adoption", name:"Weekly active adoption", unit:"percent", target:85, actual:adoption, owner:"Deployment lead", status:"active" },
        { id:"accuracy", name:"Forecast accuracy", unit:"percent", target:85, actual:forecast, owner:"Technical owner", status:"active" }
      ];
      return defaults.map(item => ({ ...item, ...(current.find(entry => entry.id === item.id) || {}), actual:item.actual }));
    }

    normalizeInitiatives(value, governance, expansion) {
      const current = Array.isArray(value) ? value : [];
      if (current.length) return current.map(item => ({ priority:"medium", status:"planned", owner:"Unassigned", quarter:"Q1", projectedValue:0, ...item }));
      const commitments = Array.isArray(governance.commitments) ? governance.commitments : [];
      const actions = Array.isArray(expansion.nextActions) ? expansion.nextActions : [];
      const source = [
        ...commitments.slice(0,3).map(item => ({ title:item.title, owner:item.owner, priority:item.priority, projectedValue:25000 })),
        ...actions.slice(0,2).map(item => ({ title:item.label || item.action, owner:"Regional operator", priority:"high", projectedValue:40000 }))
      ].filter(item => item.title);
      const base = source.length ? source : [
        { title:"Increase reservation capture and table utilization", owner:"Operations leader", priority:"high", projectedValue:50000 },
        { title:"Reduce kitchen compression during peak periods", owner:"Culinary leader", priority:"high", projectedValue:35000 },
        { title:"Raise manager adoption and recommendation follow-through", owner:"Deployment lead", priority:"medium", projectedValue:25000 }
      ];
      return base.slice(0,6).map((item,index) => ({
        id:`enterprise-initiative-${index+1}`,
        title:item.title,
        owner:item.owner || "Unassigned",
        priority:item.priority || "medium",
        projectedValue:Number(item.projectedValue || 0),
        status:"planned",
        quarter:`Q${Math.min(4,index+1)}`,
        milestone:`Complete measurable proof by the end of Q${Math.min(4,index+1)}.`
      }));
    }

    buildQuarterPlan(targets, initiatives) {
      return ["Q1","Q2","Q3","Q4"].map(quarter => {
        const items = initiatives.filter(item => item.quarter === quarter);
        return {
          quarter,
          initiatives:items,
          projectedValue:items.reduce((sum,item)=>sum+Number(item.projectedValue||0),0),
          complete:items.filter(item=>item.status==="complete").length,
          total:items.length,
          focus:items[0]?.title || "Maintain performance and validate the next improvement cycle."
        };
      });
    }

    calculateVariance(targets) {
      const get=id=>targets.find(item=>item.id===id)||{target:0,actual:0};
      const revenue=get("revenue"), rpi=get("rpi"), adoption=get("adoption"), accuracy=get("accuracy");
      return {
        revenueGap:Math.max(0,Number(revenue.target)-Number(revenue.actual)),
        revenueProgress:revenue.target?Math.min(100,Math.round(revenue.actual/revenue.target*100)):0,
        rpiGap:Math.max(0,Number(rpi.target)-Number(rpi.actual)),
        adoptionGap:Math.max(0,Number(adoption.target)-Number(adoption.actual)),
        accuracyGap:Math.max(0,Number(accuracy.target)-Number(accuracy.actual))
      };
    }

    calculateScore(targets, initiatives, governance, blockers) {
      const targetOwnership = targets.length ? targets.filter(item=>item.owner && item.owner!=="Unassigned").length/targets.length*100 : 0;
      const initiativeOwnership = initiatives.length ? initiatives.filter(item=>item.owner && item.owner!=="Unassigned").length/initiatives.length*100 : 0;
      const milestoneCoverage = initiatives.length ? initiatives.filter(item=>item.milestone && item.quarter).length/initiatives.length*100 : 0;
      const initiativeProgress = initiatives.length ? initiatives.reduce((sum,item)=>sum+(item.status==="complete"?100:item.status==="in-progress"?55:item.status==="blocked"?10:25),0)/initiatives.length : 0;
      const governanceScore = Number(governance.score || 0);
      const penalty = Math.min(35, blockers.length*10);
      return Math.max(0,Math.min(100,Math.round(targetOwnership*.2+initiativeOwnership*.2+milestoneCoverage*.16+initiativeProgress*.14+governanceScore*.3-penalty)));
    }

    buildBlockers(targets, initiatives, governance, expansion, postLaunch) {
      const blockers=[];
      if (targets.some(item=>!item.owner || item.owner==="Unassigned")) blockers.push("Assign an accountable owner to every annual performance target.");
      if (initiatives.some(item=>item.priority==="high" && (!item.owner || item.owner==="Unassigned"))) blockers.push("Assign owners to every high-priority value initiative.");
      if (initiatives.some(item=>item.status==="blocked")) blockers.push("Resolve blocked annual-plan initiatives before approving the operating plan.");
      if (Number(governance.score||0)<70) blockers.push("Performance governance is below the minimum planning threshold of 70%.");
      if (Number(expansion.blockers?.length||0)>0) blockers.push("Expansion blockers must be incorporated into the annual operating plan.");
      if (Number(postLaunch.counts?.blockingIssues||0)>0) blockers.push("Open blocking post-launch issues remain unresolved.");
      return blockers;
    }

    nextActions({ targets, initiatives, blockers, status }) {
      const actions=[];
      blockers.slice(0,3).forEach(text=>actions.push({label:"Remove blocker",action:text}));
      const ownerGap=targets.find(item=>!item.owner||item.owner==="Unassigned");
      if(ownerGap) actions.push({label:"Assign target ownership",action:`Name an accountable owner for ${ownerGap.name}.`});
      const high=initiatives.find(item=>item.priority==="high"&&item.status!=="complete");
      if(high) actions.push({label:"Advance highest-value initiative",action:`Move ${high.title} into active execution and capture evidence.`});
      if(status==="plan-ready") actions.push({label:"Approve annual operating plan",action:"Export the value plan and confirm executive sponsorship for the next cycle."});
      return actions.slice(0,5);
    }

    summary(status, blockers) {
      if(status==="plan-ready") return "The annual operating plan has named ownership, measurable targets, sequenced initiatives, and sufficient governance evidence for executive approval.";
      if(status==="aligned") return "The value plan is aligned, with a small number of targets or initiatives still needing stronger ownership or evidence.";
      if(status==="blocked") return `The annual plan is blocked by ${blockers.length} unresolved control${blockers.length===1?"":"s"}.`;
      return "The annual value plan is forming. Complete target ownership, initiative sequencing, and milestone evidence before approval.";
    }

    updateTarget(id, changes={}) {
      const current=this.normalizeTargets(this.appState.get("enterpriseValueTargets"),{
        governance:this.appState.get("performanceGovernance")||{},
        expansion:this.appState.get("expansionBenchmark")||{},
        postLaunch:this.appState.get("postLaunchValue")||{},
        outcomes:this.appState.get("outcomeIntelligence")||{},
        performance:this.appState.get("restaurantPerformance")||{}
      });
      this.appState.set("enterpriseValueTargets",current.map(item=>item.id===id?{...item,...changes}:item));
      this.eventBus.emit("enterprise-value-plan:target-updated",{id,changes});
      return this.refresh({reason:"target-updated"});
    }

    updateInitiative(id, changes={}) {
      const current=this.normalizeInitiatives(this.appState.get("enterpriseValueInitiatives"),this.appState.get("performanceGovernance")||{},this.appState.get("expansionBenchmark")||{});
      this.appState.set("enterpriseValueInitiatives",current.map(item=>item.id===id?{...item,...changes}:item));
      this.eventBus.emit("enterprise-value-plan:initiative-updated",{id,changes});
      return this.refresh({reason:"initiative-updated"});
    }

    addInitiative(title) {
      const current=this.normalizeInitiatives(this.appState.get("enterpriseValueInitiatives"),this.appState.get("performanceGovernance")||{},this.appState.get("expansionBenchmark")||{});
      current.push({id:`enterprise-initiative-${Date.now()}`,title,owner:"Unassigned",priority:"medium",projectedValue:0,status:"planned",quarter:"Q1",milestone:"Define a measurable milestone."});
      this.appState.set("enterpriseValueInitiatives",current);
      return this.refresh({reason:"initiative-added"});
    }

    exportManifest() {
      return {generatedAt:new Date().toISOString(),product:"Blue Current Hospitality OS",release:"V35.12.0",enterpriseValuePlan:this.appState.get("enterpriseValuePlan"),targets:this.appState.get("enterpriseValueTargets"),initiatives:this.appState.get("enterpriseValueInitiatives")};
    }

    reset(){this.history=[];this.appState.update({enterpriseValuePlan:null,enterpriseValuePlanHistory:[],enterpriseValueTargets:[],enterpriseValueInitiatives:[]});}
  }

  window.BlueCurrentEnterpriseValuePlanEngine=BlueCurrentEnterpriseValuePlanEngine;
})();
