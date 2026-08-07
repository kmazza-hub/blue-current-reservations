(() => {
  "use strict";

  const ROUTING_KEY = "blueCurrent.ticketRouting.v35.0.9";
  const FLOOR_KEY = "blueCurrent.liveFloorOperations.v35.0.3";
  const STORAGE_KEY = "blueCurrent.serverHandoff.v35.1.0";
  const byId = id => document.getElementById(id);

  const staff = [
    {id:"mia",name:"Mia",role:"Server",capacity:3},
    {id:"alex",name:"Alex",role:"Server",capacity:3},
    {id:"jordan",name:"Jordan",role:"Server",capacity:3},
    {id:"sarah",name:"Sarah",role:"Server",capacity:3},
    {id:"chris",name:"Chris",role:"Food Runner",capacity:5}
  ];

  const state = {
    filter:"all",
    staffFilter:"all",
    selectedId:null,
    handoffs:[]
  };

  function readRoutes() {
    try {
      const value = JSON.parse(localStorage.getItem(ROUTING_KEY));
      return Array.isArray(value?.routes) ? value.routes : [];
    } catch {
      return [];
    }
  }

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
        state.staffFilter = value.staffFilter || "all";
        state.selectedId = value.selectedId || null;
        state.handoffs = Array.isArray(value.handoffs) ? value.handoffs : [];
      }
    } catch {}

    syncHandoffs();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function syncHandoffs() {
    const routes = readRoutes().filter(route =>
      ["ready","complete"].includes(route.status)
    );

    routes.forEach(route => {
      const existing = state.handoffs.find(item => item.routeId === route.id);

      if (!existing) {
        state.handoffs.push({
          id:`handoff_${route.id}`,
          routeId:route.id,
          tableId:route.tableId,
          tableName:route.tableName,
          course:route.course,
          station:route.station,
          server:route.server || "Unassigned",
          status:route.status === "complete" ? "complete" : "ready",
          readyAt:route.readyAt || new Date().toISOString(),
          assignedRunner:null,
          claimedAt:null,
          completedAt:route.completedAt || null,
          notifiedAt:route.notifiedAt || null,
          qualityWindow:8
        });
      } else if (route.status === "complete" && existing.status !== "complete") {
        existing.status = "complete";
        existing.completedAt = route.completedAt || new Date().toISOString();
      }
    });

    const routeIds = new Set(routes.map(route => route.id));
    state.handoffs = state.handoffs.filter(item =>
      routeIds.has(item.routeId) || item.completedAt
    );

    if (!state.selectedId && state.handoffs[0]) {
      state.selectedId = state.handoffs[0].id;
    }

    save();
  }

  function readyAge(item) {
    return Math.max(0, Math.round((Date.now() - new Date(item.readyAt).getTime()) / 60000));
  }

  function pickupMinutes(item) {
    if (!item.claimedAt) return null;
    return Math.max(0, Math.round((new Date(item.claimedAt).getTime() - new Date(item.readyAt).getTime()) / 60000));
  }

  function toneFor(item) {
    if (item.status === "complete") return "stable";
    if (readyAge(item) >= item.qualityWindow) return "risk";
    if (readyAge(item) >= Math.max(3,item.qualityWindow-3)) return "watch";
    return "stable";
  }

  function selectedHandoff() {
    return state.handoffs.find(item => item.id === state.selectedId) || null;
  }

  function visibleHandoffs() {
    return state.handoffs.filter(item => {
      const filterMatch =
        state.filter === "all" ||
        state.filter === item.status ||
        (state.filter === "late" && toneFor(item) !== "stable");
      const staffMatch =
        state.staffFilter === "all" ||
        item.server === state.staffFilter ||
        item.assignedRunner === state.staffFilter;
      return filterMatch && staffMatch;
    });
  }

  function staffLoads() {
    const loads = Object.fromEntries(staff.map(member => [member.name,0]));
    state.handoffs
      .filter(item => ["ready","claimed"].includes(item.status))
      .forEach(item => {
        if (item.assignedRunner) {
          loads[item.assignedRunner] = (loads[item.assignedRunner] || 0) + 1;
        }
      });
    return loads;
  }

  function renderKPIs() {
    const active = state.handoffs.filter(item => item.status !== "complete");
    const ready = active.filter(item => item.status === "ready").length;
    const claimed = active.filter(item => item.status === "claimed").length;
    const late = active.filter(item => toneFor(item) === "risk").length;
    const pickupTimes = state.handoffs.map(pickupMinutes).filter(value => Number.isFinite(value));
    const average = pickupTimes.length
      ? Math.round(pickupTimes.reduce((sum,value) => sum + value,0) / pickupTimes.length)
      : 0;

    const loads = staffLoads();
    const totalCapacity = staff.reduce((sum,member) => sum + member.capacity,0);
    const used = Object.values(loads).reduce((sum,value) => sum + value,0);
    const capacity = Math.max(0,Math.round((1 - used / Math.max(1,totalCapacity)) * 100));

    byId("serverHandoffReadyCount").textContent = String(ready);
    byId("serverHandoffClaimedCount").textContent = String(claimed);
    byId("serverHandoffLateCount").textContent = String(late);
    byId("serverHandoffAveragePickup").textContent = `${average} min`;
    byId("serverHandoffRunnerCapacity").textContent = `${capacity}%`;

    const tone = late >= 2 || ready >= 4
      ? "risk"
      : late >= 1 || ready >= 2
        ? "watch"
        : "stable";

    byId("serverHandoffPressure").dataset.tone = tone;
    byId("serverHandoffPressureLabel").textContent =
      tone === "risk" ? "High" : tone === "watch" ? "Building" : "Stable";
    byId("serverHandoffPressureDetail").textContent =
      tone === "risk"
        ? "Multiple ready courses are beyond the pickup target."
        : tone === "watch"
          ? "Several courses need fast assignment or pickup."
          : "Ready courses are being claimed on time.";
  }

  function renderFilters() {
    const staffFilter = byId("serverHandoffStaffFilter");
    const runnerSelect = byId("serverHandoffRunnerSelect");

    staffFilter.innerHTML = '<option value="all">All staff</option>';
    runnerSelect.innerHTML = '<option value="">Choose staff member</option>';

    staff.forEach(member => {
      const optionA = document.createElement("option");
      optionA.value = member.name;
      optionA.textContent = `${member.name} · ${member.role}`;
      staffFilter.append(optionA);

      const optionB = document.createElement("option");
      optionB.value = member.name;
      optionB.textContent = `${member.name} · ${member.role}`;
      runnerSelect.append(optionB);
    });

    staffFilter.value = staff.some(member => member.name === state.staffFilter)
      ? state.staffFilter
      : "all";
  }

  function renderList() {
    const list = byId("serverHandoffList");
    list.replaceChildren();

    const rows = visibleHandoffs()
      .sort((a,b) => {
        const rank = {risk:0,watch:1,stable:2};
        return rank[toneFor(a)] - rank[toneFor(b)] || readyAge(b) - readyAge(a);
      });

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "server-handoff-empty";
      empty.textContent = "No handoffs match this view.";
      list.append(empty);
      return;
    }

    rows.forEach(item => {
      const card = document.createElement("article");
      card.className = "server-handoff-card";
      card.dataset.tone = toneFor(item);
      card.classList.toggle("is-selected", item.id === state.selectedId);

      const copy = document.createElement("div");
      copy.className = "server-handoff-copy";
      copy.innerHTML = "<small></small><strong></strong><p></p>";
      copy.querySelector("small").textContent = `${item.status} · ${item.station}`;
      copy.querySelector("strong").textContent = `${item.tableName} · ${item.course}`;
      copy.querySelector("p").textContent = `${item.server} · quality window ${item.qualityWindow} min`;

      const assignment = document.createElement("div");
      assignment.className = "server-handoff-assignment";
      assignment.textContent = item.assignedRunner || "Unassigned";
      const assignmentLabel = document.createElement("span");
      assignmentLabel.textContent = item.assignedRunner ? "Runner" : "Needs assignment";
      assignment.append(assignmentLabel);

      const age = document.createElement("div");
      age.className = "server-handoff-age";
      age.textContent = item.status === "complete" ? "Done" : `${readyAge(item)} min`;
      const ageLabel = document.createElement("span");
      ageLabel.textContent = item.status === "complete" ? "Completed" : "Ready age";
      age.append(ageLabel);

      card.addEventListener("click", () => {
        state.selectedId = item.id;
        save();
        render();
      });

      card.append(copy,assignment,age);
      list.append(card);
    });
  }

  function renderInspector() {
    const item = selectedHandoff();

    if (!item) {
      byId("serverHandoffSelectedTitle").textContent = "Choose a handoff";
      byId("serverHandoffSelectedStatus").textContent = "No handoff selected";
      [
        "serverHandoffTable",
        "serverHandoffCourse",
        "serverHandoffServer",
        "serverHandoffRunner",
        "serverHandoffAge",
        "serverHandoffQualityWindow"
      ].forEach(id => byId(id).textContent = "—");
      byId("serverHandoffRecommendation").textContent = "Select a ready course.";
      byId("serverHandoffRecommendationDetail").textContent =
        "Blue Current will balance server workload and protect food quality.";
      byId("serverHandoffRunnerSelect").value = "";
      return;
    }

    byId("serverHandoffSelectedTitle").textContent =
      `${item.tableName} · ${item.course}`;
    byId("serverHandoffSelectedStatus").textContent =
      `${item.status} · ${toneFor(item) === "risk" ? "Quality risk" : toneFor(item) === "watch" ? "Pickup watch" : "On pace"}`;
    byId("serverHandoffTable").textContent = item.tableName;
    byId("serverHandoffCourse").textContent = item.course;
    byId("serverHandoffServer").textContent = item.server;
    byId("serverHandoffRunner").textContent = item.assignedRunner || "Unassigned";
    byId("serverHandoffAge").textContent =
      item.status === "complete" ? "Complete" : `${readyAge(item)} min`;
    byId("serverHandoffQualityWindow").textContent = `${item.qualityWindow} min`;
    byId("serverHandoffRunnerSelect").value = item.assignedRunner || "";

    if (item.status === "complete") {
      byId("serverHandoffRecommendation").textContent =
        `${item.tableName} delivery is complete.`;
      byId("serverHandoffRecommendationDetail").textContent =
        "The course handoff has been closed and table progression updated.";
    } else if (!item.assignedRunner) {
      byId("serverHandoffRecommendation").textContent =
        `Assign the least-loaded staff member to ${item.tableName}.`;
      byId("serverHandoffRecommendationDetail").textContent =
        "This course is ready but has no pickup owner.";
    } else if (toneFor(item) === "risk") {
      byId("serverHandoffRecommendation").textContent =
        `Escalate ${item.tableName} immediately.`;
      byId("serverHandoffRecommendationDetail").textContent =
        `${item.course} has been ready for ${readyAge(item)} minutes. Reassign or deliver now.`;
    } else {
      byId("serverHandoffRecommendation").textContent =
        `${item.assignedRunner} should deliver ${item.tableName} now.`;
      byId("serverHandoffRecommendationDetail").textContent =
        "Complete the delivery before the remaining quality window closes.";
    }

    byId("serverHandoffAssign").disabled = item.status === "complete";
    byId("serverHandoffNotify").disabled = item.status === "complete";
    byId("serverHandoffComplete").disabled = item.status === "complete";
  }

  function renderTeam() {
    const grid = byId("serverHandoffTeamGrid");
    const loads = staffLoads();

    grid.replaceChildren();

    staff.forEach(member => {
      const load = loads[member.name] || 0;
      const percent = Math.round((load / member.capacity) * 100);
      const tone = percent >= 100 ? "risk" : percent >= 67 ? "watch" : "stable";

      const card = document.createElement("article");
      card.className = "server-handoff-team-card";
      card.dataset.tone = tone;
      card.innerHTML = "<small></small><strong></strong><span></span><div class='server-handoff-team-meter'><i></i></div>";
      card.querySelector("small").textContent = member.role;
      card.querySelector("strong").textContent = member.name;
      card.querySelector("span").textContent =
        `${load} of ${member.capacity} active handoffs`;
      card.querySelector("i").style.width = `${Math.min(100,Math.max(4,percent))}%`;
      grid.append(card);
    });

    byId("serverHandoffTeamUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function render() {
    syncHandoffs();
    renderFilters();
    renderKPIs();
    renderList();
    renderInspector();
    renderTeam();

    byId("serverHandoffUpdated").textContent =
      `Updated ${new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date())}`;
  }

  function assignRunner() {
    const item = selectedHandoff();
    const runner = byId("serverHandoffRunnerSelect").value;
    if (!item || !runner || item.status === "complete") return;

    item.assignedRunner = runner;
    item.status = "claimed";
    item.claimedAt = item.claimedAt || new Date().toISOString();

    save();
    render();

    byId("serverHandoffStatus").textContent =
      `${runner} assigned to ${item.tableName}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:handoff-assigned", {
      detail:{ handoff:{...item} }
    }));
  }

  function notifyServer() {
    const item = selectedHandoff();
    if (!item || item.status === "complete") return;

    item.notifiedAt = new Date().toISOString();
    save();
    render();

    byId("serverHandoffStatus").textContent =
      `${item.server} notified for ${item.tableName}.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:server-ready-notified", {
      detail:{ handoff:{...item} }
    }));
  }

  function completeDelivery() {
    const item = selectedHandoff();
    if (!item || item.status === "complete") return;

    item.status = "complete";
    item.completedAt = new Date().toISOString();

    const floor = readFloor();
    const table = floor.tables.find(row => row.id === item.tableId);
    if (table) {
      if (table.stage === "appetizers") table.stage = "entrees";
      else if (table.stage === "entrees") table.stage = "dessert";
      else if (table.stage === "dessert") table.stage = "check";
      saveFloor(floor);
    }

    save();
    render();

    byId("serverHandoffStatus").textContent =
      `${item.tableName} delivery completed.`;

    window.dispatchEvent(new CustomEvent("bluecurrent:handoff-completed", {
      detail:{ handoff:{...item} }
    }));
  }

  function bind() {
    byId("serverHandoffFilter")?.addEventListener("change", event => {
      state.filter = event.target.value;
      save();
      render();
    });

    byId("serverHandoffStaffFilter")?.addEventListener("change", event => {
      state.staffFilter = event.target.value;
      save();
      render();
    });

    byId("serverHandoffAssign")?.addEventListener("click", assignRunner);
    byId("serverHandoffNotify")?.addEventListener("click", notifyServer);
    byId("serverHandoffComplete")?.addEventListener("click", completeDelivery);

    window.addEventListener("bluecurrent:kitchen-ticket-updated", render);
    window.addEventListener("bluecurrent:ticket-handoff-completed", render);
    window.addEventListener("bluecurrent:party-seated", render);
    window.addEventListener("bluecurrent:table-cleared", render);
  }

  function init() {
    if (!byId("serverHandoffCenter")) return;
    load();
    byId("serverHandoffFilter").value = state.filter;
    bind();
    render();
    setInterval(render,60000);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded",init,{once:true})
    : init();
})();
