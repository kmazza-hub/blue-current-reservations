
"use strict";

const models = require("../../shared/models");

class FloorService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  async snapshot(locationId) {
    const database = await this.database.read();
    return {
      tables: (database.tables || []).filter(item => item.locationId === locationId),
      waitlist: (database.waitlist || []).filter(item => item.locationId === locationId && item.status === "waiting"),
      seatingEvents: (database.seatingEvents || []).filter(item => item.locationId === locationId).slice(-30).reverse()
    };
  }

  async updateTable(tableId, patch, actor, organizationId) {
    const allowed = [
      "status", "x", "y", "section", "server", "guestName",
      "partySize", "seatedAt", "reservationTime", "notes"
    ];
    const safePatch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) safePatch[key] = patch[key];
    }

    const table = await this.database.update("tables", tableId, safePatch);
    if (!table) return null;

    const event = models.operationalEvent({
      organizationId,
      locationId: table.locationId,
      tableId: table.id,
      type: "table.updated",
      actor,
      summary: `${table.name} changed to ${table.status}`,
      payload: safePatch
    });
    await this.database.create("seatingEvents", event);
    await this.auditService.record({
      organizationId,
      actor,
      action: `${table.name} updated: ${Object.keys(safePatch).join(", ")}`,
      category: "floor"
    });
    this.realtimeHub.publish("floor:table-updated", { ...table, organizationId });
    return table;
  }

  async seatWaitlist(waitlistId, tableId, actor, organizationId) {
    return this.database.mutate(async database => {
      const guest = (database.waitlist || []).find(item => item.id === waitlistId);
      const table = (database.tables || []).find(item => item.id === tableId);
      if (!guest || !table || guest.status !== "waiting") return null;
      if (guest.locationId !== table.locationId) return null;

      guest.status = "seated";
      guest.seatedAt = new Date().toISOString();
      guest.tableId = table.id;

      table.status = "seated";
      table.guestName = guest.guestName;
      table.partySize = guest.partySize;
      table.seatedAt = guest.seatedAt;

      database.seatingEvents ||= [];
      database.seatingEvents.push(models.operationalEvent({
        organizationId,
        locationId: table.locationId,
        tableId: table.id,
        type: "waitlist.seated",
        actor,
        summary: `${guest.guestName} seated at ${table.name}`,
        payload: { waitlistId, partySize: guest.partySize }
      }));

      return { guest, table };
    }).then(async result => {
      if (!result) return null;
      await this.auditService.record({
        organizationId,
        actor,
        action: `${result.guest.guestName} seated at ${result.table.name}`,
        category: "floor"
      });
      this.realtimeHub.publish("floor:guest-seated", { ...result, organizationId });
      return result;
    });
  }

  async addWaitlist(input, actor, organizationId) {
    const guest = {
      id: `wait_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organizationId,
      locationId: input.locationId,
      guestName: String(input.guestName || "").trim(),
      partySize: Math.max(1, Number(input.partySize || 1)),
      quotedMinutes: Math.max(0, Number(input.quotedMinutes || 0)),
      status: "waiting",
      createdAt: new Date().toISOString()
    };
    if (!guest.guestName) throw new Error("Guest name is required");
    await this.database.create("waitlist", guest);
    await this.auditService.record({
      organizationId,
      actor,
      action: `${guest.guestName} added to waitlist`,
      category: "floor"
    });
    this.realtimeHub.publish("floor:waitlist-added", guest);
    return guest;
  }
}

module.exports = FloorService;
