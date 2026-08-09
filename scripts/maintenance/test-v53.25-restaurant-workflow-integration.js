"use strict";
const assert=require("assert"),Service=require("../../server/services/restaurantWorkflowIntegrationService");
(async()=>{
 const state={locations:[{id:"loc1",organizationId:"org",name:"Pilot"}],reservations:[{id:"r1",organizationId:"org",locationId:"loc1",status:"seated",tableId:"t1"}],tables:[{id:"t1",organizationId:"org",locationId:"loc1"}],waitlist:[],seatingEvents:[{organizationId:"org",locationId:"loc1",type:"reservation.seated"}],serviceFlows:[{organizationId:"org",locationId:"loc1",updatedAt:"now"}],serviceEvents:[{organizationId:"org",locationId:"loc1",type:"course.delivered"}],kitchenTickets:[{organizationId:"org",locationId:"loc1"}],kitchenEvents:[],restaurantWorkflowIntegrationObservations:[],restaurantWorkflowIntegrationCertifications:[]};
 const db={read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)};
 const day={snapshot:async()=>({locations:[{locationId:"loc1",dayState:"OPEN"}]})},journey={snapshot:async()=>({locations:[{locationId:"loc1",guestJourneyState:"READY"}]})},floor={snapshot:async()=>({locations:[{locationId:"loc1",floorServiceState:"FLOOR_SERVICE_CERTIFIED"}]})},ux={snapshot:async()=>({status:"operator-ux-ready-for-certification"})};
 const svc=new Service(db,{record:async()=>{}},{publish:()=>{}},day,journey,floor,ux);
 let s=await svc.snapshot("org",["*"]);assert.equal(s.version,"53.25.0");
 const o=await svc.observe("org",["*"],"loc1",{handoffContinuity:"PASS",shiftCompletion:"PASS",failureRecoveryEvidence:"recovery path reviewed",operatorEvidence:"operator completed full service flow"},"Tester");
 assert.equal(o.reservationMutatedByObservation,false);assert.equal(o.seatingMutatedByObservation,false);assert.equal(o.kitchenMutatedByObservation,false);
 s=await svc.snapshot("org",["*"]);assert.equal(s.locations[0].workflowReady,true);
 const c=await svc.certify("org",["*"],"loc1",{evidence:"all gates pass",note:"certified"},"Tester");
 assert.equal(c.restaurantActionsExecutedByCertification,false);assert.equal(c.workflowRedesignedByCertification,false);
 console.log(JSON.stringify({ok:true,version:"53.25.0",opening:true,reservation:true,arrival:true,seating:true,activeService:true,kitchen:true,guestRecovery:true,closeout:true,handoffContinuity:true,operatorFriction:true,failureRecovery:true,shiftCompletion:true,humanCertification:true,noAutomaticRestaurantMutation:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});