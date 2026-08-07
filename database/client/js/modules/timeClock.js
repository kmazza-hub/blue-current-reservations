(function () {
  "use strict";
  function createBlueCurrentTimeClockModule(eventBus, appState, cloudFoundationModule) {
    const api = cloudFoundationModule?.api || new window.BlueCurrentCloudApi("");
    const byId = id => document.getElementById(id);
    const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
    let state = { summary: {}, employees: [], active: [], timecards: [], corrections: [] };

    function render() {
      const summary = state.summary || {};
      const values = { tcWorking: summary.employeesWorking, tcBreak: summary.onBreak, tcHours: summary.laborHours, tcCost: money(summary.laborCost), tcOvertime: summary.overtimeRisk, tcMissed: summary.missedPunches };
      Object.entries(values).forEach(([id, value]) => { if (byId(id)) byId(id).textContent = value ?? "—"; });
      if (byId("tcEmployee")) byId("tcEmployee").innerHTML = state.employees.map(employee => `<option value="${employee.id}">${employee.name} · ${employee.role}</option>`).join("");
      if (byId("tcActive")) byId("tcActive").innerHTML = state.active.map(item => `<article class="${item.onBreak ? "on-break" : ""}"><div><strong>${item.employeeName}</strong><span>${item.role} · ${item.department}</span></div><div><b>${item.workedHours}h</b><span>${money(item.laborCost)}</span></div><div>${item.onBreak ? `<button data-tc="break-end" data-employee="${item.employeeId}">End break</button>` : `<button data-tc="break-start" data-employee="${item.employeeId}">Start break</button>`}<button data-tc="clock-out" data-employee="${item.employeeId}">Clock out</button></div></article>`).join("") || "<p>No employees currently clocked in.</p>";
      if (byId("tcTimecards")) byId("tcTimecards").innerHTML = state.timecards.map(item => `<article><div><strong>${state.employees.find(employee => employee.id === item.employeeId)?.name || item.employeeId}</strong><span>${new Date(item.clockIn).toLocaleTimeString()} → ${item.clockOut ? new Date(item.clockOut).toLocaleTimeString() : "Active"}</span></div><b>${item.status}</b><button data-correct="${item.id}">Correct</button></article>`).join("");
      if (byId("tcCorrections")) byId("tcCorrections").innerHTML = state.corrections.map(item => `<article><strong>${item.reason}</strong><span>${item.actor}</span><small>${new Date(item.createdAt).toLocaleString()}</small></article>`).join("") || "<p>No manager corrections.</p>";
      if (byId("tcUpdated")) byId("tcUpdated").textContent = state.generatedAt ? new Date(state.generatedAt).toLocaleTimeString() : "—";
      appState.update({ employeesWorking: summary.employeesWorking || 0, employeesOnBreak: summary.onBreak || 0, laborHoursToday: summary.laborHours || 0, laborCostToday: summary.laborCost || 0, overtimeRisk: summary.overtimeRisk || 0 });
    }

    async function load() { if (!api.token) return; state = await api.timeClock(); render(); }
    async function kiosk(action) {
      const employeeId = byId("tcEmployee")?.value, pin = byId("tcPin")?.value;
      if (!employeeId) return;
      try {
        if (action === "clock-in") await api.clockIn({ employeeId, pin, locationId: "loc_marina", source: "kiosk" });
        else await api.clockOut({ employeeId, locationId: "loc_marina" });
        if (byId("tcPin")) byId("tcPin").value = "";
        await load();
      } catch (error) { alert(error.message || "Time-clock action failed"); }
    }

    byId("tcClockIn")?.addEventListener("click", () => kiosk("clock-in"));
    byId("tcClockOut")?.addEventListener("click", () => kiosk("clock-out"));
    byId("tcRefresh")?.addEventListener("click", load);
    byId("tcActive")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-tc]"); if (!button) return;
      try {
        if (button.dataset.tc === "clock-out") await api.clockOut({ employeeId: button.dataset.employee, locationId: "loc_marina" });
        if (button.dataset.tc === "break-start") await api.startBreak({ employeeId: button.dataset.employee, locationId: "loc_marina", paid: false });
        if (button.dataset.tc === "break-end") await api.endBreak({ employeeId: button.dataset.employee, locationId: "loc_marina" });
        await load();
      } catch (error) { alert(error.message || "Action failed"); }
    });
    byId("tcTimecards")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-correct]"); if (!button) return;
      const reason = prompt("Reason for correction", "Manager correction"); if (reason === null) return;
      await api.correctTimecard(button.dataset.correct, { reason }); await load();
    });
    ["timeclock:clocked-in", "timeclock:clocked-out", "timeclock:break-started", "timeclock:break-ended", "timeclock:timecard-corrected"].forEach(type => eventBus.on?.(type, load));
    eventBus.on?.("auth:signed-in", load); eventBus.on?.("auth:restored", load);
    const timer = setInterval(load, 30000); load();
    return { reload: load, getState: () => JSON.parse(JSON.stringify(state)), destroy: () => clearInterval(timer) };
  }
  window.createBlueCurrentTimeClockModule = createBlueCurrentTimeClockModule;
})();
