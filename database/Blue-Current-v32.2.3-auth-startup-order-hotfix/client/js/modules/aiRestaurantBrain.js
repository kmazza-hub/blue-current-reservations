(function () {
  "use strict";

  function createAiRestaurantBrainModule(eventBus, appState, cloudFoundationModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const locationId = "loc_marina";
    const $ = id => document.getElementById(id);
    let state = { recommendations: [], health: {}, signals: {}, decisions: [] };
    let category = "all";
    let selectedId = null;

    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[char]));

    function activeRecommendations() {
      return state.recommendations.filter(item => category === "all" || item.category === category);
    }

    function selectedRecommendation() {
      return state.recommendations.find(item => item.id === selectedId) || state.recommendations[0] || null;
    }

    function renderHealth() {
      const h = state.health || {};
      $("aiHealthScore").textContent = h.overall ?? "—";
      $("aiHealthKitchen").textContent = h.kitchen ?? "—";
      $("aiHealthService").textContent = h.service ?? "—";
      $("aiHealthStaff").textContent = h.staff ?? "—";
      $("aiHealthReservations").textContent = h.reservations ?? "—";
      $("aiHealthDining").textContent = h.diningRoom ?? "—";
      const ring = $("aiHealthRing");
      if (ring) ring.style.setProperty("--score", `${h.overall || 0}%`);
      appState.update({
        restaurantHealth: h.overall || 0,
        aiRecommendationCount: state.recommendations.length,
        aiCriticalCount: state.recommendations.filter(item => item.severity === "critical").length
      });
    }

    function renderSignals() {
      const s = state.signals || {};
      const values = [
        ["Occupancy", `${s.occupancy || 0}%`],
        ["Kitchen tickets", s.activeTickets || 0],
        ["Ready at expo", s.readyTickets || 0],
        ["Overdue", s.overdueTickets || 0],
        ["At-risk tables", s.atRiskTables || 0],
        ["Busiest station", `${s.busiestStation?.name || "—"} ${s.busiestStation?.utilization || 0}%`]
      ];
      $("aiSignalGrid").innerHTML = values.map(([label, value]) =>
        `<article><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></article>`
      ).join("");
    }

    function renderRecommendations() {
      const items = activeRecommendations();
      $("aiRecommendationList").innerHTML = items.map(item => `
        <button class="ai-rec-card severity-${item.severity} ${item.id === selectedId ? "selected" : ""}" data-ai-id="${escapeHtml(item.id)}">
          <div class="ai-rec-top">
            <span>${escapeHtml(item.category.replace("_", " "))}</span>
            <b>${escapeHtml(item.confidence)}% confidence</b>
          </div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.action)}</p>
          <footer><em>${escapeHtml(item.impact?.label || "Impact")}</em><i>${escapeHtml(item.impact?.value || "—")}</i></footer>
        </button>
      `).join("") || `<div class="ai-empty"><strong>No active recommendations</strong><p>The restaurant is operating within configured thresholds.</p></div>`;
    }

    function renderInspector() {
      const item = selectedRecommendation();
      const panel = $("aiRecommendationInspector");
      if (!item) {
        panel.innerHTML = `<div class="ai-inspector-empty"><strong>Select a recommendation</strong><p>Review the reasoning, signals, confidence, and expected impact.</p></div>`;
        return;
      }
      panel.innerHTML = `
        <div class="ai-inspector-head">
          <div><small>${escapeHtml(item.category.replace("_", " "))}</small><h3>${escapeHtml(item.title)}</h3></div>
          <span>${escapeHtml(item.confidence)}%</span>
        </div>
        <div class="ai-action-callout"><small>Recommended action</small><strong>${escapeHtml(item.action)}</strong></div>
        <div class="ai-explanation"><small>Why this appeared</small><p>${escapeHtml(item.explanation)}</p></div>
        <div class="ai-signal-list">
          ${(item.signals || []).map(signal => `<article><span>${escapeHtml(signal.label)}</span><strong>${escapeHtml(signal.value)}</strong></article>`).join("")}
        </div>
        <div class="ai-impact-box"><span>${escapeHtml(item.impact?.label || "Expected impact")}</span><strong>${escapeHtml(item.impact?.value || "—")}</strong></div>
        <textarea id="aiDecisionNote" placeholder="Optional manager note"></textarea>
        <div class="ai-decision-actions">
          <button class="button button-gold" data-ai-decision="accepted">Accept</button>
          <button class="button button-light" data-ai-decision="snoozed">Snooze</button>
          <button class="button button-ghost" data-ai-decision="rejected">Reject</button>
        </div>`;
    }

    function renderHistory() {
      $("aiDecisionHistory").innerHTML = (state.decisions || []).slice(0, 8).map(item => `
        <article>
          <span class="decision-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
          <div><strong>${escapeHtml(item.actor)}</strong><p>${escapeHtml(item.recommendationId.replace(/^air_[^_]+_/, "").replaceAll("-", " "))}</p></div>
          <time>${new Date(item.createdAt).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}</time>
        </article>
      `).join("") || `<p class="ai-history-empty">No manager decisions recorded yet.</p>`;
    }

    function renderAll() {
      renderHealth();
      renderSignals();
      renderRecommendations();
      renderInspector();
      renderHistory();
      $("aiLastUpdated").textContent = state.generatedAt
        ? new Date(state.generatedAt).toLocaleTimeString([], { hour:"numeric", minute:"2-digit", second:"2-digit" })
        : "—";
    }

    async function load() {
      if (!api.token) return;
      try {
        state = await api.aiBrain(locationId);
        if (!selectedId || !state.recommendations.some(item => item.id === selectedId)) {
          selectedId = state.recommendations[0]?.id || null;
        }
        renderAll();
        eventBus.emit("ai:brain-loaded", { locationId, count: state.recommendations.length, health: state.health });
      } catch (error) {
        console.error("AI Brain load failed", error);
      }
    }

    $("aiCategoryFilters")?.addEventListener("click", event => {
      const button = event.target.closest("[data-ai-category]");
      if (!button) return;
      category = button.dataset.aiCategory;
      document.querySelectorAll("[data-ai-category]").forEach(item =>
        item.classList.toggle("active", item.dataset.aiCategory === category)
      );
      renderRecommendations();
    });

    $("aiRecommendationList")?.addEventListener("click", event => {
      const card = event.target.closest("[data-ai-id]");
      if (!card) return;
      selectedId = card.dataset.aiId;
      renderRecommendations();
      renderInspector();
    });

    $("aiRecommendationInspector")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-ai-decision]");
      if (!button) return;
      const item = selectedRecommendation();
      if (!item) return;
      await api.decideAiRecommendation(item.id, {
        locationId,
        status: button.dataset.aiDecision,
        note: $("aiDecisionNote")?.value || "",
        expectedImpact: item.impact
      });
      await load();
    });

    $("aiRefreshButton")?.addEventListener("click", async () => {
      state = await api.refreshAiBrain(locationId);
      selectedId = state.recommendations[0]?.id || null;
      renderAll();
    });

    ["ai:recommendation-decided", "ai:recommendations-refreshed", "kitchen:ticket-updated", "service:flow-updated", "floor:table-updated"].forEach(type => {
      eventBus.on?.(type, load);
    });
    eventBus.on?.("auth:signed-in", load);
    eventBus.on?.("auth:restored", load);

    setInterval(load, 45000);
    load();

    return { reload: load, getState: () => JSON.parse(JSON.stringify(state)) };
  }

  window.createBlueCurrentAiRestaurantBrainModule = createAiRestaurantBrainModule;
})();