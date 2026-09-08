"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const router = fs.readFileSync(path.join(root, "server/api/router.js"), "utf8");
let passed = 0;
let total = 0;

function check(name, condition) {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`PASS ${total}: ${name}`);
  } else {
    console.error(`FAIL ${total}: ${name}`);
    process.exitCode = 1;
  }
}

function route(method, pathname) {
  const marker = `if (url.pathname === "${pathname}" && request.method === "${method}")`;
  const start = router.indexOf(marker);
  if (start < 0) return "";
  const next = router.indexOf("\n    if (", start + marker.length);
  return router.slice(start, next > start ? next : start + 1200);
}

const hasOperationsGuard = block => /if\s*\(\s*!canWriteOperations\(\)\s*\)/.test(block);

check("A shared operations-write predicate is defined", router.includes("const canWriteOperations = () =>"));
check("The predicate accepts general write permission", router.includes('authService.can(auth, "write") || authService.can(auth, "write_operations")'));

const exactRoutes = [
  ["POST", "/api/manager-actions", "manager actions"],
  ["POST", "/api/manager-actions/service-exceptions", "service exception synchronization"],
  ["POST", "/api/command-center/handoffs", "command handoff creation"],
  ["POST", "/api/scheduling/publish", "schedule publishing"],
  ["POST", "/api/scheduling/copy-previous", "schedule copying"],
  ["POST", "/api/scheduling/ai/smart-fill", "schedule smart fill"],
  ["POST", "/api/workforce-foundation/shift-templates", "shift-template creation"],
  ["POST", "/api/inventory-intelligence/purchase-orders", "purchase-order creation"]
];

for (const [method, pathname, label] of exactRoutes) {
  check(`${label} requires operations-write permission`, hasOperationsGuard(route(method, pathname)));
}

const guardedFragments = [
  ['managerActionMatch && request.method === "PATCH"', "manager action updates"],
  ['managerActionMatch && request.method === "DELETE"', "manager action deletion"],
  ['handoffAckMatch && request.method === "PATCH"', "command handoff acknowledgement"],
  ['url.pathname.startsWith("/api/scheduling/shifts/") && request.method === "PATCH"', "schedule updates"],
  ['url.pathname.startsWith("/api/scheduling/shifts/") && request.method === "DELETE"', "schedule deletion"],
  ['url.pathname.startsWith("/api/workforce-foundation/employees/") && request.method === "PATCH"', "employee updates"],
  ['url.pathname.startsWith("/api/workforce-foundation/pto/") && request.method === "PATCH"', "PTO decisions"],
  ['url.pathname.startsWith("/api/timeclock/timecards/") && request.method === "PATCH"', "timecard corrections"],
  ['url.pathname.startsWith("/api/inventory-intelligence/recommendations/") && request.method === "POST"', "inventory recommendation actions"],
  ['url.pathname.startsWith("/api/inventory-intelligence/policies/") && request.method === "PATCH"', "inventory policy updates"],
  ['url.pathname.startsWith("/api/workforce-intelligence/recommendations/") && request.method === "POST"', "workforce recommendation actions"],
  ['url.pathname.startsWith("/api/workforce-intelligence/plans/") && request.method === "PATCH"', "workforce plan updates"]
];

for (const [marker, label] of guardedFragments) {
  const start = router.indexOf(marker);
  check(`${label} require operations-write permission`, start >= 0 && hasOperationsGuard(router.slice(start, start + 350)));
}

const clockIn = route("POST", "/api/timeclock/clock-in");
const availability = route("POST", "/api/workforce-foundation/availability");
const ptoRequest = route("POST", "/api/workforce-foundation/pto");
check("Employee clock-in remains self-service", !clockIn.includes("canWriteOperations"));
check("Availability submission remains self-service", !availability.includes("canWriteOperations"));
check("PTO submission remains self-service", !ptoRequest.includes("canWriteOperations"));
check("The package contains no database payload", !fs.existsSync(path.join(root, "database/data/V100.3.34.json")));

console.log(`V100.3.34 validation ${passed}/${total}`);
if (passed !== total) process.exitCode = 1;
