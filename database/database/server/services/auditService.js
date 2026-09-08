
"use strict";

const models = require("../../shared/models");

class AuditService {
  constructor(database) {
    this.database = database;
  }

  record({ organizationId = "org_chefs", actor = "System", action, category = "system" }) {
    return this.database.create("auditLogs", models.audit({ organizationId, actor, action, category }));
  }
}

module.exports = AuditService;
