(() => {
  "use strict";

  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const STORAGE_KEY = "blueCurrent.serviceFlow.v35.0.7";
  const byId = id => document.getElementById(id);

  const stages = ["waiting","drinks","appetizers","entrees","dessert","check"];

  const stageTargets = {
    waiting:8,
    drinks:12,
    appetizers:18,
    entrees:32,
    dessert:15,
    check:12
  };

  const state = {
    selectedId:null,
    stageStartedAt:{},
    managerFlags:{},
    serverCalls:{}
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
        state.selectedId = value.selectedId || null;
        state.stageStartedAt = value.stageStartedAt || {};
        state.managerFlags = value.managerFlags || {};
        state.serverCalls = value.serverCalls || {};
      }
    } catch {}
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeTables() {
    return readFloor().tables.filter(table =>
      ["occupied","attention"].includes(table.status)
    );
  }

  function ensureStageTimes(tables) {
    const now = new Date().toISOString();

    tables.forEach(table => {
      if (!state.stageStartedAt[table.id]) {
        state.stageStartedAt[table.id] = {
          stage: stages.includes(table.stage) ? table.stage : "waiting",
          startedAt: table.seatedAt || now
        };
      } else if (state.stageStartedAt[table.id].stage !== table.stage) {
        state.stageStartedAt[table.id] = {
          stage: table.stage,
          startedAt: now
        };
      }
    });

    const activeIds = new Set(tables.map(table => table.id));
    Object.keys(state.stageStartedAt).forEach(id => {
      if (!activeIds.has(id)) {
        delete state.stageStartedAt[id];
        delete state.managerFlags[id];
        delete state.serverCalls[id];
      }
    });

    save();
  }

  function seatedMinutes(table) {
    if (!table.seatedAt) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(table.seatedAt).getTime()) / 60000));
  }

  function stageMinutes(table) {
    const record = state.stageStartedAt[table.id];
    if (!record?.startedAt) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(record.startedAt).getTime()) / 60000));
  }

  function currentStageIndex(table) {
    const index = stages.indexOf(table.stage);
    return index >= 0 ? index : 0;
  }

  function stageTone(table) {
    const stage = stages.includes(table.stage) ? table.stage : "waiting";
    const minutes = stageMinutes(table);
    const target = stageTargets[stage];

    if (minutes >= target * 1.6 || table.status === "attention") return "risk";
    if (minutes >= target) return "watch";
    return "stable";
  }

  function isStalled(table) {
    return stageTone(table) !== "stable";
  }

  function turnMinutes(table) {
    const base = {
      waiting:65,
      drinks:55,
      appetizers:42,
      entrees:28,
      dessert:14,
      check:7
    }[table.stage] ?? 45;

    return Math.max(0, base - Math.max(0, stageMinutes(table) - stageTargets[table.stage]));
  }

  function selectedTable() {
    return activeTables().find(table => table.id === state.selectedId) || null;
  }

  function renderKPIs(tables) {
    const stalled = tables.filter(isStalled).length;
    const checks = tables.filter(table => table.stage === "check").length;
    const average = tables.length
      ? Math.round(tables.reduce((sum,table) => sum + seatedMinutes(table),0) / tables.length)
      : 0;
    const nextTurns = tables.filter(table => turnMinutes(table) <= 20).length;

    byId("serviceFlowActiveTables").textContent = String(tables.length);
    byId("serviceFlowStalledTables").textContent = String(stalled);
    byId("serviceFlowChecksOpen").textContent = String(checks);
    byId("serviceFlowAverageCycle").textContent = `${average} min`;
    byId("serviceFlowNextTurns").textContent = String(nextTurns);

    const riskCount = tables.filter(table => stageTone(table) === "risk").length;
    const tone = riskCount >= 2 || stalled >= 4
      ? "risk"
      : stalled >= 2
        ? "watch"
        : "stable";

    byId("serviceFlowPressure").dataset.tone = tone;
    byId("serviceFlowPressureLabel").textContent =
      tone === "risk" ? "High" : tone === "watch" ? "Building" : "Stable";
    byId("serviceFlowPressureDetail").textContent =
      tone === "risk"
        ? "Multiple tables are beyond service-stage targets."
        : tone === "watch"
          ? "Several tables require proactive follow-up."
          : "Dining room flow is within target.";
  }

  function renderList(tables) {
    const list = byId("serviceFlowTableList");
    list.replaceChildren();

    if (!tables.length) {
      const empty = document.createElement("div");
      empty.className = "service-flow-empty";
      empty.textContent = "No occupied tables are currently in service.";
      list.append(empty);
      return;
    }

    tables
      .sort((a,b) => {
        const toneRank = {risk:0,watch:1,stable:2};
        return toneRank[stageTone(a)] - toneRank[stageTone(b)]
          || seatedMinutes(b) - seatedMinutes(a);
      })
      .forEach(table => {
        const row = document.createElement("article");
        row.className = "service-flow-table-row";
        row.dataset.tone = stageTone(table);
        row.classList.toggle("is-selected", table.id === state.selectedId);

        const name = document.createElement("div");
        name.className = "service-flow-table-name";
        name.innerHTML = "<small></small><strong></strong>";
        name.querySelector("small").textContent = `${table.guests || 0} guests · ${table.server || "Unassigned"}`;
        name.querySelector("strong").textContent = table.name;

        const track = document.createElement("div");
        track.className = "service-flow-track";
        const currentIndex = currentStageIndex(table);

        stages.forEach((stage,index) => {
          const marker = document.createElement("span");
          marker.className = "service-flow-stage";
          marker.classList.toggle("is-complete", index < currentIndex);
          marker.classList.toggle("is-current", index === currentIndex);
          marker.title = stage;
          track.append(marker);
        });

        const time = document.createElement("div");
        time.className = "service-flow-table-time";
        time.textContent = `${stageMinutes(table)} min`;

        row.addEventListener("click", () => {
          state.selectedId = table.id;
          save();
          render();
        });

        row.append(name,track,time);
        list.append(row);
      });
  }

  function renderInspector(tables) {
    const table = tables.find(row => row.id === state.selectedId) || null;

    if (!table) {
      byId("serviceFlowSelectedTable").textContent = "Choose a table";
      byId("serviceFlowSelectedStatus").textContent = "No table selected";
      [
        "serviceFlowGuests",
        "serviceFlowServer",
        "serviceFlowSeated",
        "serviceFlowStage",
        "serviceFlowStageTime",
        "serviceFlowTurnOutlook"
      ].forEach(id => byId(id).textContent = "—");
      byId("serviceFlowRecommendation").textContent = "Select an active table.";
      byId("serviceFlowRecommendationDetail").textContent =
        "Blue Current will compare the table against service-stage targets.";
      return;
    }

    const tone = stageTone(table);
    const stage = stages.includes(table.stage) ? table.stage : "waiting";
    const target = stageTargets[stage];
    const minutes = stageMinutes(table);
    const turn = turnMinutes(table);

    byId("serviceFlowSelectedTable").textContent = table.name;
    byId("serviceFlowSelectedStatus").textContent =
      `${tone === "risk" ? "Critical delay" : tone === "watch" ? "Watch" : "On pace"} · ${table.status}`;
    byId("serviceFlowGuests").textContent = String(table.guests || 0);
    byId("serviceFlowServer").textContent = table.server || "Unassigned";
    byId("serviceFlowSeated").textContent = `${seatedMinutes(table)} min`;
    byId("serviceFlowStage").textContent =
      stage.charAt(0).toUpperCase() + stage.slice(1);
    byId("serviceFlowStageTime").textContent = `${minutes} min`;
    byId("serviceFlowTurnOutlook").textContent =
      turn <= 0 ? "Ready now" : `About ${turn} min`;

    if (tone === "risk") {
      byId("serviceFlowRecommendation").textContent =
        `Immediate follow-up needed at ${table.name}.`;
      byId("serviceFlowRecommendationDetail").textContent =
        `${table.server || "The assigned server"} has been in ${stage} for ${minutes} minutes against a ${target}-minute target.`;
    } else if (tone === "watch") {
      byId("serviceFlowRecommendation").textContent =
        `Check progress before ${table.name} becomes stalled.`;
      byId("serviceFlowRecommendationDetail").textContent =
        `This table is at the target for ${stage}. Confirm the next service step now.`;
    } else {
      byId("serviceFlowRecommendation").textContent =
        `${table.name} is progressing normally.`;
      byId("serviceFlowRecommendationDetail").textContent =
        `Current stage is within the ${target}-minute target.`;
    }

    byId("serviceFlowAdvanceStage").disabled = stage === "check";
    byId("serviceFlowAdvanceStage").textContent =
      stage === "check"
        ? "Final stage"
        : `Advance to ${stages[currentStageIndex(table)+1]}`;
  }

  function render() {
    const tables = activeTables();
    ensureStageTimes(tables);

    if (!state.selectedId && tables[0]) {
      state.selectedId = tables[0].id;
      save();
    }

    renderKPIs(tables);
    renderList(tables);
    renderInspector(tables);

    byId("serviceFlowUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function advanceStage() {
    const table = selectedTable();
    if (!table) return;

    const index = currentStageIndex(table);
    if (index >= stages.length - 1) return;

    const floor = readFloor();
    const target = floor.tables.find(row => row.id === table.id);
    if (!target) return;

    target.stage = stages[index + 1];
    state.stageStartedAt[table.id] = {
      stage:target.stage,
      startedAt:new Date().toISOString()
    };

    saveFloor(floor);
    save();
    render();

    byId("serviceFlowStatus").textContent =
      `${table.name} advanced to ${target.stage}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:service-stage-advanced", {
      detail:{ table:{...target} }
    }));
  }

  function callServer() {
    const table = selectedTable();
    if (!table) return;

    state.serverCalls[table.id] = new Date().toISOString();
    save();

    byId("serviceFlowStatus").textContent =
      `${table.server || "Server"} called for ${table.name}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:server-called", {
      detail:{ table:{...table} }
    }));
  }

  function flagManager() {
    const table = selectedTable();
    if (!table) return;

    state.managerFlags[table.id] = new Date().toISOString();
    save();

    const floor = readFloor();
    const target = floor.tables.find(row => row.id === table.id);
    if (target) {
      target.status = "attention";
      saveFloor(floor);
    }

    byId("serviceFlowStatus").textContent =
      `${table.name} flagged for manager attention.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:table-manager-flagged", {
      detail:{ table:{...table} }
    }));

    render();
  }

  function bind() {
    byId("serviceFlowAdvanceStage")?.addEventListener("click", advanceStage);
    byId("serviceFlowCallServer")?.addEventListener("click", callServer);
    byId("serviceFlowFlagManager")?.addEventListener("click", flagManager);

    window.addEventListener("bluecurrent:party-seated", render);
    window.addEventListener("bluecurrent:table-cleared", render);
    window.addEventListener("bluecurrent:table-updated", render);
  }

  function init() {
    if (!byId("serviceFlowMonitor")) return;
    load();
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
