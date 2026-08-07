"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const DatabaseService = require("../../server/services/databaseService");

async function main() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "blue-current-db-test-"));
  const file = path.join(root, "blue-current.json");
  await fs.promises.writeFile(file, JSON.stringify({ counter: 0, records: [] }, null, 2));

  const db = new DatabaseService(file, { baseRetryDelayMs: 1, maxWriteAttempts: 5, logger: { warn() {}, error: console.error } });

  const originalRename = fs.promises.rename;
  let forcedFailures = 0;
  fs.promises.rename = async (...args) => {
    if (forcedFailures < 2) {
      forcedFailures += 1;
      const error = new Error("simulated OneDrive lock");
      error.code = "EPERM";
      throw error;
    }
    return originalRename(...args);
  };

  try {
    await db.mutate(data => { data.counter += 1; });
  } finally {
    fs.promises.rename = originalRename;
  }

  await Promise.all(Array.from({ length: 20 }, (_, index) => db.mutate(data => {
    data.counter += 1;
    data.records.push(index);
  })));

  // Prove one rejected mutation does not permanently poison the serialization queue.
  let failedAsExpected = false;
  try {
    await db.mutate(() => { throw new Error("intentional mutation failure"); });
  } catch {
    failedAsExpected = true;
  }
  await db.mutate(data => { data.counter += 1; });

  const final = await db.read();
  if (!failedAsExpected) throw new Error("Expected intentional failure was not observed.");
  if (final.counter !== 22) throw new Error(`Expected counter 22, received ${final.counter}.`);
  if (final.records.length !== 20) throw new Error(`Expected 20 records, received ${final.records.length}.`);

  console.log("Database reliability test passed.");
  console.log(JSON.stringify({ forcedEpermRetries: forcedFailures, counter: final.counter, records: final.records.length }, null, 2));
  await fs.promises.rm(root, { recursive: true, force: true });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
