(function () {
  "use strict";

  function createBlueCurrentGuidedShiftCenterModule(eventBus, appState) {
    const root = document.getElementById("guidedShiftCenter");
    if (!root || !window.BlueCurrentGuidedShiftEngine) return null;
    const engine = new window.BlueCurrentGuidedShiftEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    let filter = "open";

    function render(snapshot = engine.snapshot()) {
      byId("guidedShiftUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      byId("guidedShiftPhase").textContent = snapshot.phase.label;
      byId("guidedShiftPhaseNote").textContent = snapshot.phase.note;
      byId("guidedShiftUnacknowledged").textContent = snapshot.unacknowledged;
      byId("guidedShiftOpenHandoffs").textContent = snapshot.openHandoffs.length;
      byId("guidedShiftHandoffNote").textContent = snapshot.openHandoffs.length ? `${snapshot.openHandoffs.length} handoff${snapshot.openHandoffs.length === 1 ? "" : "s"} still open.` : "No handoff blocking the shift.";
      byId("guidedShiftFocusScore").textContent = snapshot.focusScore;
      byId("guidedShiftStatus").textContent = snapshot.unacknowledged ? `${snapshot.unacknowledged} event${snapshot.unacknowledged === 1 ? "" : "s"} need acknowledgement` : "Operator queue clear";
      [["Now", snapshot.plan.now], ["Next", snapshot.plan.next], ["Later", snapshot.plan.later]].forEach(([name, item]) => {
        byId(`guidedShift${name}Title`).textContent = item.title;
        byId(`guidedShift${name}Detail`).textContent = item.detail;
        byId(`guidedShift${name}Impact`).textContent = item.impact;
      });
      renderQueue(snapshot);
      renderHandoffs(snapshot);
    }

    function renderQueue(snapshot) {
      let items = snapshot.queue;
      if (filter === "open") items = items.filter(item => item.requiresResponse && !item.acknowledged);
      if (filter === "handoffs") items = [];
      byId("guidedShiftQueue").innerHTML = items.length ? items.slice(0, 14).map(item => `<article class="guided-shift-queue-item" data-tone="${esc(item.tone)}"><time>${new Date(item.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><small>${item.requiresResponse ? `${item.responseMinutes} min response window` : "Context only"}</small></div><div class="guided-shift-queue-actions">${item.acknowledged ? `<span>Acknowledged</span>` : `<button type="button" data-guided-ack="${esc(item.id)}">Acknowledge</button><button type="button" data-guided-snooze="${esc(item.id)}">Snooze 5m</button>`}${item.sourceId ? `<button type="button" data-guided-source="${esc(item.sourceId)}">Open</button>` : ""}</div></article>`).join("") : `<p class="guided-shift-empty">${filter === "handoffs" ? "Handoffs appear in the panel to the right." : "The operator queue is clear."}</p>`;
    }

    function renderHandoffs(snapshot) {
      byId("guidedShiftHandoffs").innerHTML = snapshot.handoffs.length ? snapshot.handoffs.slice(0, 6).map(item => `<article data-status="${esc(item.status)}"><div><strong>${esc(item.owner)}</strong><p>${esc(item.note)}</p><small>${new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>${item.status === "complete" ? `<span>Complete</span>` : `<button type="button" data-guided-complete-handoff="${esc(item.id)}">Complete</button>`}</article>`).join("") : `<p class="guided-shift-empty">No handoff has been created.</p>`;
    }

    root.addEventListener("click", event => {
      const filterButton = event.target.closest("[data-guided-filter]");
      if (filterButton) {
        filter = filterButton.dataset.guidedFilter;
        root.querySelectorAll("[data-guided-filter]").forEach(button => button.classList.toggle("is-active", button === filterButton));
        return renderQueue(engine.snapshot());
      }
      const ack = event.target.closest("[data-guided-ack]");
      if (ack) return render(engine.acknowledge(ack.dataset.guidedAck));
      const snooze = event.target.closest("[data-guided-snooze]");
      if (snooze) return render(engine.snooze(snooze.dataset.guidedSnooze, 5));
      const complete = event.target.closest("[data-guided-complete-handoff]");
      if (complete) return render(engine.completeHandoff(complete.dataset.guidedCompleteHandoff));
      const source = event.target.closest("[data-guided-source]")?.dataset.guidedSource;
      if (source) {
        document.body.classList.remove("blue-current-command-mode");
        document.body.classList.add("blue-current-full-platform-mode");
        window.setTimeout(() => document.getElementById(source)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    });

    byId("guidedShiftRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    byId("guidedShiftCreateHandoff")?.addEventListener("click", () => {
      try {
        const snapshot = engine.createHandoff({ owner: byId("guidedShiftHandoffOwner").value, note: byId("guidedShiftHandoffNoteInput").value });
        byId("guidedShiftHandoffNoteInput").value = "";
        byId("guidedShiftActionStatus").textContent = "Handoff created.";
        render(snapshot);
      } catch (error) {
        byId("guidedShiftActionStatus").textContent = error.message;
      }
      setTimeout(() => { byId("guidedShiftActionStatus").textContent = ""; }, 4000);
    });

    eventBus.on("guided-shift:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentGuidedShiftCenterModule = createBlueCurrentGuidedShiftCenterModule;
})();
