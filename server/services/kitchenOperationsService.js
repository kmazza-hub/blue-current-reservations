"use strict";

class KitchenOperationsService {
  constructor(database,auditService,realtimeHub){
    this.database=database;
    this.auditService=auditService;
    this.realtimeHub=realtimeHub;
  }

  async snapshot(locationId){
    const d=await this.database.read();
    return {
      tickets:(d.kitchenTickets||[]).filter(x=>x.locationId===locationId),
      stations:(d.kitchenStations||[]).filter(x=>x.locationId===locationId),
      events:(d.kitchenEvents||[]).filter(x=>x.locationId===locationId).slice(-40).reverse()
    };
  }

  async updateTicket(id,patch,actor,organizationId){
    const allowed=["status","priority","targetMinutes","notes"];
    const safe={};
    for(const key of allowed){
      if(Object.prototype.hasOwnProperty.call(patch,key)) safe[key]=patch[key];
    }
    if(Object.prototype.hasOwnProperty.call(safe,"targetMinutes") && Number(safe.targetMinutes)<=0){
      const error=new Error("targetMinutes must be greater than zero.");
      error.statusCode=400;
      throw error;
    }

    const ticket=await this.database.transaction(tx=>{
      const current=tx.get("kitchenTickets",id);
      if(!current || current.organizationId!==organizationId) return null;
      return tx.update("kitchenTickets",id,safe);
    },{domain:"kitchen",operation:"update-ticket",organizationId,ticketId:id});

    if(!ticket)return null;
    await this.auditService.record({
      organizationId,actor,action:`${ticket.tableName} kitchen ticket updated`,category:"kitchen"
    });
    this.realtimeHub.publish("kitchen:ticket-updated",{...ticket,organizationId});
    return ticket;
  }

  async updateItem(ticketId,itemId,patch,actor,organizationId){
    const result=await this.database.transaction(tx=>{
      const ticket=tx.get("kitchenTickets",ticketId);
      if(!ticket || ticket.organizationId!==organizationId)return null;
      const item=(ticket.items||[]).find(x=>x.id===itemId);
      if(!item)return null;
      if(patch.status)item.status=patch.status;
      const statuses=ticket.items.map(x=>x.status);
      ticket.status=statuses.every(x=>x==="ready")
        ?"plating"
        :statuses.some(x=>x==="cooking")
          ?"cooking"
          :"received";
      ticket.updatedAt=new Date().toISOString();
      return {ticket,item};
    },{domain:"kitchen",operation:"update-item",organizationId,ticketId,itemId});

    if(!result)return null;
    await this.auditService.record({
      organizationId,actor,action:`${result.item.name} updated`,category:"kitchen"
    });
    this.realtimeHub.publish("kitchen:item-updated",{...result,organizationId});
    return result;
  }

  async createTicket(input,actor,organizationId){
    const location=await this.database.get("locations",input.locationId);
    if(!location || location.organizationId!==organizationId){
      const error=new Error("Location is not available to this organization.");
      error.statusCode=404;
      throw error;
    }

    const requestedItems=Array.isArray(input.items)?input.items:[];
    if(!requestedItems.length){
      const error=new Error("At least one item is required");
      error.statusCode=400;
      throw error;
    }

    const stations=await this.database.list(
      "kitchenStations",
      station=>station.organizationId===organizationId && station.locationId===input.locationId
    );
    const stationIds=new Set(stations.map(x=>x.id));
    for(const item of requestedItems){
      if(Number(item.qty||1)<=0){
        const error=new Error("Kitchen item quantity must be greater than zero.");
        error.statusCode=400;
        throw error;
      }
      if(item.stationId && !stationIds.has(item.stationId)){
        const error=new Error(`Kitchen station ${item.stationId} is not available at this location.`);
        error.statusCode=400;
        throw error;
      }
    }

    const now=Date.now();
    const ticket={
      id:`kt_${now}`,
      organizationId,
      locationId:input.locationId,
      tableName:input.tableName||"Open",
      serverName:input.serverName||"Unassigned",
      guestName:input.guestName||"",
      priority:input.priority||"normal",
      status:"received",
      createdAt:new Date(now).toISOString(),
      targetMinutes:Number(input.targetMinutes||18),
      items:requestedItems.map((item,index)=>({
        id:`ki_${now}_${index}`,
        name:item.name,
        qty:Number(item.qty||1),
        stationId:item.stationId,
        status:"received"
      }))
    };
    if(ticket.targetMinutes<=0){
      const error=new Error("targetMinutes must be greater than zero.");
      error.statusCode=400;
      throw error;
    }

    await this.database.create("kitchenTickets",ticket);
    await this.auditService.record({
      organizationId,actor,action:`Kitchen ticket created for ${ticket.tableName}`,category:"kitchen"
    });
    this.realtimeHub.publish("kitchen:ticket-created",ticket);
    return ticket;
  }
}

module.exports=KitchenOperationsService;
