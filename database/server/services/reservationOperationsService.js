
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

    if (Object.prototype.hasOwnProperty.call(safePatch,"partySize") && Number(safePatch.partySize)<=0) {
      const error=new Error("partySize must be greater than zero.");
      error.statusCode=400;
      throw error;
    }

    const transitions={
      pending:new Set(["confirmed","cancelled","canceled"]),
      booked:new Set(["confirmed","cancelled","canceled"]),
      confirmed:new Set(["arrived","cancelled","canceled","no-show","noshow"]),
      arrived:new Set(["seated","cancelled","canceled","no-show","noshow"]),
      seated:new Set(["completed","cancelled","canceled"]),
      completed:new Set([]),
      cancelled:new Set([]),
      canceled:new Set([]),
      "no-show":new Set([]),
      noshow:new Set([])
    };

    const result=await this.database.transaction(tx=>{
      const current=tx.get("reservations",reservationId);
      if(!current || current.organizationId!==organizationId)return null;

      if(safePatch.tableId){
        const table=tx.get("tables",safePatch.tableId);
        if(!table || table.organizationId!==organizationId || table.locationId!==current.locationId)return null;
      }

      if(safePatch.status && String(safePatch.status).toLowerCase()!==String(current.status||"").toLowerCase()){
        const from=String(current.status||"confirmed").toLowerCase();
        const to=String(safePatch.status).toLowerCase();
        const allowedNext=transitions[from];
        if(!allowedNext || !allowedNext.has(to)){
          const error=new Error(`Invalid reservation transition: ${from} -> ${to}`);
          error.statusCode=409;
          error.code="INVALID_RESERVATION_TRANSITION";
          throw error;
        }
      }

      const updated=tx.update("reservations",reservationId,safePatch);
      const event=models.operationalEvent({
        organizationId,
        locationId:updated.locationId,
        reservationId,
        type:"reservation.updated",
        actor,
        summary:`${updated.guestName} reservation changed to ${updated.status}`,
        payload:safePatch
      });
      tx.create("reservationEvents",event);
      return {reservation:updated,event};
    },{domain:"reservations",operation:"update",organizationId,reservationId});

    if(!result)return null;
    await this.auditService.record({
      organizationId,
      actor,
      action:`${result.reservation.guestName} reservation updated`,
      category:"reservation"
    });
    this.realtimeHub.publish("reservation:updated",{...result.reservation,organizationId});
    return result.reservation;
  }

  async seat(reservationId, tableId, actor, organizationId) {
    const result=await this.database.transaction(tx=>{
      const reservation=tx.get("reservations",reservationId);
      const table=tx.get("tables",tableId);
      if(!reservation || !table)return null;
      if(reservation.organizationId!==organizationId || table.organizationId!==organizationId)return null;
      if(reservation.locationId!==table.locationId)return null;
      if(!["confirmed","arrived"].includes(String(reservation.status||"").toLowerCase()))return null;
      if(!["available","reserved"].includes(String(table.status||"").toLowerCase()))return null;
      if(Number(table.seats)<Number(reservation.partySize))return null;

      const seatedAt=new Date().toISOString();
      reservation.status="seated";
      reservation.tableId=table.id;
      reservation.seatedAt=seatedAt;
      reservation.updatedAt=seatedAt;

      table.status="seated";
      table.guestName=reservation.guestName;
      table.partySize=reservation.partySize;
      table.seatedAt=seatedAt;
      table.reservationTime=reservation.reservationTime;
      table.updatedAt=seatedAt;

      const event=models.operationalEvent({
        organizationId,
        locationId:reservation.locationId,
        reservationId,
        tableId,
        type:"reservation.seated",
        actor,
        summary:`${reservation.guestName} seated at ${table.name}`,
        payload:{partySize:reservation.partySize}
      });
      tx.create("reservationEvents",event);
      return {reservation,table,event};
    },{domain:"reservations",operation:"seat",organizationId,reservationId,tableId});

    if(!result)return null;
    await this.auditService.record({
      organizationId,
      actor,
      action:`${result.reservation.guestName} seated at ${result.table.name}`,
      category:"reservation"
    });
    this.realtimeHub.publish("reservation:seated",{reservation:result.reservation,table:result.table,organizationId});
    return {reservation:result.reservation,table:result.table};
  }

  async complete(reservationId, actor, organizationId) {
    const result=await this.database.transaction(tx=>{
      const reservation=tx.get("reservations",reservationId);
      if(!reservation || reservation.organizationId!==organizationId)return null;
      if(String(reservation.status||"").toLowerCase()!=="seated")return null;

      const table=reservation.tableId ? tx.get("tables",reservation.tableId) : null;
      if(table && (table.organizationId!==organizationId || table.locationId!==reservation.locationId))return null;

      const completedAt=new Date().toISOString();
      reservation.status="completed";
      reservation.completedAt=completedAt;
      reservation.updatedAt=completedAt;

      if(table){
        table.status="available";
        table.guestName="";
        table.partySize=0;
        table.seatedAt=null;
        table.reservationTime=null;
        table.updatedAt=completedAt;
      }

      const event=models.operationalEvent({
        organizationId,
        locationId:reservation.locationId,
        reservationId,
        tableId:table?.id||null,
        type:"reservation.completed",
        actor,
        summary:`${reservation.guestName} service completed${table?` at ${table.name}`:""}`,
        payload:{completedAt}
      });
      tx.create("reservationEvents",event);
      return {reservation,table,event};
    },{domain:"reservations",operation:"complete-service",organizationId,reservationId});

    if(!result)return null;
    await this.auditService.record({
      organizationId,
      actor,
      action:`${result.reservation.guestName} service completed`,
      category:"reservation"
    });
    this.realtimeHub.publish("reservation:completed",{
      reservation:result.reservation,table:result.table,organizationId
    });
    return {reservation:result.reservation,table:result.table};
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
      const error=new Error("Guest name and reservation time are required");
      error.statusCode=400;
      throw error;
    }
    const location=await this.database.get("locations",reservation.locationId);
    if(!location || location.organizationId!==organizationId){
      const error=new Error("Location is not available to this organization.");
      error.statusCode=404;
      throw error;
    }
    if(reservation.tableId){
      const table=await this.database.get("tables",reservation.tableId);
      if(!table || table.organizationId!==organizationId || table.locationId!==reservation.locationId){
        const error=new Error("Table is not available for this reservation.");
        error.statusCode=400;
        throw error;
      }
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
