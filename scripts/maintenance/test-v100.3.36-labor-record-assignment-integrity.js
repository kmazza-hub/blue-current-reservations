"use strict";

const crypto = require("crypto");
const SchedulingService = require("../../server/services/schedulingService");
const WorkforceFoundationService = require("../../server/services/workforceFoundationService");
const TimeClockService = require("../../server/services/timeClockService");
const EmployeePortalService = require("../../server/services/employeePortalService");

let passed = 0;
let total = 0;
function check(name, condition) {
  total += 1;
  if (condition) { passed += 1; console.log(`PASS ${total}: ${name}`); }
  else { console.error(`FAIL ${total}: ${name}`); process.exitCode = 1; }
}

function memoryDatabase(data) {
  return {
    read: async () => data,
    get: async (collection, id) => (data[collection] || []).find(item => item.id === id) || null,
    create: async (collection, item) => { data[collection] ||= []; data[collection].push(item); return item; },
    insert: async (collection, item) => { data[collection] ||= []; data[collection].push(item); return item; },
    update: async (collection, id, patch) => { const item=(data[collection]||[]).find(row=>row.id===id);if(!item)return null;Object.assign(item,patch);return item; },
    mutate: async callback => callback(data)
  };
}

async function rejects(work, message) {
  try { await work(); return false; }
  catch (error) { return !message || error.message === message; }
}

const auditService = { record: async () => true };
const realtimeHub = { publish: () => true };

(async () => {
  const data = {
    locations: [
      { id: "loc_one", organizationId: "org_one" },
      { id: "loc_two", organizationId: "org_two" }
    ],
    staff: [
      { id: "staff_one", organizationId: "org_one", locationId: "loc_one", name: "One", role: "Server", status: "active" },
      { id: "staff_two", organizationId: "org_two", locationId: "loc_two", name: "Two", role: "Server", status: "active" }
    ],
    employees: [
      { id: "employee_one", organizationId: "org_one", locationId: "loc_one", name: "Employee One", role: "Server", status: "active", pin: "1111" },
      { id: "employee_target", organizationId: "org_one", locationId: "loc_one", name: "Employee Target", role: "Server", status: "active", pin: "2222" },
      { id: "employee_two", organizationId: "org_two", locationId: "loc_two", name: "Employee Two", role: "Server", status: "active", pin: "3333" }
    ],
    scheduleShifts: [
      { id: "shift_one", organizationId: "org_one", locationId: "loc_one", employeeId: "staff_one", date: "2026-09-07", startTime: "16:00", endTime: "22:00", role: "Server", status: "draft" },
      { id: "portal_shift", organizationId: "org_one", locationId: "loc_one", employeeId: "employee_one", date: "2026-09-08", startTime: "16:00", endTime: "22:00", role: "Server", status: "draft" },
      { id: "foreign_portal_shift", organizationId: "org_two", locationId: "loc_two", employeeId: "employee_one", date: "2026-09-08", startTime: "16:00", endTime: "22:00", role: "Server", status: "draft" }
    ],
    schedulePublications: [], employeeAvailability: [], ptoRequests: [], reservations: [],
    employeeTimecards: [], employeeBreaks: [], timeClockPolicies: [], timeClockCorrections: [],
    workforceRoles: [], shiftTemplates: [], employeePortalSessions: [], shiftSwapRequests: [], employeeNotifications: []
  };
  const database = memoryDatabase(data);
  const scheduling = new SchedulingService(database, auditService, realtimeHub);
  const workforce = new WorkforceFoundationService(database, auditService, realtimeHub);
  const timeClock = new TimeClockService(database, auditService, realtimeHub);
  const portal = new EmployeePortalService(database, auditService, realtimeHub);

  check("Scheduling rejects foreign restaurant snapshots", await rejects(() => scheduling.snapshot("org_one", "loc_two"), "Location is not available to this organization."));
  check("Shift creation rejects a foreign employee", await rejects(() => scheduling.create({ locationId:"loc_one",date:"2026-09-09",startTime:"16:00",endTime:"22:00",role:"Server",employeeId:"staff_two" }, "Manager", "org_one"), "Employee is not available at this location."));
  check("Shift updates reject a foreign employee", await rejects(() => scheduling.update("shift_one", { employeeId:"staff_two" }, "Manager", "org_one"), "Employee is not available at this location."));
  const createdShift = await scheduling.create({ locationId:"loc_one",date:"2026-09-09",startTime:"16:00",endTime:"22:00",role:"Server",employeeId:"staff_one" }, "Manager", "org_one");
  check("Valid same-restaurant shift assignment remains available", createdShift.employeeId === "staff_one");
  check("Schedule publication rejects a foreign restaurant", await rejects(() => scheduling.publish({ locationId:"loc_two",weekStart:"2026-09-07" }, "Manager", "org_one"), "Location is not available to this organization."));

  check("Employee creation rejects a foreign restaurant", await rejects(() => workforce.createEmployee({ locationId:"loc_two",name:"Wrong",role:"Server" }, "Manager", "org_one"), "Location is not available to this organization."));
  check("Shift-template creation rejects a foreign restaurant", await rejects(() => workforce.createShiftTemplate({ locationId:"loc_two",name:"Close",role:"Server",startTime:"16:00",endTime:"22:00" }, "Manager", "org_one"), "Location is not available to this organization."));
  check("Time Clock rejects foreign restaurant snapshots", await rejects(() => timeClock.snapshot("org_one", "loc_two"), "Location is not available to this organization."));
  check("Clock-in rejects mismatched restaurant identity", await rejects(() => timeClock.clockIn({ employeeId:"employee_one",locationId:"loc_two",pin:"1111" }, "Employee One", "org_one"), "Employee and location do not match"));
  const card = await timeClock.clockIn({ employeeId:"employee_one",locationId:"loc_one",pin:"1111" }, "Employee One", "org_one");
  check("Valid same-restaurant clock-in remains available", card.locationId === "loc_one" && card.employeeId === "employee_one");
  data.employeeTimecards.unshift({ id:"wrong_location_card",organizationId:"org_one",locationId:"loc_two",employeeId:"employee_target",status:"active",clockIn:new Date().toISOString(),clockOut:null });
  check("Clock-out cannot consume a card from another restaurant", await rejects(() => timeClock.clockOut({ employeeId:"employee_target" }, "Employee Target", "org_one"), "No active timecard"));

  const token = "portal-token";
  data.employeePortalSessions.push({ id:"session_bad",tokenHash:crypto.createHash("sha256").update(token).digest("hex"),employeeId:"employee_one",organizationId:"org_one",locationId:"loc_two",expiresAt:new Date(Date.now()+3600000).toISOString() });
  check("Portal authentication rejects session-location drift", await portal.authenticate(token) === null);
  check("Swap requests reject a foreign shift", await rejects(() => portal.requestSwap(data.employees[0], { shiftId:"foreign_portal_shift" }), "Assigned shift not found."));
  check("Swap requests reject a foreign target employee", await rejects(() => portal.requestSwap(data.employees[0], { shiftId:"portal_shift",targetEmployeeId:"employee_two" }), "Swap target is not available at this location."));
  const swap = await portal.requestSwap(data.employees[0], { shiftId:"portal_shift",targetEmployeeId:"employee_target" });
  check("Valid same-restaurant swap requests remain available", swap.targetEmployeeId === "employee_target" && swap.locationId === "loc_one");

  const fs = require("fs");
  const path = require("path");
  check("No database payload is included", !fs.existsSync(path.resolve(__dirname, "../../database/data/V100.3.36.json")));
  console.log(`V100.3.36 validation ${passed}/${total}`);
  if (passed !== total) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
