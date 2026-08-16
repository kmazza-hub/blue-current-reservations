"use strict";

const CANONICAL_EVENTS=Object.freeze({
  "order.opened": {domain:"orders",sourceTypes:["pos"],required:["locationId","orderId"],optional:["checkId","tableId","employeeId","guestCount","openedAt","channel","items","subtotal","tax","total"]},
  "order.updated": {domain:"orders",sourceTypes:["pos"],required:["locationId","orderId"],optional:["checkId","tableId","employeeId","guestCount","items","subtotal","tax","total","status"]},
  "order.closed": {domain:"orders",sourceTypes:["pos"],required:["locationId","orderId","total"],optional:["checkId","tableId","employeeId","guestCount","items","subtotal","tax","tip","discount","closedAt","payments"]},
  "menu.item.upserted": {domain:"menu",sourceTypes:["pos","menu"],required:["locationId","itemId","name"],optional:["groupId","price","active","sku","categories","modifiers"]},
  "inventory.level.updated": {domain:"inventory",sourceTypes:["pos","inventory"],required:["locationId","itemId","quantity"],optional:["unit","reason","cost","available"]},
  "employee.upserted": {domain:"labor",sourceTypes:["pos","labor"],required:["locationId","employeeId"],optional:["firstName","lastName","role","jobId","active","hourlyRate"]},
  "shift.started": {domain:"labor",sourceTypes:["pos","labor"],required:["locationId","employeeId","shiftId"],optional:["jobId","role","startedAt","hourlyRate"]},
  "shift.ended": {domain:"labor",sourceTypes:["pos","labor"],required:["locationId","employeeId","shiftId"],optional:["jobId","role","startedAt","endedAt","regularHours","overtimeHours"]},
  "reservation.upserted": {domain:"reservations",sourceTypes:["reservations","pos"],required:["locationId","reservationId","covers"],optional:["guestId","guestName","time","status","tableId","channel","notes"]},
  "guest.upserted": {domain:"guest",sourceTypes:["guest","reservations","pos"],required:["guestId"],optional:["locationId","firstName","lastName","phone","email","visits","spend","tags","preferences"]},
  "kitchen.ticket.updated": {domain:"kitchen",sourceTypes:["kitchen","pos"],required:["locationId","ticketId","status"],optional:["orderId","tableId","stationId","items","firedAt","completedAt","durationSeconds"]},
  "payment.recorded": {domain:"payments",sourceTypes:["pos"],required:["locationId","paymentId","amount"],optional:["orderId","checkId","type","tip","status","paidAt"]}
});

const CAPABILITIES=Object.freeze([
  "orders.read","orders.webhook","payments.read","menu.read","inventory.read",
  "inventory.webhook","labor.read","labor.webhook","reservations.read",
  "reservations.webhook","guests.read","kitchen.read","kitchen.webhook"
]);

function contractFor(type){return CANONICAL_EVENTS[type]||null;}

function validateCanonicalEvent(event){
  if(!event||typeof event!=="object"||Array.isArray(event))throw new Error("Canonical event must be an object.");
  const contract=contractFor(event.type);
  if(!contract)throw new Error(`Unsupported canonical event type: ${event.type}`);
  const payload=event.payload||{};
  const missing=contract.required.filter(key=>payload[key]===undefined||payload[key]===null||payload[key]==="");
  if(missing.length)throw new Error(`Missing required fields for ${event.type}: ${missing.join(", ")}`);
  if(payload.quantity!==undefined&&!Number.isFinite(Number(payload.quantity)))throw new Error("quantity must be numeric.");
  for(const field of ["amount","total","subtotal","tax","tip","price","hourlyRate"]){
    if(payload[field]!==undefined&&(!Number.isFinite(Number(payload[field]))||Number(payload[field])<0))throw new Error(`${field} must be a non-negative number.`);
  }
  if(payload.guestCount!==undefined&&Number(payload.guestCount)<0)throw new Error("guestCount cannot be negative.");
  if(payload.covers!==undefined&&Number(payload.covers)<1)throw new Error("covers must be positive.");
  return true;
}

module.exports={CANONICAL_EVENTS,CAPABILITIES,contractFor,validateCanonicalEvent};
