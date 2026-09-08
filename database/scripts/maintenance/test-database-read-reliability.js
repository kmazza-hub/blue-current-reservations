"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const DatabaseService = require("../../server/services/databaseService");

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blue-current-db-read-"));
  const file = path.join(dir, "blue-current.json");
  fs.writeFileSync(file, JSON.stringify({ counter: 0, rows: Array.from({length: 100}, (_,i)=>({id:i})) }, null, 2));

  const db = new DatabaseService(file, { baseRetryDelayMs: 1 });

  // 500 simultaneous reads must coalesce to one physical disk read.
  const reads = await Promise.all(Array.from({ length: 500 }, () => db.read()));
  if (reads.some(x => x.rows.length !== 100)) throw new Error("Concurrent read result mismatch");
  let diag = db.diagnostics();
  if (diag.diskReads !== 1) throw new Error(`Expected one disk read, got ${diag.diskReads}`);

  // Readers must not be able to mutate the shared in-memory snapshot.
  reads[0].rows.push({id:999});
  const clean = await db.read();
  if (clean.rows.length !== 100) throw new Error("Snapshot isolation failed");

  // Concurrent mutations remain serialized and refresh the process snapshot.
  await Promise.all(Array.from({ length: 50 }, () => db.mutate(data => {
    data.counter += 1;
    return data.counter;
  })));
  const final = await db.read();
  if (final.counter !== 50) throw new Error(`Expected counter 50, got ${final.counter}`);

  diag = db.diagnostics();
  console.log("Database read reliability test passed.");
  console.log(JSON.stringify(diag, null, 2));
  fs.rmSync(dir, { recursive: true, force: true });
})().catch(error => {
  console.error(error);
  process.exit(1);
});
