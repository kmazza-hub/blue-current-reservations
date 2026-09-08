
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
    if (Object.prototype.hasOwnProperty.call(safePatch,"partySize") && Number(safePatch.partySize) < 0) {
      const error=new Error("partySize cannot be negative.");
      error.statusCode=400;
      throw error;
    }

    const result = await this.database.transaction(tx => {
      const table = tx.get("tables", tableId);
      if (!table || table.organizationId !== organizationId) return null;
      const updated = tx.update("tables", tableId, safePatch);
      const event = models.operationalEvent({
        organizationId,
        locationId: updated.locationId,
        tableId: updated.id,
        type: "table.updated",
        actor,
        summary: `${updated.name} changed to ${updated.status}`,
        payload: safePatch
      });
      tx.create("seatingEvents", event);
      return { table: updated, event };
    }, { domain:"floor", operation:"update-table", organizationId, tableId });

    if (!result) return null;
    await this.auditService.record({
      organizationId,
      actor,
      action: `${result.table.name} updated: ${Object.keys(safePatch).join(", ")}`,
      category: "floor"
    });
    this.realtimeHub.publish("floor:table-updated", { ...result.table, organizationId });
    return result.table;
  }

  async seatWaitlist(waitlistId, tableId, actor, organizationId) {
    return this.database.mutate(async database => {
      const guest = (database.waitlist || []).find(item => item.id === waitlistId);
      const table = (database.tables || []).find(item => item.id === tableId);
      if (!guest || !table || guest.status !== "waiting") return null;
      if (guest.organizationId !== organizationId || table.organizationId !== organizationId) return null;
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
    const location=await this.database.get("locations",guest.locationId);
    if(!location || location.organizationId!==organizationId){
      const error=new Error("Location is not available to this organization.");
      error.statusCode=404;
      throw error;
    }
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
