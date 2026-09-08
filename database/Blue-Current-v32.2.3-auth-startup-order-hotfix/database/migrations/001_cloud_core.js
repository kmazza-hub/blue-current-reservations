
"use strict";

module.exports = {
  id: "001_cloud_core",
  description: "Creates the initial V22 Cloud Core collections.",
  up(database) {
    for (const collection of [
      "organizations", "locations", "users", "configurations", "featureFlags",
      "auditLogs", "reservations", "operationalEvents"
    ]) database[collection] ||= [];
    return database;
  }
};
