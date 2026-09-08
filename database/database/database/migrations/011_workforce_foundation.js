"use strict";
module.exports = function migrate(database) {
  database.workforceRoles ||= [];
  database.employeeAvailability ||= [];
  database.ptoRequests ||= [];
  database.shiftTemplates ||= [];
  database.meta = { ...(database.meta || {}), version: "33.0.1" };
  return database;
};
