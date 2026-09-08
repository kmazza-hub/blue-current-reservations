(() => {
  "use strict";

  const STORAGE_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const byId = id => document.getElementById(id);

  const defaultTables = [
    {id:"T1",name:"Table 1",capacity:2,status:"available",guests:0,server:"Mia",stage:"reset",seatedAt:null,nextReservation:"5:30 PM"},
    {id:"T2",name:"Table 2",capacity:4,status:"occupied",guests:4,server:"Alex",stage:"drinks",seatedAt:new Date(Date.now()-18*60000).toISOString(),nextReservation:"7:00 PM"},
    {id:"T3",name:"Table 3",capacity:4,status:"reserved",guests:0,server:"Jordan",stage:"waiting",seatedAt:null,nextReservation:"6:15 PM"},
    {id:"T4",name:"Table 4",capacity:6,status:"attention",guests:5,server:"Sarah",stage:"entrees",seatedAt:new Date(Date.now()-52*60000).toISOString(),nextReservation:"8:00 PM"},
    {id:"T5",name:"Table 5",capacity:2,status:"occupied",guests:2,server:"Mia",stage:"appetizers",seatedAt:new Date(Date.now()-31*60000).toISOString(),nextReservation:"7:30 PM"},
    {id:"T6",name:"Table 6",capacity:4,status:"available",guests:0,server:"Alex",stage:"reset",seatedAt:null,nextReservation:"6:45 PM"},
    {id:"T7",name:"Table 7",capacity:8,status:"reserved",guests:0,server:"Jordan",stage:"waiting",seatedAt:null,nextReservation:"7:15 PM"},
    {id:"T8",name:"Table 8",capacity:4,status:"occupied",guests:3,server:"Sarah",stage:"check",seatedAt:new Date(Date.now()-74*60000).toISOString(),nextReservation:"8:30 PM"},
    {id:"P1",name:"Patio 1",capacity:4,status:"available",guests:0,server:"Mia",stage:"reset",seatedAt:null,nextReservation:"6:00 PM"},
    {id:"P2",name:"Patio 2",capacity:4,status:"blocked",guests:0,server:"Alex",stage:"reset",seatedAt:null,nextReservation:"—"},
    {id:"B1",name:"Bar 1",capacity:2,status:"occupied",guests:2,server:"Chris",stage:"drinks",seatedAt:new Date(Date.now()-12*60000).toISOString(),nextReservation:"—"},
    {id:"B2",name:"Bar 2",capacity:2,status:"available",guests:0,server:"Chris",stage:"reset",seatedAt:null,nextReservation:"—"}
  ];

  const state = {
    tables: [],
    selectedId: null
  };

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      state.tables = Array.isArray(value?.tables) && value.tables.length
        ? value.tables
        : defaultTables.map(table => ({...table}));
      state.selectedId = value?.selectedId || state.tables[0]?.id || null;
    } catch {
      state.tables = defaultTables.map(table => ({...table}));
      state.selectedId = state.tables[0]?.id || null;
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tables: state.tables,
      selectedId: state.selectedId
    }));
  }

  function seatedMinutes(table) {
    if (!table.seatedAt) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(table.seatedAt).getTime()) / 60000));
  }

  function selectedTable() {
    return state.tables.find(table => table.id === state.selectedId) || null;
  }

  function statusLabel(status) {
    return {
      available:"Available",
      reserved:"Reserved",
      occupied:"Occupied",
      attention:"Needs attention",
      blocked:"Blocked"
    }[status] || status;
  }

  function stageLabel(stage) {
    return {
      waiting:"Waiting",
      drinks:"Drinks",
      appetizers:"Appetizers",
      entrees:"Entrees",
      dessert:"Dessert",
      check:"Check",
      reset:"Reset"
    }[stage] || stage;
  }

  function renderKPIs() {
    const total = state.tables.length;
    const occupied = state.tables.filter(table => ["occupied","attention"].includes(table.status)).length;
    const reserved = state.tables.filter(table => table.status === "reserved").length;
    const available = state.tables.filter(table => table.status === "available").length;
    const attention = state.tables.filter(table => table.status === "attention").length;
    const occupiedTables = state.tables.filter(table => ["occupied","attention"].includes(table.status));
    const average = occupiedTables.length
      ? Math.round(occupiedTables.reduce((sum, table) => sum + seatedMinutes(table), 0) / occupiedTables.length)
      : 0;
    const occupancy = total ? Math.round((occupied / total) * 100) : 0;

    byId("liveFloorV2Occupied").textContent = String(occupied);
    byId("liveFloorV2Reserved").textContent = String(reserved);
    byId("liveFloorV2Available").textContent = String(available);
    byId("liveFloorV2Attention").textContent = String(attention);
    byId("liveFloorV2AverageTime").textContent = `${average} min`;
    byId("liveFloorV2Occupancy").textContent = `${occupancy}%`;
    byId("liveFloorV2OccupancyDetail").textContent = `${occupied} of ${total} tables occupied`;
  }

  function renderMap() {
    const map = byId("liveFloorV2Map");
    if (!map) return;

    map.replaceChildren();

    state.tables.forEach(table => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "live-floor-v2-table";
      button.dataset.status = table.status;
      button.classList.toggle("is-selected", table.id === state.selectedId);

      button.innerHTML = "<small></small><strong></strong><span></span><span></span>";
      button.querySelector("small").textContent = `${table.capacity} seats · ${statusLabel(table.status)}`;
      button.querySelector("strong").textContent = table.name;
      const spans = button.querySelectorAll("span");
      spans[0].textContent = table.guests
        ? `${table.guests} guests · ${table.server}`
        : `Server: ${table.server}`;
      spans[1].textContent = ["occupied","attention"].includes(table.status)
        ? `${stageLabel(table.stage)} · ${seatedMinutes(table)} min`
        : `Next: ${table.nextReservation}`;

      button.addEventListener("click", () => {
        state.selectedId = table.id;
        save();
        render();
      });

      map.append(button);
    });
  }

  function renderDetail() {
    const table = selectedTable();
    if (!table) return;

    byId("liveFloorV2TableName").textContent = table.name;
    byId("liveFloorV2TableStatus").textContent = statusLabel(table.status);
    byId("liveFloorV2Guests").textContent = table.guests ? String(table.guests) : "0";
    byId("liveFloorV2Server").textContent = table.server || "Unassigned";
    byId("liveFloorV2Seated").textContent = table.seatedAt ? `${seatedMinutes(table)} min` : "—";
    byId("liveFloorV2Stage").textContent = stageLabel(table.stage);
    byId("liveFloorV2NextReservation").textContent = table.nextReservation || "—";
    byId("liveFloorV2StatusSelect").value = table.status;
    byId("liveFloorV2StageSelect").value = table.stage;
  }

  function render() {
    renderKPIs();
    renderMap();
    renderDetail();
    byId("liveFloorV2Updated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function saveSelected() {
    const table = selectedTable();
    if (!table) return;

    table.status = byId("liveFloorV2StatusSelect").value;
    table.stage = byId("liveFloorV2StageSelect").value;

    if (["occupied","attention"].includes(table.status) && !table.seatedAt) {
      table.seatedAt = new Date().toISOString();
    }

    if (!["occupied","attention"].includes(table.status)) {
      table.seatedAt = null;
      if (table.status === "available") {
        table.guests = 0;
        table.stage = "reset";
      }
    }

    save();
    render();
    byId("liveFloorV2StatusMessage").textContent = `${table.name} updated.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:table-updated", {
      detail:{ table:{...table} }
    }));
  }

  function seatParty() {
    const table = selectedTable();
    if (!table) return;

    table.status = "occupied";
    table.guests = table.guests || Math.min(table.capacity, 2);
    table.stage = "waiting";
    table.seatedAt = new Date().toISOString();

    save();
    render();
    byId("liveFloorV2StatusMessage").textContent = `${table.name} seated.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:party-seated", {
      detail:{ table:{...table} }
    }));
  }

  function clearTable() {
    const table = selectedTable();
    if (!table) return;

    table.status = "available";
    table.guests = 0;
    table.stage = "reset";
    table.seatedAt = null;

    save();
    render();
    byId("liveFloorV2StatusMessage").textContent = `${table.name} cleared and ready.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:table-cleared", {
      detail:{ table:{...table} }
    }));
  }

  function bind() {
    byId("liveFloorV2Save")?.addEventListener("click", saveSelected);
    byId("liveFloorV2Seat")?.addEventListener("click", seatParty);
    byId("liveFloorV2Clear")?.addEventListener("click", clearTable);

    window.addEventListener("bluecurrent:service-mode-changed", event => {
      const mode = event.detail?.mode;
      if (mode === "dinner-rush") {
        byId("liveFloorV2StatusMessage").textContent =
          "Dinner Rush mode active. Monitor attention tables closely.";
      }
    });
  }

  function init() {
    if (!byId("liveFloorOperationsV2")) return;
    load();
    bind();
    render();

    setInterval(() => {
      renderKPIs();
      renderMap();
      renderDetail();
    }, 60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})();
