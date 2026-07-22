"use strict";
module.exports = function migrate(database) {
  database.employees ||= [];
  database.employeeTimecards ||= [];
  database.employeeBreaks ||= [];
  database.timeClockCorrections ||= [];
  database.timeClockPolicies ||= [];
  return database;
};
