
"use strict";

const required = (value, field) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${field} is required`);
  }
};

const schemas = {
  organization(input) {
    required(input.name, "name");
    return { id: input.id, name: String(input.name), status: input.status || "pilot" };
  },
  location(input) {
    required(input.organizationId, "organizationId");
    required(input.name, "name");
    return {
      id: input.id,
      organizationId: String(input.organizationId),
      name: String(input.name),
      capacity: Number(input.capacity || 0),
      timezone: input.timezone || "America/New_York"
    };
  },
  reservation(input) {
    required(input.locationId, "locationId");
    required(input.guestName, "guestName");
    return {
      id: input.id,
      locationId: String(input.locationId),
      guestName: String(input.guestName),
      partySize: Math.max(1, Number(input.partySize || 1)),
      reservationTime: input.reservationTime || new Date().toISOString(),
      status: input.status || "confirmed"
    };
  }
};

module.exports = schemas;
