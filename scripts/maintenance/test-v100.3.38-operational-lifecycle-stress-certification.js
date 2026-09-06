"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "../..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v338-"));
const databasePath = path.join(tempRoot, "blue-current.json");
const serverLogPath = path.join(tempRoot, "server.log");
const port = 18800 + Math.floor(Math.random() * 800);
const origin = `http://127.0.0.1:${port}`;
let server = null;
let passed = 0;
let total = 0;

fs.copyFileSync(path.join(root, "database/seed/seed.json"), databasePath);

function check(name, condition) {
  total += 1;
  if (condition) { passed += 1; console.log(`PASS ${total}: ${name}`); }
  else { console.error(`FAIL ${total}: ${name}`); process.exitCode = 1; }
}

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function startServer() {
  const log = fs.openSync(serverLogPath, "a");
  server = spawn(process.execPath, [path.join(root, "server/server.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), BLUE_CURRENT_DB: databasePath },
    stdio: ["ignore", log, log]
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Test server exited early. See ${serverLogPath}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch (_) {}
    await pause(100);
  }
  throw new Error(`Test server did not become healthy. See ${serverLogPath}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise(resolve => server.once("exit", resolve)),
    pause(3000)
  ]);
  server = null;
}

async function request(pathname, { method="GET", token=null, body, idempotencyKey=null } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["X-Blue-Current-Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  return { status: response.status, headers: response.headers, payload };
}

async function login() {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email: "keith@bluecurrent.demo", password: "BlueCurrent23!" }
  });
  if (response.status !== 200 || !response.payload.token) throw new Error("Demo owner login failed.");
  return response.payload.token;
}

async function mutation(pathname, token, body, idempotencyKey, method="POST") {
  return request(pathname, { method, token, body, idempotencyKey });
}

(async () => {
  await startServer();
  const firstToken = await login();
  const secondToken = await login();
  check("Two authenticated operator sessions are available", Boolean(firstToken && secondToken && firstToken !== secondToken));

  const reservationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const created = await mutation("/api/reservation-operations", firstToken, {
    locationId: "loc_marina",
    guestName: "V338 Lifecycle Guest",
    phone: "7325550138",
    partySize: 2,
    reservationTime,
    status: "confirmed",
    source: "V100.3.38 certification"
  }, "v338-reservation-create");
  check("Reservation creation succeeds", created.status === 201 && created.payload.guestName === "V338 Lifecycle Guest");
  const reservationId = created.payload.id;

  const arrived = await mutation(`/api/reservation-operations/${encodeURIComponent(reservationId)}`, firstToken, { status:"arrived" }, "v338-reservation-arrive", "PATCH");
  check("Reservation advances to arrived", arrived.status === 200 && arrived.payload.status === "arrived");

  const seatBody = { reservationId, tableId:"tbl_1" };
  const seated = await mutation("/api/reservation-operations/seat", firstToken, seatBody, "v338-reservation-seat");
  check("Arrived reservation seats at an available table", seated.status === 200 && seated.payload.table.id === "tbl_1" && seated.payload.reservation.status === "seated");
  const replayedSeat = await mutation("/api/reservation-operations/seat", firstToken, seatBody, "v338-reservation-seat");
  check("Repeated Seat action replays safely", replayedSeat.status === 200 && replayedSeat.headers.get("x-blue-current-idempotency-replayed") === "true");
  check("Repeated Seat returns the original table result", replayedSeat.payload.table.id === seated.payload.table.id && replayedSeat.payload.reservation.id === reservationId);

  const secondSessionFloor = await request("/api/floor?locationId=loc_marina", { token:secondToken });
  const occupiedTable = secondSessionFloor.payload.tables.find(item => item.id === "tbl_1");
  check("Second session sees seated Floor truth", secondSessionFloor.status === 200 && occupiedTable?.status === "seated" && occupiedTable?.guestName === "V338 Lifecycle Guest");

  const service = await mutation("/api/service-coordination", firstToken, {
    locationId:"loc_marina", tableId:"tbl_1", tableName:"T1", serverId:"staff_sarah", serverName:"Sarah Morgan", guestName:"V338 Lifecycle Guest", partySize:2
  }, "v338-service-create");
  check("Seated table enters Service", service.status === 201 && service.payload.tableId === "tbl_1" && service.payload.course === "seated");
  const serviceId = service.payload.id;

  const ready = await mutation(`/api/service-coordination/flows/${encodeURIComponent(serviceId)}`, firstToken, { course:"entrees",kitchenStatus:"ready",expoStatus:"ready",risk:"normal",readyAt:new Date().toISOString() }, "v338-service-ready", "PATCH");
  check("Service flow advances to ready", ready.status === 200 && ready.payload.expoStatus === "ready");
  const delivered = await mutation(`/api/service-coordination/deliver/${encodeURIComponent(serviceId)}`, firstToken, {}, "v338-service-deliver");
  check("Ready service is delivered", delivered.status === 200 && delivered.payload.expoStatus === "delivered" && delivered.payload.course === "food-delivered");

  const completed = await mutation("/api/reservation-operations/complete", firstToken, { reservationId }, "v338-reservation-complete");
  check("Reservation service completes", completed.status === 200 && completed.payload.reservation.status === "completed");
  check("Completion releases the table", completed.payload.table.status === "available" && completed.payload.table.guestName === "");

  const waitlist = await mutation("/api/floor/waitlist", firstToken, { locationId:"loc_marina",guestName:"V338 Walk In",partySize:2,quotedMinutes:15 }, "v338-waitlist-create");
  check("Walk-in joins the waitlist", waitlist.status === 201 && waitlist.payload.status === "waiting");
  const waitlistSeat = await mutation("/api/floor/seat-waitlist", firstToken, { waitlistId:waitlist.payload.id,tableId:"tbl_2" }, "v338-waitlist-seat");
  check("Waitlist party seats into Floor truth", waitlistSeat.status === 200 && waitlistSeat.payload.guest.status === "seated" && waitlistSeat.payload.table.guestName === "V338 Walk In");

  const clockIn = await mutation("/api/timeclock/clock-in", firstToken, { employeeId:"emp_devon",locationId:"loc_marina",pin:"9055",source:"V100.3.38 certification" }, "v338-clock-in");
  check("Employee clocks in", clockIn.status === 201 && clockIn.payload.status === "active");
  const replayedClockIn = await mutation("/api/timeclock/clock-in", firstToken, { employeeId:"emp_devon",locationId:"loc_marina",pin:"9055",source:"V100.3.38 certification" }, "v338-clock-in");
  check("Repeated Clock In replays safely", replayedClockIn.status === 201 && replayedClockIn.headers.get("x-blue-current-idempotency-replayed") === "true");
  const breakStart = await mutation("/api/timeclock/break-start", firstToken, { employeeId:"emp_devon",paid:false }, "v338-break-start");
  check("Employee starts a break", breakStart.status === 201 && breakStart.payload.status === "active");
  const breakEnd = await mutation("/api/timeclock/break-end", firstToken, { employeeId:"emp_devon" }, "v338-break-end");
  check("Employee ends the break", breakEnd.status === 200 && breakEnd.payload.status === "completed");
  const clockOut = await mutation("/api/timeclock/clock-out", firstToken, { employeeId:"emp_devon" }, "v338-clock-out");
  check("Employee clocks out", clockOut.status === 200 && clockOut.payload.status === "completed" && Boolean(clockOut.payload.clockOut));

  await stopServer();
  await startServer();
  const restartToken = await login();
  const reservationsAfterRestart = await request("/api/reservation-operations?locationId=loc_marina", { token:restartToken });
  const persistedReservation = reservationsAfterRestart.payload.find(item => item.id === reservationId);
  check("Completed reservation survives restart", reservationsAfterRestart.status === 200 && persistedReservation?.status === "completed");
  const floorAfterRestart = await request("/api/floor?locationId=loc_marina", { token:restartToken });
  const releasedTable = floorAfterRestart.payload.tables.find(item => item.id === "tbl_1");
  const waitlistTable = floorAfterRestart.payload.tables.find(item => item.id === "tbl_2");
  check("Released table survives restart", releasedTable?.status === "available" && releasedTable?.guestName === "");
  check("Waitlist seating survives restart", waitlistTable?.status === "seated" && waitlistTable?.guestName === "V338 Walk In");
  const timeClockAfterRestart = await request("/api/timeclock?locationId=loc_marina", { token:restartToken });
  check("Completed timecard survives restart", timeClockAfterRestart.status === 200 && timeClockAfterRestart.payload.timecards.some(item => item.id === clockIn.payload.id && item.clockOut));

  check("No live database path was used", databasePath.startsWith(os.tmpdir()) && databasePath !== path.join(root,"database/data/blue-current.json"));
  check("No release database payload exists", !fs.existsSync(path.join(root,"database/data/V100.3.38.json")));

  console.log(`V100.3.38 operational lifecycle certification ${passed}/${total}`);
  if (passed !== total) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await stopServer().catch(() => {});
  fs.rmSync(tempRoot, { recursive:true, force:true });
});
