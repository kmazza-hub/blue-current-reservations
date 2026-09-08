(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const state = { snapshot: null, loading: false };

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
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit"
    });
  }

  function healthScore(snapshot) {
    if (!snapshot) return 0;
    let score = 100;
    score -= Math.min(35, snapshot.requests.serverErrors * 8);
    score -= Math.min(20, snapshot.requests.clientErrors * 0.5);
    score -= Math.min(25, snapshot.incidents.critical * 15);
    score -= Math.min(20, snapshot.incidents.open * 4);
    if (snapshot.requests.p95LatencyMs > 1500) score -= 20;
    else if (snapshot.requests.p95LatencyMs > 800) score -= 10;
    return Math.max(0, Math.round(score));
  }

  function renderRequests() {
    const root = byId("observabilityRequestList");
    if (!root) return;
    root.replaceChildren();
    const requests = state.snapshot?.requests?.recent || [];
    if (!requests.length) {
      const empty = document.createElement("div");
      empty.className = "observability-empty";
      empty.textContent = "Request telemetry will appear after API activity.";
      root.append(empty);
      return;
    }
    requests.slice(0, 30).forEach(item => {
      const article = document.createElement("article");
      article.className = "observability-item";
      article.dataset.tone = item.status >= 500 ? "critical" : item.status >= 400 || item.latencyMs >= 1000 ? "warning" : "healthy";
      article.innerHTML = "<div><strong></strong><span></span></div><div><b></b><time></time></div>";
      article.querySelector("strong").textContent = `${item.method} ${item.path}`;
      article.querySelector("span").textContent = `${item.latencyMs} ms${item.replayed ? " · idempotency replay" : ""}`;
      article.querySelector("b").textContent = item.status;
      article.querySelector("time").textContent = formatTime(item.finishedAt);
      root.append(article);
    });
  }

  function renderIncidents() {
    const root = byId("observabilityIncidentList");
    if (!root) return;
    root.replaceChildren();
    const incidents = state.snapshot?.incidents?.records || [];
    if (!incidents.length) {
      const empty = document.createElement("div");
      empty.className = "observability-empty";
      empty.textContent = "No incidents have been declared.";
      root.append(empty);
      return;
    }
    incidents.forEach(item => {
      const article = document.createElement("article");
      article.className = "observability-incident";
      article.dataset.tone = item.severity || "warning";
      article.innerHTML = `
        <div><strong></strong><span></span><p></p></div>
        <div class="observability-incident-actions">
          <b></b>
          <button type="button" data-action="acknowledged">Acknowledge</button>
          <button type="button" data-action="resolved">Resolve</button>
        </div>`;
      article.querySelector("strong").textContent = item.title;
      article.querySelector("span").textContent = `${item.severity} · ${item.status} · owner ${item.owner || "unassigned"}`;
      article.querySelector("p").textContent = item.description || "No description provided.";
      article.querySelector("b").textContent = formatTime(item.updatedAt || item.createdAt);
      article.querySelectorAll("button").forEach(button => {
        button.disabled = item.status === "resolved";
        button.addEventListener("click", async () => {
          await updateIncident(item.id, button.dataset.action);
        });
      });
      root.append(article);
    });
  }

  function render() {
    const snapshot = state.snapshot;
    if (!snapshot) return;
    const score = healthScore(snapshot);
    setText("observabilityHealthScore", score);
    setText("observabilityHealthLabel", score >= 90 ? "Healthy" : score >= 70 ? "Degraded" : "Incident state");
    const card = byId("observabilityHealthCard");
    if (card) card.dataset.tone = score >= 90 ? "healthy" : score >= 70 ? "warning" : "critical";

    setText("observabilitySuccessRate", `${snapshot.requests.successRate}%`);
    setText("observabilityAverageLatency", `${snapshot.requests.averageLatencyMs} ms`);
    setText("observabilityP95Latency", `${snapshot.requests.p95LatencyMs} ms`);
    setText("observabilityOpenIncidents", snapshot.incidents.open);
    setText("observabilityRealtimeClients", snapshot.realtimeClients);
    setText("observabilityReservations", snapshot.storage.reservations);
    setText("observabilityAuditLogs", snapshot.storage.auditLogs);
    setText("observabilityIdempotency", snapshot.storage.idempotencyRecords);
    setText("observabilityVersions", snapshot.storage.resourceVersions);
    setText("observabilityAuthFailures", snapshot.requests.authFailures);
    setText("observabilityConflicts", snapshot.requests.conflicts);
    setText("observabilityUpdated", `Updated ${formatTime(snapshot.generatedAt)} · uptime ${snapshot.uptimeSeconds}s`);
    renderRequests();
    renderIncidents();
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    try {
      const client = api();
      if (!client?.observabilitySnapshot) throw new Error("Observability API is unavailable.");
      state.snapshot = await client.observabilitySnapshot();
      render();
    } catch (error) {
      setText("observabilityMessage", error.message);
    } finally {
      state.loading = false;
    }
  }

  async function createIncident() {
    const title = byId("observabilityIncidentTitle")?.value.trim();
    if (!title) {
      setText("observabilityMessage", "Enter an incident title.");
      return;
    }
    const client = api();
    if (!client?.createObservabilityIncident) return;
    try {
      await client.createObservabilityIncident({
        title,
        severity: byId("observabilityIncidentSeverity")?.value || "warning",
        owner: byId("observabilityIncidentOwner")?.value.trim() || undefined,
        description: byId("observabilityIncidentDescription")?.value.trim() || ""
      });
      setText("observabilityMessage", "Incident created.");
      ["observabilityIncidentTitle", "observabilityIncidentOwner", "observabilityIncidentDescription"]
        .forEach(id => { if (byId(id)) byId(id).value = ""; });
      await refresh();
    } catch (error) {
      setText("observabilityMessage", error.message);
    }
  }

  async function updateIncident(id, status) {
    const client = api();
    if (!client?.updateObservabilityIncident) return;
    try {
      await client.updateObservabilityIncident(id, {
        status,
        note: status === "resolved" ? "Incident resolved from command center." : "Incident acknowledged."
      });
      setText("observabilityMessage", `Incident ${status}.`);
      await refresh();
    } catch (error) {
      setText("observabilityMessage", error.message);
    }
  }

  function init() {
    if (!byId("observabilityCommandCenter")) return;
    byId("observabilityRefresh")?.addEventListener("click", refresh);
    byId("observabilityCreateIncident")?.addEventListener("click", createIncident);
    [
      "bluecurrent:observability-signal",
      "bluecurrent:observability-incident-created",
      "bluecurrent:observability-incident-updated",
      "bluecurrent:pipeline-request-failed",
      "bluecurrent:offline-sync-complete"
    ].forEach(name => window.addEventListener(name, () => refresh()));
    refresh();
    setInterval(refresh, 30000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})();