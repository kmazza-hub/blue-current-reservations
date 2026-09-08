(() => {
  "use strict";

  const OUTCOME_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const GUARDRAIL_KEY = "blueCurrent.aiBrainAutonomyGuardrails.v34.1.3";
  const STORAGE_KEY = "blueCurrent.autonomyPerformanceGovernor.v34.1.5";
  const byId = id => document.getElementById(id);

  const DOMAINS = [
    {id:"staffing",label:"Staffing",keywords:["staff","labor","workforce","coverage"]},
    {id:"kitchen",label:"Kitchen",keywords:["kitchen","ticket","station","expo"]},
    {id:"floor",label:"Floor",keywords:["floor","table","section","seating"]},
    {id:"demand",label:"Demand",keywords:["demand","reservation","pacing","arrival"]},
    {id:"recovery",label:"Executive recovery",keywords:["recovery","overdue","commitment","accountability"]}
  ];

  const state = {
    audit:[],
    emergencyStop:false,
    suspendedDomains:[]
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.audit = Array.isArray(stored.audit) ? stored.audit : [];
    state.emergencyStop = Boolean(stored.emergencyStop);
    state.suspendedDomains = Array.isArray(stored.suspendedDomains)
      ? stored.suspendedDomains
      : [];
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      audit:state.audit.slice(-100),
      emergencyStop:state.emergencyStop,
      suspendedDomains:state.suspendedDomains,
      updatedAt:new Date().toISOString()
    }));
  }

  function outcomes() {
    const stored = read(OUTCOME_KEY);
    return Array.isArray(stored.history) ? stored.history : [];
  }

  function classifyDomain(item) {
    const text = `${item.title || ""} ${item.note || ""}`.toLowerCase();
    return DOMAINS.find(domain =>
      domain.keywords.some(keyword => text.includes(keyword))
    )?.id || "recovery";
  }

  function metrics() {
    const records = outcomes();
    const successful = records.filter(item => item.classification === "successful").length;
    const partial = records.filter(item => item.classification === "partial").length;
    const failed = records.filter(item => item.classification === "underperformed").length;
    const weightedSuccess = records.length
      ? Math.round((successful + partial*.5)/records.length*100)
      : 0;

    const expected = records.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
    const observed = records.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
    const delivery = expected
      ? Math.max(0,Math.min(150,Math.round(observed/expected*100)))
      : weightedSuccess;

    const trust = records.length
      ? Math.max(0,Math.min(100,Math.round(weightedSuccess*.55 + Math.min(100,delivery)*.45)))
      : 0;

    const domainStats = DOMAINS.map(domain => {
      const items = records.filter(item => classifyDomain(item) === domain.id);
      const wins = items.filter(item => item.classification === "successful").length;
      const losses = items.filter(item => item.classification === "underperformed").length;
      const score = items.length
        ? Math.max(0,Math.min(100,Math.round((wins + (items.length-wins-losses)*.5)/items.length*100)))
        : null;
      return {...domain,items,wins,losses,score};
    });

    const failedValue = records
      .filter(item => item.classification === "underperformed")
      .reduce((sum,item) => sum+Number(item.expectedValue || 0),0);

    return {records,successful,partial,failed,weightedSuccess,delivery,trust,domainStats,failedValue};
  }

  function recommendation(data) {
    if (!data.records.length) {
      return {
        mode:"supervised",
        confidenceFloor:88,
        maxValue:500,
        reviewWindow:"Next 3 outcomes",
        title:"Maintain supervised autonomy",
        detail:"More verified outcomes are required before expanding or restricting autonomy."
      };
    }

    if (data.trust >= 85 && data.failed === 0) {
      return {
        mode:"bounded",
        confidenceFloor:82,
        maxValue:Math.max(500,Math.min(2500,Math.round(data.delivery*10/50)*50)),
        reviewWindow:"Every 5 outcomes",
        title:"Expand bounded autonomy carefully",
        detail:"Verified outcomes show strong value delivery and no recent underperformance."
      };
    }

    if (data.trust >= 65 && data.failed <= 1) {
      return {
        mode:"supervised",
        confidenceFloor:90,
        maxValue:500,
        reviewWindow:"Next 3 outcomes",
        title:"Keep autonomy supervised",
        detail:"Performance is acceptable, but human approval should remain in the loop."
      };
    }

    return {
      mode:"advisory",
      confidenceFloor:95,
      maxValue:250,
      reviewWindow:"After corrective review",
      title:"Roll back automatic execution",
      detail:"Underperformance or weak value delivery requires tighter controls and domain-level suspension."
    };
  }

  function domainStatus(domain,data) {
    if (state.emergencyStop) return "suspended";
    if (state.suspendedDomains.includes(domain.label)) return "suspended";
    if (domain.score === null) return "supervised";
    if (domain.score >= 80 && data.trust >= 75) return "active";
    if (domain.score < 50) return "suspended";
    return "supervised";
  }

  function renderDomains(data) {
    const root = byId("autonomyPerformanceDomainList");
    root.replaceChildren();

    data.domainStats.forEach(domain => {
      const status = domainStatus(domain,data);
      const item = document.createElement("article");
      item.className = "autonomy-performance-domain-item";
      item.dataset.status = status;
      item.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      item.querySelector("strong").textContent = domain.label;
      item.querySelector("span").textContent =
        domain.score === null
          ? "No verified outcomes yet."
          : `${domain.items.length} outcomes · ${domain.score}% weighted success · ${domain.losses} underperformed.`;
      item.querySelector("b").textContent = status;
      root.append(item);
    });
  }

  function renderRollback(data,rec) {
    const root = byId("autonomyPerformanceRollbackList");
    root.replaceChildren();
    const items = [];

    data.domainStats
      .filter(domain => domain.score !== null && domain.score < 50)
      .forEach(domain => items.push({
        title:`Suspend ${domain.label} autonomy`,
        detail:`Weighted success is ${domain.score}%. Require manual approval until two successful verified outcomes are recorded.`,
        level:"domain"
      }));

    if (data.failed >= 2) {
      items.push({
        title:"Review recent autonomous failures",
        detail:`${data.failed} autonomous actions underperformed. Compare expected versus observed value and correct the decision criteria.`,
        level:"system"
      });
    }

    if (rec.mode === "advisory") {
      items.push({
        title:"Disable automatic execution temporarily",
        detail:"Move all autonomy to advisory mode until corrective review is complete.",
        level:"critical"
      });
    }

    if (!items.length) {
      items.push({
        title:"No rollback required",
        detail:"Current verified performance does not require a corrective autonomy intervention.",
        level:"stable"
      });
    }

    items.forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-performance-rollback-item";
      item.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      item.querySelector("strong").textContent = entry.title;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("b").textContent = entry.level;
      root.append(item);
    });

    byId("autonomyPerformanceRollbackLabel").textContent =
      `${items.length} recommendation${items.length === 1 ? "" : "s"}`;
  }

  function addAudit(action,detail) {
    state.audit.push({
      id:`governor_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
    save();
  }

  function renderAudit() {
    const root = byId("autonomyPerformanceAuditList");
    root.replaceChildren();

    if (!state.audit.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-performance-empty";
      empty.textContent = "Governor policy changes and interventions will appear here.";
      root.append(empty);
      return;
    }

    state.audit.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-performance-audit-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(item);
    });
  }

  function render() {
    const data = metrics();
    const rec = recommendation(data);

    const suspended = data.domainStats.filter(domain =>
      domainStatus(domain,data) === "suspended"
    ).length;
    const active = data.domainStats.filter(domain =>
      domainStatus(domain,data) === "active"
    ).length;

    byId("autonomyPerformanceGovernorScore").textContent = String(data.trust);
    byId("autonomyPerformanceGovernorLabel").textContent =
      state.emergencyStop ? "Emergency stop active" :
      data.trust >= 85 ? "High-trust autonomy" :
      data.trust >= 65 ? "Controlled autonomy" :
      data.trust > 0 ? "Rollback recommended" : "Awaiting outcomes";
    byId("autonomyPerformanceGovernorScoreCard").dataset.tone =
      state.emergencyStop || (data.trust > 0 && data.trust < 65)
        ? "risk"
        : data.trust < 85
          ? "watch"
          : "stable";

    byId("autonomyPerformanceTrustBand").textContent =
      data.trust >= 85 ? "High" : data.trust >= 65 ? "Controlled" : data.trust > 0 ? "Restricted" : "Unrated";
    byId("autonomyPerformanceActiveDomains").textContent = String(active);
    byId("autonomyPerformanceSuspendedDomains").textContent = String(suspended);
    byId("autonomyPerformanceRollbackCount").textContent =
      String(state.audit.filter(item =>
        item.action.includes("Rollback") ||
        item.action.includes("Emergency") ||
        item.action.includes("suspended")
      ).length);
    byId("autonomyPerformanceProtectedValue").textContent =
      `$${data.failedValue.toLocaleString()}`;

    byId("autonomyPerformanceDecisionTitle").textContent = rec.title;
    byId("autonomyPerformanceDecisionDetail").textContent = rec.detail;
    byId("autonomyPerformanceRecommendedMode").textContent =
      rec.mode.charAt(0).toUpperCase()+rec.mode.slice(1);
    byId("autonomyPerformanceConfidenceFloor").textContent =
      `${rec.confidenceFloor}%`;
    byId("autonomyPerformanceMaxValue").textContent =
      `$${rec.maxValue.toLocaleString()}`;
    byId("autonomyPerformanceReviewWindow").textContent = rec.reviewWindow;

    renderDomains(data);
    renderRollback(data,rec);
    renderAudit();

    byId("autonomyPerformanceGovernorUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function applyPolicy() {
    const data = metrics();
    const rec = recommendation(data);
    const guardrails = read(GUARDRAIL_KEY);
    const policy = {
      ...(guardrails.policy || {}),
      mode:rec.mode,
      minConfidence:rec.confidenceFloor,
      maxValue:rec.maxValue
    };

    state.suspendedDomains = data.domainStats
      .filter(domain => domain.score !== null && domain.score < 50)
      .map(domain => domain.label);

    localStorage.setItem(GUARDRAIL_KEY,JSON.stringify({
      ...guardrails,
      policy,
      updatedAt:new Date().toISOString()
    }));

    addAudit(
      "Governor policy applied",
      `${rec.mode} mode · ${rec.confidenceFloor}% confidence floor · $${rec.maxValue.toLocaleString()} maximum value · ${state.suspendedDomains.length} suspended domains.`
    );
    save();
    render();
    byId("autonomyPerformanceStatus").textContent = "Governor policy applied.";
    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-governor-policy-applied", {
      detail:{policy,suspendedDomains:state.suspendedDomains}
    }));
  }

  function emergencyStop() {
    state.emergencyStop = !state.emergencyStop;
    if (state.emergencyStop) {
      const guardrails = read(GUARDRAIL_KEY);
      localStorage.setItem(GUARDRAIL_KEY,JSON.stringify({
        ...guardrails,
        policy:{...(guardrails.policy || {}),mode:"advisory"},
        updatedAt:new Date().toISOString()
      }));
      addAudit("Emergency stop activated","All automatic execution was blocked and the autonomy policy moved to advisory mode.");
    } else {
      addAudit("Emergency stop released","Automatic execution may resume subject to the saved governor and guardrail policies.");
    }
    save();
    render();
    byId("autonomyPerformanceStatus").textContent =
      state.emergencyStop ? "Emergency stop activated." : "Emergency stop released.";
  }

  function init() {
    if (!byId("autonomyPerformanceGovernor")) return;

    load();
    byId("autonomyPerformanceRefresh")?.addEventListener("click",render);
    byId("autonomyPerformanceApply")?.addEventListener("click",applyPolicy);
    byId("autonomyPerformanceEmergencyStop")?.addEventListener("click",emergencyStop);
    byId("autonomyPerformanceClearAudit")?.addEventListener("click",() => {
      state.audit = [];
      save();
      renderAudit();
    });

    window.addEventListener("bluecurrent:autonomy-outcome-verified",render);
    window.addEventListener("storage",event => {
      if ([OUTCOME_KEY,GUARDRAIL_KEY,STORAGE_KEY].includes(event.key)) {
        load();
        render();
      }
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();