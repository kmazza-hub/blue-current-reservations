(() => {
  "use strict";

  const HOST_KEY = "blueCurrent.hostStand.v35.0.4";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const STORAGE_KEY = "blueCurrent.reservationTimeline.v35.0.6";
  const byId = id => document.getElementById(id);

  const state = {
    window:"dinner",
    interval:15,
    selectedTime:null,
    seatingPlans:[]
  };

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (value && typeof value === "object") {
        state.window = value.window || "dinner";
        state.interval = Number.parseInt(value.interval,10) || 15;
        state.selectedTime = value.selectedTime || null;
        state.seatingPlans = Array.isArray(value.seatingPlans) ? value.seatingPlans : [];
      }
    } catch {}
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function readReservations() {
    try {
      const value = JSON.parse(localStorage.getItem(HOST_KEY));
      return Array.isArray(value?.arrivals)
        ? value.arrivals.filter(item => item.type === "reservation" && item.status !== "seated")
        : [];
    } catch {
      return [];
    }
  }

  function readFloorTables() {
    try {
      const value = JSON.parse(localStorage.getItem(FLOOR_KEY));
      return Array.isArray(value?.tables) ? value.tables : [];
    } catch {
      return [];
    }
  }

  function rangeForWindow() {
    if (state.window === "lunch") return [11 * 60, 15 * 60];
    if (state.window === "full-day") return [10 * 60, 23 * 60];
    return [17 * 60, 22 * 60];
  }

  function timeToMinutes(value) {
    const [hour, minute] = String(value || "00:00").split(":").map(Number);
    return hour * 60 + minute;
  }

  function minutesToTime(value) {
    const hour = Math.floor(value / 60);
    const minute = value % 60;
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return new Intl.DateTimeFormat("en-US", {
      hour:"numeric",
      minute:"2-digit"
    }).format(date);
  }

  function buildSlots() {
    const reservations = readReservations();
    const tables = readFloorTables();
    const [start,end] = rangeForWindow();
    const seats = tables.reduce((sum,table) => sum + (table.capacity || 0),0);
    const availableTables = tables.filter(table => table.status === "available").length;

    const slots = [];

    for (let minute = start; minute <= end; minute += state.interval) {
      const slotReservations = reservations.filter(item => {
        const arrival = timeToMinutes(item.time);
        return arrival >= minute && arrival < minute + state.interval;
      });

      const covers = slotReservations.reduce((sum,item) => sum + (item.partySize || 0),0);
      const largeParties = slotReservations.filter(item => (item.partySize || 0) >= 6).length;
      const pressure = Math.min(
        100,
        Math.round(
          (seats ? (covers / Math.max(1, seats * 0.22)) * 55 : covers * 8) +
          largeParties * 12 +
          Math.max(0, 4 - availableTables) * 5
        )
      );

      slots.push({
        minute,
        time:minutesToTime(minute),
        reservations:slotReservations.length,
        covers,
        largeParties,
        availableTables,
        pressure
      });
    }

    return slots;
  }

  function toneFor(pressure) {
    if (pressure >= 75) return "risk";
    if (pressure >= 52) return "watch";
    return "stable";
  }

  function selectedSlot(slots) {
    return slots.find(slot => slot.minute === state.selectedTime) || null;
  }

  function renderKPIs(slots) {
    const reservations = readReservations();
    const total = reservations.length;
    const covers = reservations.reduce((sum,item) => sum + (item.partySize || 0),0);
    const large = reservations.filter(item => (item.partySize || 0) >= 6).length;
    const peak = [...slots].sort((a,b) => b.pressure - a.pressure)[0];
    const tables = readFloorTables();
    const unassigned = reservations.filter(item =>
      !tables.some(table => table.capacity >= item.partySize && table.status !== "blocked")
    ).length;

    byId("reservationTimelineTotal").textContent = String(total);
    byId("reservationTimelineCovers").textContent = String(covers);
    byId("reservationTimelinePeak").textContent = peak?.time || "—";
    byId("reservationTimelineLargeParties").textContent = String(large);
    byId("reservationTimelineUnassigned").textContent = String(unassigned);

    const tone = toneFor(peak?.pressure || 0);
    byId("reservationTimelinePressure").dataset.tone = tone;
    byId("reservationTimelinePressureLabel").textContent =
      tone === "risk" ? "High" : tone === "watch" ? "Building" : "Stable";
    byId("reservationTimelinePressureDetail").textContent =
      tone === "risk"
        ? `${peak.time} is projected to exceed comfortable seating pace.`
        : tone === "watch"
          ? `${peak.time} requires a coordinated seating plan.`
          : "Reservation flow is balanced.";
  }

  function renderSlots(slots) {
    const container = byId("reservationTimelineSlots");
    container.replaceChildren();

    slots.forEach(slot => {
      const row = document.createElement("article");
      row.className = "reservation-timeline-slot";
      row.dataset.tone = toneFor(slot.pressure);
      row.classList.toggle("is-selected", slot.minute === state.selectedTime);

      const time = document.createElement("div");
      time.className = "reservation-timeline-time";
      time.textContent = slot.time;

      const track = document.createElement("div");
      track.className = "reservation-timeline-track";
      const fill = document.createElement("div");
      fill.className = "reservation-timeline-fill";
      fill.style.width = `${Math.max(4,slot.pressure)}%`;
      track.append(fill);

      const value = document.createElement("div");
      value.className = "reservation-timeline-slot-value";
      value.textContent = `${slot.covers} covers`;

      row.addEventListener("click", () => {
        state.selectedTime = slot.minute;
        save();
        render();
      });

      row.append(time,track,value);
      container.append(row);
    });
  }

  function renderInspector(slots) {
    const slot = selectedSlot(slots);

    if (!slot) {
      byId("reservationTimelineSelectedTime").textContent = "Choose a time";
      byId("reservationTimelineSelectedPressure").textContent = "No window selected";
      ["reservationTimelineSelectedReservations","reservationTimelineSelectedCovers","reservationTimelineSelectedTables","reservationTimelineSelectedWait"]
        .forEach(id => byId(id).textContent = "—");
      byId("reservationTimelineRecommendation").textContent = "Select a time window.";
      byId("reservationTimelineRecommendationDetail").textContent =
        "Blue Current will compare booked demand with current floor capacity.";
      return;
    }

    const projectedWait = Math.max(0, Math.round((slot.pressure - 45) * 0.65));
    const tone = toneFor(slot.pressure);

    byId("reservationTimelineSelectedTime").textContent = slot.time;
    byId("reservationTimelineSelectedPressure").textContent =
      `${tone === "risk" ? "High" : tone === "watch" ? "Moderate" : "Low"} pressure · ${slot.pressure}/100`;
    byId("reservationTimelineSelectedReservations").textContent = String(slot.reservations);
    byId("reservationTimelineSelectedCovers").textContent = String(slot.covers);
    byId("reservationTimelineSelectedTables").textContent = String(slot.availableTables);
    byId("reservationTimelineSelectedWait").textContent = `${projectedWait} min`;

    if (tone === "risk") {
      byId("reservationTimelineRecommendation").textContent =
        "Pre-assign tables and protect the host stand from clustered arrivals.";
      byId("reservationTimelineRecommendationDetail").textContent =
        `${slot.covers} covers are arriving in this interval. Hold flexible tables and avoid seating large walk-ins immediately before this window.`;
    } else if (tone === "watch") {
      byId("reservationTimelineRecommendation").textContent =
        "Stage the next two table turns before this arrival wave.";
      byId("reservationTimelineRecommendationDetail").textContent =
        `Coordinate floor resets and confirm large-party placement before ${slot.time}.`;
    } else {
      byId("reservationTimelineRecommendation").textContent =
        "Current reservation pacing is manageable.";
      byId("reservationTimelineRecommendationDetail").textContent =
        "Maintain normal seating rotation and preserve available tables for walk-ins.";
    }
  }

  function render() {
    const slots = buildSlots();

    if (state.selectedTime === null && slots[0]) {
      state.selectedTime = slots[0].minute;
      save();
    }

    renderKPIs(slots);
    renderSlots(slots);
    renderInspector(slots);

    byId("reservationTimelineUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function createSeatingPlan() {
    const slots = buildSlots();
    const slot = selectedSlot(slots);
    if (!slot) return;

    const plan = {
      id:`plan_${Date.now()}`,
      time:slot.time,
      reservations:slot.reservations,
      covers:slot.covers,
      pressure:slot.pressure,
      createdAt:new Date().toISOString()
    };

    state.seatingPlans.push(plan);
    save();

    byId("reservationTimelineStatus").textContent =
      `Seating plan created for ${slot.time}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:seating-plan-created", {
      detail:{ plan }
    }));
  }

  function bind() {
    byId("reservationTimelineWindow")?.addEventListener("change", event => {
      state.window = event.target.value;
      state.selectedTime = null;
      save();
      render();
    });

    byId("reservationTimelineInterval")?.addEventListener("change", event => {
      state.interval = Number.parseInt(event.target.value,10) || 15;
      state.selectedTime = null;
      save();
      render();
    });

    byId("reservationTimelineOpenHost")?.addEventListener("click", () => {
      byId("hostStandDashboard")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    byId("reservationTimelineCreatePlan")?.addEventListener("click", createSeatingPlan);

    window.addEventListener("bluecurrent:party-seated", render);
    window.addEventListener("bluecurrent:table-cleared", render);
  }

  function init() {
    if (!byId("reservationTimeline")) return;
    load();
    byId("reservationTimelineWindow").value = state.window;
    byId("reservationTimelineInterval").value = String(state.interval);
    bind();
    render();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
