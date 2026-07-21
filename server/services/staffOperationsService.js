
"use strict";

const models = require("../../shared/models");

class StaffOperationsService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  async snapshot(locationId) {
    const database = await this.database.read();
    const staff = (database.staff || []).filter(item => item.locationId === locationId);
    const sections = (database.sections || []).filter(item => item.locationId === locationId);
    const tables = (database.tables || []).filter(item => item.locationId === locationId);
    return { staff, sections, tables };
  }

  async updateStaff(staffId, patch, actor, organizationId) {
    const allowed = ["status", "sectionId", "shiftStart", "shiftEnd", "maxCovers", "role"];
    const safePatch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) safePatch[key] = patch[key];
    }
    const staff = await this.database.update("staff", staffId, safePatch);
    if (!staff) return null;

    const event = models.operationalEvent({
      organizationId,
      locationId: staff.locationId,
      staffId,
      type: "staff.updated",
      actor,
      summary: `${staff.name} updated`,
      payload: safePatch
    });
    await this.database.create("staffEvents", event);
    await this.auditService.record({
      organizationId,
      actor,
      action: `${staff.name} staff assignment updated`,
      category: "staff"
    });
    this.realtimeHub.publish("staff:updated", { ...staff, organizationId });
    return staff;
  }

  async assignSection(sectionId, serverId, actor, organizationId) {
    return this.database.mutate(database => {
      const section = (database.sections || []).find(item => item.id === sectionId);
      const server = (database.staff || []).find(item => item.id === serverId);
      if (!section || !server || section.locationId !== server.locationId) return null;

      section.serverId = server.id;
      server.sectionId = section.id;

      for (const table of database.tables || []) {
        if (section.tableIds.includes(table.id)) {
          table.sectionId = section.id;
          table.serverId = server.id;
          table.server = server.name;
        }
      }

      database.staffEvents ||= [];
      database.staffEvents.push(models.operationalEvent({
        organizationId,
        locationId: section.locationId,
        sectionId,
        staffId: serverId,
        type: "section.assigned",
        actor,
        summary: `${server.name} assigned to ${section.name}`,
        payload: { sectionId, serverId }
      }));

      return { section, server };
    }).then(async result => {
      if (!result) return null;
      await this.auditService.record({
        organizationId,
        actor,
        action: `${result.server.name} assigned to ${result.section.name}`,
        category: "staff"
      });
      this.realtimeHub.publish("staff:section-assigned", { ...result, organizationId });
      return result;
    });
  }

  async reassignTable(tableId, serverId, actor, organizationId) {
    return this.database.mutate(database => {
      const table = (database.tables || []).find(item => item.id === tableId);
      const server = (database.staff || []).find(item => item.id === serverId);
      if (!table || !server || table.locationId !== server.locationId) return null;
      table.serverId = server.id;
      table.server = server.name;

      database.staffEvents ||= [];
      database.staffEvents.push(models.operationalEvent({
        organizationId,
        locationId: table.locationId,
        tableId,
        staffId: serverId,
        type: "table.reassigned",
        actor,
        summary: `${table.name} reassigned to ${server.name}`,
        payload: { tableId, serverId }
      }));
      return { table, server };
    }).then(async result => {
      if (!result) return null;
      await this.auditService.record({
        organizationId,
        actor,
        action: `${result.table.name} reassigned to ${result.server.name}`,
        category: "staff"
      });
      this.realtimeHub.publish("staff:table-reassigned", { ...result, organizationId });
      return result;
    });
  }
}

module.exports = StaffOperationsService;
