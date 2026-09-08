(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const HISTORY_KEY = "blueCurrentV3441SyncCenterHistory";

  const state = {
    serverVersions: [],
    reconciliation: null,
    auditReconciliation: null,
    history: [],
    refreshing: false
  };

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-120)));
  }

  function addHistory(action, detail, tone = "info") {
    state.history.push({
      id: `sync_history_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action,
      detail,
      tone,
      createdAt: new Date().toISOString()
    });
    saveHistory();
    renderHistory();
  }

  function cloudApi() {
    return window.BlueCurrentCloud || window.BlueCurrentCloudFoundation?.api || null;
  }

  function offlineSnapshot() {
    return window.BlueCurrentOfflineSync?.snapshot?.() || {
      online: navigator.onLine,
      queueDepth: 0,
      openConflicts: 0,
      queue: [],
      conflicts: [],
      history: [],
      metrics: {}
    };
  }

  function auditSnapshot() {
    return window.BlueCurrentAuditLedger?.snapshot?.() || {
      entries: 0,
      headHash: null,
      checkpoint: { status: "unavailable" },
      metrics: {}
    };
  }

  function score() {
    const offline = offlineSnapshot();
    const drift = state.reconciliation?.differences?.filter(item => item.status !== "aligned").length || 0;
    let value = 100;
    if (!navigator.onLine) value -= 30;
    value -= Math.min(25, offline.queueDepth * 5);
    value -= Math.min(30, offline.openConflicts * 10);
    value -= Math.min(20, drift * 4);
    const audit = auditSnapshot();
    if (audit.metrics?.integrityFailures) value -= 30;
    return Math.max(0, value);
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = String(value);
  }

  function formatTime(value) {
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function renderQueue() {
    const root = byId("syncControlQueueList");
    if (!root) return;
    root.replaceChildren();

    const snapshot = offlineSnapshot();
    if (!snapshot.queue?.length) {
      const empty = document.createElement("div");
      empty.className = "sync-control-empty";
      empty.textContent = "No local writes are waiting to synchronize.";
      root.append(empty);
      return;
    }

    snapshot.queue.forEach(item => {
      const article = document.createElement("article");
      article.className = "sync-control-item";
      article.innerHTML = `
        <div>
          <strong></strong>
          <span></span>
        </div>
        <div class="sync-control-item-actions">
          <b></b>
          <button type="button">Discard</button>
        </div>
      `;
      article.querySelector("strong").textContent = `${item.method} ${item.path}`;
      article.querySelector("span").textContent =
        `${item.entityType || "operation"} · ${item.status} · ${formatTime(item.createdAt)}`;
      article.querySelector("b").textContent = `${item.attempts || 0} attempts`;
      article.querySelector("button").addEventListener("click", () => {
        window.BlueCurrentOfflineSync?.discard?.(item.id);
        addHistory("Queued write discarded", `${item.method} ${item.path}`, "warning");
        render();
      });
      root.append(article);
    });
  }

  function renderConflicts() {
    const root = byId("syncControlConflictList");
    if (!root) return;
    root.replaceChildren();

    const snapshot = offlineSnapshot();
    const conflicts = (snapshot.conflicts || []).filter(item => item.status === "open");
    setText("syncControlConflictStatus",
      conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} require review` : "No open conflicts"
    );

    if (!conflicts.length) {
      const empty = document.createElement("div");
      empty.className = "sync-control-empty";
      empty.textContent = "No version conflicts require resolution.";
      root.append(empty);
      return;
    }

    conflicts.forEach(conflict => {
      const article = document.createElement("article");
      article.className = "sync-control-conflict";
      article.innerHTML = `
        <div>
          <strong></strong>
          <span></span>
          <p></p>
        </div>
        <div class="sync-control-conflict-actions">
          <button type="button" data-action="server">Keep server</button>
          <button type="button" data-action="local">Keep local</button>
        </div>
      `;
      article.querySelector("strong").textContent = `${conflict.entityType || "Resource"} conflict`;
      article.querySelector("span").textContent =
        `${conflict.path} · client ${conflict.baseVersion ?? "—"} · server ${conflict.serverVersion ?? "—"}`;
      article.querySelector("p").textContent = conflict.reason || "The resource changed after the local snapshot.";

      article.querySelector('[data-action="server"]').addEventListener("click", () => {
        window.BlueCurrentOfflineSync?.resolveConflict?.(conflict.id, "server-wins");
        addHistory("Conflict resolved", `Server state retained for ${conflict.path}.`, "stable");
        render();
      });
      article.querySelector('[data-action="local"]').addEventListener("click", () => {
        window.BlueCurrentOfflineSync?.resolveConflict?.(conflict.id, "local-wins");
        addHistory("Conflict resolved", `Local state queued against server version ${conflict.serverVersion ?? "unknown"}.`, "warning");
        render();
      });
      root.append(article);
    });
  }

  function renderVersions() {
    const root = byId("syncControlVersionList");
    if (!root) return;
    root.replaceChildren();

    if (!state.serverVersions.length) {
      const empty = document.createElement("div");
      empty.className = "sync-control-empty";
      empty.textContent = "Run reconciliation to load server resource versions.";
      root.append(empty);
      return;
    }

    state.serverVersions.slice(0, 20).forEach(item => {
      const article = document.createElement("article");
      article.className = "sync-control-version";
      article.innerHTML = "<div><strong></strong><span></span></div><b></b>";
      article.querySelector("strong").textContent = item.path || item.id;
      article.querySelector("span").textContent = item.entityId || "collection";
      article.querySelector("b").textContent = `v${item.version}`;
      root.append(article);
    });
  }

  function renderAudit() {
    const audit = auditSnapshot();
    setText("syncControlAuditLocal", audit.entries || 0);
    setText("syncControlAuditCloud",
      state.auditReconciliation?.cloudHead || audit.checkpoint?.cloudHead || "—"
    );
    setText("syncControlAuditStatus",
      state.auditReconciliation
        ? (state.auditReconciliation.missingOnClient?.length ? "Review required" : "Reconciled")
        : audit.checkpoint?.status || "Unverified"
    );
  }

  function renderHistory() {
    const root = byId("syncControlHistoryList");
    if (!root) return;
    root.replaceChildren();

    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "sync-control-empty";
      empty.textContent = "Synchronization and recovery actions will appear here.";
      root.append(empty);
      return;
    }

    state.history.slice().reverse().forEach(item => {
      const article = document.createElement("article");
      article.className = "sync-control-history-item";
      article.dataset.tone = item.tone || "info";
      article.innerHTML = "<div><strong></strong><span></span></div><time></time>";
      article.querySelector("strong").textContent = item.action;
      article.querySelector("span").textContent = item.detail;
      article.querySelector("time").textContent = formatTime(item.createdAt);
      root.append(article);
    });
  }

  function renderKPIs() {
    const offline = offlineSnapshot();
    const drift = state.reconciliation?.differences?.filter(item => item.status !== "aligned").length || 0;
    const value = score();

    setText("syncControlConnection", navigator.onLine ? "Online" : "Offline");
    setText("syncControlQueueCount", offline.queueDepth || 0);
    setText("syncControlConflictCount", offline.openConflicts || 0);
    setText("syncControlDriftCount", drift);
    setText("syncControlLastReconcile", formatTime(state.reconciliation?.reconciledAt));
    setText("syncControlScore", value);

    const label = value >= 90 ? "Healthy" : value >= 70 ? "Attention required" : "Recovery required";
    setText("syncControlLabel", label);
    const card = byId("syncControlScoreCard");
    if (card) card.dataset.tone = value >= 90 ? "stable" : value >= 70 ? "watch" : "risk";
  }

  function render() {
    renderKPIs();
    renderQueue();
    renderConflicts();
    renderVersions();
    renderAudit();
    renderHistory();
    setText("syncControlUpdated", `Updated ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date())}.`);
  }

  async function refreshServerVersions() {
    const api = cloudApi();
    if (!api?.syncVersions) throw new Error("Cloud synchronization API is unavailable.");
    const result = await api.syncVersions();
    state.serverVersions = Array.isArray(result.versions) ? result.versions : [];
    return result;
  }

  async function reconcile() {
    const api = cloudApi();
    if (!api?.reconcileSync) throw new Error("Cloud reconciliation API is unavailable.");
    const entries = state.serverVersions.map(item => ({
      key: item.id,
      path: item.path,
      entityId: item.entityId,
      version: item.version
    }));
    state.reconciliation = await api.reconcileSync(entries);
    state.serverVersions = state.reconciliation.serverVersions || state.serverVersions;
    addHistory(
      "Synchronization reconciled",
      `${state.reconciliation.aligned || 0} aligned · ${state.reconciliation.clientBehind || 0} client-behind · ${state.reconciliation.clientAhead || 0} client-ahead.`,
      state.reconciliation.clientBehind || state.reconciliation.clientAhead ? "warning" : "stable"
    );
    return state.reconciliation;
  }

  async function reconcileAudit() {
    const api = cloudApi();
    const ledger = window.BlueCurrentAuditLedger;
    if (!api?.reconcileAudit || !ledger) throw new Error("Audit reconciliation is unavailable.");

    const snapshot = ledger.snapshot();
    const entries = ledger.query?.({}) || [];
    state.auditReconciliation = await api.reconcileAudit(
      entries.map(item => item.payload?.cloudAuditId || item.id),
      snapshot.headHash
    );
    ledger.importCloudEntries?.(state.auditReconciliation.cloudEntries || []);
    ledger.reconcile?.({
      auditLogs: state.auditReconciliation.cloudEntries || [],
      headHash: state.auditReconciliation.cloudHead || null
    });
    addHistory(
      "Audit reconciled",
      `${state.auditReconciliation.missingOnClient?.length || 0} cloud records were missing locally.`,
      state.auditReconciliation.missingOnClient?.length ? "warning" : "stable"
    );
    return state.auditReconciliation;
  }

  async function withStatus(action, successMessage) {
    const message = byId("syncControlMessage");
    try {
      if (message) message.textContent = "Working…";
      await action();
      if (message) message.textContent = successMessage;
      render();
    } catch (error) {
      if (message) message.textContent = error.message;
      addHistory("Recovery action failed", error.message, "risk");
      render();
    }
  }

  function init() {
    if (!byId("syncControlCenter")) return;
    state.history = readHistory();

    byId("syncControlReplay")?.addEventListener("click", () =>
      withStatus(async () => {
        await window.BlueCurrentOfflineSync?.replay?.();
        await refreshServerVersions();
      }, "Queued writes replayed and server state refreshed.")
    );

    byId("syncControlRefresh")?.addEventListener("click", () =>
      withStatus(refreshServerVersions, "Server versions refreshed.")
    );

    byId("syncControlReconcile")?.addEventListener("click", () =>
      withStatus(async () => {
        await refreshServerVersions();
        await reconcile();
      }, "Synchronization reconciliation complete.")
    );

    byId("syncControlAuditReconcile")?.addEventListener("click", () =>
      withStatus(reconcileAudit, "Audit reconciliation complete.")
    );

    byId("syncControlVerifyAudit")?.addEventListener("click", () =>
      withStatus(async () => {
        const result = window.BlueCurrentAuditLedger?.verify?.();
        if (!result?.valid) throw new Error(`${result?.failures?.length || 0} audit integrity failures detected.`);
        addHistory("Audit ledger verified", `${result.entries} entries passed integrity verification.`, "stable");
      }, "Local audit ledger verified.")
    );

    byId("syncControlDownloadAudit")?.addEventListener("click", () => {
      const auditPackage = window.BlueCurrentAuditLedger?.download?.();
      if (auditPackage) addHistory("Audit package downloaded", auditPackage.packageId, "stable");
      render();
    });

    byId("syncControlClearHistory")?.addEventListener("click", () => {
      state.history = [];
      saveHistory();
      renderHistory();
    });

    [
      "bluecurrent:offline-queue-changed",
      "bluecurrent:offline-sync-complete",
      "bluecurrent:offline-conflict-created",
      "bluecurrent:offline-conflict-resolved",
      "bluecurrent:audit-verified",
      "bluecurrent:audit-reconciled",
      "online",
      "offline"
    ].forEach(name => window.addEventListener(name, render));

    render();
    if (window.BlueCurrentAuthSession?.snapshot?.().authenticated) {
      refreshServerVersions().then(render).catch(() => {});
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();