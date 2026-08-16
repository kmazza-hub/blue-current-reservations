"use strict";

class OperationalDataIntegrityService {
  constructor(persistence){ this.persistence=persistence; }

  _index(items){ return new Map((items||[]).filter(x=>x?.id).map(x=>[x.id,x])); }

  async certify(){
    const db=await this.persistence.read();
    const issues=[];
    const add=(severity,code,store,id,detail,context={})=>issues.push({
      severity,code,store,id:id||null,detail,context
    });

    const organizations=this._index(db.organizations);
    const locations=this._index(db.locations);
    const tables=this._index(db.tables);
    const staff=this._index([...(db.staff||[]),...(db.employees||[])]);
    const sections=this._index(db.sections);
    const vendors=this._index(db.vendors);
    const inventory=this._index(db.inventoryItems);
    const stations=this._index(db.kitchenStations);

    const scopedStores=[
      "locations","reservations","waitlist","tables","sections","staff","employees",
      "kitchenTickets","kitchenStations","inventoryItems","recipes","wasteEvents",
      "purchaseOrders","inventoryPolicies","inventoryActions","financialSnapshots",
      "locationFinancials","revenueSnapshots","executiveGoals","managerActions"
    ];

    for(const store of scopedStores){
      for(const item of db[store]||[]){
        if(item.organizationId && !organizations.has(item.organizationId)){
          add("critical","ORPHAN_ORGANIZATION",store,item.id,
            `References missing organization ${item.organizationId}.`,
            {organizationId:item.organizationId});
        }
        if(item.locationId){
          const location=locations.get(item.locationId);
          if(!location){
            add("critical","ORPHAN_LOCATION",store,item.id,
              `References missing location ${item.locationId}.`,{locationId:item.locationId});
          }else if(item.organizationId && location.organizationId &&
                   item.organizationId!==location.organizationId){
            add("critical","TENANT_LOCATION_MISMATCH",store,item.id,
              `Organization ${item.organizationId} does not own location ${item.locationId}.`,
              {organizationId:item.organizationId,locationOrganizationId:location.organizationId,locationId:item.locationId});
          }
        }
      }
    }

    // Floor/workforce relationships.
    for(const table of db.tables||[]){
      if(table.serverId){
        const server=staff.get(table.serverId);
        if(!server) add("high","ORPHAN_TABLE_SERVER","tables",table.id,
          `Assigned server ${table.serverId} does not exist.`,{serverId:table.serverId});
        else{
          if(table.locationId&&server.locationId&&table.locationId!==server.locationId)
            add("critical","CROSS_LOCATION_TABLE_SERVER","tables",table.id,
              `Table and assigned server are in different locations.`,
              {tableLocationId:table.locationId,serverLocationId:server.locationId,serverId:server.id});
          if(table.organizationId&&server.organizationId&&table.organizationId!==server.organizationId)
            add("critical","CROSS_TENANT_TABLE_SERVER","tables",table.id,
              `Table and assigned server belong to different organizations.`,{serverId:server.id});
        }
      }
      if(table.sectionId && !sections.has(table.sectionId))
        add("high","ORPHAN_TABLE_SECTION","tables",table.id,
          `Assigned section ${table.sectionId} does not exist.`,{sectionId:table.sectionId});
      if(Number(table.partySize)<0)
        add("high","INVALID_PARTY_SIZE","tables",table.id,"Table partySize cannot be negative.");
    }

    for(const section of db.sections||[]){
      if(section.serverId && !staff.has(section.serverId))
        add("high","ORPHAN_SECTION_SERVER","sections",section.id,
          `Assigned server ${section.serverId} does not exist.`,{serverId:section.serverId});
      for(const tableId of section.tableIds||[]){
        const table=tables.get(tableId);
        if(!table) add("high","ORPHAN_SECTION_TABLE","sections",section.id,
          `Section references missing table ${tableId}.`,{tableId});
        else if(section.locationId&&table.locationId&&section.locationId!==table.locationId)
          add("critical","CROSS_LOCATION_SECTION_TABLE","sections",section.id,
            `Section references a table in another location.`,{tableId});
      }
    }

    // Reservations/waitlist.
    const activeReservationStatuses=new Set(["booked","confirmed","arrived","seated","completed","cancelled","canceled","no-show","noshow","pending"]);
    for(const reservation of db.reservations||[]){
      if(Number(reservation.partySize)<=0)
        add("high","INVALID_RESERVATION_PARTY_SIZE","reservations",reservation.id,
          "Reservation partySize must be greater than zero.");
      if(reservation.status && !activeReservationStatuses.has(String(reservation.status).toLowerCase()))
        add("medium","UNKNOWN_RESERVATION_STATUS","reservations",reservation.id,
          `Unknown reservation status ${reservation.status}.`);
      if(reservation.tableId){
        const table=tables.get(reservation.tableId);
        if(!table) add("high","ORPHAN_RESERVATION_TABLE","reservations",reservation.id,
          `Reservation references missing table ${reservation.tableId}.`);
        else if(reservation.locationId&&table.locationId&&reservation.locationId!==table.locationId)
          add("critical","CROSS_LOCATION_RESERVATION_TABLE","reservations",reservation.id,
            "Reservation table belongs to another location.");
      }
    }
    for(const guest of db.waitlist||[]){
      if(Number(guest.partySize)<=0)
        add("high","INVALID_WAITLIST_PARTY_SIZE","waitlist",guest.id,"Waitlist partySize must be greater than zero.");
      if(guest.tableId && !tables.has(guest.tableId))
        add("high","ORPHAN_WAITLIST_TABLE","waitlist",guest.id,
          `Waitlist record references missing table ${guest.tableId}.`);
    }

    // Kitchen.
    for(const ticket of db.kitchenTickets||[]){
      if(!Array.isArray(ticket.items)||ticket.items.length===0)
        add("high","EMPTY_KITCHEN_TICKET","kitchenTickets",ticket.id,"Kitchen ticket has no items.");
      if(Number(ticket.targetMinutes)<=0)
        add("medium","INVALID_KITCHEN_TARGET","kitchenTickets",ticket.id,"Kitchen targetMinutes must be greater than zero.");
      for(const item of ticket.items||[]){
        if(Number(item.qty)<=0) add("high","INVALID_KITCHEN_ITEM_QTY","kitchenTickets",ticket.id,
          `Kitchen item ${item.id||item.name||"unknown"} has non-positive quantity.`);
        if(item.stationId){
          const station=stations.get(item.stationId);
          if(!station) add("high","ORPHAN_KITCHEN_STATION","kitchenTickets",ticket.id,
            `Item references missing kitchen station ${item.stationId}.`,{itemId:item.id,stationId:item.stationId});
          else if(ticket.locationId&&station.locationId&&ticket.locationId!==station.locationId)
            add("critical","CROSS_LOCATION_KITCHEN_STATION","kitchenTickets",ticket.id,
              "Kitchen item station belongs to another location.",{itemId:item.id,stationId:item.stationId});
        }
      }
    }

    // Inventory and purchasing.
    for(const item of db.inventoryItems||[]){
      if(item.vendorId && !vendors.has(item.vendorId))
        add("high","ORPHAN_INVENTORY_VENDOR","inventoryItems",item.id,
          `Inventory item references missing vendor ${item.vendorId}.`);
      if(Number(item.onHand)<0) add("high","NEGATIVE_INVENTORY","inventoryItems",item.id,"Inventory onHand cannot be negative.");
      if(Number(item.par)<0) add("high","NEGATIVE_INVENTORY_PAR","inventoryItems",item.id,"Inventory par cannot be negative.");
      if(Number(item.unitCost)<0) add("high","NEGATIVE_UNIT_COST","inventoryItems",item.id,"Inventory unitCost cannot be negative.");
    }
    for(const recipe of db.recipes||[]){
      for(const ingredient of recipe.ingredients||[]){
        const item=inventory.get(ingredient.inventoryId);
        if(!item) add("high","ORPHAN_RECIPE_INVENTORY","recipes",recipe.id,
          `Recipe ingredient references missing inventory ${ingredient.inventoryId}.`);
        else if(recipe.locationId&&item.locationId&&recipe.locationId!==item.locationId)
          add("critical","CROSS_LOCATION_RECIPE_INVENTORY","recipes",recipe.id,
            "Recipe ingredient references inventory from another location.",{inventoryId:item.id});
      }
    }
    for(const order of db.purchaseOrders||[]){
      if(order.vendorId && !vendors.has(order.vendorId))
        add("high","ORPHAN_PURCHASE_ORDER_VENDOR","purchaseOrders",order.id,
          `Purchase order references missing vendor ${order.vendorId}.`);
      for(const line of order.items||[]){
        const item=inventory.get(line.inventoryId);
        if(line.inventoryId && !item)
          add("high","ORPHAN_PURCHASE_ORDER_ITEM","purchaseOrders",order.id,
            `Purchase order references missing inventory ${line.inventoryId}.`);
        if(Number(line.quantity)<0)
          add("high","NEGATIVE_PURCHASE_QUANTITY","purchaseOrders",order.id,"Purchase quantity cannot be negative.");
      }
    }

    // Executive/financial records must remain tenant/location consistent.
    for(const store of ["financialSnapshots","locationFinancials","revenueSnapshots"]){
      for(const record of db[store]||[]){
        for(const key of ["revenue","netSales","sales","yesterdayRevenue","priorDayRevenue","previousDaySales"]){
          if(record[key]!==undefined && (!Number.isFinite(Number(record[key])) || Number(record[key])<0)){
            add("high","INVALID_FINANCIAL_VALUE",store,record.id,`${key} must be a non-negative number.`,{key,value:record[key]});
          }
        }
      }
    }

    const counts=issues.reduce((acc,item)=>{acc[item.severity]=(acc[item.severity]||0)+1;return acc;},{});
    const critical=counts.critical||0, high=counts.high||0;
    return {
      version:"72.50.0",
      generatedAt:new Date().toISOString(),
      certified:critical===0 && high===0,
      health:critical>0?"critical":high>0?"degraded":issues.length?"warning":"healthy",
      summary:{
        critical,high,medium:counts.medium||0,low:counts.low||0,total:issues.length,
        storesChecked:scopedStores.length
      },
      rules:{
        tenantLocationIsolation:true,
        orphanReferenceDetection:true,
        floorWorkforceConsistency:true,
        reservationStateValidation:true,
        kitchenReferenceValidation:true,
        inventoryPurchaseIntegrity:true,
        financialValueValidation:true,
        automaticRepair:false
      },
      issues
    };
  }
}

module.exports=OperationalDataIntegrityService;
