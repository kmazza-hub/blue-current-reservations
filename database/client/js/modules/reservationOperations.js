
(function () {
  "use strict";

  function createReservationOperationsModule(eventBus, appState, cloudFoundationModule, floorModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    const locationId = "loc_marina";
    let reservations = [];
    let floor = { tables: [], waitlist: [] };
    let selectedReservationId = null;
    let activeFilter = "all";

    function selectedReservation() {
      return reservations.find(item => item.id === selectedReservationId) || null;
    }

    function timeLabel(value) {
      return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function filteredReservations() {
      if (activeFilter === "all") return reservations;
      return reservations.filter(item => item.status === activeFilter);
    }

    function metrics() {
      const confirmed = reservations.filter(item => item.status === "confirmed").length;
      const arrived = reservations.filter(item => item.status === "arrived").length;
      const seated = reservations.filter(item => item.status === "seated").length;
      const covers = reservations.reduce((sum, item) => sum + Number(item.partySize || 0), 0);
      return { confirmed, arrived, seated, covers };
    }

    function renderMetrics() {
      const data = metrics();
      $("reservationConfirmed").textContent = data.confirmed;
      $("reservationArrived").textContent = data.arrived;
      $("reservationSeated").textContent = data.seated;
      $("reservationCovers").textContent = data.covers;
      appState.update({
        reservationsToday: reservations.length,
        reservationCovers: data.covers,
        arrivedReservations: data.arrived
      });
    }

    function renderList() {
      const items = filteredReservations();
      $("reservationList").innerHTML = items.length
        ? items.map(item => `
          <button class="reservation-row ${item.id === selectedReservationId ? "selected" : ""}" data-reservation-id="${item.id}">
            <time>${timeLabel(item.reservationTime)}</time>
            <div>
              <strong>${item.guestName}${item.vip ? " · VIP" : ""}</strong>
              <small>${item.partySize} guests · ${item.source}</small>
            </div>
            <span class="status-${item.status}">${item.status}</span>
          </button>
        `).join("")
        : "<p class='reservation-empty'>No reservations match this filter.</p>";
    }

    function compatibleTables(reservation) {
      return floor.tables.filter(table =>
        ["available", "reserved"].includes(table.status) &&
        Number(table.seats) >= Number(reservation.partySize)
      );
    }

    function renderInspector() {
      const reservation = selectedReservation();
      const panel = $("reservationInspector");
      if (!reservation) {
        panel.innerHTML = `
          <div class="reservation-inspector-empty">
            <strong>Select a reservation</strong>
            <p>Review guest details, mark arrival, assign a table, or update notes.</p>
          </div>`;
        return;
      }

      const tables = compatibleTables(reservation);
      panel.innerHTML = `
        <div class="reservation-inspector-head">
          <div><small>Reservation</small><h3>${reservation.guestName}</h3></div>
          <span class="status-${reservation.status}">${reservation.status}</span>
        </div>

        <div class="reservation-detail-grid">
          <label>Guest<input id="reservationGuestName" value="${reservation.guestName}"></label>
          <label>Phone<input id="reservationPhone" value="${reservation.phone || ""}"></label>
          <label>Party size<input id="reservationPartySize" type="number" min="1" value="${reservation.partySize}"></label>
          <label>Time<input id="reservationTime" type="datetime-local" value="${reservation.reservationTime.slice(0,16)}"></label>
          <label>Status<select id="reservationStatus">
            ${["confirmed","arrived","seated","completed","cancelled","no_show"].map(status => `<option value="${status}" ${status === reservation.status ? "selected" : ""}>${status.replace("_"," ")}</option>`).join("")}
          </select></label>
          <label>Source<select id="reservationSource">
            ${["AI Concierge","Website","Phone","OpenTable","Host Stand"].map(source => `<option ${source === reservation.source ? "selected" : ""}>${source}</option>`).join("")}
          </select></label>
          <label class="reservation-wide">Accessibility<input id="reservationAccessibility" value="${reservation.accessibility || ""}" placeholder="Accessibility needs"></label>
          <label class="reservation-wide">Notes<textarea id="reservationNotes">${reservation.notes || ""}</textarea></label>
        </div>

        <label class="reservation-vip-toggle">
          <input type="checkbox" id="reservationVip" ${reservation.vip ? "checked" : ""}>
          <span>VIP guest</span>
        </label>

        <div class="reservation-table-assignment">
          <small>Compatible tables</small>
          <div>
            ${tables.length
              ? tables.map(table => `<button data-reservation-table="${table.id}">${table.name}<span>${table.seats} seats</span></button>`).join("")
              : "<p>No available table currently fits this party.</p>"}
          </div>
        </div>

        <div class="reservation-actions">
          <button class="button button-gold" id="reservationSave">Save reservation</button>
          <button class="button button-light" id="reservationMarkArrived">Mark arrived</button>
        </div>`;
    }

    function renderAll() {
      renderMetrics();
      renderList();
      renderInspector();
    }

    async function load() {
      if (!api.token) return;
      try {
        [reservations, floor] = await Promise.all([
          api.reservationOperations(locationId),
          api.floor(locationId)
        ]);
        if (!selectedReservationId && reservations[0]) selectedReservationId = reservations[0].id;
        renderAll();
        eventBus.emit("reservations:loaded", { count: reservations.length, locationId });
      } catch (error) {
        $("reservationList").innerHTML = `<p class="reservation-empty">${error.message}</p>`;
      }
    }

    $("reservationFilters")?.addEventListener("click", event => {
      const button = event.target.closest("[data-reservation-filter]");
      if (!button) return;
      activeFilter = button.dataset.reservationFilter;
      document.querySelectorAll("[data-reservation-filter]").forEach(item =>
        item.classList.toggle("active", item.dataset.reservationFilter === activeFilter)
      );
      renderList();
    });

    $("reservationList")?.addEventListener("click", event => {
      const row = event.target.closest("[data-reservation-id]");
      if (!row) return;
      selectedReservationId = row.dataset.reservationId;
      renderAll();
    });

    $("reservationInspector")?.addEventListener("click", async event => {
      const reservation = selectedReservation();
      if (!reservation) return;

      const tableButton = event.target.closest("[data-reservation-table]");
      if (tableButton) {
        await api.seatOperationalReservation({
          reservationId: reservation.id,
          tableId: tableButton.dataset.reservationTable
        });
        await load();
        floorModule?.reload?.();
        return;
      }

      if (event.target.closest("#reservationMarkArrived")) {
        await api.updateOperationalReservation(reservation.id, { status: "arrived" });
        await load();
        return;
      }

      if (event.target.closest("#reservationSave")) {
        await api.updateOperationalReservation(reservation.id, {
          guestName: $("reservationGuestName").value.trim(),
          phone: $("reservationPhone").value.trim(),
          partySize: Number($("reservationPartySize").value),
          reservationTime: new Date($("reservationTime").value).toISOString(),
          status: $("reservationStatus").value,
          source: $("reservationSource").value,
          accessibility: $("reservationAccessibility").value.trim(),
          notes: $("reservationNotes").value.trim(),
          vip: $("reservationVip").checked
        });
        await load();
      }
    });

    $("reservationCreateForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      const date = $("newReservationDate").value;
      const time = $("newReservationTime").value;
      await api.createOperationalReservation({
        locationId,
        guestName: $("newReservationGuest").value,
        phone: $("newReservationPhone").value,
        partySize: Number($("newReservationParty").value),
        reservationTime: new Date(`${date}T${time}`).toISOString(),
        source: "Host Stand",
        vip: $("newReservationVip").checked,
        notes: $("newReservationNotes").value
      });
      event.target.reset();
      await load();
    });

    ["reservation:created","reservation:updated","reservation:seated","floor:table-updated","floor:guest-seated"].forEach(type => {
      eventBus.on?.(type, () => load());
    });
    eventBus.on?.("auth:signed-in", load);
    eventBus.on?.("auth:restored", load);

    load();

    return {
      reload: load,
      getReservations: () => JSON.parse(JSON.stringify(reservations))
    };
  }

  window.createBlueCurrentReservationOperationsModule = createReservationOperationsModule;
})();
