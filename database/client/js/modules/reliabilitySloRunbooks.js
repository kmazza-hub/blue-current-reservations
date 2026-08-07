(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const state = { evaluation: null, history: null, loading: false };

  function api() {
    return window.BlueCurrentCloud || window.BlueCurrentCloudFoundation?.api || null;
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = String(value);
  }

  function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString([], {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
  }

  function formatValue(item) {
    const value = Number(item.value);
    if (item.unit === "%") return `${value.toFixed(1)}%`;
    if (item.unit === "ms") return `${Math.round(value)} ms`;
    return `${value} ${item.unit || ""}`.trim();
  }

  function renderObjectives() {
    const root = byId("reliabilityObjectiveList");
    if (!root) return;
    root.replaceChildren();
    const objectives = state.evaluation?.objectives || [];

    if (!objectives.length) {
      const empty = document.createElement("div");
      empty.className = "reliability-empty";
      empty.textContent = "Service objectives will appear after evaluation.";
      root.append(empty);
      return;
    }

    objectives.forEach(item => {
      const article = document.createElement("article");
      article.className = "reliability-objective";
      article.dataset.tone = item.status;
      article.innerHTML = `
        <div>
          <strong></strong>
          <span></span>
        </div>
        <div class="reliability-objective-value">
          <b></b>
          <em></em>
        </div>`;
      article.querySelector("strong").textContent = item.name;
      article.querySelector("span").textContent =
        `${item.window} · target ${item.operator === "gte" ? "≥" : "≤"} ${item.target}${item.unit === "%" ? "%" : ` ${item.unit}`}`;
      article.querySelector("b").textContent = formatValue(item);
      article.querySelector("em").textContent = item.status;
      root.append(article);
    });
  }

  function renderRunbooks() {
    const root = byId("reliabilityRunbookList");
    if (!root) return;
    root.replaceChildren();
    const runbooks = state.evaluation?.runbooks || [];
    const objectiveByRunbook = new Map(
      (state.evaluation?.objectives || []).map(item => [item.runbookId, item])
    );

    if (!runbooks.length) {
      const empty = document.createElement("div");
      empty.className = "reliability-empty";
      empty.textContent = "No automated runbooks are available.";
      root.append(empty);
      return;
    }

    runbooks.forEach(runbook => {
      const objective = objectiveByRunbook.get(runbook.id);
      const article = document.createElement("article");
      article.className = "reliability-runbook";
      article.dataset.tone = objective?.status || "meeting";
      article.innerHTML = `
        <div>
          <strong></strong>
          <span></span>
          <ol></ol>
        </div>
        <div class="reliability-runbook-actions"></div>`;
      article.querySelector("strong").textContent = runbook.name;
      article.querySelector("span").textContent = runbook.trigger;
      const list = article.querySelector("ol");
      runbook.steps.slice(0, 3).forEach(step => {
        const li = document.createElement("li");
        li.textContent = step;
        list.append(li);
      });

      const actions = article.querySelector(".reliability-runbook-actions");
      runbook.safeActions.forEach(action => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.replaceAll("-", " ");
        button.addEventListener("click", () => executeRunbook(runbook.id, action));
        actions.append(button);
      });
      root.append(article);
    });
  }

  function renderHistory() {
    const root = byId("reliabilityHistoryList");
    if (!root) return;
    root.replaceChildren();
    const executions = state.history?.executions || [];

    if (!executions.length) {
      const empty = document.createElement("div");
      empty.className = "reliability-empty";
      empty.textContent = "Runbook executions will appear here.";
      root.append(empty);
      return;
    }

    executions.forEach(item => {
      const article = document.createElement("article");
      article.className = "reliability-history-item";
      article.dataset.tone = item.status === "complete" ? "meeting" : "warning";
      article.innerHTML = "<div><strong></strong><span></span></div><div><b></b><time></time></div>";
      article.querySelector("strong").textContent = item.runbookName;
      article.querySelector("span").textContent =
        `${item.action.replaceAll("-", " ")} · ${item.actor || "system"}`;
      article.querySelector("b").textContent = item.status;
      article.querySelector("time").textContent = formatTime(item.createdAt);
      root.append(article);
    });
  }

  function render() {
    const evaluation = state.evaluation;
    if (!evaluation) return;

    setText("reliabilityScore", evaluation.score);
    setText("reliabilityStatus",
      evaluation.status === "meeting"
        ? "Meeting objectives"
        : evaluation.status === "warning"
          ? "Approaching limits"
          : "Objectives breached"
    );
    const card = byId("reliabilityScoreCard");
    if (card) card.dataset.tone = evaluation.status;

    const meeting = evaluation.objectives.filter(item => item.status === "meeting").length;
    setText("reliabilityMeeting", meeting);
    setText("reliabilityWarnings", evaluation.warning);
    setText("reliabilityBreaches", evaluation.breached);
    setText("reliabilityErrorBudget", `${evaluation.errorBudgetRemaining}%`);
    setText("reliabilityExecutionCount", state.history?.executions?.length || 0);
    setText("reliabilityUpdated", `Evaluated ${formatTime(evaluation.evaluatedAt)}.`);
    renderObjectives();
    renderRunbooks();
    renderHistory();
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    try {
      const client = api();
      if (!client?.reliabilitySloSnapshot) throw new Error("Reliability API is unavailable.");
      const [evaluation, history] = await Promise.all([
        client.reliabilitySloSnapshot(),
        client.reliabilityHistory()
      ]);
      state.evaluation = evaluation;
      state.history = history;
      render();
      setText("reliabilityMessage", "Reliability evaluation complete.");
    } catch (error) {
      setText("reliabilityMessage", error.message);
    } finally {
      state.loading = false;
    }
  }

  async function executeRunbook(runbookId, action) {
    const client = api();
    if (!client?.executeReliabilityRunbook) return;
    try {
      setText("reliabilityMessage", `Executing ${action.replaceAll("-", " ")}…`);
      await client.executeReliabilityRunbook(runbookId, { action });
      setText("reliabilityMessage", "Runbook action completed.");
      await refresh();
    } catch (error) {
      setText("reliabilityMessage", error.message);
    }
  }

  function init() {
    if (!byId("reliabilityCommandCenter")) return;
    byId("reliabilityRefresh")?.addEventListener("click", refresh);
    byId("reliabilityRefreshHistory")?.addEventListener("click", refresh);
    [
      "bluecurrent:reliability-slo-evaluated",
      "bluecurrent:reliability-slo-breached",
      "bluecurrent:reliability-runbook-executed",
      "bluecurrent:observability-incident-created",
      "bluecurrent:observability-incident-updated"
    ].forEach(name => window.addEventListener(name, refresh));
    refresh();
    setInterval(refresh, 60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();