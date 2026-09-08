"use strict";
const assert=require("assert");
const Service=require("../../server/services/liveFloorServiceCertificationService");
(async()=>{
 const state={
  locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
  tables:[{id:"t1",organizationId:"org",locationId:"loc1",name:"T1",seats:4,status:"seated",partySize:4,section:"Main",server:"Sam"},{id:"t2",organizationId:"org",locationId:"loc1",name:"T2",seats:4,status:"available",partySize:0,section:"Main",server:"Sam"}],
  sections:[{id:"s1",organizationId:"org",locationId:"loc1",name:"Main"}],staff:[{id:"st1",organizationId:"org",locationId:"loc1",status:"active",name:"Sam"}],
  reservations:[{id:"r1",organizationId:"org",locationId:"loc1",status:"seated",partySize:4,tableId:"t1"}],
  waitlist:[{id:"w1",organizationId:"org",locationId:"loc1",status:"seated",partySize:2,tableId:"t2"},{id:"w2",organizationId:"org",locationId:"loc1",status:"waiting",partySize:3}],
  seatingEvents:[{id:"se1",organizationId:"org",locationId:"loc1",type:"waitlist.seated",summary:"Guest seated at T2"},{id:"se2",organizationId:"org",locationId:"loc1",type:"table.reset",summary:"T2 reset and available"}],
  serviceFlows:[{id:"sf1",organizationId:"org",locationId:"loc1",tableId:"t1",tableName:"T1",seatedAt:"2026-08-09T21:00:00Z",readyAt:"2026-08-09T21:20:00Z",deliveredAt:"2026-08-09T21:23:00Z",updatedAt:"2026-08-09T21:23:00Z"}],
  serviceEvents:[{id:"sv1",organizationId:"org",locationId:"loc1",type:"service:flow-updated",summary:"T1 food delivered"},{id:"sv2",organizationId:"org",locationId:"loc1",type:"table.available",summary:"T2 turned available"}],
  liveFloorServiceCertificationSessions:[],liveFloorServiceCertifications:[]
 };
 const audits=[],events=[],svc=new Service({read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},{record:async x=>audits.push(x)},{publish:(n,p)=>events.push([n,p])},{snapshot:async()=>({status:"reservation-guest-journey-ready"})});
 let snap=await svc.snapshot("org",["loc1"]);assert.equal(snap.version,"51.40.0");assert.equal(snap.status,"live-floor-service-ready");assert.equal(snap.locations[0].stages.length,10);assert.equal(snap.locations[0].systemEvidencePassed,10);assert.equal(snap.locations[0].floorSummary.occupancyPercent,50);assert.equal(snap.policy.noSyntheticFloorPass,true);
 const session=await svc.start("org",["loc1"],"loc1",{shiftLabel:"Dinner",manager:"GM",targetOccupancyPercent:90,note:"Full floor rehearsal"},"Tester");assert.equal(session.status,"ACTIVE");
 let orderBlocked=false;try{await svc.checkpoint("org",["loc1"],session.id,{stage:"SEATING_PRESSURE",evidence:"Pressure reviewed"},"Tester");}catch(e){orderBlocked=/prior floor\/service stage/i.test(e.message);}assert(orderBlocked);
 for(const stage of svc.stageOrder){const cp=await svc.checkpoint("org",["loc1"],session.id,{stage,evidence:`${stage} exercised and verified on the live-floor model.`},"Tester");assert.equal(cp.status,"COMPLETED");assert.equal(cp.overrideUsed,false);assert.equal(cp.tableMutationPerformed,false);assert.equal(cp.guestMovementPerformed,false);}
 snap=await svc.snapshot("org",["loc1"]);assert.equal(snap.locations[0].completedStages,10);assert.equal(snap.locations[0].floorServiceState,"READY_FOR_CERTIFICATION");
 const cert=await svc.certify("org",["loc1"],"loc1",{evidence:"Table state, occupancy, seating linkages, service timing, turns, pressure, and event continuity were exercised in one shift rehearsal.",note:"Live floor and service flow accepted for pilot."},"Tester");assert.equal(cert.status,"LIVE_FLOOR_SERVICE_CERTIFIED");assert.equal(cert.tableMutationPerformedByCertification,false);
 snap=await svc.snapshot("org",["loc1"]);assert.equal(snap.status,"live-floor-service-certified");
 state.serviceEvents=[];state.serviceFlows=[];state.liveFloorServiceCertificationSessions=[];state.liveFloorServiceCertifications=[];
 const session2=await svc.start("org",["loc1"],"loc1",{},"Tester");for(const stage of svc.stageOrder.slice(0,6))await svc.checkpoint("org",["loc1"],session2.id,{stage,evidence:`${stage} verified.`},"Tester");
 let gapBlocked=false;try{await svc.checkpoint("org",["loc1"],session2.id,{stage:"SERVICE_TIMING",evidence:"Timing reviewed."},"Tester");}catch(e){gapBlocked=/override reason/i.test(e.message);}assert(gapBlocked);
 const overridden=await svc.checkpoint("org",["loc1"],session2.id,{stage:"SERVICE_TIMING",evidence:"Timing workflow reviewed using the known missing service-flow evidence state.",overrideReason:"Controlled pilot rehearsal of service-timing evidence gap."},"Tester");assert.equal(overridden.overrideUsed,true);
 console.log(JSON.stringify({ok:true,version:"51.40.0",stages:10,tableStateContinuity:true,occupancyAccuracy:true,sectionServerAssignment:true,reservationTableLinkage:true,waitlistTableLinkage:true,tableTurnReset:true,serviceTiming:true,guestMovement:true,seatingPressure:true,serviceEventContinuity:true,stageOrderEnforced:true,evidenceGapOverrideGuard:true,humanCertification:true,noSyntheticFloorPass:true,noAutomaticTableMutation:true,noAutomaticGuestMovement:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
