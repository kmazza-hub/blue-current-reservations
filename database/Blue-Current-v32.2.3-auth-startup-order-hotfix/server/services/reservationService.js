
"use strict";

const schemas = require("../../shared/schemas/entities");
const models = require("../../shared/models");

class ReservationService {
  constructor(database, auditService, realtimeHub) {
    this.database = database;
    this.auditService = auditService;
    this.realtimeHub = realtimeHub;
  }

  async create(input) {
    const reservation = models.reservation(schemas.reservation(input));
    await this.database.create("reservations", reservation);
    await this.auditService.record({
      action: `Reservation created for ${reservation.guestName}`,
      category: "reservation",
      actor: input.actor || "Cloud API"
    });
    this.realtimeHub.publish("reservation:created", reservation);
    return reservation;
  }
}

module.exports = ReservationService;
