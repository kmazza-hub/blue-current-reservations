(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.hostStand.v35.0.4";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const byId = id => document.getElementById(id);

  const seedArrivals = [
    {
      id:"arr_1",
      name:"The Parker Party",
      partySize:4,
      type:"reservation",
      time:"17:30",
      status:"upcoming",
      vip:true,
      notes:"Anniversary. Prefers a quiet table."
    },
    {
      id:"arr_2",
      name:"Lopez",
      partySize:2,
      type:"walk-in",
      time:"17:42",
      status:"checked-in",
      vip:false,
      notes:"Bar seating is acceptable."
    },
    {
      id:"arr_3",
      name:"Bennett",
      partySize:6,
      type:"reservation",
      time:"18:00",
      status:"upcoming",
      vip:false,
      notes:"High chair requested."
    },
    {
      id:"arr_4",
      name:"Kim",
      partySize:3,
      type:"walk-in",
      time:"17:48",
      status:"checked-in",
      vip:true,
      notes:"Returning guest."
    }
  ];

  const state = {
    filter:"all",
    arrivals:[]
  };

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.arrivals = Array.isArray(value?.arrivals) && value.arrivals.length
        ? value.arrivals
        : seedArrivals.map(item => ({...item}));
      state.filter = value?.filter || "all";
    } catch {
      state.arrivals = seedArrivals.map(item => ({...item}));
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      filter:state.filter,
      arrivals:state.arrivals
    }));
  }

  function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function timeMinutes(value) {
    const [hours, minutes] = String(value || "00:00").split(":").map(Number);
    return hours * 60 + minutes;
  }

  function waitMinutes(arrival) {
    if (arrival.status !== "checked-in") return 0;
    return Math.max(0, nowMinutes() - timeMinutes(arrival.time));
  }

  function visibleArrivals() {
    if (state.filter === "all") return state.arrivals;
    if (state.filter === "vip") return state.arrivals.filter(item => item.vip);
    if (state.filter === "walk-in") return state.arrivals.filter(item => item.type === "walk-in");
    return state.arrivals.filter(item => item.status === state.filter);
  }

  function readFloorTables() {
    try {
      const value = JSON.parse(localStorage.getItem(FLOOR_KEY));
      return Array.isArray(value?.tables) ? value.tables : [];
    } catch {
      return [];
    }
  }

  function availableTableFor(arrival) {
    return readFloorTables()
      .filter(table => table.status === "available" && table.capacity >= arrival.partySize)
      .sort((a,b) => a.capacity - b.capacity)[0] || null;
  }

  function pressureTone() {
    const waiting = state.arrivals.filter(item => item.status === "checked-in");
    const available = readFloorTables().filter(table => table.status === "available").length;

    if (waiting.length >= 4 || (waiting.length >= 2 && available === 0)) return "risk";
    if (waiting.length >= 2 || available <= 2) return "watch";
    return "stable";
  }

  function renderKPIs() {
    const now = nowMinutes();
    const upcoming = state.arrivals.filter(item => {
      if (item.status !== "upcoming") return false;
      const delta = timeMinutes(item.time) - now;
      return delta >= 0 && delta <= 60;
    }).length;
    const checkedIn = state.arrivals.filter(item => item.status === "checked-in").length;
    const walkIns = state.arrivals.filter(item => item.type === "walk-in" && item.status !== "seated").length;
    const vips = state.arrivals.filter(item => item.vip && item.status !== "seated").length;
    const waits = state.arrivals.filter(item => item.status === "checked-in").map(waitMinutes);
    const average = waits.length ? Math.round(waits.reduce((sum,value) => sum + value,0) / waits.length) : 0;

    byId("hostStandUpcomingCount").textContent = String(upcoming);
    byId("hostStandCheckedInCount").textContent = String(checkedIn);
    byId("hostStandWalkInCount").textContent = String(walkIns);
    byId("hostStandVipCount").textContent = String(vips);
    byId("hostStandAverageWait").textContent = `${average} min`;

    const tone = pressureTone();
    const wrap = byId("hostStandPressure");
    wrap.dataset.tone = tone;

    byId("hostStandPressureLabel").textContent =
      tone === "risk" ? "High" : tone === "watch" ? "Building" : "Stable";
    byId("hostStandPressureDetail").textContent =
      tone === "risk"
        ? "Guest demand is exceeding current table availability."
        : tone === "watch"
          ? "Arrival pace is building. Prepare the next available tables."
          : "Guest flow is manageable.";
  }

  function render() {
    const list = byId("hostStandArrivalList");
    if (!list) return;

    renderKPIs();
    list.replaceChildren();

    const arrivals = visibleArrivals()
      .sort((a,b) => timeMinutes(a.time) - timeMinutes(b.time));

    if (!arrivals.length) {
      const empty = document.createElement("div");
      empty.className = "host-stand-empty";
      empty.textContent = "No arrivals match this view.";
      list.append(empty);
      return;
    }

    arrivals.forEach(arrival => {
      const card = document.createElement("article");
      card.className = "host-stand-arrival-card";
      card.dataset.status = arrival.status;
      card.classList.toggle("is-vip", arrival.vip);

      const copy = document.createElement("div");
      copy.className = "host-stand-arrival-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p><div class='host-stand-arrival-meta'></div>";
      copy.querySelector("small").textContent =
        `${arrival.type === "walk-in" ? "Walk-in" : "Reservation"} · ${arrival.time}`;
      copy.querySelector("strong").textContent = arrival.name;
      copy.querySelector("p").textContent = arrival.notes || "No guest notes.";

      const meta = copy.querySelector(".host-stand-arrival-meta");
      const table = availableTableFor(arrival);
      [
        `${arrival.partySize} guests`,
        arrival.vip ? "VIP" : "Standard",
        arrival.status === "checked-in" ? `${waitMinutes(arrival)} min waiting` : arrival.status,
        table ? `Best table: ${table.name}` : "No matching table"
      ].forEach(value => {
        const chip = document.createElement("span");
        chip.textContent = value;
        meta.append(chip);
      });

      const actions = document.createElement("div");
      actions.className = "host-stand-arrival-actions";

      if (arrival.status === "upcoming") {
        const checkIn = document.createElement("button");
        checkIn.type = "button";
        checkIn.className = "host-stand-arrival-secondary";
        checkIn.textContent = "Check in";
        checkIn.addEventListener("click", () => updateStatus(arrival.id,"checked-in"));
        actions.append(checkIn);
      }

      if (arrival.status === "checked-in") {
        const seat = document.createElement("button");
        seat.type = "button";
        seat.className = "host-stand-arrival-primary";
        seat.textContent = table ? `Seat at ${table.name}` : "No table ready";
        seat.disabled = !table;
        seat.addEventListener("click", () => seatArrival(arrival,table));
        actions.append(seat);
      }

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "host-stand-arrival-secondary";
      remove.textContent = arrival.status === "seated" ? "Archive" : "Remove";
      remove.addEventListener("click", () => removeArrival(arrival.id));
      actions.append(remove);

      card.append(copy, actions);
      list.append(card);
    });

    byId("hostStandUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function updateStatus(id,status) {
    const arrival = state.arrivals.find(item => item.id === id);
    if (!arrival) return;
    arrival.status = status;
    if (status === "checked-in") {
      const now = new Date();
      arrival.time = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    }
    save();
    render();
  }

  function seatArrival(arrival,table) {
    if (!arrival || !table) return;

    try {
      const floor = JSON.parse(localStorage.getItem(FLOOR_KEY));
      const target = floor?.tables?.find(item => item.id === table.id);

      if (target) {
        target.status = "occupied";
        target.guests = arrival.partySize;
        target.stage = "waiting";
        target.seatedAt = new Date().toISOString();
        localStorage.setItem(FLOOR_KEY, JSON.stringify(floor));
      }
    } catch {}

    arrival.status = "seated";
    arrival.seatedTable = table.name;
    save();
    render();

    byId("hostStandStatus").textContent =
      `${arrival.name} seated at ${table.name}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:party-seated", {
      detail:{
        arrival:{...arrival},
        table:{...table}
      }
    }));
  }

  function removeArrival(id) {
    state.arrivals = state.arrivals.filter(item => item.id !== id);
    save();
    render();
  }

  function addGuest() {
    const name = byId("hostStandGuestName").value.trim();
    const partySize = Number.parseInt(byId("hostStandPartySize").value,10) || 1;
    const type = byId("hostStandArrivalType").value;
    const time = byId("hostStandArrivalTime").value || (() => {
      const now = new Date();
      return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    })();
    const notes = byId("hostStandGuestNotes").value.trim();
    const vip = byId("hostStandVip").checked;

    if (!name) {
      byId("hostStandStatus").textContent = "Enter a guest name.";
      return;
    }

    state.arrivals.push({
      id:`arr_${Date.now()}`,
      name,
      partySize,
      type,
      time,
      status:type === "walk-in" ? "checked-in" : "upcoming",
      vip,
      notes
    });

    save();
    render();

    byId("hostStandGuestName").value = "";
    byId("hostStandPartySize").value = "2";
    byId("hostStandGuestNotes").value = "";
    byId("hostStandVip").checked = false;
    byId("hostStandStatus").textContent = `${name} added to the host stand.`;
  }

  function bind() {
    byId("hostStandFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("hostStandAddGuest")?.addEventListener("click", addGuest);

    window.addEventListener("bluecurrent:table-cleared", () => {
      render();
      byId("hostStandStatus").textContent = "A table is now available.";
    });
  }

  function init() {
    if (!byId("hostStandDashboard")) return;
    load();
    byId("hostStandFilter").value = state.filter;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
