"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const ReservationOps=require(path.join(root,"server/services/reservationOperationsService"));
const StaffOps=require(path.join(root,"server/services/staffOperationsService"));
const KitchenOps=require(path.join(root,"server/services/kitchenOperationsService"));
const Inventory=require(path.join(root,"server/services/inventoryIntelligenceService"));
const Executive=require(path.join(root,"server/services/executiveCommandCenterService"));
const Integrity=require(path.join(root,"server/services/operationalDataIntegrityService"));
const Workflow=require(path.join(root,"server/services/restaurantWorkflowCertificationService"));

(async()=>{
  assert.equal(pkg.version,"73.0.0");

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  assert(router.includes("/api/reservation-operations/complete"));
  assert(router.includes("/api/system/workflow-certification"));
  assert(server.includes("RestaurantWorkflowCertificationService"));
  assert(startup.includes("V73.0.0 ready"));
  assert(html.includes('content="73.0.0"'));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v73-"));
  const dbPath=path.join(dir,"db.json");
  const now=new Date().toISOString();

  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"org1",name:"Pilot Group"}],
    locations:[{id:"loc1",organizationId:"org1",name:"Pilot Restaurant",status:"open"}],
    tables:[
      {id:"t1",organizationId:"org1",locationId:"loc1",name:"Table 1",status:"available",seats:4,partySize:0}
    ],
    sections:[{id:"sec1",organizationId:"org1",locationId:"loc1",name:"Dining Room",tableIds:["t1"]}],
    staff:[{id:"s1",organizationId:"org1",locationId:"loc1",name:"Alex",status:"active",role:"server"}],
    employees:[],
    reservations:[],
    reservationEvents:[],
    staffEvents:[],
    seatingEvents:[],
    kitchenStations:[{id:"ks1",organizationId:"org1",locationId:"loc1",name:"Grill"}],
    kitchenTickets:[],
    kitchenEvents:[],
    vendors:[{id:"v1",organizationId:"org1",name:"Food Vendor"}],
    inventoryItems:[{id:"i1",organizationId:"org1",locationId:"loc1",name:"Burger",vendorId:"v1",onHand:20,par:30,unitCost:3,dailyUsage:5,unit:"ea"}],
    recipes:[],
    wasteEvents:[],
    purchaseOrders:[],
    inventoryPolicies:[],
    inventoryActions:[],
    financialSnapshots:[{id:"fin1",organizationId:"org1",locationId:"loc1",revenue:1000,yesterdayRevenue:900,generatedAt:now}],
    locationFinancials:[],
    revenueSnapshots:[],
    executiveGoals:[],
    aiDecisionHistory:[],
    auditLogs:[]
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const audits=[];
  const audit={record:async event=>{audits.push(event);return event;}};
  const realtime={events:[],publish(type,payload){this.events.push({type,payload});}};

  const reservations=new ReservationOps(db,audit,realtime);
  const staff=new StaffOps(db,audit,realtime);
  const kitchen=new KitchenOps(db,audit,realtime);
  const inventory=new Inventory(db,audit,realtime);
  const executive=new Executive(db,audit,realtime,{snapshot:async()=>({health:{overall:95}})});
  const integrity=new Integrity(db);
  const workflow=new Workflow(db,integrity);

  // 1. Reservation created.
  const reservation=await reservations.create({
    locationId:"loc1",
    guestName:"Taylor Guest",
    phone:"555-0100",
    partySize:4,
    reservationTime:new Date(Date.now()+3600000).toISOString(),
    status:"confirmed"
  },"Host","org1");
  assert.equal(reservation.status,"confirmed");

  // Invalid jump to completed is rejected.
  await assert.rejects(
    ()=>reservations.update(reservation.id,{status:"completed"},"Host","org1"),
    error=>error.code==="INVALID_RESERVATION_TRANSITION"
  );

  // 2. Arrival.
  const arrived=await reservations.update(reservation.id,{status:"arrived"},"Host","org1");
  assert.equal(arrived.status,"arrived");

  // 3. Staff assignment propagates to the table.
  const assignment=await staff.assignSection("sec1","s1","Manager","org1");
  assert(assignment);
  assert.equal((await db.get("tables","t1")).serverId,"s1");

  // 4. Seating is one transaction: reservation + table + event.
  const seated=await reservations.seat(reservation.id,"t1","Host","org1");
  assert(seated);
  assert.equal(seated.reservation.status,"seated");
  assert.equal(seated.table.status,"seated");
  assert.equal(seated.table.partySize,4);
  assert.equal(seated.table.serverId,"s1");
  assert((await db.list("reservationEvents")).some(e=>e.type==="reservation.seated"));

  // 5. Kitchen lifecycle.
  const ticket=await kitchen.createTicket({
    locationId:"loc1",
    tableName:"Table 1",
    serverName:"Alex",
    guestName:"Taylor Guest",
    targetMinutes:18,
    items:[{name:"Burger",qty:4,stationId:"ks1"}]
  },"Alex","org1");
  assert.equal(ticket.status,"received");
  await kitchen.updateItem(ticket.id,ticket.items[0].id,{status:"cooking"},"Cook","org1");
  assert.equal((await db.get("kitchenTickets",ticket.id)).status,"cooking");
  await kitchen.updateItem(ticket.id,ticket.items[0].id,{status:"ready"},"Cook","org1");
  assert.equal((await db.get("kitchenTickets",ticket.id)).status,"plating");
  await kitchen.updateTicket(ticket.id,{status:"served"},"Expo","org1");
  assert.equal((await db.get("kitchenTickets",ticket.id)).status,"served");

  // 6. Inventory action creates a tenant-safe draft PO.
  const po=await inventory.createPurchaseOrder({
    locationId:"loc1",
    vendorId:"v1",
    items:[{inventoryId:"i1",name:"Burger",quantity:5,unit:"ea",unitCost:3}],
    total:15
  },"Manager","org1");
  assert.equal(po.organizationId,"org1");
  assert.equal(po.locationId,"loc1");

  // 7. Executive snapshot consumes the resulting sourced operating picture.
  const snapshot=await executive.snapshot("org1");
  assert.equal(snapshot.locations.length,1);
  assert.equal(snapshot.locations[0].locationId,"loc1");
  assert.equal(snapshot.locations[0].revenue,1000);

  // 8. Service completion atomically releases the table.
  const completed=await reservations.complete(reservation.id,"Manager","org1");
  assert(completed);
  assert.equal(completed.reservation.status,"completed");
  assert.equal(completed.table.status,"available");
  assert.equal(completed.table.partySize,0);
  assert.equal(completed.table.guestName,"");

  // 9. Final cross-module certification.
  const cert=await workflow.certify("org1","loc1");
  assert.equal(cert.certified,true);
  assert.equal(cert.pilotWorkflowReady,true);
  assert.equal(cert.summary.workflowIssues,0);
  assert.equal(cert.operationalIntegrity.certified,true);

  // Cross-tenant reservation mutation is rejected.
  // Add a second tenant for isolation verification.
  await db.mutate(state=>{
    state.organizations.push({id:"org2",name:"Other"});
    state.locations.push({id:"loc2",organizationId:"org2",name:"Other Restaurant"});
    state.tables.push({id:"t2",organizationId:"org2",locationId:"loc2",name:"Other Table",status:"available",seats:4});
    state.reservations.push({id:"r_other",organizationId:"org2",locationId:"loc2",guestName:"Other",partySize:2,status:"confirmed"});
    return true;
  });
  assert.equal(await reservations.update("r_other",{status:"arrived"},"Manager","org1"),null);
  assert.equal((await db.get("reservations","r_other")).status,"confirmed");

  assert(audits.length>=8);
  assert(realtime.events.some(e=>e.type==="reservation:completed"));

  console.log(JSON.stringify({
    ok:true,
    version:"73.0.0",
    reservationCreate:true,
    reservationTransitionGuard:true,
    arrivalTransition:true,
    staffSectionAssignment:true,
    atomicSeating:true,
    kitchenLifecycle:true,
    inventoryPurchaseBoundary:true,
    executiveSourcedSnapshot:true,
    atomicServiceCompletion:true,
    tableRelease:true,
    finalWorkflowCertification:true,
    crossTenantMutationRejected:true,
    auditTrail:true,
    realtimeEvents:true,
    pilotWorkflowReady:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
