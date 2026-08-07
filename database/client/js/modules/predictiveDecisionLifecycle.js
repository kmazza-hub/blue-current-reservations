(() => {
  "use strict";

  const BRIDGE_KEY = "blueCurrent.predictiveDecisionBridge.v34.0.13.5";
  const DECISION_KEY = "blueCurrent.executiveDecisionCenter.v34.0.11";
  const OUTCOME_KEY = "blueCurrent.decisionOutcomeTracker.v34.0.12";
  const byId = id => document.getElementById(id);

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  function currentRecord() {
    const bridge = read(BRIDGE_KEY);
    if (!bridge.decisionId) return null;

    const decisionState = read(DECISION_KEY);
    const decisions = Array.isArray(decisionState.decisions)
      ? decisionState.decisions
      : [];
    const decision = decisions.find(item => item.id === bridge.decisionId);
    if (!decision) return null;

    const outcomeState = read(OUTCOME_KEY);
    const outcomes = Array.isArray(outcomeState.outcomes)
      ? outcomeState.outcomes
      : [];
    const outcome = outcomes.find(item => item.decisionId === decision.id);

    return {decision,outcome};
  }

  function displayStatus(record) {
    if (record.outcome?.status === "measured") return "measured";
    return record.decision.status || "open";
  }

  function render() {
    const root = byId("predictiveDecisionLifecycle");
    if (!root) return;

    const record = currentRecord();
    if (!record) {
      root.hidden = true;
      return;
    }

    root.hidden = false;

    const status = displayStatus(record);
    const statusBadge = byId("predictiveDecisionLifecycleStatus");
    statusBadge.dataset.status = status;
    statusBadge.textContent =
      status === "completed" ? "Approved" :
      status === "measured" ? "Measured" :
      status.charAt(0).toUpperCase() + status.slice(1);

    byId("predictiveDecisionLifecycleTitle").textContent =
      record.decision.title || "Executive decision";

    byId("predictiveDecisionLifecycleDetail").textContent =
      status === "open"
        ? "Waiting for executive review."
        : status === "completed"
          ? "Approved and waiting for outcome measurement."
          : status === "measured"
            ? `Outcome recorded: $${Number(record.outcome.observedValue || 0).toLocaleString()} observed value.`
            : status === "dismissed"
              ? "The recommendation was dismissed."
              : "Decision lifecycle updated.";
  }

  function openDecision() {
    const record = currentRecord();
    if (!record) return;

    const decisionState = read(DECISION_KEY);
    decisionState.selectedId = record.decision.id;
    localStorage.setItem(DECISION_KEY, JSON.stringify(decisionState));

    byId("executiveDecisionCenter")?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }

  function init() {
    if (!byId("predictiveDecisionLifecycle")) return;

    byId("predictiveDecisionLifecycleOpen")?.addEventListener("click",openDecision);

    [
      "bluecurrent:predictive-decision-created",
      "bluecurrent:executive-decision-approved",
      "bluecurrent:decision-outcome-recorded"
    ].forEach(name => window.addEventListener(name,render));

    window.addEventListener("storage",event => {
      if ([BRIDGE_KEY,DECISION_KEY,OUTCOME_KEY].includes(event.key)) render();
    });

    render();
    setInterval(render,5000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();