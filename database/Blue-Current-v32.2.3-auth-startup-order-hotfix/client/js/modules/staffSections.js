
(function () {
  "use strict";

  function createStaffSectionsModule(eventBus, appState, cloudFoundationModule, floorModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const $ = id => document.getElementById(id);
    const locationId = "loc_marina";
    let state = { staff: [], sections: [], tables: [] };
    let selectedStaffId = null;

    function staffById(id) {
      return state.staff.find(item => item.id === id);
    }

    function sectionById(id) {
      return state.sections.find(item => item.id === id);
    }

    function workloadFor(staffId) {
      const tables = state.tables.filter(table => table.serverId === staffId && table.status === "seated");
      const covers = tables.reduce((sum, table) => sum + Number(table.partySize || 0), 0);
      return { tables: tables.length, covers };
    }

    function renderMetrics() {
      const active = state.staff.filter(item => item.status === "active").length;
      const seatedTables = state.tables.filter(item => item.status === "seated").length;
      const totalCovers = state.tables.filter(item => item.status === "seated")
        .reduce((sum, table) => sum + Number(table.partySize || 0), 0);
      const overloaded = state.staff.filter(item => {
        const work = workloadFor(item.id);
        return item.maxCovers > 0 && work.covers / item.maxCovers >= .85;
      }).length;

      $("staffActiveCount").textContent = active;
      $("staffSeatedTables").textContent = seatedTables;
      $("staffActiveCovers").textContent = totalCovers;
      $("staffOverloaded").textContent = overloaded;

      appState.update({
        activeStaffCount: active,
        activeCovers: totalCovers,
        overloadedStaffCount: overloaded
      });
    }

    function renderStaff() {
      $("staffRoster").innerHTML = state.staff.map(member => {
        const workload = workloadFor(member.id);
        const utilization = member.maxCovers ? Math.min(100, Math.round(workload.covers / member.maxCovers * 100)) : 0;
        const section = sectionById(member.sectionId);
        return `
          <button class="staff-roster-row ${member.id === selectedStaffId ? "selected" : ""}" data-staff-id="${member.id}">
            <span>${member.name.split(" ").map(part => part[0]).slice(0,2).join("")}</span>
            <div>
              <strong>${member.name}</strong>
              <small>${member.role} · ${section?.name || "Unassigned"}</small>
              <i><b style="width:${utilization}%"></b></i>
            </div>
            <em>${workload.covers}/${member.maxCovers || "—"} covers</em>
          </button>`;
      }).join("");
    }

    function renderSections() {
      $("sectionAssignmentGrid").innerHTML = state.sections.map(section => {
        const server = staffById(section.serverId);
        const tables = state.tables.filter(table => section.tableIds.includes(table.id));
        const activeTables = tables.filter(table => table.status === "seated").length;
        const covers = tables.reduce((sum, table) => sum + Number(table.partySize || 0), 0);
        return `
          <article class="section-card color-${section.colorKey}">
            <div><small>${section.name}</small><strong>${server?.name || "Unassigned"}</strong></div>
            <p>${activeTables} active tables · ${covers} covers</p>
            <select data-section-select="${section.id}">
              ${state.staff.filter(member => member.role === "Server").map(member => `<option value="${member.id}" ${member.id === section.serverId ? "selected" : ""}>${member.name}</option>`).join("")}
            </select>
          </article>`;
      }).join("");
    }

    function renderBalance() {
      const servers = state.staff.filter(member => member.role === "Server");
      $("staffBalanceBoard").innerHTML = servers.map(member => {
        const workload = workloadFor(member.id);
        const ratio = member.maxCovers ? workload.covers / member.maxCovers : 0;
        const status = ratio >= .85 ? "overloaded" : ratio >= .6 ? "busy" : "balanced";
        return `
          <article class="${status}">
            <div><strong>${member.name}</strong><span>${status}</span></div>
            <p>${workload.tables} tables · ${workload.covers} covers · ${Math.round(ratio * 100)}% capacity</p>
          </article>`;
      }).join("");
    }

    function renderInspector() {
      const member = staffById(selectedStaffId);
      if (!member) {
        $("staffInspector").innerHTML = `<div class="staff-inspector-empty"><strong>Select a staff member</strong><p>Review workload, shift status, and assigned tables.</p></div>`;
        return;
      }
      const section = sectionById(member.sectionId);
      const tables = state.tables.filter(table => table.serverId === member.id);
      $("staffInspector").innerHTML = `
        <div class="staff-inspector-head">
          <div><small>Staff member</small><h3>${member.name}</h3></div>
          <span class="${member.status}">${member.status}</span>
        </div>
        <div class="staff-detail-grid">
          <label>Status<select id="staffStatus"><option ${member.status === "active" ? "selected" : ""}>active</option><option ${member.status === "break" ? "selected" : ""}>break</option><option ${member.status === "off" ? "selected" : ""}>off</option></select></label>
          <label>Max covers<input id="staffMaxCovers" type="number" min="0" value="${member.maxCovers || 0}"></label>
          <label>Section<select id="staffSection">
            <option value="">Unassigned</option>
            ${state.sections.map(item => `<option value="${item.id}" ${item.id === member.sectionId ? "selected" : ""}>${item.name}</option>`).join("")}
          </select></label>
          <label>Role<select id="staffRole"><option ${member.role === "Server" ? "selected" : ""}>Server</option><option ${member.role === "Host" ? "selected" : ""}>Host</option><option ${member.role === "Bartender" ? "selected" : ""}>Bartender</option></select></label>
        </div>
        <div class="staff-table-list">
          <small>Assigned tables</small>
          ${tables.length ? tables.map(table => `<p><strong>${table.name}</strong><span>${table.status} · ${table.partySize || 0} guests</span></p>`).join("") : "<p>No assigned tables.</p>"}
        </div>
        <button class="button button-gold" id="staffSave">Save staff assignment</button>`;
    }

    function renderAll() {
      renderMetrics();
      renderStaff();
      renderSections();
      renderBalance();
      renderInspector();
    }

    async function load() {
      if (!api.token) return;
      state = await api.staffOperations(locationId);
      if (!selectedStaffId && state.staff[0]) selectedStaffId = state.staff[0].id;
      renderAll();
      eventBus.emit("staff:loaded", { count: state.staff.length, locationId });
    }

    $("staffRoster")?.addEventListener("click", event => {
      const row = event.target.closest("[data-staff-id]");
      if (!row) return;
      selectedStaffId = row.dataset.staffId;
      renderAll();
    });

    $("sectionAssignmentGrid")?.addEventListener("change", async event => {
      const select = event.target.closest("[data-section-select]");
      if (!select) return;
      await api.assignSection({ sectionId: select.dataset.sectionSelect, serverId: select.value });
      await load();
      floorModule?.reload?.();
    });

    $("staffInspector")?.addEventListener("click", async event => {
      if (!event.target.closest("#staffSave")) return;
      const member = staffById(selectedStaffId);
      if (!member) return;
      await api.updateStaff(member.id, {
        status: $("staffStatus").value,
        maxCovers: Number($("staffMaxCovers").value),
        sectionId: $("staffSection").value || null,
        role: $("staffRole").value
      });
      if ($("staffSection").value) {
        await api.assignSection({ sectionId: $("staffSection").value, serverId: member.id });
      }
      await load();
      floorModule?.reload?.();
    });

    ["staff:updated","staff:section-assigned","staff:table-reassigned","floor:table-updated","reservation:seated"].forEach(type => {
      eventBus.on?.(type, () => load());
    });
    eventBus.on?.("auth:signed-in", load);
    eventBus.on?.("auth:restored", load);

    load();

    return {
      reload: load,
      getState: () => JSON.parse(JSON.stringify(state))
    };
  }

  window.createBlueCurrentStaffSectionsModule = createStaffSectionsModule;
})();
