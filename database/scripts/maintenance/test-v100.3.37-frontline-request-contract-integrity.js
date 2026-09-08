"use strict";

const fs = require("fs");
const path = require("path");
const SchedulingService = require("../../server/services/schedulingService");

const root = path.resolve(__dirname, "../..");
const router = fs.readFileSync(path.join(root, "server/api/router.js"), "utf8");
let passed = 0;
let total = 0;
function check(name, condition) {
  total += 1;
  if (condition) { passed += 1; console.log(`PASS ${total}: ${name}`); }
  else { console.error(`FAIL ${total}: ${name}`); process.exitCode = 1; }
}

function exactRoute(method, pathname) {
  const marker = `if (url.pathname === "${pathname}" && request.method === "${method}")`;
  const start = router.indexOf(marker);
  if (start < 0) return "";
  const next = router.indexOf("\n    if (", start + marker.length);
  return router.slice(start, next > start ? next : start + 1800);
}

async function statusFrom(work) {
  try { await work(); return null; }
  catch (error) { return error.statusCode || null; }
}

(async () => {
  const locationRoutes = [
    ["POST", "/api/scheduling/shifts", "shift creation"],
    ["POST", "/api/scheduling/publish", "schedule publication"],
    ["POST", "/api/scheduling/copy-previous", "schedule copying"],
    ["POST", "/api/workforce-foundation/employees", "employee creation"],
    ["POST", "/api/workforce-foundation/shift-templates", "shift-template creation"],
    ["POST", "/api/timeclock/clock-in", "clock-in"],
    ["POST", "/api/ai-brain/refresh", "AI refresh"],
    ["POST", "/api/reservations", "reservation creation"]
  ];
  for (const [method, pathname, label] of locationRoutes) {
    const block = exactRoute(method, pathname);
    check(`${label} returns an explicit missing-location contract`, block.includes('Location is required.') && /sendJson\(response,\s*400/.test(block));
  }

  const publish = exactRoute("POST", "/api/scheduling/publish");
  const copy = exactRoute("POST", "/api/scheduling/copy-previous");
  check("Schedule publication requires an explicit week", publish.includes('Week start is required.'));
  check("Schedule copying requires an explicit week", copy.includes('Week start is required.'));

  for (const pathname of ["/api/timeclock/clock-in", "/api/timeclock/clock-out", "/api/timeclock/break-start", "/api/timeclock/break-end"]) {
    check(`${pathname} requires employee identity`, exactRoute("POST", pathname).includes('Employee is required.'));
  }

  const recommendationStart = router.indexOf('if (url.pathname.startsWith("/api/ai-brain/recommendations/")');
  const recommendationBlock = router.slice(recommendationStart, recommendationStart + 1000);
  check("AI recommendation decisions require explicit location", recommendationBlock.includes('Location is required.') && recommendationBlock.includes('sendJson(response, 400'));

  const database = { get: async () => null };
  const scheduling = new SchedulingService(database, { record: async () => true }, { publish: () => true });
  check("Scheduling validation errors carry HTTP 400", await statusFrom(() => scheduling.create({}, "Manager", "org_one")) === 400);
  check("Schedule publishing cannot choose an implicit week", await statusFrom(() => scheduling.publish({ locationId:"loc_one" }, "Manager", "org_one")) === 400);
  check("Schedule copying cannot choose an implicit week", await statusFrom(() => scheduling.copyPrevious({ locationId:"loc_one" }, "Manager", "org_one")) === 400);
  check("No database payload is included", !fs.existsSync(path.join(root, "database/data/V100.3.37.json")));

  console.log(`V100.3.37 validation ${passed}/${total}`);
  if (passed !== total) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
