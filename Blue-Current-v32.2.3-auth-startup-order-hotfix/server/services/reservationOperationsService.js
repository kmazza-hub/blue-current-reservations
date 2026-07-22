
"use strict";

const models = require("../../shared/models");

class ReservationOperationsService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  async list(locationId) {
    const database = await this.database.read();
    return (database.reservations || [])
      .filter(item => item.locationId === locationId)
      .sort((a, b) => new Date(a.reservationTime) - new Date(b.reservationTime));
  }

  async update(reservationId, patch, actor, organizationId) {
    const allowed = [
      "status", "tableId", "guestName", "phone", "partySize",
      "reservationTime", "vip", "accessibility", "notes", "source"
    ];
    const safePatch = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) safePatch[key] = patch[key];
    }

    const reservation = await this.database.update("reservations", reservationId, safePatch);
    if (!reservation) return null;

    const event = models.operationalEvent({
      organizationId,
      locationId: reservation.locationId,
      reservationId,
      type: "reservation.updated",
      actor,
      summary: `${reservation.guestName} reservation changed to ${reservation.status}`,
      payload: safePatch
    });

    await this.database.create("reservationEvents", event);
    await this.auditService.record({
      organizationId,
      actor,
      action: `${reservation.guestName} reservation updated`,
      category: "reservation"
    });

    this.realtimeHub.publish("reservation:updated", { ...reservation, organizationId });
    return reservation;
  }

  async seat(reservationId, tableId, actor, organizationId) {
    return this.database.mutate(database => {
      const reservation = (database.reservations || []).find(item => item.id === reservationId);
      const table = (database.tables || []).find(item => item.id === tableId);
      if (!reservation || !table) return null;
      if (reservation.locationId !== table.locationId) return null;
      if (table.status !== "available" && table.status !== "reserved") return null;
      if (Number(table.seats) < Number(reservation.partySize)) return null;

      reservation.status = "seated";
      reservation.tableId = table.id;
      reservation.seatedAt = new Date().toISOString();

      table.status = "seated";
      table.guestName = reservation.guestName;
      table.partySize = reservation.partySize;
      table.seatedAt = reservation.seatedAt;
      table.reservationTime = reservation.reservationTime;

      database.reservationEvents ||= [];
      database.reservationEvents.push(models.operationalEvent({
        organizationId,
        locationId: reservation.locationId,
        reservationId,
        tableId,
        type: "reservation.seated",
        actor,
        summary: `${reservation.guestName} seated at ${table.name}`,
        payload: { partySize: reservation.partySize }
      }));

      return { reservation, table };
    }).then(async result => {
      if (!result) return null;
      await this.auditService.record({
        organizationId,
        actor,
        action: `${result.reservation.guestName} seated at ${result.table.name}`,
        category: "reservation"
      });
      this.realtimeHub.publish("reservation:seated", { ...result, organizationId });
      return result;
    });
  }

  async create(input, actor, organizationId) {
    const reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      organizationId,
      locationId: input.locationId,
      guestName: String(input.guestName || "").trim(),
      phone: String(input.phone || "").trim(),
      partySize: Math.max(1, Number(input.partySize || 1)),
      reservationTime: input.reservationTime,
      status: input.status || "confirmed",
      tableId: input.tableId || null,
      source: input.source || "Host Stand",
      vip: Boolean(input.vip),
      accessibility: String(input.accessibility || ""),
      notes: String(input.notes || ""),
      createdAt: new Date().toISOString()
    };
    if (!reservation.guestName || !reservation.reservationTime) {
      throw new Error("Guest name and reservation time are required");
    }

    await this.database.create("reservations", reservation);
    await this.auditService.record({
      organizationId,
      actor,
      action: `Reservation created for ${reservation.guestName}`,
      category: "reservation"
    });
    this.realtimeHub.publish("reservation:created", reservation);
    return reservation;
  }
}

module.exports = ReservationOperationsService;
