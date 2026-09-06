"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "../..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-v339-"));
const databasePath = path.join(tempRoot, "blue-current.json");
const serverLogPath = path.join(tempRoot, "server.log");
const port = 19600 + Math.floor(Math.random() * 700);
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
  await Promise.race([new Promise(resolve => server.once("exit", resolve)), pause(3000)]);
  server = null;
}

async function request(pathname, { method="GET", token=null, body, idempotencyKey=null, headers={} } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (idempotencyKey) requestHeaders["X-Blue-Current-Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${origin}${pathname}`, {
    method,
    headers: requestHeaders,
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

async function createReservation(token, index) {
  return request("/api/reservation-operations", {
    method: "POST",
    token,
    idempotencyKey: `v339-rush-reservation-${index}`,
    body: {
      locationId: "loc_marina",
      guestName: `V339 Rush Guest ${index}`,
      phone: `732555${String(2000 + index)}`,
      partySize: 2,
      reservationTime: new Date(Date.now() + (index + 1) * 15 * 60 * 1000).toISOString(),
      status: "confirmed",
      source: "V100.3.39 rush certification"
    }
  });
}

(async () => {
  await startServer();
  const firstToken = await login();
  const secondToken = await login();
  check("Independent operator sessions are ready for collision testing", firstToken !== secondToken);

  const rushReservations = await Promise.all(
    Array.from({ length: 8 }, (_, index) => createReservation(index % 2 ? secondToken : firstToken, index + 1))
  );
  const reservationIds = rushReservations.map(result => result.payload.id);
  check("Eight simultaneous reservations are accepted", rushReservations.every(result => result.status === 201));
  check("Rush reservation writes keep unique identities", new Set(reservationIds).size === 8 && reservationIds.every(Boolean));

  const rushWaitlist = await Promise.all(Array.from({ length: 4 }, (_, index) => request("/api/floor/waitlist", {
    method: "POST",
    token: index % 2 ? secondToken : firstToken,
    idempotencyKey: `v339-rush-waitlist-${index + 1}`,
    body: { locationId:"loc_marina", guestName:`V339 Walk In ${index + 1}`, partySize:2, quotedMinutes:10 + index * 5 }
  })));
  check("Four simultaneous walk-ins are accepted", rushWaitlist.every(result => result.status === 201));
  check("Rush waitlist writes keep unique identities", new Set(rushWaitlist.map(result => result.payload.id)).size === 4);

  const firstReservationId = reservationIds[0];
  const secondReservationId = reservationIds[1];
  const [firstSeat, secondSeat] = await Promise.all([
    request("/api/reservation-operations/seat", { method:"POST", token:firstToken, idempotencyKey:"v339-seat-contender-a", body:{ reservationId:firstReservationId, tableId:"tbl_1" } }),
    request("/api/reservation-operations/seat", { method:"POST", token:secondToken, idempotencyKey:"v339-seat-contender-b", body:{ reservationId:secondReservationId, tableId:"tbl_1" } })
  ]);
  const seatResults = [firstSeat, secondSeat];
  const winner = seatResults.find(result => result.status === 200);
  const loser = seatResults.find(result => result.status === 409);
  check("Competing Seat actions produce exactly one winner", seatResults.filter(result => result.status === 200).length === 1);
  check("Competing Seat actions reject exactly one collision", seatResults.filter(result => result.status === 409).length === 1);
  const winningReservationId = winner?.payload?.reservation?.id;
  const winningKey = winner === firstSeat ? "v339-seat-contender-a" : "v339-seat-contender-b";
  const losingReservationId = winner === firstSeat ? secondReservationId : firstReservationId;
  const winningToken = winner === firstSeat ? firstToken : secondToken;
  const replayedWinner = await request("/api/reservation-operations/seat", {
    method:"POST", token:winningToken, idempotencyKey:winningKey,
    body:{ reservationId:winningReservationId, tableId:"tbl_1" }
  });
  check("The winning Seat retry replays its original success", replayedWinner.status === 200 && replayedWinner.headers.get("x-blue-current-idempotency-replayed") === "true");
  const losingRetry = await request("/api/reservation-operations/seat", {
    method:"POST", token:firstToken, idempotencyKey:"v339-seat-loser-new-attempt",
    body:{ reservationId:losingReservationId, tableId:"tbl_1" }
  });
  check("A new attempt cannot overwrite the occupied table", losingRetry.status === 409);

  const floorAfterCollision = await request("/api/floor?locationId=loc_marina", { token:secondToken });
  const collisionTable = floorAfterCollision.payload.tables.find(item => item.id === "tbl_1");
  check("Both sessions converge on the one seating winner", collisionTable?.status === "seated" && collisionTable?.guestName === winner?.payload?.reservation?.guestName);

  const mismatchedSeat = await request("/api/reservation-operations/seat", {
    method:"POST", token:firstToken, idempotencyKey:"v339-seat-unknown-table",
    body:{ reservationId:losingReservationId, tableId:"tbl_unknown" }
  });
  check("Unknown table input is rejected without mutation", mismatchedSeat.status === 404);

  const firstUpdate = await request(`/api/reservation-operations/${encodeURIComponent(losingReservationId)}`, {
    method:"PATCH", token:firstToken, idempotencyKey:"v339-version-first",
    body:{ notes:"Current operator note" }
  });
  const currentVersion = Number(firstUpdate.headers.get("x-blue-current-resource-version"));
  check("A successful write returns its resource version", firstUpdate.status === 200 && currentVersion === 1);
  const staleUpdate = await request(`/api/reservation-operations/${encodeURIComponent(losingReservationId)}`, {
    method:"PATCH", token:secondToken, idempotencyKey:"v339-version-stale",
    headers:{ "If-Match":"0" }, body:{ notes:"Stale tablet note" }
  });
  check("A stale tablet write receives HTTP 412", staleUpdate.status === 412 && staleUpdate.payload.code === "VERSION_CONFLICT");
  const afterStaleUpdate = await request("/api/reservation-operations?locationId=loc_marina", { token:firstToken });
  check("Rejected stale input does not replace current truth", afterStaleUpdate.payload.find(item => item.id === losingReservationId)?.notes === "Current operator note");

  const completedWinner = await request("/api/reservation-operations/complete", {
    method:"POST", token:firstToken, idempotencyKey:"v339-complete-winner", body:{ reservationId:winningReservationId }
  });
  check("The collision winner can complete normally", completedWinner.status === 200 && completedWinner.payload.reservation.status === "completed");
  const invalidTransition = await request(`/api/reservation-operations/${encodeURIComponent(winningReservationId)}`, {
    method:"PATCH", token:secondToken, idempotencyKey:"v339-invalid-reopen", body:{ status:"arrived" }
  });
  check("A completed reservation cannot be reopened out of sequence", invalidTransition.status === 409 && invalidTransition.payload.code === "INVALID_RESERVATION_TRANSITION");

  await stopServer();
  const database = JSON.parse(fs.readFileSync(databasePath, "utf8"));
  const expiringHash = crypto.createHash("sha256").update(secondToken).digest("hex");
  const expiringSession = database.sessions.find(item => item.tokenHash === expiringHash);
  if (!expiringSession) throw new Error("Second test session was not persisted.");
  expiringSession.expiresAt = new Date(Date.now() - 60_000).toISOString();
  expiringSession.idleExpiresAt = expiringSession.expiresAt;
  fs.writeFileSync(databasePath, `${JSON.stringify(database, null, 2)}\n`);

  await startServer();
  const expiredRequest = await request("/api/floor?locationId=loc_marina", { token:secondToken });
  check("An expired tablet session is denied after restart", expiredRequest.status === 401);
  const recoveryToken = await login();
  const recoveredFloor = await request("/api/floor?locationId=loc_marina", { token:recoveryToken });
  check("A fresh login restores authorized operation", recoveredFloor.status === 200);
  const persistedWinner = await request("/api/reservation-operations?locationId=loc_marina", { token:recoveryToken });
  check("Collision outcome survives restart", persistedWinner.payload.find(item => item.id === winningReservationId)?.status === "completed");
  check("Rush reservations survive restart without loss", reservationIds.every(id => persistedWinner.payload.some(item => item.id === id)));

  check("No live database path was used", databasePath.startsWith(os.tmpdir()) && databasePath !== path.join(root,"database/data/blue-current.json"));
  check("No release database payload exists", !fs.existsSync(path.join(root,"database/data/V100.3.39.json")));

  console.log(`V100.3.39 frontline failure and rush stress certification ${passed}/${total}`);
  if (passed !== total) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await stopServer().catch(() => {});
  fs.rmSync(tempRoot, { recursive:true, force:true });
});
