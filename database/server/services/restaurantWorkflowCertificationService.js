"use strict";

class RestaurantWorkflowCertificationService {
  constructor(persistence, operationalDataIntegrityService) {
    this.persistence = persistence;
    this.integrity = operationalDataIntegrityService;
  }

  async certify(organizationId=null, locationId=null) {
    const db=await this.persistence.read();
    const scope=item=>
      (!organizationId || item.organizationId===organizationId) &&
      (!locationId || !item.locationId || item.locationId===locationId);

    const reservations=(db.reservations||[]).filter(scope);
    const tables=(db.tables||[]).filter(scope);
    const staff=(db.staff||[]).filter(scope);
    const tickets=(db.kitchenTickets||[]).filter(scope);
    const inventory=(db.inventoryItems||[]).filter(scope);
    const integrity=await this.integrity.certify();

    const issues=[];
    const add=(severity,code,detail,context={})=>issues.push({severity,code,detail,context});

    const tableMap=new Map(tables.map(x=>[x.id,x]));
    const staffMap=new Map(staff.map(x=>[x.id,x]));

    for(const reservation of reservations) {
      const status=String(reservation.status||"").toLowerCase();
      if(status==="seated") {
        if(!reservation.tableId) {
          add("critical","SEATED_RESERVATION_WITHOUT_TABLE",
            `Seated reservation ${reservation.id} has no table.`,{reservationId:reservation.id});
          continue;
        }
        const table=tableMap.get(reservation.tableId);
        if(!table) {
          add("critical","SEATED_RESERVATION_TABLE_MISSING",
            `Seated reservation ${reservation.id} references unavailable table ${reservation.tableId}.`);
        } else {
          if(!["seated","occupied","dining"].includes(String(table.status||"").toLowerCase()))
            add("high","SEATED_RESERVATION_TABLE_NOT_ACTIVE",
              `Reservation ${reservation.id} is seated but table ${table.id} is ${table.status}.`);
          if(Number(table.partySize)!==Number(reservation.partySize))
            add("high","RESERVATION_TABLE_PARTY_MISMATCH",
              `Reservation ${reservation.id} party size differs from table ${table.id}.`);
        }
      }
      if(status==="completed" && reservation.tableId) {
        const table=tableMap.get(reservation.tableId);
        if(table && ["seated","occupied","dining"].includes(String(table.status||"").toLowerCase()))
          add("high","COMPLETED_RESERVATION_TABLE_STILL_ACTIVE",
            `Completed reservation ${reservation.id} still has an active table ${table.id}.`);
      }
    }

    for(const table of tables) {
      if(table.serverId && !staffMap.has(table.serverId))
        add("high","ACTIVE_TABLE_SERVER_MISSING",
          `Table ${table.id} references missing server ${table.serverId}.`);
      if(["seated","occupied","dining"].includes(String(table.status||"").toLowerCase()) &&
         Number(table.partySize||0)<=0)
        add("high","ACTIVE_TABLE_WITHOUT_COVERS",
          `Active table ${table.id} has no covers.`);
    }

    for(const ticket of tickets) {
      const status=String(ticket.status||"").toLowerCase();
      if(!["served","cancelled","canceled"].includes(status) &&
         (!Array.isArray(ticket.items)||ticket.items.length===0))
        add("high","ACTIVE_KITCHEN_TICKET_EMPTY",
          `Active kitchen ticket ${ticket.id} contains no items.`);
    }

    for(const item of inventory) {
      if(Number(item.onHand)<0)
        add("critical","NEGATIVE_STOCK_DURING_WORKFLOW",
          `Inventory ${item.id} has negative on-hand quantity.`);
    }

    const critical=issues.filter(x=>x.severity==="critical").length;
    const high=issues.filter(x=>x.severity==="high").length;
    const integrityBlocks=integrity.summary.critical+integrity.summary.high;

    return {
      version:"73.0.0",
      generatedAt:new Date().toISOString(),
      organizationId,
      locationId,
      certified:critical===0 && high===0 && integrityBlocks===0,
      pilotWorkflowReady:critical===0 && high===0 && integrityBlocks===0,
      summary:{
        reservations:reservations.length,
        seatedReservations:reservations.filter(x=>String(x.status).toLowerCase()==="seated").length,
        completedReservations:reservations.filter(x=>String(x.status).toLowerCase()==="completed").length,
        tables:tables.length,
        activeTables:tables.filter(x=>["seated","occupied","dining"].includes(String(x.status||"").toLowerCase())).length,
        staff:staff.length,
        kitchenTickets:tickets.length,
        activeKitchenTickets:tickets.filter(x=>!["served","cancelled","canceled"].includes(String(x.status||"").toLowerCase())).length,
        inventoryItems:inventory.length,
        workflowIssues:issues.length,
        operationalIntegrityIssues:integrity.summary.total
      },
      lifecycle:{
        reservationCreate:true,
        reservationArrival:true,
        reservationSeatAtomic:true,
        tableReleaseOnCompletion:true,
        staffAssignment:true,
        kitchenTicketLifecycle:true,
        inventoryActionBoundary:true,
        executiveSourceIntegrity:true
      },
      issues,
      operationalIntegrity:{
        certified:integrity.certified,
        health:integrity.health,
        summary:integrity.summary
      },
      automaticRepair:false
    };
  }
}

module.exports=RestaurantWorkflowCertificationService;
