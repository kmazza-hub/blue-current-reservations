(function () {
  "use strict";

  function createBlueCurrentPilotOperationsCenterModule(eventBus, appState) {
    const root = document.getElementById("pilotOperationsCenter");
    if (!root || !window.BlueCurrentPilotOperationsEngine) return null;
    const engine = new window.BlueCurrentPilotOperationsEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

    function render(session = engine.getSession()) {
      byId("pilotOperationsScore").textContent = `${session.validationScore}%`;
      byId("pilotOperationsState").textContent = session.status;
      byId("pilotOperationsState").dataset.tone = session.status;
      byId("pilotOperationsSummary").textContent = session.summary;
      byId("pilotOperationsLocation").textContent = session.locationId;
      byId("pilotOperationsLeadValue").textContent = session.lead;
      byId("pilotOperationsShiftValue").textContent = session.shift;
      byId("pilotOperationsNextAction").textContent = session.nextAction;
      byId("pilotOperationsIssueCount").textContent = session.issues.filter(item => item.status === "open").length;
      byId("pilotOperationsPassedCount").textContent = `${session.checkpoints.filter(item => item.status === "passed").length}/${session.checkpoints.length}`;
      byId("pilotOperationsStart").disabled = session.status !== "draft";
      byId("pilotOperationsComplete").disabled = session.status !== "active";
      byId("pilotOperationsCheckpoints").innerHTML = session.checkpoints.map(item => `
        <article data-status="${esc(item.status)}" data-checkpoint="${esc(item.id)}">
          <div><span>${esc(item.status)}</span><strong>${esc(item.label)}</strong><small>${esc(item.owner)}</small></div>
          <p>${esc(item.evidence)}</p>
          ${item.note ? `<em>${esc(item.note)}</em>` : ""}
          <div class="pilot-operations-checkpoint-actions">
            <button type="button" data-status-action="passed">Pass</button>
            <button type="button" data-status-action="watch">Watch</button>
            <button type="button" data-status-action="blocked">Block</button>
          </div>
        </article>`).join("");
      const issues = session.issues;
      byId("pilotOperationsIssues").innerHTML = issues.length ? issues.map(issue => `
        <li data-severity="${esc(issue.severity)}"><div><strong>${esc(issue.title)}</strong><small>${esc(issue.owner)} · ${esc(issue.status)}</small>${issue.note ? `<p>${esc(issue.note)}</p>` : ""}</div>${issue.status === "open" ? `<button type="button" data-resolve-issue="${esc(issue.id)}">Resolve</button>` : ""}</li>`).join("") : "<li class=\"pilot-operations-empty\">No pilot issues recorded.</li>";
      byId("pilotOperationsTimeline").innerHTML = session.decisions.length ? session.decisions.slice(0, 12).map(item => `<li><time>${new Date(item.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time><span>${esc(item.detail)}</span></li>`).join("") : "<li class=\"pilot-operations-empty\">Pilot activity will appear here.</li>";
    }

    function status(message, tone = "") {
      const node = byId("pilotOperationsStatus");
      node.textContent = message;
      node.dataset.tone = tone;
    }

    root.addEventListener("click", event => {
      const statusButton = event.target.closest("[data-status-action]");
      if (statusButton) {
        const card = statusButton.closest("[data-checkpoint]");
        const note = window.prompt("Optional validation note:", "") || "";
        try { render(engine.setCheckpoint(card.dataset.checkpoint, statusButton.dataset.statusAction, note)); status("Checkpoint updated.", "success"); }
        catch (error) { status(error.message, "error"); }
        return;
      }
      const resolveButton = event.target.closest("[data-resolve-issue]");
      if (resolveButton) { render(engine.resolveIssue(resolveButton.dataset.resolveIssue)); status("Issue resolved.", "success"); }
    });

    byId("pilotOperationsStart")?.addEventListener("click", () => {
      const lead = window.prompt("Pilot lead:", engine.getSession().lead) || engine.getSession().lead;
      const shift = window.prompt("Pilot shift:", engine.getSession().shift) || engine.getSession().shift;
      render(engine.start({ lead, shift }));
      status("Controlled pilot session started.", "success");
    });
    byId("pilotOperationsAddIssue")?.addEventListener("click", () => {
      const title = window.prompt("Issue title:", "");
      if (!title) return;
      const severity = window.confirm("Is this issue blocking the pilot?") ? "blocking" : "watch";
      const note = window.prompt("Issue detail:", "") || "";
      try { render(engine.addIssue({ title, severity, note })); status("Issue recorded.", severity === "blocking" ? "error" : "watch"); }
      catch (error) { status(error.message, "error"); }
    });
    byId("pilotOperationsComplete")?.addEventListener("click", () => {
      try { render(engine.complete()); status("Pilot session completed.", "success"); }
      catch (error) { status(error.message, "error"); }
    });
    byId("pilotOperationsExport")?.addEventListener("click", () => {
      const payload = engine.exportRecord();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `blue-current-pilot-${payload.session.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      status("Pilot validation record downloaded.", "success");
    });

    eventBus.on("pilot-operations:updated", session => session && render(session));
    setTimeout(() => render(engine.refresh({ reason: "startup-settled" })), 450);
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.getSession() };
  }

  window.createBlueCurrentPilotOperationsCenterModule = createBlueCurrentPilotOperationsCenterModule;
})();
