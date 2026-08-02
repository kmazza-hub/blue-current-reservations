(() => {
  "use strict";

  const ACCOUNTABILITY_KEY = "blueCurrent.executiveAccountabilityCenter.v34.0.14.6";
  const ORCHESTRATOR_KEY = "blueCurrent.aiBrainDecisionOrchestrator.v34.1.1";
  const byId = id => document.getElementById(id);

  const state = {
    recommendations:[],
    selectedId:null,
    history:[]
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(ORCHESTRATOR_KEY);
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.selectedId = stored.selectedId || null;
  }

  function save() {
    localStorage.setItem(ORCHESTRATOR_KEY,JSON.stringify({
      history:state.history,
      selectedId:state.selectedId,
      updatedAt:new Date().toISOString()
    }));
  }

  function signals() {
    const accountability = read(ACCOUNTABILITY_KEY);
    const commitments = Array.isArray(accountability.commitments) ? accountability.commitments : [];
    const open = commitments.filter(item => !["completed","verified"].includes(item.status));
    const overdue = open.filter(item => new Date(item.dueAt || 0).getTime() < Date.now());
    const dueSoon = open.filter(item => {
      const due = new Date(item.dueAt || 0).getTime();
      return due >= Date.now() && due-Date.now() <= 24*3600000;
    });
    const verified = commitments.filter(item => item.status === "verified");

    const locations = Array.from(document.querySelectorAll("#crossLocationRankingList .cross-location-card"))
      .map(card => ({
        name:card.querySelector(".cross-location-copy strong")?.textContent || "Location",
        score:Number(card.querySelector(".cross-location-score strong")?.textContent || 0),
        detail:card.querySelector(".cross-location-copy span")?.textContent || ""
      }));

    const revenueText = byId("executiveIntelligenceRevenueOpportunity")?.textContent || "$0";
    const revenueValue = Number(revenueText.replace(/[^0-9.-]/g,"")) || 0;

    return {commitments,open,overdue,dueSoon,verified,locations,revenueValue};
  }

  function buildRecommendations() {
    const data = signals();
    const items = [];

    data.overdue.slice(0,2).forEach((item,index) => {
      items.push({
        id:`overdue_${item.id || index}`,
        urgency:"immediate",
        tone:"risk",
        title:`Recover overdue commitment: ${item.title}`,
        detail:`The commitment assigned to ${item.owner || "leadership"} missed its due date. Set a same-day recovery deadline and require measurable proof.`,
        owner:item.owner || "Operations Director",
        expectedValue:0,
        confidence:94,
        source:"executiveAccountabilityCenter"
      });
    });

    data.dueSoon.slice(0,2).forEach((item,index) => {
      items.push({
        id:`due_${item.id || index}`,
        urgency:"today",
        tone:"watch",
        title:`Protect the due-soon action: ${item.title}`,
        detail:`Confirm blockers, ownership, and proof of completion before the deadline passes.`,
        owner:item.owner || "General Manager",
        expectedValue:0,
        confidence:88,
        source:"executiveAccountabilityCenter"
      });
    });

    const weak = data.locations.slice().sort((a,b) => a.score-b.score)[0];
    if (weak && weak.score < 78) {
      items.push({
        id:`location_${weak.name.toLowerCase().replace(/[^a-z0-9]+/g,"_")}`,
        urgency:weak.score < 65 ? "immediate" : "today",
        tone:weak.score < 65 ? "risk" : "watch",
        title:`Stabilize ${weak.name}`,
        detail:`Its portfolio score is ${weak.score}. Review the largest ticket-time, labor, or alert gap and apply a best-practice transfer from the portfolio leader.`,
        owner:"Regional Manager",
        expectedValue:500,
        confidence:86,
        source:"crossLocationIntelligence"
      });
    }

    if (data.revenueValue > 0) {
      items.push({
        id:"revenue_opportunity",
        urgency:data.revenueValue >= 1000 ? "today" : "monitor",
        tone:data.revenueValue >= 1000 ? "watch" : "stable",
        title:`Assign the $${data.revenueValue.toLocaleString()} revenue opportunity`,
        detail:"Choose one accountable owner, define the operating intervention, and verify observed value after the next shift.",
        owner:"Operations Director",
        expectedValue:data.revenueValue,
        confidence:82,
        source:"executiveOperationalIntelligence"
      });
    }

    if (data.verified.length) {
      const item = data.verified[0];
      items.push({
        id:`scale_${item.id || "verified"}`,
        urgency:"monitor",
        tone:"stable",
        title:`Scale the verified win: ${item.title}`,
        detail:item.verifiedResult || "Document the successful behavior and repeat it across the next three shifts.",
        owner:"Operations Director",
        expectedValue:250,
        confidence:90,
        source:"aiOperationsCoach"
      });
    }

    if (!items.length) {
      items.push({
        id:"maintain_plan",
        urgency:"monitor",
        tone:"stable",
        title:"Maintain the current operating plan",
        detail:"No urgent intervention is visible. Continue verification discipline and monitor the next shift for material change.",
        owner:"General Manager",
        expectedValue:0,
        confidence:76,
        source:"restaurantAiBrainV341"
      });
    }

    const orchestratorState = read(ORCHESTRATOR_KEY);
    const promotedScenarios = Array.isArray(orchestratorState.promotedScenarios)
      ? orchestratorState.promotedScenarios
      : [];
    promotedScenarios.forEach(item => {
      if (!items.some(existing => existing.id === item.id)) items.unshift(item);
    });

    const completedIds = new Set(
      state.history
        .filter(item => ["committed","dismissed"].includes(item.status))
        .map(item => item.recommendationId)
    );

    state.recommendations = items.filter(item => !completedIds.has(item.id));
    if (state.selectedId && !state.recommendations.some(item => item.id === state.selectedId)) {
      state.selectedId = null;
    }
  }

  function selected() {
    return state.recommendations.find(item => item.id === state.selectedId) || null;
  }

  function renderList() {
    const root = byId("aiBrainDecisionRecommendationList");
    root.replaceChildren();

    if (!state.recommendations.length) {
      const empty = document.createElement("div");
      empty.className = "ai-brain-decision-empty";
      empty.textContent = "No new AI recommendations are waiting for review.";
      root.append(empty);
      return;
    }

    state.recommendations.forEach((item,index) => {
      const card = document.createElement("article");
      card.className = "ai-brain-decision-recommendation";
      card.dataset.tone = item.tone;
      card.classList.toggle("is-selected",item.id === state.selectedId);
      card.innerHTML =
        "<span class='ai-brain-decision-rank'></span>" +
        "<div class='ai-brain-decision-copy'><strong></strong><span></span></div>" +
        "<span class='ai-brain-decision-badge'></span>";

      card.querySelector(".ai-brain-decision-rank").textContent = String(index+1);
      card.querySelector(".ai-brain-decision-copy strong").textContent = item.title;
      card.querySelector(".ai-brain-decision-copy span").textContent =
        `${item.owner} · ${item.confidence}% confidence · $${item.expectedValue.toLocaleString()} value`;
      card.querySelector(".ai-brain-decision-badge").textContent = item.urgency;

      card.addEventListener("click",() => {
        state.selectedId = item.id;
        save();
        render();
      });

      root.append(card);
    });
  }

  function renderInspector() {
    const item = selected();
    const buttons = [
      "aiBrainDecisionCommit",
      "aiBrainDecisionOpenSource",
      "aiBrainDecisionDismiss"
    ];

    buttons.forEach(id => byId(id).disabled = !item);

    if (!item) {
      byId("aiBrainDecisionSelectedTitle").textContent = "Choose a recommendation";
      byId("aiBrainDecisionSelectedDetail").textContent =
        "Select an AI recommendation to review its evidence, expected impact, owner, and execution window.";
      ["aiBrainDecisionSelectedUrgency","aiBrainDecisionSelectedOwner"].forEach(id => byId(id).textContent = "—");
      byId("aiBrainDecisionSelectedValue").textContent = "$0";
      byId("aiBrainDecisionSelectedConfidence").textContent = "0%";
      return;
    }

    byId("aiBrainDecisionSelectedTitle").textContent = item.title;
    byId("aiBrainDecisionSelectedDetail").textContent = item.detail;
    byId("aiBrainDecisionSelectedUrgency").textContent =
      item.urgency.charAt(0).toUpperCase()+item.urgency.slice(1);
    byId("aiBrainDecisionSelectedOwner").textContent = item.owner;
    byId("aiBrainDecisionSelectedValue").textContent =
      `$${item.expectedValue.toLocaleString()}`;
    byId("aiBrainDecisionSelectedConfidence").textContent =
      `${item.confidence}%`;
  }

  function renderKPIs() {
    const immediate = state.recommendations.filter(item => item.urgency === "immediate").length;
    const value = state.recommendations.reduce((sum,item) => sum+item.expectedValue,0);
    const committed = state.history.filter(item => item.status === "committed").length;
    const confidence = state.recommendations.length
      ? Math.round(state.recommendations.reduce((sum,item) => sum+item.confidence,0)/state.recommendations.length)
      : 0;
    const readiness = Math.max(0,Math.min(100,
      confidence + committed*2 - immediate*5
    ));

    byId("aiBrainDecisionRecommendationCount").textContent =
      String(state.recommendations.length);
    byId("aiBrainDecisionImmediateCount").textContent = String(immediate);
    byId("aiBrainDecisionEstimatedValue").textContent =
      `$${value.toLocaleString()}`;
    byId("aiBrainDecisionCommittedCount").textContent = String(committed);
    byId("aiBrainDecisionConfidence").textContent = `${confidence}%`;
    byId("aiBrainDecisionOrchestratorScore").textContent = String(readiness);
    byId("aiBrainDecisionOrchestratorLabel").textContent =
      readiness >= 85 ? "Ready for execution" :
      readiness >= 65 ? "Executive review required" : "Evidence still developing";
    byId("aiBrainDecisionOrchestratorScoreCard").dataset.tone =
      readiness >= 85 ? "stable" : readiness >= 65 ? "watch" : "risk";
  }

  function renderHistory() {
    const root = byId("aiBrainDecisionHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "ai-brain-decision-empty";
      empty.textContent = "Committed and dismissed recommendations will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().slice(0,30).forEach(entry => {
      const row = document.createElement("article");
      row.className = "ai-brain-decision-history-item";
      row.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      row.querySelector("strong").textContent = entry.title;
      row.querySelector("span").textContent =
        `${entry.status} · ${entry.owner} · $${Number(entry.expectedValue || 0).toLocaleString()} value`;
      row.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(row);
    });
  }

  function commitSelected() {
    const item = selected();
    if (!item) return;

    const accountability = read(ACCOUNTABILITY_KEY);
    const commitments = Array.isArray(accountability.commitments)
      ? accountability.commitments
      : [];
    const audit = Array.isArray(accountability.audit) ? accountability.audit : [];

    const commitmentId = `brain_commitment_${Date.now()}`;
    const priority = item.urgency === "immediate" ? 1 :
      item.urgency === "today" ? 2 : 3;
    const dueHours = priority === 1 ? 8 : priority === 2 ? 24 : 72;

    commitments.push({
      id:commitmentId,
      sourceId:`ai_brain_${item.id}`,
      title:item.title,
      detail:item.detail,
      priority,
      owner:item.owner,
      dueAt:new Date(Date.now()+dueHours*3600000).toISOString(),
      expectedImpact:item.expectedValue
        ? `Recover or protect approximately $${item.expectedValue.toLocaleString()}`
        : "Complete the recommended operating intervention",
      completionNote:"",
      verifiedResult:"",
      status:"open",
      createdAt:new Date().toISOString(),
      completedAt:null,
      verifiedAt:null,
      escalatedAt:null
    });

    audit.push({
      id:`audit_${Date.now()}`,
      commitmentId,
      action:"AI Brain commitment created",
      detail:`${item.title} assigned to ${item.owner}.`,
      createdAt:new Date().toISOString()
    });

    localStorage.setItem(ACCOUNTABILITY_KEY,JSON.stringify({
      ...accountability,
      commitments,
      audit,
      selectedId:commitmentId,
      updatedAt:new Date().toISOString()
    }));

    state.history.push({
      recommendationId:item.id,
      title:item.title,
      owner:item.owner,
      expectedValue:item.expectedValue,
      status:"committed",
      createdAt:new Date().toISOString()
    });
    state.selectedId = null;
    save();
    buildRecommendations();
    render();

    byId("aiBrainDecisionStatus").textContent =
      "Accountability commitment created.";
    window.dispatchEvent(new CustomEvent("bluecurrent:ai-brain-commitment-created", {
      detail:{commitmentId,recommendation:item}
    }));
  }

  function dismissSelected() {
    const item = selected();
    if (!item) return;

    state.history.push({
      recommendationId:item.id,
      title:item.title,
      owner:item.owner,
      expectedValue:item.expectedValue,
      status:"dismissed",
      createdAt:new Date().toISOString()
    });
    state.selectedId = null;
    save();
    buildRecommendations();
    render();
    byId("aiBrainDecisionStatus").textContent = "Recommendation dismissed.";
  }

  function openSource() {
    const item = selected();
    if (!item?.source) return;
    byId(item.source)?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function render() {
    renderKPIs();
    renderList();
    renderInspector();
    renderHistory();
    byId("aiBrainDecisionOrchestratorUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function refresh() {
    buildRecommendations();
    render();
  }

  function init() {
    if (!byId("aiBrainDecisionOrchestrator")) return;

    load();
    buildRecommendations();

    byId("aiBrainDecisionRefresh")?.addEventListener("click",refresh);
    byId("aiBrainDecisionCommit")?.addEventListener("click",commitSelected);
    byId("aiBrainDecisionOpenSource")?.addEventListener("click",openSource);
    byId("aiBrainDecisionDismiss")?.addEventListener("click",dismissSelected);
    byId("aiBrainDecisionClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      buildRecommendations();
      render();
    });

    [
      "bluecurrent:restaurant-ai-brain-answered",
      "bluecurrent:decision-outcome-recorded",
      "bluecurrent:executive-replay-session-saved",
      "bluecurrent:ai-brain-scenario-promoted"
    ].forEach(name => window.addEventListener(name,refresh));

    window.addEventListener("storage",event => {
      if ([ACCOUNTABILITY_KEY,ORCHESTRATOR_KEY].includes(event.key)) {
        load();
        refresh();
      }
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();