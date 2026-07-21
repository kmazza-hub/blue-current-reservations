(function () {
  "use strict";

  function createAutonomousOperationsModule(eventBus, appState) {
    const decisionFeed = document.getElementById("autonomousDecisionFeed");
    const health = document.getElementById("autonomousHealth");
    const nextAction = document.getElementById("autonomousNextAction");
    const confidence = document.getElementById("autonomousConfidence");
    const acceptedCount = document.getElementById("autonomousAccepted");
    const successRate = document.getElementById("autonomousSuccessRate");
    const revenueImpact = document.getElementById("autonomousRevenueImpact");
    const waitReduction = document.getElementById("autonomousWaitReduction");
    const commandInput = document.getElementById("autonomousCommandInput");
    const commandOutput = document.getElementById("autonomousCommandOutput");
    const scenarioOutput = document.getElementById("scenarioOutput");

    let decisions = [];
    let accepted = 0;
    let successful = 0;
    let impact = 0;
    let waitMinutesSaved = 0;

    const rules = [
      { id: "occupancy", label: "Open patio when occupancy exceeds 88%", enabled: true },
      { id: "kitchen", label: "Add expo support when kitchen exceeds 17 minutes", enabled: true },
      { id: "vip", label: "Notify host lead when a VIP is recognized", enabled: true },
      { id: "wait", label: "Escalate when quoted wait exceeds 20 minutes", enabled: true }
    ];

    function state() { return appState.getState(); }

    function scoreHealth(s) {
      const occupancyPenalty = Math.max(0, Number(s.occupancyPercent || 0) - 82) * 0.45;
      const callBonus = Math.min(4, Number(s.callsAnswered || 0) / 70);
      return Math.max(72, Math.min(99, Math.round(96 - occupancyPenalty + callBonus)));
    }

    function evaluate(trigger = "state") {
      const s = state();
      const candidates = [];
      const occupancy = Number(s.occupancyPercent || 0);
      const kitchen = Number(s.projectedKitchenMinutes || 16);

      if (rules.find(r => r.id === "occupancy")?.enabled && occupancy >= 88) {
        candidates.push({
          key: "open-patio", priority: "Act now", title: "Open the patio section",
          detail: `Occupancy is ${occupancy}%. Opening the patio now protects reservation pacing and walk-in capacity.`,
          confidence: Math.min(98, 84 + Math.round((occupancy - 88) * 2)), impact: 620, wait: 6
        });
      }
      if (rules.find(r => r.id === "kitchen")?.enabled && kitchen >= 17) {
        candidates.push({
          key: "expo-support", priority: "Protect service", title: "Assign manager support to expo",
          detail: `Projected kitchen time is ${kitchen} minutes. Temporary expo support should reduce ticket-time growth.`,
          confidence: 91, impact: 280, wait: 3
        });
      }
      if (s.activeGuest?.vip && rules.find(r => r.id === "vip")?.enabled) {
        candidates.push({
          key: "vip-arrival", priority: "Guest moment", title: `Prepare for ${s.activeGuest.guestName || "VIP guest"}`,
          detail: "Share the guest profile, occasion, and seating preference with the host lead before arrival.",
          confidence: 97, impact: 140, wait: 0
        });
      }
      if (!candidates.length) {
        candidates.push({
          key: `pace-${Date.now()}`, priority: "Stay ahead", title: "Maintain current pacing",
          detail: "Service is stable. Protect the next thirty minutes by confirming section readiness and delaying nonessential breaks.",
          confidence: 89, impact: 190, wait: 2
        });
      }

      const candidate = candidates[0];
      const duplicate = decisions.some(d => d.key === candidate.key && d.status === "pending");
      if (!duplicate) {
        const decision = { ...candidate, id: `decision-${Date.now()}`, status: "pending", createdAt: new Date(), trigger };
        decisions.unshift(decision);
        decisions = decisions.slice(0, 8);
        eventBus.emit("autonomy:recommendation-created", decision);
      }
      render();
    }

    function render() {
      const s = state();
      const healthScore = scoreHealth(s);
      if (health) health.textContent = String(healthScore);
      const pending = decisions.find(d => d.status === "pending");
      if (nextAction) nextAction.textContent = pending?.title || "No immediate action required";
      if (confidence) confidence.textContent = pending ? `${pending.confidence}% confidence` : "System stable";
      if (acceptedCount) acceptedCount.textContent = String(accepted);
      if (successRate) successRate.textContent = accepted ? `${Math.round(successful / accepted * 100)}%` : "—";
      if (revenueImpact) revenueImpact.textContent = `$${impact.toLocaleString()}`;
      if (waitReduction) waitReduction.textContent = `${waitMinutesSaved} min`;

      if (decisionFeed) {
        decisionFeed.innerHTML = decisions.map(d => `
          <article class="autonomous-decision ${d.status}">
            <div class="decision-meta"><span>${d.priority}</span><time>${d.createdAt.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</time></div>
            <strong>${d.title}</strong><p>${d.detail}</p>
            <div class="decision-impact"><span>${d.confidence}% confidence</span><span>Estimated impact +$${d.impact}</span></div>
            ${d.status === "pending" ? `<div class="decision-actions"><button data-decision="${d.id}" data-action="accept">Accept</button><button data-decision="${d.id}" data-action="snooze">Snooze</button><button data-decision="${d.id}" data-action="reject">Reject</button></div>` : `<small class="decision-status">${d.status}</small>`}
          </article>`).join("");
      }
    }

    function resolveDecision(id, action) {
      const decision = decisions.find(d => d.id === id);
      if (!decision) return;
      decision.status = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "snoozed";
      if (action === "accept") {
        accepted += 1; successful += 1; impact += decision.impact; waitMinutesSaved += decision.wait;
        appState.update({
          executiveBrief: `Autonomous Operations accepted: ${decision.title}. Estimated impact +$${decision.impact}.`,
          lastOperationalEvent: { type: "autonomy:decision-accepted", occurredAt: new Date().toISOString(), decisionId: id }
        });
      }
      eventBus.emit(`autonomy:decision-${action}`, decision);
      render();
    }

    function answerCommand(raw) {
      const q = raw.trim().toLowerCase();
      const s = state();
      let answer = "Ask about the next action, revenue forecast, occupancy, VIPs, kitchen pacing, or tonight's summary.";
      if (q.includes("next") || q.includes("do")) answer = decisions.find(d => d.status === "pending")?.detail || "No immediate intervention is required.";
      else if (q.includes("revenue") || q.includes("close")) answer = `Current estimated revenue is $${Number(s.estimatedRevenue || 0).toLocaleString()}. Predictive pacing indicates a close near $${Math.round(Number(s.estimatedRevenue || 0) * 1.18).toLocaleString()}.`;
      else if (q.includes("occupancy")) answer = `Current occupancy is ${s.occupancyPercent}%. ${s.occupancyPercent >= 88 ? "Capacity pressure is elevated." : "Capacity remains manageable."}`;
      else if (q.includes("vip")) answer = s.activeGuest?.vip ? `${s.activeGuest.guestName || "A VIP guest"} is active in the guest journey.` : "No active VIP arrival is currently flagged.";
      else if (q.includes("kitchen")) answer = "Kitchen pacing is projected at 16 minutes. Expo support is not required unless it crosses 17 minutes.";
      else if (q.includes("summary") || q.includes("tonight")) answer = `Restaurant health is ${scoreHealth(s)}. Occupancy is ${s.occupancyPercent}%, ${s.reservationsToday} reservations are tracked, and estimated revenue is $${Number(s.estimatedRevenue || 0).toLocaleString()}.`;
      if (commandOutput) commandOutput.textContent = answer;
      eventBus.emit("autonomy:command-answered", { query: raw, answer });
    }

    function runScenario(type) {
      const scenarios = {
        server: { title: "Add one server", result: "Projected wait falls by 4 minutes. Labor rises $168. Expected net revenue impact: +$540." },
        rain: { title: "Simulate rain", result: "Patio capacity falls by 28 seats. Occupancy pressure reaches 97%. Recommend pacing reservations by 10 minutes." },
        walkin: { title: "Large walk-in party", result: "A 12-top can be absorbed at 8:05 PM by combining Tables 18 and 19. Expected incremental revenue: $780." },
        kitchen: { title: "Kitchen equipment failure", result: "Projected ticket time rises to 24 minutes. Pause new walk-ins for 15 minutes and assign manager support to expo." }
      };
      const selected = scenarios[type] || scenarios.server;
      if (scenarioOutput) scenarioOutput.innerHTML = `<strong>${selected.title}</strong><p>${selected.result}</p>`;
      eventBus.emit("autonomy:scenario-run", { type, ...selected });
    }

    document.addEventListener("click", event => {
      const actionButton = event.target.closest("[data-decision][data-action]");
      if (actionButton) resolveDecision(actionButton.dataset.decision, actionButton.dataset.action);
      const scenarioButton = event.target.closest("[data-scenario]");
      if (scenarioButton) runScenario(scenarioButton.dataset.scenario);
      const ruleButton = event.target.closest("[data-rule]");
      if (ruleButton) {
        const rule = rules.find(r => r.id === ruleButton.dataset.rule);
        if (rule) { rule.enabled = !rule.enabled; ruleButton.classList.toggle("active", rule.enabled); ruleButton.setAttribute("aria-pressed", String(rule.enabled)); }
      }
    });

    document.getElementById("autonomousEvaluate")?.addEventListener("click", () => evaluate("manual"));
    document.getElementById("autonomousCommandSend")?.addEventListener("click", () => answerCommand(commandInput?.value || ""));
    commandInput?.addEventListener("keydown", e => { if (e.key === "Enter") answerCommand(commandInput.value); });

    eventBus.on("state:updated", () => evaluate("state"));
    eventBus.on("reservation:confirmed", () => evaluate("reservation"));
    eventBus.on("guest:recognized", guest => { if (guest?.vip) evaluate("vip"); });

    evaluate("startup");
    return { evaluate, getDecisions: () => [...decisions], runScenario };
  }

  window.createBlueCurrentAutonomousOperationsModule = createAutonomousOperationsModule;
})();
