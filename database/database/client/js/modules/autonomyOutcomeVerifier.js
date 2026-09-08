(() => {
  "use strict";

  const ACCOUNTABILITY_KEY = "blueCurrent.executiveAccountabilityCenter.v34.0.14.6";
  const GUARDRAIL_KEY = "blueCurrent.aiBrainAutonomyGuardrails.v34.1.3";
  const STORAGE_KEY = "blueCurrent.autonomyOutcomeVerifier.v34.1.4";
  const byId = id => document.getElementById(id);

  const state = {
    selectedId:null,
    history:[],
    executed:[]
  };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function load() {
    const stored = read(STORAGE_KEY);
    state.history = Array.isArray(stored.history) ? stored.history : [];
    state.selectedId = stored.selectedId || null;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY,JSON.stringify({
      history:state.history.slice(-100),
      selectedId:state.selectedId,
      updatedAt:new Date().toISOString()
    }));
  }

  function executedCommitments() {
    const accountability = read(ACCOUNTABILITY_KEY);
    const commitments = Array.isArray(accountability.commitments)
      ? accountability.commitments
      : [];

    const verifiedIds = new Set(state.history.map(item => item.commitmentId));

    return commitments
      .filter(item =>
        String(item.sourceId || "").startsWith("autonomy_") ||
        String(item.id || "").startsWith("autonomy_commitment_")
      )
      .map(item => ({
        ...item,
        expectedValue:Number(
          String(item.expectedImpact || "").match(/\$([\d,]+)/)?.[1]?.replace(/,/g,"") || 0
        ),
        isVerified:verifiedIds.has(item.id)
      }));
  }

  function selected() {
    return state.executed.find(item => item.id === state.selectedId) || null;
  }

  function tone(item) {
    if (item.isVerified) return "stable";
    const due = new Date(item.dueAt || 0).getTime();
    if (due && due < Date.now()) return "risk";
    if (due && due-Date.now() <= 24*3600000) return "watch";
    return "stable";
  }

  function renderQueue() {
    const root = byId("autonomyOutcomeQueueList");
    root.replaceChildren();

    if (!state.executed.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-outcome-empty";
      empty.textContent = "No bounded-autonomy commitments are available for verification.";
      root.append(empty);
      return;
    }

    state.executed.forEach((item,index) => {
      const card = document.createElement("article");
      card.className = "autonomy-outcome-queue-item";
      card.dataset.tone = tone(item);
      card.classList.toggle("is-selected",item.id === state.selectedId);
      card.innerHTML =
        "<span class='autonomy-outcome-rank'></span>" +
        "<div class='autonomy-outcome-copy'><strong></strong><span></span></div>" +
        "<span class='autonomy-outcome-badge'></span>";

      card.querySelector(".autonomy-outcome-rank").textContent = String(index+1);
      card.querySelector(".autonomy-outcome-copy strong").textContent = item.title;
      card.querySelector(".autonomy-outcome-copy span").textContent =
        `${item.owner || "General Manager"} · Expected $${item.expectedValue.toLocaleString()} · ${item.status}`;
      card.querySelector(".autonomy-outcome-badge").textContent =
        item.isVerified ? "verified" : "pending";

      card.addEventListener("click",() => {
        state.selectedId = item.id;
        save();
        render();
      });

      root.append(card);
    });
  }

  function renderEditor() {
    const item = selected();
    const controls = [
      "autonomyOutcomeObservedValue",
      "autonomyOutcomeClassification",
      "autonomyOutcomeNote",
      "autonomyOutcomeVerify",
      "autonomyOutcomeOpenCommitment"
    ];

    controls.forEach(id => byId(id).disabled = !item);

    if (!item) {
      byId("autonomyOutcomeSelectedTitle").textContent = "Choose an action";
      byId("autonomyOutcomeSelectedDetail").textContent =
        "Select an auto-executed commitment to record the observed result and verify whether the intervention worked.";
      return;
    }

    const existing = state.history.find(entry => entry.commitmentId === item.id);
    byId("autonomyOutcomeSelectedTitle").textContent = item.title;
    byId("autonomyOutcomeSelectedDetail").textContent =
      `${item.detail || "Autonomous commitment"} Expected value: $${item.expectedValue.toLocaleString()}.`;
    byId("autonomyOutcomeObservedValue").value =
      existing ? String(existing.observedValue) : "";
    byId("autonomyOutcomeClassification").value =
      existing?.classification || "successful";
    byId("autonomyOutcomeNote").value = existing?.note || "";
    byId("autonomyOutcomeVerify").disabled = Boolean(existing);
  }

  function verifyOutcome() {
    const item = selected();
    if (!item) return;

    const observedValue = Number(byId("autonomyOutcomeObservedValue").value || 0);
    const classification = byId("autonomyOutcomeClassification").value;
    const note = byId("autonomyOutcomeNote").value.trim();

    const record = {
      id:`autonomy_outcome_${Date.now()}`,
      commitmentId:item.id,
      title:item.title,
      expectedValue:item.expectedValue,
      observedValue,
      classification,
      note,
      owner:item.owner || "General Manager",
      recordedAt:new Date().toISOString()
    };

    state.history.push(record);

    const accountability = read(ACCOUNTABILITY_KEY);
    const commitments = Array.isArray(accountability.commitments)
      ? accountability.commitments
      : [];
    const target = commitments.find(commitment => commitment.id === item.id);

    if (target) {
      target.status = "verified";
      target.verifiedAt = record.recordedAt;
      target.verifiedResult =
        note || `${classification}: $${observedValue.toLocaleString()} observed value.`;
    }

    const audit = Array.isArray(accountability.audit)
      ? accountability.audit
      : [];
    audit.push({
      id:`audit_${Date.now()}`,
      commitmentId:item.id,
      action:"Autonomous outcome verified",
      detail:`${item.title}: ${classification}, $${observedValue.toLocaleString()} observed.`,
      createdAt:record.recordedAt
    });

    localStorage.setItem(ACCOUNTABILITY_KEY,JSON.stringify({
      ...accountability,
      commitments,
      audit,
      updatedAt:record.recordedAt
    }));

    save();
    refresh();
    byId("autonomyOutcomeStatus").textContent = "Autonomous outcome verified.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-outcome-verified", {
      detail:{record}
    }));
  }

  function recommendations() {
    const count = state.history.length;
    if (!count) {
      return {
        successRate:0,
        valueDelivery:0,
        confidenceFloor:88,
        maxValue:500,
        trustScore:0
      };
    }

    const successful = state.history.filter(item => item.classification === "successful").length;
    const partial = state.history.filter(item => item.classification === "partial").length;
    const successRate = Math.round((successful + partial*.5)/count*100);

    const expected = state.history.reduce((sum,item) => sum+Number(item.expectedValue || 0),0);
    const observed = state.history.reduce((sum,item) => sum+Number(item.observedValue || 0),0);
    const valueDelivery = expected > 0
      ? Math.max(0,Math.min(150,Math.round(observed/expected*100)))
      : successRate;

    const trustScore = Math.max(0,Math.min(100,
      Math.round(successRate*.55 + Math.min(100,valueDelivery)*.45)
    ));

    const confidenceFloor = trustScore >= 85 ? 82 :
      trustScore >= 70 ? 88 : trustScore >= 50 ? 92 : 95;

    const avgSuccessfulValue = successful
      ? Math.round(
          state.history
            .filter(item => item.classification === "successful")
            .reduce((sum,item) => sum+Number(item.observedValue || 0),0) /
          successful
        )
      : 250;

    const maxValue = trustScore >= 85
      ? Math.max(500,Math.min(2500,Math.round(avgSuccessfulValue/50)*50))
      : trustScore >= 70 ? 500 : 250;

    return {
      successRate,
      valueDelivery,
      confidenceFloor,
      maxValue,
      trustScore
    };
  }

  function renderTrust() {
    const r = recommendations();
    const validated = state.history.filter(item => item.classification === "successful").length;
    const underperformed = state.history.filter(item => item.classification === "underperformed").length;
    const observed = state.history.reduce((sum,item) => sum+Number(item.observedValue || 0),0);

    byId("autonomyOutcomeExecutedCount").textContent = String(state.executed.length);
    byId("autonomyOutcomePendingCount").textContent =
      String(state.executed.filter(item => !item.isVerified).length);
    byId("autonomyOutcomeValidatedCount").textContent = String(validated);
    byId("autonomyOutcomeUnderperformedCount").textContent = String(underperformed);
    byId("autonomyOutcomeVerifiedValue").textContent = `$${observed.toLocaleString()}`;

    byId("autonomyOutcomeSuccessRate").textContent = `${r.successRate}%`;
    byId("autonomyOutcomeValueDelivery").textContent = `${r.valueDelivery}%`;
    byId("autonomyOutcomeRecommendedConfidence").textContent = `${r.confidenceFloor}%`;
    byId("autonomyOutcomeRecommendedMaxValue").textContent = `$${r.maxValue.toLocaleString()}`;

    byId("autonomyOutcomeVerifierScore").textContent = String(r.trustScore);
    byId("autonomyOutcomeVerifierLabel").textContent =
      r.trustScore >= 85 ? "High-trust autonomy" :
      r.trustScore >= 70 ? "Controlled autonomy" :
      r.trustScore > 0 ? "Tighten guardrails" : "Awaiting outcomes";
    byId("autonomyOutcomeVerifierScoreCard").dataset.tone =
      r.trustScore >= 85 ? "stable" :
      r.trustScore >= 70 ? "watch" :
      r.trustScore > 0 ? "risk" : "watch";

    byId("autonomyOutcomeTrustLabel").textContent =
      state.history.length
        ? `${state.history.length} verified outcome${state.history.length === 1 ? "" : "s"}`
        : "No verified history";

    byId("autonomyOutcomeTrustSummary").textContent =
      state.history.length
        ? `Autonomous actions delivered ${r.valueDelivery}% of expected value with a ${r.successRate}% weighted success rate. Recommended guardrails are ${r.confidenceFloor}% minimum confidence and $${r.maxValue.toLocaleString()} maximum automatic value.`
        : "Verified autonomous outcomes will calibrate the recommended confidence and value limits.";

    byId("autonomyOutcomeApplyRecommendations").disabled = !state.history.length;
  }

  function renderHistory() {
    const root = byId("autonomyOutcomeHistoryList");
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "autonomy-outcome-empty";
      empty.textContent = "Verified autonomous outcomes will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("article");
      item.className = "autonomy-outcome-history-item";
      item.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      item.querySelector("strong").textContent = entry.title;
      item.querySelector("span").textContent =
        `${entry.classification} · $${Number(entry.observedValue || 0).toLocaleString()} observed vs $${Number(entry.expectedValue || 0).toLocaleString()} expected`;
      item.querySelector("time").textContent =
        new Date(entry.recordedAt).toLocaleTimeString([], {
          hour:"numeric",
          minute:"2-digit"
        });
      root.append(item);
    });
  }

  function applyRecommendations() {
    const r = recommendations();
    const guardrails = read(GUARDRAIL_KEY);
    const policy = {
      ...(guardrails.policy || {}),
      minConfidence:r.confidenceFloor,
      maxValue:r.maxValue
    };

    localStorage.setItem(GUARDRAIL_KEY,JSON.stringify({
      ...guardrails,
      policy,
      updatedAt:new Date().toISOString()
    }));

    byId("autonomyOutcomeStatus").textContent =
      "Recommended autonomy guardrails applied.";

    window.dispatchEvent(new CustomEvent("bluecurrent:autonomy-guardrails-recommended", {
      detail:{policy}
    }));
  }

  function openCommitment() {
    byId("executiveAccountabilityCenter")?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  function refresh() {
    state.executed = executedCommitments();
    if (state.selectedId && !state.executed.some(item => item.id === state.selectedId)) {
      state.selectedId = null;
    }
    render();
  }

  function render() {
    renderQueue();
    renderEditor();
    renderTrust();
    renderHistory();
    byId("autonomyOutcomeVerifierUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}.`;
  }

  function init() {
    if (!byId("autonomyOutcomeVerifier")) return;

    load();
    byId("autonomyOutcomeRefresh")?.addEventListener("click",refresh);
    byId("autonomyOutcomeVerify")?.addEventListener("click",verifyOutcome);
    byId("autonomyOutcomeOpenCommitment")?.addEventListener("click",openCommitment);
    byId("autonomyOutcomeApplyRecommendations")?.addEventListener("click",applyRecommendations);
    byId("autonomyOutcomeClearHistory")?.addEventListener("click",() => {
      state.history = [];
      save();
      refresh();
    });

    window.addEventListener("bluecurrent:ai-brain-autonomy-executed",() => {
      setTimeout(refresh,0);
    });
    window.addEventListener("storage",event => {
      if ([ACCOUNTABILITY_KEY,GUARDRAIL_KEY,STORAGE_KEY].includes(event.key)) {
        load();
        refresh();
      }
    });

    refresh();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();