/** Blue Current Digital Twin module */
function createDigitalTwinModule(eventBus) {
  if (!eventBus) throw new Error("Digital Twin module requires an Event Bus.");

  const setTableState = (tableNumber, status = "reserved") => {
    const selectors = [
      `.floor-table[data-table="${tableNumber}"]`,
      `.host-table[data-table="${tableNumber}"]`,
      `#targetTable[data-table="${tableNumber}"]`
    ];
    selectors.forEach((selector) => {
      const table = document.querySelector(selector);
      if (!table) return;
      table.classList.remove("available", "reserved", "seated", "dining", "reset", "cleaning");
      table.classList.add(status, "selected");
    });
  };

  const pulse = (node) => {
    if (!node) return;
    node.classList.remove("is-updating");
    void node.offsetWidth;
    node.classList.add("is-updating");
    setTimeout(() => node.classList.remove("is-updating"), 700);
  };

  const unsubscribers = [
    eventBus.on("table:assigned", (table) => {
      setTableState(table.tableNumber, table.status || "reserved");
      pulse(document.getElementById("targetTable"));
      const recommendation = document.getElementById("hostRecommendation");
      if (recommendation) recommendation.textContent = `Table ${table.tableNumber} assigned for 7:15 PM`;
    }),
    eventBus.on("occupancy:updated", ({ occupancyPercent }) => {
      const label = document.getElementById("occupancyLabel");
      if (label) label.textContent = `${occupancyPercent}% occupied`;
      const twin = document.getElementById("twinOccupancy");
      if (twin) twin.textContent = `${occupancyPercent}%`;
      pulse(label);
      pulse(twin);
    })
  ];

  return { destroy: () => unsubscribers.forEach((unsubscribe) => unsubscribe()) };
}

window.createBlueCurrentDigitalTwinModule = createDigitalTwinModule;
