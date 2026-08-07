
(function () {
  "use strict";

  function createLiveFloorOperationsModule(eventBus, appState, cloudFoundationModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    const locationId = "loc_marina";
    let state = { tables: [], waitlist: [], seatingEvents: [] };
    let selectedTableId = null;
    let drag = null;

    const statusOrder = ["available", "reserved", "seated", "cleaning", "blocked"];

    function selectedTable() {
      return state.tables.find(table => table.id === selectedTableId) || null;
    }

    function statusLabel(status) {
      return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function elapsed(seatedAt) {
      if (!seatedAt) return "";
      const minutes = Math.max(0, Math.floor((Date.now() - new Date(seatedAt).getTime()) / 60000));
      return `${minutes}m`;
    }

    function metrics() {
      const active = state.tables.filter(table => table.status === "seated");
      const seats = state.tables.reduce((sum, table) => sum + Number(table.seats || 0), 0);
      const occupiedSeats = active.reduce((sum, table) => sum + Number(table.partySize || 0), 0);
      return {
        activeTables: active.length,
        occupiedSeats,
        totalSeats: seats,
        occupancy: seats ? Math.round((occupiedSeats / seats) * 100) : 0,
        available: state.tables.filter(table => table.status === "available").length,
        waiting: state.waitlist.filter(guest => guest.status === "waiting").length
      };
    }

    function renderMetrics() {
      const data = metrics();
      $("floorActiveTables").textContent = data.activeTables;
      $("floorOccupancy").textContent = `${data.occupancy}%`;
      $("floorAvailable").textContent = data.available;
      $("floorWaiting").textContent = data.waiting;
      appState.update({
        floorActiveTables: data.activeTables,
        occupancyPercent: data.occupancy,
        floorAvailableTables: data.available,
        waitlistCount: data.waiting
      });
    }

    function renderFloor() {
      const canvas = $("floorCanvas");
      canvas.innerHTML = state.tables.map(table => `
        <button
          class="floor-table ${table.shape} status-${table.status} ${table.id === selectedTableId ? "selected" : ""}"
          data-floor-table="${table.id}"
          style="left:${table.x}%;top:${table.y}%"
          aria-label="${table.name}, ${table.seats} seats, ${table.status}"
        >
          <strong>${table.name}</strong>
          <span>${table.seats} seats</span>
          ${table.status === "seated" ? `<em>${elapsed(table.seatedAt)}</em>` : ""}
        </button>
      `).join("");
    }

    function renderWaitlist() {
      const waiting = state.waitlist.filter(item => item.status === "waiting");
      $("floorWaitlist").innerHTML = waiting.length
        ? waiting.map(guest => `
          <article data-wait-guest="${guest.id}">
            <span>${guest.partySize}</span>
            <div><strong>${guest.guestName}</strong><small>${guest.quotedMinutes} min quote</small></div>
            <button data-seat-waitlist="${guest.id}">Seat</button>
          </article>
        `).join("")
        : "<p class='floor-empty'>No guests currently waiting.</p>";
    }

    function renderEvents() {
      $("floorEventFeed").innerHTML = state.seatingEvents.slice(0, 8).map(event => `
        <article>
          <time>${new Date(event.createdAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time>
          <div><strong>${event.actor}</strong><p>${event.summary}</p></div>
        </article>
      `).join("") || "<p class='floor-empty'>No seating events yet.</p>";
    }

    function renderInspector() {
      const table = selectedTable();
      const panel = $("floorInspector");
      if (!table) {
        panel.innerHTML = `
          <div class="floor-inspector-empty">
            <strong>Select a table</strong>
            <p>Choose any table to update its status, guest, section, or server.</p>
          </div>`;
        return;
      }

      panel.innerHTML = `
        <div class="floor-inspector-head">
          <div><small>Selected table</small><h3>${table.name}</h3></div>
          <span class="status-${table.status}">${statusLabel(table.status)}</span>
        </div>
        <div class="floor-inspector-grid">
          <label>Status<select id="floorTableStatus">${statusOrder.map(status => `<option value="${status}" ${status === table.status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></label>
          <label>Seats<input id="floorTableSeats" value="${table.seats}" disabled></label>
          <label>Guest<input id="floorGuestName" value="${table.guestName || ""}" placeholder="Guest or party name"></label>
          <label>Party size<input id="floorPartySize" type="number" min="0" max="${table.seats}" value="${table.partySize || 0}"></label>
          <label>Section<select id="floorSection"><option ${table.section === "Dining Room" ? "selected" : ""}>Dining Room</option><option ${table.section === "Patio" ? "selected" : ""}>Patio</option><option ${table.section === "Bar" ? "selected" : ""}>Bar</option></select></label>
          <label>Server<select id="floorServer"><option ${table.server === "Unassigned" ? "selected" : ""}>Unassigned</option><option ${table.server === "Sarah" ? "selected" : ""}>Sarah</option><option ${table.server === "Marcus" ? "selected" : ""}>Marcus</option><option ${table.server === "Elena" ? "selected" : ""}>Elena</option></select></label>
        </div>
        <div class="floor-inspector-actions">
          <button class="button button-gold" id="floorSaveTable">Save table</button>
          <button class="button button-light" id="floorClearTable">Clear table</button>
        </div>`;
    }

    function renderAll() {
      renderMetrics();
      renderFloor();
      renderWaitlist();
      renderEvents();
      renderInspector();
    }

    async function load() {
      if (!api.token) return;
      try {
        state = await api.floor(locationId);
        if (!selectedTableId && state.tables[0]) selectedTableId = state.tables[0].id;
        renderAll();
        eventBus.emit("floor:loaded", { locationId, tableCount: state.tables.length });
      } catch (error) {
        $("floorConnection").textContent = error.message;
      }
    }

    async function updateSelected(patch) {
      const table = selectedTable();
      if (!table) return;
      const updated = await api.updateTable(table.id, patch);
      state.tables = state.tables.map(item => item.id === updated.id ? updated : item);
      renderAll();
      eventBus.emit("floor:table-updated-local", updated);
    }

    $("floorCanvas")?.addEventListener("pointerdown", event => {
      const button = event.target.closest("[data-floor-table]");
      if (!button) return;
      const table = state.tables.find(item => item.id === button.dataset.floorTable);
      if (!table) return;
      selectedTableId = table.id;
      drag = {
        tableId: table.id,
        startX: event.clientX,
        startY: event.clientY,
        originalX: table.x,
        originalY: table.y,
        moved: false
      };
      button.setPointerCapture?.(event.pointerId);
      renderAll();
    });

    $("floorCanvas")?.addEventListener("pointermove", event => {
      if (!drag) return;
      const canvas = $("floorCanvas");
      const rect = canvas.getBoundingClientRect();
      const dx = ((event.clientX - drag.startX) / rect.width) * 100;
      const dy = ((event.clientY - drag.startY) / rect.height) * 100;
      const table = state.tables.find(item => item.id === drag.tableId);
      if (!table) return;
      table.x = Math.max(4, Math.min(92, drag.originalX + dx));
      table.y = Math.max(6, Math.min(86, drag.originalY + dy));
      drag.moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      renderFloor();
    });

    $("floorCanvas")?.addEventListener("pointerup", async () => {
      if (!drag) return;
      const table = state.tables.find(item => item.id === drag.tableId);
      const moved = drag.moved;
      drag = null;
      if (moved && table) {
        await api.updateTable(table.id, { x: Number(table.x.toFixed(2)), y: Number(table.y.toFixed(2)) });
      }
    });

    $("floorInspector")?.addEventListener("click", async event => {
      if (event.target.closest("#floorSaveTable")) {
        const status = $("floorTableStatus").value;
        await updateSelected({
          status,
          guestName: $("floorGuestName").value.trim(),
          partySize: Number($("floorPartySize").value || 0),
          section: $("floorSection").value,
          server: $("floorServer").value,
          seatedAt: status === "seated" ? (selectedTable().seatedAt || new Date().toISOString()) : null
        });
      }
      if (event.target.closest("#floorClearTable")) {
        await updateSelected({
          status: "cleaning",
          guestName: "",
          partySize: 0,
          seatedAt: null,
          reservationTime: null
        });
      }
    });

    $("floorWaitlist")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-seat-waitlist]");
      if (!button) return;
      const available = state.tables.filter(table => table.status === "available");
      const guest = state.waitlist.find(item => item.id === button.dataset.seatWaitlist);
      const compatible = available.find(table => table.seats >= guest.partySize);
      if (!compatible) {
        alert("No available table currently fits this party.");
        return;
      }
      selectedTableId = compatible.id;
      await api.seatWaitlist({ waitlistId: guest.id, tableId: compatible.id });
      await load();
    });

    $("floorWaitlistForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      await api.addWaitlist({
        locationId,
        guestName: $("floorWaitGuest").value,
        partySize: Number($("floorWaitParty").value),
        quotedMinutes: Number($("floorWaitQuote").value)
      });
      event.target.reset();
      await load();
    });

    eventBus.on?.("auth:signed-in", load);
    eventBus.on?.("auth:restored", load);
    eventBus.on?.("floor:table-updated", payload => {
      if (payload.locationId === locationId) load();
    });
    eventBus.on?.("floor:guest-seated", () => load());
    eventBus.on?.("floor:waitlist-added", () => load());

    setInterval(() => {
      if (document.getElementById("live-floor-operations")) renderFloor();
    }, 60000);

    load();

    return {
      reload: load,
      getState: () => JSON.parse(JSON.stringify(state))
    };
  }

  window.createBlueCurrentLiveFloorOperationsModule = createLiveFloorOperationsModule;
})();
