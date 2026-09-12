"use strict";
const fs=require("fs"),os=require("os"),path=require("path");
const {createPersistence}=require("../../server/persistence/persistenceFactory");
const AuditService=require("../../server/services/auditService");
const RealtimeHub=require("../../server/realtime/realtimeHub");
const ReservationOperationsService=require("../../server/services/reservationOperationsService");
const ServiceCoordinationService=require("../../server/services/serviceCoordinationService");
const ActionListService=require("../../server/services/actionListService");
const RestaurantConfigurationService=require("../../server/services/restaurantConfigurationService");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v100-3-55-")),file=path.join(temp,"db.json");
fs.writeFileSync(file,JSON.stringify({locations:[],sections:[],tables:[],reservations:[],waitlist:[],serviceFlows:[],reservationEvents:[],serviceEvents:[],auditLogs:[],managerActions:[],operationalValueEvents:[],staff:[],employees:[],ptoRequests:[],inventoryItems:[],maintenanceTickets:[],shiftHandoffs:[],restaurantConfigurations:{}},null,2));
const db=createPersistence({databasePath:file}),audit=new AuditService(db),hub=new RealtimeHub(),reservations=new ReservationOperationsService(db,audit,hub),service=new ServiceCoordinationService(db,audit,hub),actions=new ActionListService(db,null),configuration=new RestaurantConfigurationService(db);
let passed=0;const check=(name,value)=>{if(!value)throw new Error(`FAIL: ${name}`);passed+=1;console.log(`PASS: ${name}`);};

(async()=>{try{
  const cfg=configuration.defaults("org_test");
  cfg.location={...cfg.location,id:"loc_test",name:"Test Restaurant"};cfg.diningAreas=[{id:"main",name:"Main Dining",enabled:true}];cfg.tables=[{id:"1",name:"Table 1",areaId:"main",minCovers:1,maxCovers:4}];cfg.pilot={...cfg.pilot,actualRestaurantDataConfirmed:true,confirmedBy:"Test Manager",confirmedAt:new Date().toISOString(),confirmationSource:"isolated acceptance test"};
  const saved=await configuration.save("org_test",cfg,"Test Manager");
  const seeded=await db.read();
  check("Simple setup materializes the real location and floor",saved.configured&&seeded.locations.some(x=>x.id==="loc_test")&&seeded.tables.some(x=>x.id==="loc_test_1"));
  check("First-location automation starts behind manager approval",saved.configuration.automationPolicy.managerApprovalRequired===true&&saved.configuration.automationPolicy.mode==="RECOMMEND_ONLY");

  const reservation=await reservations.create({locationId:"loc_test",guestName:"Test Guest",phone:"555-0100",partySize:2,reservationTime:new Date().toISOString(),source:"Website"},"Test Host","org_test");
  await reservations.update(reservation.id,{status:"arrived"},"Test Host","org_test");
  let snapshot=await db.read();
  check("Arrival creates one linked waitlist record",snapshot.waitlist.filter(x=>x.reservationId===reservation.id&&x.status==="waiting").length===1);

  const seated=await reservations.seat(reservation.id,"loc_test_1","Test Host","org_test");
  snapshot=await db.read();
  check("Seating links reservation, waitlist, table, and service",seated.serviceFlow?.reservationId===reservation.id&&snapshot.waitlist.find(x=>x.reservationId===reservation.id)?.status==="seated"&&snapshot.tables.find(x=>x.id==="loc_test_1")?.status==="seated");

  await service.updateFlow(seated.serviceFlow.id,{course:"check"},"Test Manager","org_test");
  check("Check course is visible on the floor",(await db.get("tables","loc_test_1")).status==="check");
  await service.updateFlow(seated.serviceFlow.id,{course:"closed"},"Test Manager","org_test");
  snapshot=await db.read();
  check("Closing service completes the reservation and sends table to cleaning",snapshot.reservations.find(x=>x.id===reservation.id)?.status==="completed"&&snapshot.tables.find(x=>x.id==="loc_test_1")?.status==="cleaning");

  const second=await reservations.create({locationId:"loc_test",guestName:"Waiting Guest",partySize:3,reservationTime:new Date().toISOString()},"Test Host","org_test");
  await reservations.update(second.id,{status:"arrived"},"Test Host","org_test");
  await db.update("reservations",second.id,{arrivedAt:new Date(Date.now()-31*60000).toISOString()});
  const inbox=await actions.list("org_test","loc_test");
  const exception=inbox.actions.find(x=>x.sourceRecordType==="arrival_wait");
  check("Unified manager inbox receives lifecycle exceptions",Boolean(exception&&exception.approvalRequired&&exception.automationStatus==="AWAITING_MANAGER"));
  const approved=await actions.update("org_test","loc_test",exception.id,{approvalDecision:"APPROVED"},{name:"Test Manager"});
  check("Manager approval is persisted and attributable",approved.automationStatus==="APPROVED"&&approved.approvedBy==="Test Manager");
  check("Time-savings proof is derived from persisted lifecycle evidence",inbox.valueProof.measuredEvents>=3&&inbox.valueProof.manualStepsAvoided>=4&&/no financial causation/i.test(inbox.valueProof.methodology));
  console.log(`V100.3.55 first-class operating lifecycle ${passed}/9`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
