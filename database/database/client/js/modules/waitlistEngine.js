(() => {
  "use strict";

  const HOST_KEY = "blueCurrent.hostStand.v35.0.4";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const WAITLIST_KEY = "blueCurrent.waitlist.v35.0.5";
  const byId = id => document.getElementById(id);

  const state = {
    selectedId:null,
    sort:"priority",
    waitlist:[]
  };

  function loadHostArrivals() {
    try {
      const value = JSON.parse(localStorage.getItem(HOST_KEY));
      return Array.isArray(value?.arrivals) ? value.arrivals : [];
    } catch {
      return [];
    }
  }

  function saveHostArrivals(arrivals) {
    let host = {};
    try {
      host = JSON.parse(localStorage.getItem(HOST_KEY)) || {};
    } catch {}
    host.arrivals = arrivals;
    localStorage.setItem(HOST_KEY, JSON.stringify(host));
  }

  function loadFloor() {
    try {
      return JSON.parse(localStorage.getItem(FLOOR_KEY)) || { tables:[] };
    } catch {
      return { tables:[] };
    }
  }

  function saveFloor(floor) {
    localStorage.setItem(FLOOR_KEY, JSON.stringify(floor));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(WAITLIST_KEY));
      state.selectedId = saved?.selectedId || null;
      state.sort = saved?.sort || "priority";
      state.waitlist = Array.isArray(saved?.waitlist) ? saved.waitlist : [];
    } catch {}

    syncFromHost();
  }

  function save() {
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(state));
  }

  function syncFromHost() {
    const hostArrivals = loadHostArrivals().filter(item => item.status === "checked-in");

    hostArrivals.forEach(arrival => {
      if (!state.waitlist.some(item => item.id === arrival.id)) {
        state.waitlist.push({
          id:arrival.id,
          name:arrival.name,
          partySize:arrival.partySize,
          vip:Boolean(arrival.vip),
          notes:arrival.notes || "",
          checkedInAt:new Date().toISOString(),
          quotedWait:estimateQuote(arrival.partySize),
          notified:false,
          ready:false
        });
      }
    });

    const activeIds = new Set(hostArrivals.map(item => item.id));
    state.waitlist = state.waitlist.filter(item => activeIds.has(item.id));

    if (!state.selectedId && state.waitlist[0]) {
      state.selectedId = state.waitlist[0].id;
    }
    save();
  }

  function elapsedMinutes(item) {
    return Math.max(0, Math.round((Date.now() - new Date(item.checkedInAt).getTime()) / 60000));
  }

  function availableTables() {
    return loadFloor().tables
      .filter(table => table.status === "available")
      .sort((a,b) => a.capacity - b.capacity);
  }

  function bestTable(item) {
    return availableTables().find(table => table.capacity >= item.partySize) || null;
  }

  function estimateQuote(partySize) {
    const tables = availableTables();
    const directMatch = tables.find(table => table.capacity >= partySize);
    if (directMatch) return 5;

    const pressure = state.waitlist?.length || 0;
    const base = partySize >= 6 ? 35 : partySize >= 4 ? 25 : 15;
    return Math.min(90, base + pressure * 5);
  }

  function priorityScore(item) {
    const wait = elapsedMinutes(item);
    const fit = bestTable(item) ? 20 : 0;
    const vip = item.vip ? 25 : 0;
    const overdue = Math.max(0, wait - item.quotedWait) * 2;
    const sizePenalty = item.partySize >= 6 ? -5 : 0;
    return wait + fit + vip + overdue + sizePenalty;
  }

  function priorityLabel(item) {
    if (item.vip) return "VIP";
    if (elapsedMinutes(item) > item.quotedWait) return "High";
    if (bestTable(item)) return "Ready";
    return "Standard";
  }

  function sortedWaitlist() {
    const rows = [...state.waitlist];

    if (state.sort === "oldest") {
      rows.sort((a,b) => elapsedMinutes(b) - elapsedMinutes(a));
    } else if (state.sort === "party-size") {
      rows.sort((a,b) => b.partySize - a.partySize);
    } else if (state.sort === "shortest-fit") {
      rows.sort((a,b) => {
        const tableA = bestTable(a);
        const tableB = bestTable(b);
        const wasteA = tableA ? tableA.capacity - a.partySize : 99;
        const wasteB = tableB ? tableB.capacity - b.partySize : 99;
        return wasteA - wasteB;
      });
    } else {
      rows.sort((a,b) => priorityScore(b) - priorityScore(a));
    }

    return rows;
  }

  function selectedParty() {
    return state.waitlist.find(item => item.id === state.selectedId) || null;
  }

  function renderKPIs() {
    const active = state.waitlist.length;
    const averageQuote = active
      ? Math.round(state.waitlist.reduce((sum,item) => sum + item.quotedWait,0) / active)
      : 0;
    const longest = active
      ? Math.max(...state.waitlist.map(elapsedMinutes))
      : 0;
    const ready = state.waitlist.filter(item => bestTable(item)).length;
    const texted = state.waitlist.filter(item => item.notified).length;

    byId("waitlistActiveCount").textContent = String(active);
    byId("waitlistAverageQuote").textContent = `${averageQuote} min`;
    byId("waitlistLongestWait").textContent = `${longest} min`;
    byId("waitlistReadyCount").textContent = String(ready);
    byId("waitlistTextedCount").textContent = String(texted);

    const tone = active >= 6 || longest >= 45
      ? "risk"
      : active >= 3 || longest >= 25
        ? "watch"
        : "stable";

    byId("waitlistPressure").dataset.tone = tone;
    byId("waitlistPressureLabel").textContent =
      tone === "risk" ? "High" : tone === "watch" ? "Building" : "Stable";
    byId("waitlistPressureDetail").textContent =
      tone === "risk"
        ? "Current queue is outpacing available seating."
        : tone === "watch"
          ? "Wait times are building. Prepare the next table turns."
          : "Current seating capacity can absorb demand.";
  }

  function renderList() {
    const list = byId("waitlistList");
    list.replaceChildren();

    const rows = sortedWaitlist();

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "waitlist-empty";
      empty.textContent = "No checked-in parties are currently waiting.";
      list.append(empty);
      return;
    }

    rows.forEach(item => {
      const table = bestTable(item);
      const card = document.createElement("article");
      card.className = "waitlist-party-card";
      card.classList.toggle("is-selected", item.id === state.selectedId);
      card.dataset.priority = item.vip ? "vip" : elapsedMinutes(item) > item.quotedWait ? "high" : "normal";

      const copy = document.createElement("div");
      copy.className = "waitlist-party-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p><div class='waitlist-party-meta-inline'></div>";
      copy.querySelector("small").textContent = `${item.partySize} guests · ${priorityLabel(item)}`;
      copy.querySelector("strong").textContent = item.name;
      copy.querySelector("p").textContent = item.notes || "No host notes.";

      const meta = copy.querySelector(".waitlist-party-meta-inline");
      [
        `${elapsedMinutes(item)} min waiting`,
        table ? `Best fit: ${table.name}` : "No matching table",
        item.notified ? "Guest texted" : "Not texted"
      ].forEach(value => {
        const chip = document.createElement("span");
        chip.textContent = value;
        meta.append(chip);
      });

      const quote = document.createElement("div");
      quote.className = "waitlist-party-quote";
      quote.textContent = `${item.quotedWait} min`;
      const quoteStatus = document.createElement("span");
      quoteStatus.textContent = elapsedMinutes(item) > item.quotedWait ? "Over quote" : "Quoted wait";
      quote.append(quoteStatus);

      card.addEventListener("click", () => {
        state.selectedId = item.id;
        save();
        render();
      });

      card.append(copy, quote);
      list.append(card);
    });
  }

  function renderInspector() {
    const item = selectedParty();

    if (!item) {
      byId("waitlistPartyName").textContent = "Choose a party";
      ["waitlistPartySize","waitlistPartyWaiting","waitlistPartyQuote","waitlistPartyTable","waitlistPartyPriority","waitlistPartyNotification"]
        .forEach(id => byId(id).textContent = "—");
      byId("waitlistQuoteInput").value = "";
      byId("waitlistNoteInput").value = "";
      return;
    }

    const table = bestTable(item);

    byId("waitlistPartyName").textContent = item.name;
    byId("waitlistPartySize").textContent = String(item.partySize);
    byId("waitlistPartyWaiting").textContent = `${elapsedMinutes(item)} min`;
    byId("waitlistPartyQuote").textContent = `${item.quotedWait} min`;
    byId("waitlistPartyTable").textContent = table?.name || "No match";
    byId("waitlistPartyPriority").textContent = priorityLabel(item);
    byId("waitlistPartyNotification").textContent = item.notified ? "Texted" : "Not sent";
    byId("waitlistQuoteInput").value = String(item.quotedWait);
    byId("waitlistNoteInput").value = item.notes || "";
    byId("waitlistSeatParty").disabled = !table;
    byId("waitlistSeatParty").textContent = table ? `Seat at ${table.name}` : "No table ready";
  }

  function render() {
    syncFromHost();
    renderKPIs();
    renderList();
    renderInspector();
    byId("waitlistUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function updateSelected() {
    const item = selectedParty();
    if (!item) return;

    item.quotedWait = Math.max(0, Number.parseInt(byId("waitlistQuoteInput").value,10) || 0);
    item.notes = byId("waitlistNoteInput").value.trim();
    save();
  }

  function textGuest() {
    const item = selectedParty();
    if (!item) return;

    item.notified = true;
    item.lastTextedAt = new Date().toISOString();
    save();
    render();
    byId("waitlistStatus").textContent = `${item.name} marked as texted.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:waitlist-guest-texted", {
      detail:{ party:{...item} }
    }));
  }

  function markReady() {
    const item = selectedParty();
    if (!item) return;

    item.ready = true;
    item.notified = true;
    save();
    render();
    byId("waitlistStatus").textContent = `${item.name} marked ready for seating.`;
  }

  function seatParty() {
    const item = selectedParty();
    const table = item ? bestTable(item) : null;
    if (!item || !table) return;

    const floor = loadFloor();
    const target = floor.tables.find(row => row.id === table.id);
    if (target) {
      target.status = "occupied";
      target.guests = item.partySize;
      target.stage = "waiting";
      target.seatedAt = new Date().toISOString();
      saveFloor(floor);
    }

    const host = loadHostArrivals();
    const arrival = host.find(row => row.id === item.id);
    if (arrival) {
      arrival.status = "seated";
      arrival.seatedTable = table.name;
      saveHostArrivals(host);
    }

    state.waitlist = state.waitlist.filter(row => row.id !== item.id);
    state.selectedId = state.waitlist[0]?.id || null;
    save();
    render();

    byId("waitlistStatus").textContent = `${item.name} seated at ${table.name}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:party-seated", {
      detail:{ arrival:{...item}, table:{...table} }
    }));
  }

  function bind() {
    byId("waitlistSort")?.addEventListener("change", event => {
      state.sort = event.target.value;
      save();
      render();
    });

    byId("waitlistQuoteInput")?.addEventListener("change", updateSelected);
    byId("waitlistNoteInput")?.addEventListener("change", updateSelected);
    byId("waitlistTextGuest")?.addEventListener("click", textGuest);
    byId("waitlistMarkReady")?.addEventListener("click", markReady);
    byId("waitlistSeatParty")?.addEventListener("click", seatParty);

    window.addEventListener("bluecurrent:table-cleared", render);
    window.addEventListener("bluecurrent:party-seated", render);
  }

  function init() {
    if (!byId("waitlistEngine")) return;
    load();
    byId("waitlistSort").value = state.sort;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
