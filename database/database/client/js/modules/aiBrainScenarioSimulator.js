(() => {
  "use strict";

  const ACCOUNTABILITY_KEY = "blueCurrent.executiveAccountabilityCenter.v34.0.14.6";
  const ORCHESTRATOR_KEY = "blueCurrent.aiBrainDecisionOrchestrator.v34.1.1";
  const HISTORY_KEY = "blueCurrent.aiBrainScenarioSimulator.v34.1.2";
  const byId = id => document.getElementById(id);

  let currentScenario = null;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function currentState() {
    const accountability = read(ACCOUNTABILITY_KEY);
    const commitments = Array.isArray(accountability.commitments) ? accountability.commitments : [];
    const open = commitments.filter(item => !["completed","verified"].includes(item.status));
    const overdue = open.filter(item => new Date(item.dueAt || 0).getTime() < Date.now());
    const verified = commitments.filter(item => item.status === "verified");

    const portfolioScores = Array.from(
      document.querySelectorAll("#crossLocationRankingList .cross-location-score strong")
    ).map(node => Number(node.textContent || 0)).filter(Number.isFinite);

    const portfolioScore = portfolioScores.length
      ? Math.round(portfolioScores.reduce((sum,value) => sum+value,0)/portfolioScores.length)
      : 75;

    const accountabilityScore = Number(byId("executiveAccountabilityScore")?.textContent || 75);
    const executiveRisk = Math.max(0,Math.min(100,
      overdue.length*16 + open.length*4 + Math.max(0,75-portfolioScore)
    ));

    return {
      open:open.length,
      overdue:overdue.length,
      verified:verified.length,
      portfolioScore,
      accountabilityScore,
      executiveRisk
    };
  }

  function strengthFactor(value) {
    return value === "aggressive" ? 1.35 :
      value === "conservative" ? .7 : 1;
  }

  function horizonFactor(value) {
    return value === "week" ? 1.35 :
      value === "three_shifts" ? 1.15 : 1;
  }

  function profile(type) {
    return {
      staffing:{
        label:"Targeted staffing coverage",
        owner:"Workforce Manager",
        dependency:"Qualified coverage availability",
        scoreGain:7,
        revenue:650,
        riskReduction:16,
        effort:"Medium",
        source:"workforceFoundation"
      },
      kitchen:{
        label:"Kitchen station rebalance",
        owner:"Kitchen Manager",
        dependency:"Station and expo coordination",
        scoreGain:9,
        revenue:900,
        riskReduction:22,
        effort:"Medium",
        source:"kitchenExpoCommand"
      },
      floor:{
        label:"Floor and section reassignment",
        owner:"Floor Manager",
        dependency:"Server and host communication",
        scoreGain:6,
        revenue:550,
        riskReduction:14,
        effort:"Low",
        source:"liveFloorOperationsV2"
      },
      demand:{
        label:"Reservation pacing adjustment",
        owner:"General Manager",
        dependency:"Demand forecast accuracy",
        scoreGain:8,
        revenue:1100,
        riskReduction:18,
        effort:"Low",
        source:"domainForecastingCenter"
      },
      recovery:{
        label:"Executive recovery plan",
        owner:"Operations Director",
        dependency:"Accountability owner follow-through",
        scoreGain:11,
        revenue:750,
        riskReduction:28,
        effort:"High",
        source:"executiveAccountabilityCenter"
      }
    }[type];
  }

  function runSimulation() {
    const base = currentState();
    const type = byId("aiBrainScenarioType").value;
    const strength = byId("aiBrainScenarioStrength").value;
    const horizon = byId("aiBrainScenarioHorizon").value;
    const p = profile(type);
    const factor = strengthFactor(strength) * horizonFactor(horizon);

    const scoreGain = Math.round(p.scoreGain * factor);
    const revenue = Math.round(p.revenue * factor);
    const riskReduction = Math.min(base.executiveRisk,Math.round(p.riskReduction * factor));
    const projectedRisk = Math.max(0,base.executiveRisk-riskReduction);
    const accountabilityGain = Math.round(
      (type === "recovery" ? 10 : type === "staffing" ? 5 : 3) * factor
    );
    const projectedAccountability = Math.min(100,base.accountabilityScore+accountabilityGain);
    const portfolioGain = Math.round(scoreGain*.65);
    const projectedPortfolio = Math.min(100,base.portfolioScore+portfolioGain);
    const openReduction = Math.min(base.open,Math.max(1,Math.round((type === "recovery" ? 3 : 1)*factor)));
    const projectedOpen = Math.max(0,base.open-openReduction);

    const probability = Math.max(45,Math.min(96,Math.round(
      64 + base.verified*3 - base.overdue*2 +
      (strength === "balanced" ? 8 : strength === "conservative" ? 5 : -2)
    )));

    const confidence = Math.max(55,Math.min(97,Math.round(
      probability*.7 + Math.min(100,65+base.verified*5)*.3
    )));

    const decision =
      probability >= 82 && riskReduction >= 12 ? "Proceed" :
      probability >= 65 ? "Proceed with checkpoint" : "Revise scenario";

    currentScenario = {
      id:`scenario_${Date.now()}`,
      type,
      label:p.label,
      strength,
      horizon,
      owner:p.owner,
      dependency:p.dependency,
      source:p.source,
      current:base,
      projected:{
        score:Math.min(100,base.portfolioScore+scoreGain),
        risk:projectedRisk,
        accountability:projectedAccountability,
        portfolio:projectedPortfolio,
        open:projectedOpen
      },
      changes:{
        score:scoreGain,
        risk:-riskReduction,
        accountability:accountabilityGain,
        portfolio:portfolioGain,
        open:-openReduction
      },
      revenue,
      riskReduction,
      effort:p.effort,
      probability,
      confidence,
      decision,
      checkpoint:horizon === "week" ? "48-hour review" :
        horizon === "three_shifts" ? "After shift 2" : "Mid-shift checkpoint",
      createdAt:new Date().toISOString()
    };

    renderScenario();
    byId("aiBrainScenarioStatus").textContent = "Simulation completed.";
  }

  function signed(value) {
    return value > 0 ? `+${value}` : String(value);
  }

  function renderScenario() {
    if (!currentScenario) return;
    const s = currentScenario;

    byId("aiBrainScenarioScore").textContent = String(s.confidence);
    byId("aiBrainScenarioLabel").textContent =
      s.confidence >= 85 ? "High-confidence projection" :
      s.confidence >= 70 ? "Moderate-confidence projection" : "Low-confidence projection";
    byId("aiBrainScenarioScoreCard").dataset.tone =
      s.confidence >= 85 ? "stable" : s.confidence >= 70 ? "watch" : "risk";

    byId("aiBrainScenarioProjectedScore").textContent =
      String(s.projected.score);
    byId("aiBrainScenarioProjectedScoreDelta").textContent =
      `${signed(s.changes.score)} projected`;
    byId("aiBrainScenarioRevenue").textContent =
      `$${s.revenue.toLocaleString()}`;
    byId("aiBrainScenarioRiskReduction").textContent =
      `${s.riskReduction}%`;
    byId("aiBrainScenarioEffort").textContent = s.effort;
    byId("aiBrainScenarioProbability").textContent =
      `${s.probability}%`;

    const fields = {
      aiBrainScenarioCurrentRisk:s.current.executiveRisk,
      aiBrainScenarioFutureRisk:s.projected.risk,
      aiBrainScenarioRiskDelta:signed(s.changes.risk),
      aiBrainScenarioCurrentAccountability:s.current.accountabilityScore,
      aiBrainScenarioFutureAccountability:s.projected.accountability,
      aiBrainScenarioAccountabilityDelta:signed(s.changes.accountability),
      aiBrainScenarioCurrentPortfolio:s.current.portfolioScore,
      aiBrainScenarioFuturePortfolio:s.projected.portfolio,
      aiBrainScenarioPortfolioDelta:signed(s.changes.portfolio),
      aiBrainScenarioCurrentOpen:s.current.open,
      aiBrainScenarioFutureOpen:s.projected.open,
      aiBrainScenarioOpenDelta:signed(s.changes.open)
    };

    Object.entries(fields).forEach(([id,value]) => {
      byId(id).textContent = String(value);
    });

    byId("aiBrainScenarioComparisonLabel").textContent =
      `${s.label} · ${s.strength} · ${s.horizon.replace("_"," ")}`;
    byId("aiBrainScenarioRecommendationTitle").textContent =
      `${s.decision}: ${s.label}`;
    byId("aiBrainScenarioRecommendationDetail").textContent =
      `The model projects ${signed(s.changes.portfolio)} portfolio points, ${s.riskReduction}% risk reduction, and approximately $${s.revenue.toLocaleString()} in operating upside with ${s.effort.toLowerCase()} execution effort.`;
    byId("aiBrainScenarioOwner").textContent = s.owner;
    byId("aiBrainScenarioCheckpoint").textContent = s.checkpoint;
    byId("aiBrainScenarioDependency").textContent = s.dependency;
    byId("aiBrainScenarioDecision").textContent = s.decision;
    byId("aiBrainScenarioPromote").disabled = false;
    byId("aiBrainScenarioSave").disabled = false;
    byId("aiBrainScenarioUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function promote() {
    if (!currentScenario) return;

    const stored = read(ORCHESTRATOR_KEY);
    const promoted = Array.isArray(stored.promotedScenarios)
      ? stored.promotedScenarios
      : [];

    const recommendation = {
      id:`scenario_recommendation_${Date.now()}`,
      urgency:currentScenario.decision === "Proceed" ? "today" : "monitor",
      tone:currentScenario.confidence >= 80 ? "stable" : "watch",
      title:`Execute scenario: ${currentScenario.label}`,
      detail:byId("aiBrainScenarioRecommendationDetail").textContent,
      owner:currentScenario.owner,
      expectedValue:currentScenario.revenue,
      confidence:currentScenario.confidence,
      source:currentScenario.source,
      scenarioId:currentScenario.id
    };

    promoted.push(recommendation);
    localStorage.setItem(ORCHESTRATOR_KEY,JSON.stringify({
      ...stored,
      promotedScenarios:promoted.slice(-25),
      updatedAt:new Date().toISOString()
    }));

    byId("aiBrainScenarioStatus").textContent =
      "Scenario promoted to the Decision Orchestrator.";
    window.dispatchEvent(new CustomEvent("bluecurrent:ai-brain-scenario-promoted", {
      detail:{recommendation,scenario:currentScenario}
    }));
  }

  function saveScenario() {
    if (!currentScenario) return;
    const stored = read(HISTORY_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];
    history.push(currentScenario);
    localStorage.setItem(HISTORY_KEY,JSON.stringify({history:history.slice(-50)}));
    byId("aiBrainScenarioStatus").textContent = "Scenario saved.";
    renderHistory();
  }

  function renderHistory() {
    const stored = read(HISTORY_KEY);
    const history = Array.isArray(stored.history) ? stored.history : [];
    const root = byId("aiBrainScenarioHistoryList");
    root.replaceChildren();

    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "ai-brain-scenario-empty";
      empty.textContent = "Saved simulations will appear here.";
      root.append(empty);
      return;
    }

    history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "ai-brain-scenario-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent =
        `${entry.decision}: ${entry.label}`;
      item.querySelector("span").textContent =
        `${entry.probability}% success · $${Number(entry.revenue || 0).toLocaleString()} upside · ${entry.strength}`;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {
          hour:"numeric",
          minute:"2-digit"
        });
      item.addEventListener("click",() => {
        currentScenario = entry;
        renderScenario();
      });
      root.append(item);
    });
  }

  function init() {
    if (!byId("aiBrainScenarioSimulator")) return;

    byId("aiBrainScenarioRun")?.addEventListener("click",runSimulation);
    byId("aiBrainScenarioPromote")?.addEventListener("click",promote);
    byId("aiBrainScenarioSave")?.addEventListener("click",saveScenario);
    byId("aiBrainScenarioClearHistory")?.addEventListener("click",() => {
      localStorage.setItem(HISTORY_KEY,JSON.stringify({history:[]}));
      renderHistory();
    });

    window.addEventListener("storage",event => {
      if ([ACCOUNTABILITY_KEY,ORCHESTRATOR_KEY,HISTORY_KEY].includes(event.key)) {
        renderHistory();
      }
    });

    renderHistory();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();