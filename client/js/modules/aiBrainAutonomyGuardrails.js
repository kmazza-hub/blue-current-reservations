(() => {
  "use strict";

  const POLICY_KEY = "blueCurrent.aiBrainAutonomyGuardrails.v34.1.3";
  const ORCHESTRATOR_KEY = "blueCurrent.aiBrainDecisionOrchestrator.v34.1.1";
  const ACCOUNTABILITY_KEY = "blueCurrent.executiveAccountabilityCenter.v34.0.14.6";
  const GOVERNOR_KEY = "blueCurrent.autonomyPerformanceGovernor.v34.1.5";
  const ROLLOUT_KEY = "blueCurrent.autonomyRolloutManager.v34.1.6";
  const INCIDENT_KEY = "blueCurrent.autonomyIncidentResponseCenter.v34.1.8";
  const byId = id => document.getElementById(id);

  const DEFAULT_POLICY = {
    mode:"supervised",
    maxValue:500,
    minConfidence:88,
    maxUrgency:"today",
    requireOwner:true,
    requireCheckpoint:true
  };

  const state = {
    policy:{...DEFAULT_POLICY},
    selected:null,
    evaluations:[],
    audit:[]
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(POLICY_KEY);
    state.policy = {...DEFAULT_POLICY,...(stored.policy || {})};
    state.audit = Array.isArray(stored.audit) ? stored.audit : [];
  }

  function save() {
    localStorage.setItem(POLICY_KEY,JSON.stringify({
      policy:state.policy,
      audit:state.audit.slice(-100),
      updatedAt:new Date().toISOString()
    }));
  }

  function urgencyRank(value) {
    return {monitor:1,today:2,immediate:3}[value] || 1;
  }

  function orchestratorRecommendations() {
    const cards = Array.from(
      document.querySelectorAll("#aiBrainDecisionRecommendationList .ai-brain-decision-recommendation")
    );

    return cards.map((card,index) => {
      const title = card.querySelector(".ai-brain-decision-copy strong")?.textContent || `Recommendation ${index+1}`;
      const summary = card.querySelector(".ai-brain-decision-copy span")?.textContent || "";
      const urgency = card.querySelector(".ai-brain-decision-badge")?.textContent?.trim().toLowerCase() || "monitor";
      const valueMatch = summary.match(/\$([\d,]+)/);
      const confidenceMatch = summary.match(/(\d+)% confidence/);
      const owner = summary.split("·")[0]?.trim() || "";
      return {
        id:`visible_${title.toLowerCase().replace(/[^a-z0-9]+/g,"_")}`,
        title,
        detail:summary,
        urgency,
        expectedValue:Number((valueMatch?.[1] || "0").replace(/,/g,"")),
        confidence:Number(confidenceMatch?.[1] || 0),
        owner,
        source:"aiBrainDecisionOrchestrator"
      };
    });
  }

  function evaluate(recommendation) {
    const p = state.policy;
    const governor = read(GOVERNOR_KEY);
    const rolloutState = read(ROLLOUT_KEY);
    const incidentState = read(INCIDENT_KEY);
    const reasons = [];

    const activeIncidents = Array.isArray(incidentState.incidents)
      ? incidentState.incidents.filter(item =>
          ["open","contained"].includes(item.status) &&
          item.severity === "critical"
        )
      : [];
    const incidentText = `${recommendation.title || ""} ${recommendation.detail || ""}`.toLowerCase();
    const incidentMatch = activeIncidents.find(item =>
      incidentText.includes(String(item.domain || "").toLowerCase())
    );
    if (incidentMatch) {
      return {result:"blocked",reason:`${incidentMatch.domain} autonomy is blocked by an active critical incident.`};
    }

    const rollouts = Array.isArray(rolloutState.rollouts) ? rolloutState.rollouts : [];
    const pausedRollouts = rollouts.filter(item => item.status === "paused");
    const recommendationText = `${recommendation.title || ""} ${recommendation.detail || ""}`.toLowerCase();
    const pausedMatch = pausedRollouts.find(item =>
      recommendationText.includes(String(item.domain || "").toLowerCase())
    );
    if (pausedMatch) {
      return {result:"blocked",reason:`${pausedMatch.domain} autonomy is paused by the Deployment Observatory.`};
    }

    if (rollouts.length && p.mode === "bounded") {
      const text = recommendationText;
      const matchingRollout = rollouts.find(item =>
        ["pilot","promoted"].includes(item.status) &&
        text.includes(String(item.domain || "").toLowerCase())
      );
      if (!matchingRollout) {
        return {result:"approval",reason:"Bounded execution requires an active rollout plan for this operating domain."};
      }
    }

    if (governor.emergencyStop) {
      return {result:"blocked",reason:"Emergency stop is active in the Autonomy Performance Governor."};
    }

    const suspendedDomains = Array.isArray(governor.suspendedDomains)
      ? governor.suspendedDomains
      : [];
    const domainText = `${recommendation.title || ""} ${recommendation.detail || ""}`.toLowerCase();
    const blockedDomain = suspendedDomains.find(domain =>
      domainText.includes(domain.toLowerCase())
    );
    if (blockedDomain) {
      return {result:"blocked",reason:`${blockedDomain} autonomy is suspended by the performance governor.`};
    }

    if (p.mode === "advisory") {
      return {result:"approval",reason:"Policy is advisory-only; every recommendation requires human approval."};
    }

    if (recommendation.expectedValue > Number(p.maxValue || 0)) {
      reasons.push(`Value $${recommendation.expectedValue.toLocaleString()} exceeds the $${Number(p.maxValue || 0).toLocaleString()} limit`);
    }

    if (recommendation.confidence < Number(p.minConfidence || 0)) {
      reasons.push(`Confidence ${recommendation.confidence}% is below the ${p.minConfidence}% threshold`);
    }

    if (urgencyRank(recommendation.urgency) > urgencyRank(p.maxUrgency)) {
      reasons.push(`${recommendation.urgency} urgency exceeds the allowed ${p.maxUrgency} level`);
    }

    if (p.requireOwner && !recommendation.owner) {
      reasons.push("No accountable owner is assigned");
    }

    if (reasons.length) {
      const blocked = reasons.length >= 2 || recommendation.urgency === "immediate";
      return {result:blocked ? "blocked" : "approval",reason:reasons.join("; ")};
    }

    return {
      result:p.mode === "bounded" ? "eligible" : "approval",
      reason:p.mode === "bounded"
        ? "Recommendation is within all automatic-execution guardrails."
        : "Recommendation is within policy, but supervised mode requires approval."
    };
  }

  function addAudit(action,detail) {
    state.audit.push({
      id:`autonomy_audit_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      action,
      detail,
      createdAt:new Date().toISOString()
    });
    save();
  }

  function readPolicyForm() {
    state.policy = {
      mode:byId("aiBrainAutonomyMode").value,
      maxValue:Number(byId("aiBrainAutonomyMaxValue").value || 0),
      minConfidence:Number(byId("aiBrainAutonomyMinConfidence").value || 0),
      maxUrgency:byId("aiBrainAutonomyMaxUrgency").value,
      requireOwner:byId("aiBrainAutonomyRequireOwner").checked,
      requireCheckpoint:byId("aiBrainAutonomyRequireCheckpoint").checked
    };
  }

  function renderPolicy() {
    byId("aiBrainAutonomyMode").value = state.policy.mode;
    byId("aiBrainAutonomyMaxValue").value = String(state.policy.maxValue);
    byId("aiBrainAutonomyMinConfidence").value = String(state.policy.minConfidence);
    byId("aiBrainAutonomyMaxUrgency").value = state.policy.maxUrgency;
    byId("aiBrainAutonomyRequireOwner").checked = state.policy.requireOwner;
    byId("aiBrainAutonomyRequireCheckpoint").checked = state.policy.requireCheckpoint;
    byId("aiBrainAutonomyValueThreshold").textContent =
      `$${Number(state.policy.maxValue).toLocaleString()}`;
    byId("aiBrainAutonomyConfidenceThreshold").textContent =
      `${state.policy.minConfidence}%`;
  }

  function reviewAll() {
    state.evaluations = orchestratorRecommendations().map(item => ({
      recommendation:item,
      ...evaluate(item)
    }));
  }

  function renderReview() {
    const root = byId("aiBrainAutonomyReviewList");
    root.replaceChildren();

    if (!state.evaluations.length) {
      const empty = document.createElement("div");
      empty.className = "ai-brain-autonomy-empty";
      empty.textContent = "No recommendations are currently available for policy review.";
      root.append(empty);
      return;
    }

    state.evaluations.forEach(entry => {
      const item = document.createElement("article");
      item.className = "ai-brain-autonomy-review-item";
      item.dataset.result = entry.result;
      item.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      item.querySelector("strong").textContent = entry.recommendation.title;
      item.querySelector("span").textContent = entry.reason;
      item.querySelector("b").textContent = entry.result;
      item.addEventListener("click",() => {
        state.selected = entry.recommendation;
        renderSelected();
      });
      root.append(item);
    });
  }

  function renderSelected() {
    const r = state.selected;
    const execute = byId("aiBrainAutonomyExecute");

    if (!r) {
      execute.disabled = true;
      return;
    }

    const result = evaluate(r);
    byId("aiBrainAutonomyDecisionTitle").textContent = r.title;
    byId("aiBrainAutonomyDecisionDetail").textContent = r.detail || "No additional detail.";
    byId("aiBrainAutonomyDecisionResult").textContent =
      result.result.charAt(0).toUpperCase()+result.result.slice(1);
    byId("aiBrainAutonomyDecisionReason").textContent = result.reason;
    execute.disabled = result.result !== "eligible";
  }

  function renderKPIs() {
    const eligible = state.evaluations.filter(x => x.result === "eligible").length;
    const approval = state.evaluations.filter(x => x.result === "approval").length;
    const blocked = state.evaluations.filter(x => x.result === "blocked").length;
    const executed = state.audit.filter(x => x.action === "Auto-executed").length;
    const confidence = Math.max(55,Math.min(97,
      68 + eligible*5 - blocked*3 + (state.policy.mode === "bounded" ? 8 : 3)
    ));

    byId("aiBrainAutonomyEligible").textContent = String(eligible);
    byId("aiBrainAutonomyApprovalRequired").textContent = String(approval);
    byId("aiBrainAutonomyBlocked").textContent = String(blocked);
    byId("aiBrainAutonomyExecuted").textContent = String(executed);
    byId("aiBrainAutonomyConfidence").textContent = `${confidence}%`;
    byId("aiBrainAutonomyScore").textContent = String(confidence);
    byId("aiBrainAutonomyLabel").textContent =
      state.policy.mode === "bounded" && confidence >= 85
        ? "Bounded autonomy ready"
        : state.policy.mode === "advisory"
          ? "Advisory-only controls"
          : "Supervised autonomy active";
    byId("aiBrainAutonomyScoreCard").dataset.tone =
      blocked ? "risk" : approval ? "watch" : "stable";
  }

  function renderAudit() {
    const root = byId("aiBrainAutonomyAuditList");
    root.replaceChildren();

    if (!state.audit.length) {
      const empty = document.createElement("div");
      empty.className = "ai-brain-autonomy-empty";
      empty.textContent = "Policy changes and autonomy decisions will appear here.";
      root.append(empty);
      return;
    }

    state.audit.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "ai-brain-autonomy-audit-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.action;
      item.querySelector("span").textContent = entry.detail;
      item.querySelector("time").textContent =
        new Date(entry.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
      root.append(item);
    });
  }

  function savePolicy() {
    readPolicyForm();
    addAudit(
      "Policy updated",
      `${state.policy.mode} mode · $${state.policy.maxValue.toLocaleString()} max value · ${state.policy.minConfidence}% minimum confidence.`
    );
    reviewAll();
    render();
    byId("aiBrainAutonomyPolicyStatus").textContent = "Autonomy policy saved.";
  }

  function resetPolicy() {
    state.policy = {...DEFAULT_POLICY};
    addAudit("Policy reset","Autonomy policy returned to supervised defaults.");
    reviewAll();
    render();
  }

  function evaluateSelected() {
    if (!state.selected) {
      const recommendations = orchestratorRecommendations();
      state.selected = recommendations[0] || null;
    }
    renderSelected();
    if (state.selected) {
      const result = evaluate(state.selected);
      addAudit(
        "Recommendation evaluated",
        `${state.selected.title}: ${result.result} — ${result.reason}`
      );
      renderAudit();
    }
  }

  function executeSelected() {
    if (!state.selected) return;
    const result = evaluate(state.selected);
    if (result.result !== "eligible") return;

    const accountability = read(ACCOUNTABILITY_KEY);
    const commitments = Array.isArray(accountability.commitments)
      ? accountability.commitments
      : [];
    const audit = Array.isArray(accountability.audit)
      ? accountability.audit
      : [];

    const priority = state.selected.urgency === "immediate" ? 1 :
      state.selected.urgency === "today" ? 2 : 3;
    const dueHours = priority === 1 ? 8 : priority === 2 ? 24 : 72;
    const commitmentId = `autonomy_commitment_${Date.now()}`;

    commitments.push({
      id:commitmentId,
      sourceId:`autonomy_${state.selected.id}`,
      title:state.selected.title,
      detail:state.selected.detail,
      priority,
      owner:state.selected.owner || "General Manager",
      dueAt:new Date(Date.now()+dueHours*3600000).toISOString(),
      expectedImpact:state.selected.expectedValue
        ? `Protect or recover approximately $${state.selected.expectedValue.toLocaleString()}`
        : "Complete the approved bounded-autonomy intervention",
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
      action:"Bounded-autonomy commitment created",
      detail:`${state.selected.title} auto-assigned to ${state.selected.owner || "General Manager"}.`,
      createdAt:new Date().toISOString()
    });

    localStorage.setItem(ACCOUNTABILITY_KEY,JSON.stringify({
      ...accountability,
      commitments,
      audit,
      selectedId:commitmentId,
      updatedAt:new Date().toISOString()
    }));

    addAudit(
      "Auto-executed",
      `${state.selected.title} was committed automatically within the saved guardrails.`
    );

    byId("aiBrainAutonomyStatus").textContent =
      "Recommendation executed within guardrails.";
    window.dispatchEvent(new CustomEvent("bluecurrent:ai-brain-autonomy-executed", {
      detail:{
        recommendation:state.selected,
        commitmentId,
        autonomyPolicySnapshot:{...state.policy}
      }
    }));

    state.selected = null;
    reviewAll();
    render();
  }

  function render() {
    renderPolicy();
    renderKPIs();
    renderReview();
    renderSelected();
    renderAudit();
    byId("aiBrainAutonomyUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function init() {
    if (!byId("aiBrainAutonomyGuardrails")) return;

    load();
    reviewAll();

    byId("aiBrainAutonomySavePolicy")?.addEventListener("click",savePolicy);
    byId("aiBrainAutonomyResetPolicy")?.addEventListener("click",resetPolicy);
    byId("aiBrainAutonomyEvaluate")?.addEventListener("click",evaluateSelected);
    byId("aiBrainAutonomyExecute")?.addEventListener("click",executeSelected);
    byId("aiBrainAutonomyRefresh")?.addEventListener("click",() => {
      reviewAll();
      render();
    });
    byId("aiBrainAutonomyClearAudit")?.addEventListener("click",() => {
      state.audit = [];
      save();
      renderAudit();
    });

    window.addEventListener("bluecurrent:ai-brain-recommendation-selected",event => {
      state.selected = event.detail?.recommendation || null;
      renderSelected();
    });
    window.addEventListener("bluecurrent:ai-brain-scenario-promoted",() => {
      setTimeout(() => {
        reviewAll();
        render();
      },0);
    });
    window.addEventListener("storage",event => {
      if ([POLICY_KEY,ORCHESTRATOR_KEY,ACCOUNTABILITY_KEY,GOVERNOR_KEY,ROLLOUT_KEY,INCIDENT_KEY].includes(event.key)) {
        load();
        reviewAll();
        render();
      }
    });

    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();