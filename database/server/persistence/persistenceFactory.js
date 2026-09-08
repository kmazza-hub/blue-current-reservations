"use strict";

const JsonPersistenceAdapter = require("./jsonPersistenceAdapter");
const PersistenceGateway = require("./persistenceGateway");

function createPersistence({ driver = process.env.BLUE_CURRENT_PERSISTENCE_DRIVER || "json", databasePath, options = {} } = {}) {
  const normalized = String(driver || "json").trim().toLowerCase();

  if (normalized === "json") {
    return new PersistenceGateway(new JsonPersistenceAdapter(databasePath, options));
  }

  const error = new Error(
    `Persistence driver "${normalized}" is not installed in this build. ` +
    `V71 exposes the adapter contract so a managed transactional driver can be added without changing service constructors.`
  );
  error.code = "PERSISTENCE_DRIVER_NOT_INSTALLED";
  error.driver = normalized;
  throw error;
}

module.exports = { createPersistence };
