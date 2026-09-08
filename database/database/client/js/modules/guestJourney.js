/** Blue Current Guest Journey V15.5 */
function createGuestJourneyModule(eventBus, appState) {
  const root = document.getElementById("guest-journey-live");
  if (!root) return null;

  const stages = [
    { key: "call", label: "Call", detail: "Concierge answers", icon: "☎" },
    { key: "recognized", label: "Recognized", detail: "Profile loaded", icon: "◎" },
    { key: "matched", label: "Matched", detail: "Inventory found", icon: "⌁" },
    { key: "confirmed", label: "Confirmed", detail: "Reservation saved", icon: "✓" },
    { key: "arrived", label: "Arrived", detail: "Host notified", icon: "↘" },
    { key: "seated", label: "Seated", detail: "Table activated", icon: "▦" },
    { key: "dining", label: "Dining", detail: "Experience underway", icon: "✦" },
    { key: "followup", label: "Follow-up", detail: "Relationship continues", icon: "↗" }
  ];

  const eventToStage = {
    "concierge:call-started": "call",
    "guest:recognized": "recognized",
    "availability:matched": "matched",
    "reservation:confirmed": "confirmed",
    "guest:arrived": "arrived",
    "guest:seated": "seated",
    "dining:started": "dining",
    "followup:scheduled": "followup"
  };

  let currentIndex = -1;
  let timers = [];
  const history = [];
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  function now() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function renderStages() {
    const track = document.getElementById("guestJourneyTrack");
    if (!track) return;
    track.innerHTML = stages.map((stage, index) => `
      <article class="guest-journey-stage${index < currentIndex ? " is-complete" : ""}${index === currentIndex ? " is-active" : ""}" data-journey-stage="${stage.key}">
        <div class="guest-journey-node"><span>${stage.icon}</span></div>
        <div><small>${String(index + 1).padStart(2, "0")}</small><strong>${stage.label}</strong><p>${stage.detail}</p></div>
      </article>`).join("");
  }

  function addHistory(stageKey, payload = {}) {
    const stage = stages.find((item) => item.key === stageKey);
    if (!stage) return;
    const guestName = payload.guestName || payload.reservation?.guestName || appState.get("activeGuest")?.guestName || "Anthony Russo";
    const detailMap = {
      call: `${guestName}'s call was answered instantly.`,
      recognized: `${guestName}'s preferences and history were synchronized.`,
      matched: `Table ${payload.tableNumber || appState.get("activeTable")?.tableNumber || 14} was matched to the request.`,
      confirmed: `Reservation confirmed for ${payload.reservation?.reservationTime || "7:15 PM"}.`,
      arrived: `${guestName} arrived and the host team was alerted.`,
      seated: `${guestName} was seated at Table ${payload.tableNumber || 14}.`,
      dining: `The dining experience is now underway.`,
      followup: `A personalized follow-up and return-visit prompt were scheduled.`
    };
    history.push({ stage: stage.label, detail: detailMap[stageKey], time: now() });
    const list = document.getElementById("guestJourneyHistory");
    if (list) {
      list.innerHTML = history.slice(-5).reverse().map((item) => `<article><time>${item.time}</time><div><strong>${item.stage}</strong><p>${item.detail}</p></div></article>`).join("");
    }
  }

  function advance(stageKey, payload = {}) {
    const nextIndex = stages.findIndex((stage) => stage.key === stageKey);
    if (nextIndex < 0) return;
    currentIndex = Math.max(currentIndex, nextIndex);
    renderStages();
    addHistory(stageKey, payload);
    const state = appState.getState();
    const guest = payload.guestName || payload.reservation?.guestName || state.activeGuest?.guestName || "Anthony Russo";
    setText("guestJourneyGuest", guest);
    setText("guestJourneyCurrentStage", stages[currentIndex].label);
    setText("guestJourneyProgress", `${Math.round(((currentIndex + 1) / stages.length) * 100)}%`);
    const progress = document.getElementById("guestJourneyProgressBar");
    if (progress) progress.style.width = `${((currentIndex + 1) / stages.length) * 100}%`;
    eventBus.emit("guest-journey:advanced", { stage: stageKey, index: currentIndex, guestName: guest });
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function reset() {
    clearTimers();
    currentIndex = -1;
    history.length = 0;
    renderStages();
    setText("guestJourneyGuest", "Waiting for guest");
    setText("guestJourneyCurrentStage", "Not started");
    setText("guestJourneyProgress", "0%");
    const progress = document.getElementById("guestJourneyProgressBar");
    if (progress) progress.style.width = "0%";
    const list = document.getElementById("guestJourneyHistory");
    if (list) list.innerHTML = `<div class="guest-journey-empty"><span>⌁</span><p>Run the live journey to watch one guest move from first contact to return visit.</p></div>`;
  }

  function runFullJourney() {
    reset();
    const guest = { guestName: "Anthony Russo", tableNumber: 14 };
    const sequence = [
      [0, "concierge:call-started", { ...guest, guestType: "returning" }],
      [900, "guest:recognized", { ...guest, tier: "Premier guest", preferences: ["Waterfront", "Quiet table"] }],
      [1800, "availability:matched", { ...guest, offeredTime: "7:15 PM" }],
      [2800, "reservation:confirmed", { reservation: { id: `journey-${Date.now()}`, ...guest, partySize: 4, reservationTime: "7:15 PM", occasion: "Birthday" }, occupancyPercent: 84, revenueImpact: 420, executiveBrief: "Premier birthday guest confirmed for Table 14." }],
      [4300, "guest:arrived", guest],
      [5600, "guest:seated", guest],
      [7000, "dining:started", guest],
      [8700, "followup:scheduled", { ...guest, channel: "SMS", sendAt: "Tomorrow 10:00 AM" }]
    ];
    sequence.forEach(([delay, eventName, payload]) => timers.push(setTimeout(() => {
      eventBus.emit(eventName, payload);
      if (eventName === "guest:arrived") eventBus.emit("table:presentation-state", { tableNumber: 14, status: "reserved" });
      if (eventName === "guest:seated") eventBus.emit("table:presentation-state", { tableNumber: 14, status: "seated" });
      if (eventName === "dining:started") eventBus.emit("table:presentation-state", { tableNumber: 14, status: "dining" });
    }, delay)));
  }

  const unsubs = Object.entries(eventToStage).map(([eventName, stage]) => eventBus.on(eventName, (payload) => advance(stage, payload)));
  unsubs.push(eventBus.on("state:reset", reset));
  document.getElementById("guestJourneyPlay")?.addEventListener("click", runFullJourney);
  document.getElementById("guestJourneyReset")?.addEventListener("click", reset);
  reset();

  return { run: runFullJourney, reset, destroy() { clearTimers(); unsubs.forEach((fn) => fn?.()); } };
}
window.createBlueCurrentGuestJourneyModule = createGuestJourneyModule;
