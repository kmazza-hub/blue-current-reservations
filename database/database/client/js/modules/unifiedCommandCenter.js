(function () {
  "use strict";

  function createBlueCurrentUnifiedCommandCenterModule(eventBus, appState) {
    const root = document.getElementById("unifiedCommandCenter");
    if (!root || !window.BlueCurrentUnifiedCommandEngine) return null;
    const engine = new window.BlueCurrentUnifiedCommandEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
    let filter = "all";
    let fullPlatform = localStorage.getItem("blue-current-view-mode") === "full";

    function applyMode() {
      document.body.classList.toggle("blue-current-command-mode", !fullPlatform);
      document.body.classList.toggle("blue-current-full-platform-mode", fullPlatform);
      byId("unifiedCommandViewToggle").textContent = fullPlatform ? "Return to command view" : "Explore full platform";
      byId("unifiedCommandViewState").textContent = fullPlatform ? "Full platform visible" : "Focused command view";
      localStorage.setItem("blue-current-view-mode", fullPlatform ? "full" : "command");
    }

    function render(snapshot = engine.snapshot()) {
      byId("unifiedCommandUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("unifiedCommandRpi").textContent = snapshot.rpi.toFixed(1);
      byId("unifiedCommandBand").textContent = snapshot.band;
      byId("unifiedCommandTrend").textContent = `${snapshot.trend >= 0 ? "+" : ""}${snapshot.trend.toFixed(1)} today`;
      byId("unifiedCommandHeadline").textContent = snapshot.headline;
      byId("unifiedCommandRevenueOpportunity").textContent = money(snapshot.revenueOpportunity);
      byId("unifiedCommandProfitOpportunity").textContent = money(snapshot.profitOpportunity);
      byId("unifiedCommandProfitRisk").textContent = money(snapshot.profitAtRisk);
      byId("unifiedCommandMeasuredRevenue").textContent = money(snapshot.measuredRevenue);
      byId("unifiedCommandOccupancy").textContent = `${Math.round(snapshot.occupancy)}%`;
      byId("unifiedCommandKitchen").textContent = `${Math.round(snapshot.kitchenLoad)}%`;
      byId("unifiedCommandWait").textContent = `${Math.round(snapshot.guestWait)} min`;
      byId("unifiedCommandApprovals").textContent = snapshot.pendingApprovals;
      byId("unifiedCommandConciergeHeadline").textContent = snapshot.concierge.headline;
      byId("unifiedCommandConciergeMessage").textContent = snapshot.concierge.message;
      byId("unifiedCommandPriorityTitle").textContent = snapshot.priority.title;
      byId("unifiedCommandPriorityInstruction").textContent = snapshot.priority.instruction;
      byId("unifiedCommandPriorityOwner").textContent = snapshot.priority.owner;
      byId("unifiedCommandPriorityProfit").textContent = money(snapshot.priority.profitImpact);
      byId("unifiedCommandPriorityRpi").textContent = `+${snapshot.priority.projectedRpiGain.toFixed(1)}`;
      byId("unifiedCommandPriorityConfidence").textContent = `${snapshot.priority.confidence}%`;
      byId("unifiedCommandApprove").disabled = !snapshot.priority.approvalRequired;
      byId("unifiedCommandApprove").textContent = snapshot.priority.approvalRequired ? "Approve highest-impact action" : "No approval required";
      root.querySelectorAll("[data-command-role]").forEach(button => button.classList.toggle("is-active", button.dataset.commandRole === snapshot.role));
      byId("unifiedCommandTechnical").hidden = snapshot.role !== "technical";
      byId("unifiedCommandTechnical").innerHTML = `<article><small>Integration health</small><strong>${snapshot.technical.integrationHealth}%</strong></article><article><small>Active workflows</small><strong>${snapshot.technical.activeWorkflows}</strong></article><article><small>Modules ready</small><strong>${snapshot.technical.modulesReady}</strong></article>`;
      renderTimeline(snapshot);
      renderActions(snapshot);
      applyMode();
    }

    function renderTimeline(snapshot) {
      const items = snapshot.timeline.filter(item => filter === "all" || item.tone === filter);
      byId("unifiedCommandTimeline").innerHTML = items.length ? items.slice(0, 12).map(item => `<button type="button" class="unified-command-event" data-source-id="${esc(item.sourceId || "")}" data-tone="${esc(item.tone)}"><time>${new Date(item.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time><i></i><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span></button>`).join("") : `<p class="unified-command-empty">No events match this filter.</p>`;
    }

    function renderActions(snapshot) {
      byId("unifiedCommandActions").innerHTML = snapshot.actions.length ? snapshot.actions.map((action, index) => `<article><span>${index + 1}</span><div><strong>${esc(action.title)}</strong><small>${esc(action.instruction)}</small></div><b>${money(Number(action.revenueImpact || 0) * 0.42)} profit</b></article>`).join("") : `<p class="unified-command-empty">No additional actions need attention.</p>`;
    }

    root.addEventListener("click", event => {
      const role = event.target.closest("[data-command-role]");
      if (role) return render(engine.setRole(role.dataset.commandRole));
      const prompt = event.target.closest("[data-command-prompt]");
      if (prompt) return answer(prompt.dataset.commandPrompt);
      const timelineFilter = event.target.closest("[data-timeline-filter]");
      if (timelineFilter) {
        filter = timelineFilter.dataset.timelineFilter;
        root.querySelectorAll("[data-timeline-filter]").forEach(button => button.classList.toggle("is-active", button === timelineFilter));
        return renderTimeline(engine.snapshot());
      }
      const source = event.target.closest("[data-source-id]")?.dataset.sourceId;
      if (source) openSource(source);
    });

    function answer(question) {
      byId("unifiedCommandConciergeAnswer").textContent = engine.answer(question);
      byId("unifiedCommandQuestion").value = "";
    }

    byId("unifiedCommandAsk")?.addEventListener("click", () => answer(byId("unifiedCommandQuestion").value));
    byId("unifiedCommandQuestion")?.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); answer(event.currentTarget.value); } });
    byId("unifiedCommandRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("unifiedCommandViewToggle")?.addEventListener("click", () => { fullPlatform = !fullPlatform; applyMode(); if (fullPlatform) byId("restaurantPerformanceCenter")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
    byId("unifiedCommandOpenDetails")?.addEventListener("click", () => openSource(engine.snapshot().priority.sourceId));
    byId("unifiedCommandApprove")?.addEventListener("click", () => {
      const snapshot = engine.snapshot();
      const action = snapshot.priority;
      if (!action.approvalRequired) return;
      eventBus.emit("restaurant-performance:action-approved", { action: action.raw || action, performance: appState.get("restaurantPerformance"), approvedAt: new Date().toISOString(), source: "unified-command" });
      eventBus.emit("portfolio-intelligence:recommendation-approved", { recommendation: { ...(action.raw || action), action: action.instruction, expectedImpact: `${money(action.profitImpact)} projected profit and +${action.projectedRpiGain.toFixed(1)} RPI.` }, approvedAt: new Date().toISOString(), source: "unified-command" });
      byId("unifiedCommandStatus").textContent = `Approved: ${action.title}`;
      setTimeout(() => { byId("unifiedCommandStatus").textContent = ""; }, 4500);
    });

    function openSource(sourceId) {
      fullPlatform = true;
      applyMode();
      window.setTimeout(() => document.getElementById(sourceId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }

    eventBus.on("unified-command:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentUnifiedCommandCenterModule = createBlueCurrentUnifiedCommandCenterModule;
})();
