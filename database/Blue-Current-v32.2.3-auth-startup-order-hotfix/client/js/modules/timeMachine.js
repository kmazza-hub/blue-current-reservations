/** Blue Current Time Machine — V15.6 */
function createTimeMachineModule(eventBus, appState) {
  const root = document.getElementById("time-machine");
  if (!root) return null;

  const slider = document.getElementById("timeMachineSlider");
  const playButton = document.getElementById("timeMachinePlay");
  const liveButton = document.getElementById("timeMachineLive");
  const eventList = document.getElementById("timeMachineEvents");
  const progressBar = document.getElementById("timeMachineProgressBar");
  const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };

  let playing = false;
  let timer = null;
  let liveState = appState.getState();
  let inPreview = false;

  const baseTables = appState.get("tables") || [];
  const updateTable = (tables, number, status, guest = undefined) => tables.map((table) =>
    table.tableNumber === number ? { ...table, status, guest: guest === undefined ? table.guest : guest } : table
  );

  const anthony = {
    guestName: "Anthony Russo",
    partySize: 4,
    time: "7:15 PM",
    occasion: "Birthday",
    note: "Tree nut allergy",
    vip: true
  };

  const snapshots = [
    {
      time: "6:00 PM", label: "Service opens", event: "Dinner service begins with healthy inventory.", stage: "Preparing",
      patch: { serviceStatus: "live", occupancyPercent: 42, reservationsToday: 206, callsAnswered: 161, estimatedRevenue: 28100, activeGuest: null, activeTable: null, executiveBrief: "Dinner service opened with balanced demand and healthy table inventory.", tables: baseTables }
    },
    {
      time: "6:18 PM", label: "Demand rises", event: "Waterfront demand accelerates before the first seating wave.", stage: "Building",
      patch: { occupancyPercent: 58, reservationsToday: 211, callsAnswered: 166, estimatedRevenue: 29400, executiveBrief: "Waterfront demand is building while the dining room remains flexible." }
    },
    {
      time: "6:42 PM", label: "Call answered", event: "Anthony Russo reaches the AI Concierge and is recognized instantly.", stage: "Call",
      patch: { callsAnswered: 167, activeGuest: { ...anthony, tier: "Premier guest" }, activeCall: { status: "active", guestName: "Anthony Russo" }, executiveBrief: "A returning premier guest is active in the Concierge journey." }
    },
    {
      time: "6:44 PM", label: "Table matched", event: "Table 14 is selected from constrained waterfront inventory.", stage: "Matched",
      patch: { activeTable: { tableNumber: 14, status: "reserved", guest: anthony }, tables: updateTable(baseTables, 14, "reserved", anthony), executiveBrief: "Table 14 matched to a premier birthday guest with allergy notes synchronized." }
    },
    {
      time: "6:45 PM", label: "Reservation confirmed", event: "Reservation confirmation updates every connected module.", stage: "Confirmed",
      patch: { occupancyPercent: 64, reservationsToday: 212, estimatedRevenue: 29820, activeCall: null, executiveBrief: "Anthony Russo confirmed for Table 14 at 7:15 PM. Estimated revenue increased by $420." }
    },
    {
      time: "7:14 PM", label: "Guest arrives", event: "The host team receives a synchronized arrival alert.", stage: "Arrived",
      patch: { occupancyPercent: 78, reservationsToday: 218, callsAnswered: 174, estimatedRevenue: 31200, executiveBrief: "Premier guest arrival recognized. Host and service teams are ready." }
    },
    {
      time: "7:18 PM", label: "Guest seated", event: "Table 14 transitions into active service.", stage: "Seated",
      patch: { occupancyPercent: 84, activeTable: { tableNumber: 14, status: "seated", guest: anthony }, tables: updateTable(baseTables, 14, "seated", anthony), executiveBrief: "Table 14 is seated. Occupancy is entering the peak service window." }
    },
    {
      time: "7:36 PM", label: "Dining underway", event: "The guest journey enters the dining experience.", stage: "Dining",
      patch: { occupancyPercent: 91, reservationsToday: 220, callsAnswered: 176, estimatedRevenue: 31800, activeTable: { tableNumber: 14, status: "dining", guest: anthony }, tables: updateTable(baseTables, 14, "dining", anthony), executiveBrief: "Peak service is underway at 91% occupancy. Protect flexible inventory and monitor table pacing." }
    },
    {
      time: "8:24 PM", label: "Follow-up scheduled", event: "A personalized return-visit message is queued automatically.", stage: "Follow-up",
      patch: { occupancyPercent: 86, estimatedRevenue: 32640, executiveBrief: "The guest journey completed successfully and personalized follow-up is scheduled." }
    }
  ];

  function renderEvents(activeIndex) {
    if (!eventList) return;
    eventList.innerHTML = snapshots.map((snapshot, index) => `
      <button type="button" class="time-machine-event${index === activeIndex ? " is-active" : ""}${index < activeIndex ? " is-past" : ""}" data-time-index="${index}">
        <time>${snapshot.time}</time><span><strong>${snapshot.label}</strong><small>${snapshot.event}</small></span>
      </button>`).join("");
  }

  function applySnapshot(index, options = {}) {
    const safeIndex = Math.max(0, Math.min(snapshots.length - 1, Number(index) || 0));
    const snapshot = snapshots[safeIndex];
    inPreview = true;
    appState.update(snapshot.patch);
    inPreview = false;
    if (slider) slider.value = String(safeIndex);
    setText("timeMachineTime", snapshot.time);
    setText("timeMachineLabel", snapshot.label);
    setText("timeMachineStage", snapshot.stage);
    setText("timeMachineOccupancy", `${snapshot.patch.occupancyPercent ?? appState.get("occupancyPercent")}%`);
    setText("timeMachineRevenue", `$${Number((snapshot.patch.estimatedRevenue ?? appState.get("estimatedRevenue")) || 0).toLocaleString()}`);
    setText("timeMachineReservations", Number((snapshot.patch.reservationsToday ?? appState.get("reservationsToday")) || 0).toLocaleString());
    if (progressBar) progressBar.style.width = `${(safeIndex / (snapshots.length - 1)) * 100}%`;
    renderEvents(safeIndex);
    eventBus.emit("time-machine:previewed", { index: safeIndex, snapshot, source: options.source || "scrubber" });
  }

  function stop() {
    playing = false;
    clearInterval(timer);
    timer = null;
    if (playButton) playButton.textContent = "Play service";
  }

  function play() {
    if (playing) { stop(); return; }
    liveState = appState.getState();
    playing = true;
    if (playButton) playButton.textContent = "Pause replay";
    let index = Number(slider?.value || 0);
    if (index >= snapshots.length - 1) index = 0;
    applySnapshot(index, { source: "playback" });
    timer = setInterval(() => {
      index += 1;
      applySnapshot(index, { source: "playback" });
      if (index >= snapshots.length - 1) stop();
    }, 1250);
  }

  function returnLive() {
    stop();
    inPreview = true;
    appState.update(liveState);
    inPreview = false;
    setText("timeMachineTime", "LIVE");
    setText("timeMachineLabel", "Current service restored");
    setText("timeMachineStage", "Live");
    if (progressBar) progressBar.style.width = "100%";
    eventBus.emit("time-machine:live-restored", { state: appState.getState() });
  }

  slider?.addEventListener("input", (event) => { stop(); applySnapshot(event.target.value); });
  playButton?.addEventListener("click", play);
  liveButton?.addEventListener("click", returnLive);
  eventList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-time-index]");
    if (!button) return;
    stop(); applySnapshot(button.dataset.timeIndex);
  });

  const unsubscribe = eventBus.on("state:updated", ({ state }) => {
    if (!inPreview && !playing) liveState = state;
  });

  renderEvents(0);
  applySnapshot(0, { source: "initial" });
  returnLive();

  return { play, stop, preview: applySnapshot, returnLive, destroy() { stop(); unsubscribe?.(); } };
}
window.createBlueCurrentTimeMachineModule = createTimeMachineModule;
