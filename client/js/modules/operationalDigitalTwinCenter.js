(function () {
  "use strict";

  function createBlueCurrentOperationalDigitalTwinCenterModule(eventBus, appState) {
    const root = document.getElementById("operationalDigitalTwinCenter");
    if (!root || !window.BlueCurrentOperationalDigitalTwinEngine) return null;
    const engine = new window.BlueCurrentOperationalDigitalTwinEngine({ eventBus, appState });
    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
    const titleCase = value => String(value || "").replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
    let selectedTable = null;

    function renderTables(snapshot) {
      const list = byId("digitalTwinTableGrid");
      if (!list) return;
      if (!snapshot.tables.some(table => table.tableNumber === selectedTable)) selectedTable = snapshot.tables[0]?.tableNumber || null;
      list.innerHTML = snapshot.tables.map(table => `
        <button type="button" class="digital-twin-table status-${escapeHtml(table.status)} risk-${escapeHtml(table.risk)} ${table.tableNumber === selectedTable ? "is-selected" : ""}" data-digital-twin-table="${table.tableNumber}">
          <strong>${table.tableNumber}</strong><span>${escapeHtml(titleCase(table.status))}</span><small>${table.partySize ? `${table.partySize} guests` : `${table.capacity} seats`}</small>
        </button>`).join("");
    }

    function renderInspector(snapshot) {
      const table = snapshot.tables.find(item => item.tableNumber === selectedTable) || snapshot.tables[0];
      byId("digitalTwinSelectedTable").textContent = table ? `Table ${table.tableNumber}` : "No table selected";
      byId("digitalTwinSelectedStatus").textContent = table ? titleCase(table.status) : "—";
      byId("digitalTwinSelectedZone").textContent = table?.zone || "—";
      byId("digitalTwinSelectedParty").textContent = table?.partySize ? `${table.partySize} guests` : "No active party";
      byId("digitalTwinSelectedElapsed").textContent = table?.elapsedMinutes ? `${table.elapsedMinutes} min` : "—";
      byId("digitalTwinSelectedTurn").textContent = table?.predictedTurnMinutes != null ? `${table.predictedTurnMinutes} min` : "—";
      byId("digitalTwinSelectedRisk").textContent = table ? titleCase(table.risk) : "—";
    }

    function renderZones(snapshot) {
      const list = byId("digitalTwinZones");
      if (!list) return;
      list.innerHTML = snapshot.zones.map(zone => `<article><span><strong>${escapeHtml(zone.name)}</strong><small>${zone.occupied}/${zone.tables} occupied · ${zone.atRisk} at risk</small></span><b>${zone.occupancyPercent}%</b></article>`).join("");
    }

    function renderKitchen(snapshot) {
      const list = byId("digitalTwinKitchenStations");
      if (!list) return;
      list.innerHTML = snapshot.kitchen.stations.map(station => `<article class="status-${escapeHtml(station.status)}"><span><strong>${escapeHtml(station.name)}</strong><small>${station.ticketMinutes} min tickets</small></span><div><i style="width:${station.load}%"></i></div><b>${station.load}%</b></article>`).join("");
    }

    function renderStaff(snapshot) {
      const list = byId("digitalTwinStaffRoles");
      if (!list) return;
      list.innerHTML = snapshot.staff.roles.map(role => `<article><span><strong>${escapeHtml(role.role)}</strong><small>${role.active}/${role.scheduled} active</small></span><b>${role.utilization}%</b></article>`).join("");
    }

    function render(snapshot = engine.snapshot()) {
      byId("digitalTwinHealthScore").textContent = snapshot.health.score;
      byId("digitalTwinHealthBand").textContent = titleCase(snapshot.health.band);
      byId("digitalTwinOccupiedCount").textContent = snapshot.summary.occupiedTables;
      byId("digitalTwinGuestsCount").textContent = snapshot.summary.guestsInService;
      byId("digitalTwinTurningCount").textContent = snapshot.summary.turningTables;
      byId("digitalTwinKitchenLoad").textContent = `${snapshot.kitchen.load}%`;
      byId("digitalTwinStaffCount").textContent = `${snapshot.staff.active}/${snapshot.staff.scheduled}`;
      byId("digitalTwinWorkflowCount").textContent = snapshot.summary.activeWorkflows;
      byId("digitalTwinUpdated").textContent = `Updated ${new Date(snapshot.capturedAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit", second:"2-digit"})}`;
      byId("digitalTwinForecastArrivals").textContent = snapshot.forecast.expectedArrivals;
      byId("digitalTwinForecastTurns").textContent = snapshot.forecast.expectedTurns;
      byId("digitalTwinForecastOccupancy").textContent = `${snapshot.forecast.projectedOccupancy}%`;
      byId("digitalTwinForecastKitchen").textContent = `${snapshot.forecast.projectedKitchenLoad}%`;
      byId("digitalTwinForecastConstraint").textContent = snapshot.forecast.likelyConstraint;
      byId("digitalTwinForecastNarrative").textContent = snapshot.forecast.narrative;
      renderTables(snapshot); renderInspector(snapshot); renderZones(snapshot); renderKitchen(snapshot); renderStaff(snapshot);
    }

    root.addEventListener("click", event => {
      const table = event.target.closest("[data-digital-twin-table]");
      if (table) { selectedTable = Number(table.dataset.digitalTwinTable); render(engine.snapshot()); }
    });
    byId("digitalTwinRefresh")?.addEventListener("click", () => render(engine.refresh({ reason: "manual" })));
    eventBus.on("digital-twin:updated", render);
    render(engine.refresh({ reason: "module-start" }));
    return { engine, refresh: () => render(engine.refresh({ reason: "module-refresh" })), getState: () => engine.snapshot() };
  }

  window.createBlueCurrentOperationalDigitalTwinCenterModule = createBlueCurrentOperationalDigitalTwinCenterModule;
})();
