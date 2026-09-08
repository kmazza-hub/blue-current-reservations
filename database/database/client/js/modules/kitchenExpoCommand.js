(() => {
  "use strict";

  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const STORAGE_KEY = "blueCurrent.kitchenExpo.v35.0.8";
  const byId = id => document.getElementById(id);

  const courseConfig = {
    waiting:{course:"Starter",station:"salad",target:8,items:["House salad","Bread service"]},
    drinks:{course:"Starter",station:"salad",target:10,items:["Caesar salad","Burrata"]},
    appetizers:{course:"Appetizers",station:"fry",target:14,items:["Calamari","Crab cakes"]},
    entrees:{course:"Entrees",station:"grill",target:24,items:["Filet","Salmon","Vegetables"]},
    dessert:{course:"Dessert",station:"dessert",target:12,items:["Cheesecake","Espresso"]},
    check:{course:"Complete",station:"dessert",target:6,items:["Final course complete"]}
  };

  const state = {
    filter:"all",
    station:"all",
    selectedId:null,
    tickets:[]
  };

  function readFloor() {
    try {
      const value = JSON.parse(localStorage.getItem(FLOOR_KEY));
      return value && Array.isArray(value.tables) ? value : {tables:[]};
    } catch {
      return {tables:[]};
    }
  }

  function saveFloor(floor) {
    localStorage.setItem(FLOOR_KEY, JSON.stringify(floor));
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (value && typeof value === "object") {
        state.filter = value.filter || "all";
        state.station = value.station || "all";
        state.selectedId = value.selectedId || null;
        state.tickets = Array.isArray(value.tickets) ? value.tickets : [];
      }
    } catch {}

    syncTickets();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function syncTickets() {
    const floor = readFloor();
    const active = floor.tables.filter(table =>
      ["occupied","attention"].includes(table.status)
    );

    active.forEach(table => {
      const existing = state.tickets.find(ticket => ticket.tableId === table.id);
      const config = courseConfig[table.stage] || courseConfig.waiting;

      if (!existing) {
        state.tickets.push({
          id:`ticket_${table.id}`,
          tableId:table.id,
          tableName:table.name,
          server:table.server || "Unassigned",
          course:config.course,
          station:config.station,
          target:config.target,
          items:[...config.items],
          status:table.stage === "waiting" ? "hold" : "fired",
          createdAt:table.seatedAt || new Date().toISOString(),
          firedAt:table.stage === "waiting" ? null : new Date().toISOString()
        });
      } else if (existing.course !== config.course && existing.status !== "ready") {
        existing.course = config.course;
        existing.station = config.station;
        existing.target = config.target;
        existing.items = [...config.items];
        existing.status = table.stage === "waiting" ? "hold" : "fired";
        existing.firedAt = table.stage === "waiting" ? null : new Date().toISOString();
      }
    });

    const activeIds = new Set(active.map(table => table.id));
    state.tickets = state.tickets.filter(ticket => activeIds.has(ticket.tableId));

    if (!state.selectedId && state.tickets[0]) {
      state.selectedId = state.tickets[0].id;
    }

    save();
  }

  function ticketAge(ticket) {
    const start = ticket.firedAt || ticket.createdAt;
    return Math.max(0, Math.round((Date.now() - new Date(start).getTime()) / 60000));
  }

  function toneFor(ticket) {
    const age = ticketAge(ticket);
    if (ticket.status === "ready") return "stable";
    if (age >= ticket.target * 1.5) return "risk";
    if (age >= ticket.target) return "watch";
    return "stable";
  }

  function selectedTicket() {
    return state.tickets.find(ticket => ticket.id === state.selectedId) || null;
  }

  function visibleTickets() {
    return state.tickets.filter(ticket => {
      const statusMatch =
        state.filter === "all" ||
        state.filter === ticket.status ||
        (state.filter === "late" && toneFor(ticket) !== "stable");
      const stationMatch = state.station === "all" || ticket.station === state.station;
      return statusMatch && stationMatch;
    });
  }

  function renderKPIs() {
    const open = state.tickets.length;
    const held = state.tickets.filter(ticket => ticket.status === "hold").length;
    const fired = state.tickets.filter(ticket => ticket.status === "fired").length;
    const ready = state.tickets.filter(ticket => ticket.status === "ready").length;
    const average = open
      ? Math.round(state.tickets.reduce((sum,ticket) => sum + ticketAge(ticket),0) / open)
      : 0;

    byId("kitchenExpoOpenCount").textContent = String(open);
    byId("kitchenExpoHeldCount").textContent = String(held);
    byId("kitchenExpoFiredCount").textContent = String(fired);
    byId("kitchenExpoReadyCount").textContent = String(ready);
    byId("kitchenExpoAverageAge").textContent = `${average} min`;

    const late = state.tickets.filter(ticket => toneFor(ticket) === "risk").length;
    const watch = state.tickets.filter(ticket => toneFor(ticket) === "watch").length;
    const tone = late >= 2 ? "risk" : late >= 1 || watch >= 2 ? "watch" : "stable";

    byId("kitchenExpoPressure").dataset.tone = tone;
    byId("kitchenExpoPressureLabel").textContent =
      tone === "risk" ? "High" : tone === "watch" ? "Building" : "Stable";
    byId("kitchenExpoPressureDetail").textContent =
      tone === "risk"
        ? "Multiple tickets are beyond their course targets."
        : tone === "watch"
          ? "Several tickets need proactive expo attention."
          : "Ticket flow is within target.";
  }

  function renderList() {
    const list = byId("kitchenExpoTicketList");
    list.replaceChildren();

    const tickets = visibleTickets()
      .sort((a,b) => {
        const rank = {risk:0,watch:1,stable:2};
        return rank[toneFor(a)] - rank[toneFor(b)] || ticketAge(b) - ticketAge(a);
      });

    if (!tickets.length) {
      const empty = document.createElement("div");
      empty.className = "kitchen-expo-empty";
      empty.textContent = "No kitchen tickets match this view.";
      list.append(empty);
      return;
    }

    tickets.forEach(ticket => {
      const row = document.createElement("article");
      row.className = "kitchen-expo-ticket";
      row.dataset.tone = toneFor(ticket);
      row.classList.toggle("is-selected", ticket.id === state.selectedId);

      const copy = document.createElement("div");
      copy.className = "kitchen-expo-ticket-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent =
        `${ticket.status} · ${ticket.station}`;
      copy.querySelector("strong").textContent =
        `${ticket.tableName} · ${ticket.course}`;
      copy.querySelector("p").textContent =
        `${ticket.server} · target ${ticket.target} min`;

      const items = document.createElement("div");
      items.className = "kitchen-expo-ticket-items";
      items.textContent = ticket.items.join(" · ");

      const age = document.createElement("div");
      age.className = "kitchen-expo-ticket-age";
      age.textContent = `${ticketAge(ticket)} min`;
      const ageLabel = document.createElement("span");
      ageLabel.textContent =
        toneFor(ticket) === "risk" ? "Late" :
        toneFor(ticket) === "watch" ? "At target" :
        ticket.status === "ready" ? "Ready" : "On pace";
      age.append(ageLabel);

      row.addEventListener("click", () => {
        state.selectedId = ticket.id;
        save();
        render();
      });

      row.append(copy,items,age);
      list.append(row);
    });
  }

  function renderInspector() {
    const ticket = selectedTicket();

    if (!ticket) {
      byId("kitchenExpoSelectedTicket").textContent = "Choose a ticket";
      byId("kitchenExpoSelectedStatus").textContent = "No ticket selected";
      [
        "kitchenExpoSelectedTable",
        "kitchenExpoSelectedServer",
        "kitchenExpoSelectedCourse",
        "kitchenExpoSelectedStation",
        "kitchenExpoSelectedAge",
        "kitchenExpoSelectedTarget"
      ].forEach(id => byId(id).textContent = "—");
      byId("kitchenExpoSelectedItems").replaceChildren();
      byId("kitchenExpoRecommendation").textContent = "Select a kitchen ticket.";
      byId("kitchenExpoRecommendationDetail").textContent =
        "Blue Current will compare ticket age, course pacing, and table status.";
      return;
    }

    byId("kitchenExpoSelectedTicket").textContent =
      `${ticket.tableName} · ${ticket.course}`;
    byId("kitchenExpoSelectedStatus").textContent =
      `${ticket.status} · ${toneFor(ticket) === "risk" ? "Late" : toneFor(ticket) === "watch" ? "At target" : "On pace"}`;
    byId("kitchenExpoSelectedTable").textContent = ticket.tableName;
    byId("kitchenExpoSelectedServer").textContent = ticket.server;
    byId("kitchenExpoSelectedCourse").textContent = ticket.course;
    byId("kitchenExpoSelectedStation").textContent = ticket.station;
    byId("kitchenExpoSelectedAge").textContent = `${ticketAge(ticket)} min`;
    byId("kitchenExpoSelectedTarget").textContent = `${ticket.target} min`;

    const list = byId("kitchenExpoSelectedItems");
    list.replaceChildren();
    ticket.items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });

    if (toneFor(ticket) === "risk") {
      byId("kitchenExpoRecommendation").textContent =
        `Prioritize ${ticket.tableName} immediately.`;
      byId("kitchenExpoRecommendationDetail").textContent =
        `${ticket.course} is ${ticketAge(ticket) - ticket.target} minutes beyond target. Confirm station status and coordinate pickup.`;
    } else if (ticket.status === "hold") {
      byId("kitchenExpoRecommendation").textContent =
        `Keep ${ticket.tableName} on hold until the dining room is ready.`;
      byId("kitchenExpoRecommendationDetail").textContent =
        "Coordinate with the server before firing the course.";
    } else if (ticket.status === "ready") {
      byId("kitchenExpoRecommendation").textContent =
        `Run ${ticket.tableName} now.`;
      byId("kitchenExpoRecommendationDetail").textContent =
        "The course is ready and should be delivered before quality declines.";
    } else {
      byId("kitchenExpoRecommendation").textContent =
        `${ticket.tableName} is progressing within target.`;
      byId("kitchenExpoRecommendationDetail").textContent =
        "Maintain current station pacing and monitor the next course handoff.";
    }

    byId("kitchenExpoHold").disabled = ticket.status === "hold";
    byId("kitchenExpoFire").disabled = ticket.status === "fired";
    byId("kitchenExpoReady").disabled = ticket.status === "ready";
  }

  function render() {
    syncTickets();
    renderKPIs();
    renderList();
    renderInspector();
    byId("kitchenExpoUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function setStatus(status) {
    const ticket = selectedTicket();
    if (!ticket) return;

    ticket.status = status;

    if (status === "fired") {
      ticket.firedAt = new Date().toISOString();
    }

    if (status === "ready") {
      ticket.readyAt = new Date().toISOString();
      const floor = readFloor();
      const table = floor.tables.find(row => row.id === ticket.tableId);
      if (table) {
        if (table.stage === "appetizers") table.stage = "entrees";
        else if (table.stage === "entrees") table.stage = "dessert";
        else if (table.stage === "dessert") table.stage = "check";
        saveFloor(floor);
      }
    }

    save();
    render();

    byId("kitchenExpoStatus").textContent =
      `${ticket.tableName} marked ${status}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:kitchen-ticket-updated", {
      detail:{ ticket:{...ticket} }
    }));
  }

  function bind() {
    byId("kitchenExpoFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("kitchenExpoStationFilter")?.addEventListener("change", event => {
      state.station = event.target.value;
      save();
      render();
    });

    byId("kitchenExpoHold")?.addEventListener("click", () => setStatus("hold"));
    byId("kitchenExpoFire")?.addEventListener("click", () => setStatus("fired"));
    byId("kitchenExpoReady")?.addEventListener("click", () => setStatus("ready"));

    window.addEventListener("bluecurrent:party-seated", render);
    window.addEventListener("bluecurrent:table-cleared", render);
    window.addEventListener("bluecurrent:service-stage-advanced", render);
    window.addEventListener("bluecurrent:table-updated", render);
  }

  function init() {
    if (!byId("kitchenExpoCommand")) return;
    load();
    byId("kitchenExpoFilter").value = state.filter;
    byId("kitchenExpoStationFilter").value = state.station;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
