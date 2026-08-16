"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const ReservationOps=require(path.join(root,"server/services/reservationOperationsService"));
const KitchenOps=require(path.join(root,"server/services/kitchenOperationsService"));
const Idempotency=require(path.join(root,"server/services/idempotencyService"));
const Sync=require(path.join(root,"server/services/syncReconciliationService"));
const Mutation=require(path.join(root,"server/services/productionMutationIntegrityService"));
const Integrity=require(path.join(root,"server/services/operationalDataIntegrityService"));
const Workflow=require(path.join(root,"server/services/restaurantWorkflowCertificationService"));
const Failure=require(path.join(root,"server/services/liveShiftFailureCertificationService"));

(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 73);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/system/live-shift-failure-certification"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7350-")), dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({
  organizations:[{id:"o",name:"O"}],locations:[{id:"l",organizationId:"o",name:"L"}],
  tables:[{id:"t",organizationId:"o",locationId:"l",name:"T",status:"available",seats:4,partySize:0}],
  reservations:[
   {id:"r1",organizationId:"o",locationId:"l",guestName:"A",partySize:2,status:"arrived"},
   {id:"r2",organizationId:"o",locationId:"l",guestName:"B",partySize:2,status:"arrived"}
  ],
  reservationEvents:[],staff:[],employees:[],sections:[],waitlist:[],seatingEvents:[],staffEvents:[],
  kitchenStations:[{id:"ks",organizationId:"o",locationId:"l",name:"Grill"}],kitchenTickets:[],kitchenEvents:[],
  vendors:[],inventoryItems:[],recipes:[],wasteEvents:[],purchaseOrders:[],inventoryPolicies:[],inventoryActions:[],
  financialSnapshots:[],locationFinancials:[],revenueSnapshots:[],executiveGoals:[],managerActions:[],
  auditLogs:[],idempotencyRecords:[],resourceVersions:[],mutationIntegrityRecords:[]
 },null,2));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const audit={record:async x=>x}, realtime={publish(){}};
 const res=new ReservationOps(db,audit,realtime), kit=new KitchenOps(db,audit,realtime);

 // Duplicate/table conflict: exactly first seating succeeds.
 assert(await res.seat("r1","t","Host","o"));
 assert.equal(await res.seat("r2","t","Host","o"),null);
 assert.equal(await res.seat("r1","t","Host","o"),null);
 assert.equal((await db.get("tables","t")).guestName,"A");

 // Completion is safe to retry: second completion does nothing.
 assert(await res.complete("r1","Manager","o"));
 assert.equal(await res.complete("r1","Manager","o"),null);
 assert.equal((await db.get("tables","t")).status,"available");

 // Transaction rollback leaves no partial state.
 await assert.rejects(()=>db.transaction(tx=>{
   tx.update("tables","t",{status:"seated",guestName:"BROKEN",partySize:9});
   throw new Error("simulated interruption");
 }));
 assert.equal((await db.get("tables","t")).status,"available");
 assert.notEqual((await db.get("tables","t")).guestName,"BROKEN");

 // Kitchen invalid terminal transition rejected.
 const ticket=await kit.createTicket({locationId:"l",tableName:"T",items:[{name:"Burger",qty:1,stationId:"ks"}]},"Cook","o");
 await assert.rejects(()=>kit.updateTicket(ticket.id,{status:"served"},"Expo","o"),e=>e.code==="INVALID_KITCHEN_TRANSITION");
 await kit.updateItem(ticket.id,ticket.items[0].id,{status:"cooking"},"Cook","o");
 await kit.updateItem(ticket.id,ticket.items[0].id,{status:"ready"},"Cook","o");
 await kit.updateTicket(ticket.id,{status:"served"},"Expo","o");

 // Idempotency reserves once and replays durable result.
 const idem=new Idempotency(db);
 const key="o:test-key";
 const first=await idem.reserve(key,{method:"POST",path:"/x",organizationId:"o",userId:"u"});
 const second=await idem.reserve(key,{method:"POST",path:"/x",organizationId:"o",userId:"u"});
 assert.equal(first.id,second.id);
 await idem.complete(key,200,{ok:true});
 assert.equal((await idem.find(key)).status,"complete");

 // Stale write conflict.
 const sync=new Sync(db,audit,realtime);
 const prep=await sync.prepare({organizationId:"o",path:"/api/floor/tables/t",entityId:"t",expectedVersion:0});
 assert(prep.ok);
 await sync.commit({key:prep.key,organizationId:"o",path:"/api/floor/tables/t",entityId:"t",actor:"A",payload:{status:"available"}});
 const stale=await sync.prepare({organizationId:"o",path:"/api/floor/tables/t",entityId:"t",expectedVersion:0});
 assert.equal(stale.conflict,true);

 // Restart recovery uses durable idempotency proof.
 const mutation=new Mutation(db,{staleAfterMs:1});
 const m=await mutation.begin({organizationId:"o",method:"POST",path:"/x",entityId:"collection",userId:"u",actor:"A",idempotencyKey:key,expectedVersion:0});
 await new Promise(r=>setTimeout(r,3));
 const recovered=await mutation.recoverStalePrepared();
 assert.equal(recovered.committedRecovered,1);

 const integrity=new Integrity(db), workflow=new Workflow(db,integrity);
 const failure=new Failure(db,{workflowCertification:workflow,idempotencyService:idem,syncReconciliationService:sync,mutationIntegrityService:mutation});
 const cert=await failure.certify("o","l");
 assert.equal(cert.liveShiftFailureReady,true);
 assert.equal(cert.issues.length,0);

 console.log(JSON.stringify({
  ok:true,version:"73.50.0",duplicateSeatingRejected:true,tableConflictRejected:true,
  repeatedCompletionSafe:true,transactionRollback:true,kitchenTransitionGuard:true,
  idempotencyReplay:true,staleWriteConflict:true,restartMutationRecovery:true,
  liveShiftFailureReady:true
 },null,2));
})().catch(e=>{console.error(e);process.exit(1)});
