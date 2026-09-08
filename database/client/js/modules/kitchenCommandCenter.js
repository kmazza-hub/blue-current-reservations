(function () {
  "use strict";
  function createKitchenCommandCenterModule(eventBus, appState, cloud) {
    const api = cloud?.api || new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    const locationId = () => window.BlueCurrentFrontlineLocation?.get?.() || "loc_marina";
    let state = { tickets: [], stations: [], events: [] }, selected = null, filter = "all";
    const age = value => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    function loadMetrics() {
      const active = state.tickets.filter(ticket => !["served", "cancelled"].includes(ticket.status));
      $("kitchenActiveTickets").textContent = active.length;
      $("kitchenReadyTickets").textContent = active.filter(ticket => ticket.status === "ready").length;
      $("kitchenOverdueTickets").textContent = active.filter(ticket => age(ticket.createdAt) > ticket.targetMinutes).length;
      $("kitchenAverageTime").textContent = (active.length ? Math.round(active.reduce((sum, ticket) => sum + age(ticket.createdAt), 0) / active.length) : 0) + "m";
    }
    function render() {
      loadMetrics();
      $("kitchenStationGrid").innerHTML = state.stations.map(station => {
        const load = state.tickets.flatMap(ticket => ticket.items).filter(item => item.stationId === station.id && ["received", "cooking"].includes(item.status)).length;
        return `<article><div><small>${station.name}</small><strong>${load}/${station.capacity}</strong></div><i><b style="width:${Math.min(100, load / station.capacity * 100)}%"></b></i></article>`;
      }).join("");
      const list = filter === "all" ? state.tickets : state.tickets.filter(ticket => ticket.status === filter);
      $("kitchenTicketBoard").innerHTML = list.map(ticket => `<button class="kitchen-ticket-card ${selected === ticket.id ? "selected" : ""}" data-ticket="${ticket.id}"><div><span>${ticket.tableName}</span><time>${age(ticket.createdAt)}m</time></div><strong>${ticket.guestName}</strong><small>${ticket.serverName} · ${ticket.items.length} items</small><footer>${ticket.status} · ${ticket.priority}</footer></button>`).join("");
      const ticket = state.tickets.find(item => item.id === selected);
      $("kitchenInspector").innerHTML = ticket ? `<h3>${ticket.tableName} · ${ticket.guestName}</h3><label>Status<select id="ktStatus">${["received", "cooking", "plating", "ready", "served"].map(status => `<option ${status === ticket.status ? "selected" : ""}>${status}</option>`).join("")}</select></label><div class="kitchen-item-list">${ticket.items.map(item => `<article><strong>${item.qty}× ${item.name}</strong><select data-item="${item.id}">${["received", "cooking", "ready"].map(status => `<option ${status === item.status ? "selected" : ""}>${status}</option>`).join("")}</select></article>`).join("")}</div><button class="button button-gold button-full" id="ktSave">Save ticket</button>` : "<p>Select a ticket.</p>";
    }
    async function load() {
      if (!api.token) return;
      try {
        state = await api.kitchenOperations(locationId());
        if (!selected && state.tickets[0]) selected = state.tickets[0].id;
        render();
      } catch (error) {
        const element = $("kitchenAverageTime");
        if (element && navigator.onLine === false) element.textContent = "offline";
      }
    }
    $("kitchenFilters")?.addEventListener("click", event => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      filter = button.dataset.filter;
      render();
    });
    $("kitchenTicketBoard")?.addEventListener("click", event => {
      const button = event.target.closest("[data-ticket]");
      if (!button) return;
      selected = button.dataset.ticket;
      render();
    });
    $("kitchenInspector")?.addEventListener("change", async event => {
      const select = event.target.closest("[data-item]");
      if (!select) return;
      await api.updateKitchenItem(selected, select.dataset.item, { status: select.value });
      await load();
    });
    $("kitchenInspector")?.addEventListener("click", async event => {
      if (!event.target.closest("#ktSave")) return;
      await api.updateKitchenTicket(selected, { status: $("ktStatus").value });
      await load();
    });
    eventBus.on?.("auth:signed-in", load);
    eventBus.on?.("auth:restored", load);
    window.addEventListener?.("online", load);
    ["kitchen:ticket-created", "kitchen:ticket-updated", "kitchen:item-updated"].forEach(type => eventBus.on?.(type, load));
    load();
    return { reload: load };
  }
  window.createBlueCurrentKitchenCommandCenterModule = createKitchenCommandCenterModule;
})();
