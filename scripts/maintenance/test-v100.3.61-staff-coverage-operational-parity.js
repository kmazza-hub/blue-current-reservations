"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [];
const check = (label, condition) => { assert.ok(condition, label); checks.push(label); console.log(`PASS: ${label}`); };

const staff = read("client/js/staff-truth-v100.2.64.js");
const coverage = read("client/js/staff-role-coverage-v100.2.65.js");
const attendance = read("client/js/staff-attendance-v100.2.66.js");
const schedule = read("client/js/scheduling-truth-v100.2.73.js");
const timeclock = read("client/js/timeclock-truth-v100.2.76.js");
const workforce = read("client/js/modules/workforceFoundation.js");
const scheduling = read("client/js/modules/scheduling.js");
const cloudApi = read("client/js/cloud/cloudApi.js");
const index = read("client/index.html");

check("Staff data clients resynchronize with the authenticated browser token", [staff, coverage, attendance, schedule, timeclock].every(source => source.includes("blueCurrentV3230Token") && source.includes("api.setToken(token)")));
check("Staff truth refreshes when authentication becomes ready", [staff, coverage, attendance, schedule, timeclock].every(source => source.includes("bluecurrent:auth-session-state")));
check("Focused Staff Coverage exposes employee, schedule, and time-clock operations", ["workforce-foundation", "scheduling", "time-clock"].every(id => staff.includes(`data-bc-staff-section=\"${id}\"`)));
check("Staff operations retain large iPad touch targets", staff.includes("min-height:58px") && staff.includes("grid-template-columns:1fr"));
check("Employee creation, availability, PTO, and templates remain wired to APIs", ["createWorkforceEmployee", "saveEmployeeAvailability", "createPtoRequest", "createShiftTemplate"].every(method => workforce.includes(method)));
check("Schedule editing and manager publication remain wired to APIs", scheduling.includes("createScheduleShift") && scheduling.includes("publishSchedule") && schedule.includes("data-bc-sch-edit"));
check("Time Clock retains clock in, clock out, breaks, and corrections", ["clockIn", "clockOut", "startBreak", "endBreak", "correctTimecard"].every(method => timeclock.includes(method)));
check("Cloud API retains all staff mutation boundaries", ["createWorkforceEmployee", "saveEmployeeAvailability", "createPtoRequest", "createShiftTemplate", "createScheduleShift", "publishSchedule", "clockIn", "clockOut", "correctTimecard"].every(method => cloudApi.includes(method)));
const build=Number(index.match(/name="blue-current-build" content="100\.3\.(\d+)"/)?.[1]||0);
check("V100.3.61 staffing assets are cache-advanced", build>=61 && ["staff-truth-v100.2.64.js", "staff-role-coverage-v100.2.65.js", "staff-attendance-v100.2.66.js", "scheduling-truth-v100.2.73.js", "timeclock-truth-v100.2.76.js"].every(file => index.includes(`${file}?v=100.3.${build}`)));

console.log(`V100.3.61 staff coverage operational parity ${checks.length}/${checks.length}`);
