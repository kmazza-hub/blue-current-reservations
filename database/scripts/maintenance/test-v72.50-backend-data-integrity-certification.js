"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Integrity=require(path.join(root,"server/services/operationalDataIntegrityService"));
const FloorService=require(path.join(root,"server/services/floorService"));
const StaffService=require(path.join(root,"server/services/staffOperationsService"));
const KitchenService=require(path.join(root,"server/services/kitchenOperationsService"));
const InventoryService=require(path.join(root,"server/services/inventoryIntelligenceService"));
const ExecutiveService=require(path.join(root,"server/services/executiveCommandCenterService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 72, `Expected V72 or later, found ${pkg.version}`);

  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const gateway=fs.readFileSync(path.join(root,"server/persistence/persistenceGateway.js"),"utf8");
  const contract=fs.readFileSync(path.join(root,"server/persistence/persistenceContract.js"),"utf8");

  assert(server.includes("OperationalDataIntegrityService"));
  assert(router.includes("/api/system/operational-data-integrity"));
  assert(gateway.includes("insert(collection"));
  assert(gateway.includes("delete(collection"));
  assert(contract.includes('"insert"'));
  assert(contract.includes('"delete"'));
  assert(/V\d+(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));

  // No server service may call a persistence method outside the gateway contract.
  const allowed=new Set([
    "read","reload","write","mutate","list","get","create","insert","update","delete",
    "diagnostics","awaitIdle","checkpointBackup","verifyBackups","recoverFromBackup","transaction"
  ]);
  const serviceDir=path.join(root,"server/services");
  const unknown=[];
  for(const file of fs.readdirSync(serviceDir).filter(name=>name.endsWith(".js"))){
    const source=fs.readFileSync(path.join(serviceDir,file),"utf8");
    for(const match of source.matchAll(/\b(?:this\.)?database\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)){
      if(!allowed.has(match[1])) unknown.push(`${file}:${match[1]}`);
    }
  }
  assert.deepEqual(unknown,[]);

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7250-"));
  const dbPath=path.join(dir,"db.json");
  const now=new Date().toISOString();
  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[
      {id:"org_a",name:"A"},
      {id:"org_b",name:"B"}
    ],
    locations:[
      {id:"loc_a",organizationId:"org_a",name:"A Main"},
      {id:"loc_b",organizationId:"org_b",name:"B Main"}
    ],
    tables:[
      {id:"table_a",organizationId:"org_a",locationId:"loc_a",name:"A1",status:"open",partySize:0},
      {id:"table_b",organizationId:"org_b",locationId:"loc_b",name:"B1",status:"open",partySize:0}
    ],
    waitlist:[
      {id:"wait_a",organizationId:"org_a",locationId:"loc_a",guestName:"Guest",partySize:2,status:"waiting"}
    ],
    sections:[
      {id:"sec_a",organizationId:"org_a",locationId:"loc_a",name:"A",tableIds:["table_a"]},
      {id:"sec_b",organizationId:"org_b",locationId:"loc_b",name:"B",tableIds:["table_b"]}
    ],
    staff:[
      {id:"staff_a",organizationId:"org_a",locationId:"loc_a",name:"Alice",status:"active"},
      {id:"staff_b",organizationId:"org_b",locationId:"loc_b",name:"Bob",status:"active"}
    ],
    employees:[],
    kitchenStations:[
      {id:"station_a",organizationId:"org_a",locationId:"loc_a",name:"Grill"},
      {id:"station_b",organizationId:"org_b",locationId:"loc_b",name:"Grill"}
    ],
    kitchenTickets:[
      {id:"kt_a",organizationId:"org_a",locationId:"loc_a",tableName:"A1",targetMinutes:18,status:"received",createdAt:now,
       items:[{id:"ki_a",name:"Burger",qty:1,stationId:"station_a",status:"received"}]}
    ],
    vendors:[
      {id:"vendor_a",organizationId:"org_a",name:"Vendor A"},
      {id:"vendor_b",organizationId:"org_b",name:"Vendor B"}
    ],
    inventoryItems:[
      {id:"inv_a",organizationId:"org_a",locationId:"loc_a",name:"Beef",vendorId:"vendor_a",onHand:10,par:20,unitCost:2},
      {id:"inv_b",organizationId:"org_b",locationId:"loc_b",name:"Fish",vendorId:"vendor_b",onHand:10,par:20,unitCost:3}
    ],
    recipes:[],
    purchaseOrders:[],
    inventoryPolicies:[],
    inventoryActions:[],
    wasteEvents:[],
    reservations:[
      {id:"res_a",organizationId:"org_a",locationId:"loc_a",guestName:"Guest",partySize:2,status:"confirmed"}
    ],
    financialSnapshots:[],
    locationFinancials:[],
    revenueSnapshots:[],
    executiveGoals:[
      {id:"goal_a",organizationId:"org_a",label:"Sales",target:100},
      {id:"goal_b",organizationId:"org_b",label:"Sales",target:100}
    ],
    managerActions:[],
    seatingEvents:[],
    staffEvents:[],
    auditLogs:[]
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const audit={record:async x=>x};
  const realtime={publish(){}};

  // Clean data certifies.
  let certification=await new Integrity(db).certify();
  assert.equal(certification.certified,true);
  assert.equal(certification.summary.total,0);

  // Persistence compatibility methods are operational.
  await db.insert("managerActions",{id:"action_1",organizationId:"org_a",locationId:"loc_a"});
  assert(await db.get("managerActions","action_1"));
  await db.delete("managerActions","action_1");
  assert.equal(await db.get("managerActions","action_1"),null);

  // Floor mutations cannot cross tenant boundaries.
  const floor=new FloorService(db,audit,realtime);
  assert.equal(await floor.updateTable("table_b",{status:"seated"},"Manager A","org_a"),null);
  assert.equal((await db.get("tables","table_b")).status,"open");
  assert.equal(await floor.seatWaitlist("wait_a","table_b","Manager A","org_a"),null);

  // Staff assignment cannot cross tenants/locations.
  const staff=new StaffService(db,audit,realtime);
  assert.equal(await staff.assignSection("sec_a","staff_b","Manager A","org_a"),null);
  assert.equal(await staff.reassignTable("table_a","staff_b","Manager A","org_a"),null);

  // Kitchen mutation cannot target another organization.
  const kitchen=new KitchenService(db,audit,realtime);
  assert.equal(await kitchen.updateTicket("kt_a",{status:"ready"},"Manager B","org_b"),null);
  await assert.rejects(
    ()=>kitchen.createTicket({
      locationId:"loc_a",tableName:"A1",
      items:[{name:"Burger",qty:1,stationId:"station_b"}]
    },"Manager A","org_a"),
    error=>error.statusCode===400
  );

  // Inventory PO cannot reference cross-tenant vendor/item.
  const inventory=new InventoryService(db,audit,realtime);
  await assert.rejects(
    ()=>inventory.createPurchaseOrder({
      locationId:"loc_a",vendorId:"vendor_b",
      items:[{inventoryId:"inv_a",quantity:1}]
    },"Manager A","org_a"),
    error=>error.statusCode===400
  );

  // Executive goals are tenant-scoped.
  const executive=new ExecutiveService(db,audit,realtime,{snapshot:async()=>({})});
  assert.equal(await executive.updateGoal("goal_b",{target:999},"Manager A","org_a"),null);
  assert.equal((await db.get("executiveGoals","goal_b")).target,100);

  // Inject cross-module integrity failures and prove detection.
  await db.mutate(state=>{
    state.tables.find(x=>x.id==="table_a").serverId="staff_b";
    state.inventoryItems.find(x=>x.id==="inv_a").onHand=-1;
    state.reservations.find(x=>x.id==="res_a").tableId="table_b";
    state.kitchenTickets[0].items[0].stationId="station_b";
    return true;
  });

  certification=await new Integrity(db).certify();
  assert.equal(certification.certified,false);
  const codes=new Set(certification.issues.map(x=>x.code));
  for(const code of [
    "CROSS_LOCATION_TABLE_SERVER",
    "NEGATIVE_INVENTORY",
    "CROSS_LOCATION_RESERVATION_TABLE",
    "CROSS_LOCATION_KITCHEN_STATION"
  ]) assert(codes.has(code),`missing integrity code ${code}`);

  console.log(JSON.stringify({
    ok:true,
    version:"72.50.0",
    persistenceContractComplete:true,
    insertCompatibility:true,
    deleteCompatibility:true,
    unknownPersistenceCalls:0,
    actualCleanCertificationModel:true,
    floorTenantIsolation:true,
    staffTenantIsolation:true,
    kitchenTenantIsolation:true,
    inventoryTenantIsolation:true,
    executiveGoalTenantIsolation:true,
    crossModuleOrphanDetection:true,
    invalidStateDetection:true,
    automaticRepair:false
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
