(() => {
  "use strict";

  const DECISION_KEY = "blueCurrent.executiveDecisionCenter.v34.0.11";
  const BRIDGE_KEY = "blueCurrent.predictiveDecisionBridge.v34.0.13.5";
  const byId = id => document.getElementById(id);

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(DECISION_KEY));
      return value && typeof value === "object"
        ? value
        : {filter:"all",selectedId:null,decisions:[],history:[]};
    } catch {
      return {filter:"all",selectedId:null,decisions:[],history:[]};
    }
  }

  function urgencyFor(delta) {
    if (delta >= 25) return "immediate";
    if (delta >= 12) return "today";
    return "monitor";
  }

  function createDecision(simulation) {
    const state = readState();
    state.decisions = Array.isArray(state.decisions) ? state.decisions : [];
    state.history = Array.isArray(state.history) ? state.history : [];

    const fingerprint =
      `simulation:${simulation.scenario}:${simulation.severity}:${simulation.startWindow}`;

    const existing = state.decisions.find(item =>
      item.fingerprint === fingerprint &&
      item.status !== "completed" &&
      item.status !== "dismissed"
    );

    const decision = {
      fingerprint,
      urgency:urgencyFor(Number(simulation.riskDelta || 0)),
      title:simulation.recommendationTitle,
      why:`What-If simulation: ${simulation.scenarioName}, ${simulation.severity} severity, starting ${simulation.startWindow === 0 ? "now" : `in ${simulation.startWindow} minutes`}. ${simulation.recommendationDetail}`,
      sourceTarget:simulation.sourceTarget || "whatIfSimulator",
      revenueImpact:Number(simulation.revenueExposure || 0),
      guestImpact:Number(simulation.projectedRisk || 0) >= 75 ? "High" : "Medium",
      laborImpact:Number(simulation.projected?.labor || 0) >= 70 ? "High" : "Medium",
      estimatedCost:0,
      confidence:Number(simulation.confidence || 0),
      simulationSnapshot:simulation,
      updatedAt:new Date().toISOString()
    };

    let decisionId;

    if (existing) {
      Object.assign(existing, decision);
      state.selectedId = existing.id;
      decisionId = existing.id;
    } else {
      decisionId = `decision_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      state.decisions.push({
        ...decision,
        id:decisionId,
        status:"open",
        note:"",
        createdAt:new Date().toISOString(),
        approvedAt:null,
        completedAt:null
      });
      state.selectedId = decisionId;
    }

    localStorage.setItem(DECISION_KEY, JSON.stringify(state));
    localStorage.setItem(BRIDGE_KEY, JSON.stringify({
      decisionId,
      fingerprint,
      createdAt:new Date().toISOString()
    }));

    window.dispatchEvent(new CustomEvent("bluecurrent:predictive-decision-created", {
      detail:{decision:{...decision,id:decisionId}}
    }));

    byId("executiveDecisionCenter")?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  function init() {
    window.addEventListener("bluecurrent:predictive-decision-requested", event => {
      const simulation = event.detail?.simulation;
      if (!simulation) return;
      createDecision(simulation);
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();