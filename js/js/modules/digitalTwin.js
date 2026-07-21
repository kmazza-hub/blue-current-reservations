/** Blue Current Digital Twin 2.0 — V15.4 */
function createDigitalTwinModule(eventBus, appState) {
  if (!eventBus) throw new Error("Digital Twin module requires an Event Bus.");

  const STATUSES = ["available", "reserved", "seated", "dining", "reset"];
  const floorTables = [...document.querySelectorAll(".floor-table[data-table]")];
  const selected = { tableNumber: 14 };

  const guestDirectory = {
    14: { guestName: "Anthony Russo", partySize: 4, time: "7:15 PM", occasion: "Birthday", note: "Tree nut allergy", vip: true }
  };

  const initialTables = floorTables.map((node) => {
    const status = STATUSES.find((name) => node.classList.contains(name)) || "available";
    const tableNumber = Number(node.dataset.table);
    const capacity = Number((node.querySelector("small")?.textContent || "0").match(/\d+/)?.[0] || 0);
    return { tableNumber, capacity, status, guest: guestDirectory[tableNumber] || null };
  });

  const getTables = () => appState?.get("tables") || initialTables;
  const getTable = (number) => getTables().find((table) => table.tableNumber === Number(number));

  function occupancyFrom(tables) {
    const occupied = tables.filter((table) => ["seated", "dining"].includes(table.status));
    const totalSeats = tables.reduce((sum, table) => sum + table.capacity, 0);
    const occupiedSeats = occupied.reduce((sum, table) => sum + (table.guest?.partySize || table.capacity), 0);
    return {
      occupancyPercent: totalSeats ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
      guestsDining: occupiedSeats
    };
  }

  function renderDetail(table) {
    if (!table) return;
    selected.tableNumber = table.tableNumber;
    const guest = table.guest;
    const statusLabel = table.status.charAt(0).toUpperCase() + table.status.slice(1);
    const statusWithTime = guest?.time && table.status === "reserved" ? `${statusLabel} · ${guest.time}` : statusLabel;

    const set = (id, text) => { const node = document.getElementById(id); if (node) node.textContent = text; };
    set("floorDetailTable", `Table ${table.tableNumber}`);
    set("floorDetailStatus", statusWithTime);
    set("floorDetailGuest", guest ? `${guest.guestName} · Party of ${guest.partySize}` : "No guest assigned");
    set("floorDetailNote", guest ? [guest.occasion, guest.note].filter(Boolean).join(" · ") : table.status === "available" ? "Ready for assignment" : "Service notes available");

    document.querySelectorAll("#floorStatusControls [data-table-status]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tableStatus === table.status);
    });
  }

  function renderTable(table) {
    const nodes = document.querySelectorAll(`.floor-table[data-table="${table.tableNumber}"], .host-table[data-table="${table.tableNumber}"], #targetTable[data-table="${table.tableNumber}"]`);
    nodes.forEach((node) => {
      STATUSES.forEach((status) => node.classList.remove(status));
      node.classList.add(table.status);
      node.dataset.liveStatus = table.status;
      node.classList.toggle("vip", Boolean(table.guest?.vip));
      if (node.classList.contains("floor-table")) {
        const small = node.querySelector("small");
        if (small) small.textContent = table.guest?.vip ? `${table.capacity} · VIP` : String(table.capacity);
      }
    });
  }

  function renderAll(tables = getTables()) {
    tables.forEach(renderTable);
    const current = tables.find((table) => table.tableNumber === selected.tableNumber) || tables[0];
    renderDetail(current);
    const { occupancyPercent, guestsDining } = occupancyFrom(tables);
    const occupancy = document.getElementById("twinOccupancy");
    const guests = document.getElementById("twinGuests");
    if (occupancy) occupancy.textContent = `${occupancyPercent}%`;
    if (guests) guests.textContent = String(guestsDining);
  }

  function commitTable(number, status, options = {}) {
    if (!STATUSES.includes(status)) return false;
    const tables = getTables();
    const current = tables.find((table) => table.tableNumber === Number(number));
    if (!current) return false;
    const guest = options.guest !== undefined ? options.guest : current.guest;
    const updated = { ...current, status, guest };
    const nextTables = tables.map((table) => table.tableNumber === updated.tableNumber ? updated : table);
    const metrics = occupancyFrom(nextTables);

    appState?.update({
      tables: nextTables,
      activeTable: updated,
      occupancyPercent: metrics.occupancyPercent,
      lastOperationalEvent: {
        type: "table:status-changed",
        occurredAt: new Date().toISOString(),
        tableNumber: updated.tableNumber,
        status
      }
    });

    renderAll(nextTables);
    const node = document.querySelector(`.floor-table[data-table="${updated.tableNumber}"]`);
    node?.classList.add("is-updating");
    setTimeout(() => node?.classList.remove("is-updating"), 750);

    eventBus.emit("table:status-changed", { table: updated, ...metrics, source: options.source || "digital-twin" });
    eventBus.emit("occupancy:updated", { occupancyPercent: metrics.occupancyPercent });
    return true;
  }

  floorTables.forEach((node) => {
    node.addEventListener("click", () => {
      floorTables.forEach((table) => table.classList.remove("selected"));
      node.classList.add("selected");
      renderDetail(getTable(Number(node.dataset.table)));
      eventBus.emit("table:selected", { tableNumber: Number(node.dataset.table) });
    });
  });

  document.querySelectorAll("#floorStatusControls [data-table-status]").forEach((button) => {
    button.addEventListener("click", () => commitTable(selected.tableNumber, button.dataset.tableStatus));
  });

  const unsubscribers = [
    eventBus.on("table:assigned", (assignment) => {
      const guest = {
        ...(guestDirectory[assignment.tableNumber] || {}),
        guestName: assignment.guestName || guestDirectory[assignment.tableNumber]?.guestName || "Reserved guest",
        partySize: assignment.partySize || guestDirectory[assignment.tableNumber]?.partySize || 2,
        time: assignment.time || guestDirectory[assignment.tableNumber]?.time || "7:15 PM",
        occasion: assignment.occasion || guestDirectory[assignment.tableNumber]?.occasion,
        note: assignment.note || guestDirectory[assignment.tableNumber]?.note,
        vip: assignment.vip ?? guestDirectory[assignment.tableNumber]?.vip ?? false
      };
      commitTable(assignment.tableNumber, assignment.status || "reserved", { guest, source: "reservation" });
      const recommendation = document.getElementById("hostRecommendation");
      if (recommendation) recommendation.textContent = `Table ${assignment.tableNumber} assigned for ${guest.time}`;
    }),
    eventBus.on("table:presentation-state", ({ tableNumber, status }) => commitTable(tableNumber, status, { source: "presentation" })),
    eventBus.on("state:reset", () => renderAll(initialTables))
  ];

  if (appState && !appState.get("tables")) appState.set("tables", initialTables);
  renderAll();
  document.querySelector(`.floor-table[data-table="${selected.tableNumber}"]`)?.classList.add("selected");

  return {
    setTableStatus: commitTable,
    selectTable(number) { renderDetail(getTable(number)); },
    getTables,
    destroy() { unsubscribers.forEach((unsubscribe) => unsubscribe()); }
  };
}

window.createBlueCurrentDigitalTwinModule = createDigitalTwinModule;
