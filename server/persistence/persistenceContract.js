"use strict";

const REQUIRED_METHODS = Object.freeze([
  "read","reload","write","mutate","list","get","create","update",
  "diagnostics","awaitIdle","checkpointBackup","verifyBackups"
]);

function validatePersistenceAdapter(adapter) {
  const missing = REQUIRED_METHODS.filter(name => typeof adapter?.[name] !== "function");
  if (missing.length) {
    const error = new Error(`Persistence adapter is missing required methods: ${missing.join(", ")}`);
    error.code = "INVALID_PERSISTENCE_ADAPTER";
    error.missing = missing;
    throw error;
  }
  if (!adapter.driver) {
    const error = new Error("Persistence adapter must declare a driver.");
    error.code = "INVALID_PERSISTENCE_ADAPTER";
    throw error;
  }
  return adapter;
}

module.exports = { REQUIRED_METHODS, validatePersistenceAdapter };
