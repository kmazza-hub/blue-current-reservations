"use strict";
const assert=require("assert");
const Service=require("../../server/services/reservationGuestJourneyCertificationService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
    reservations:[
      {id:"r1",organizationId:"org",locationId:"loc1",guestName:"Alex Guest",phone:"555-1000",status:"confirmed",notes:"Anniversary",createdAt:"2026-08-01T10:00:00Z"},
      {id:"r2",organizationId:"org",locationId:"loc1",guestName:"Alex Guest",phone:"555-1000",status:"seated",createdAt:"2026-08-08T10:00:00Z"}
    ],
    reservationEvents:[
      {id:"e1",organizationId:"org",locationId:"loc1",reservationId:"r1",type:"reservation.updated"},
      {id:"e2",organizationId:"org",locationId:"loc1",reservationId:"r2",type:"reservation.seated"}
    ],
    waitlist:[{id:"w1",organizationId:"org",locationId:"loc1",guestName:"Walk In",status:"waiting"}],
    seatingEvents:[],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1",status:"seated"}],
    guestEngagements:[{id:"g1",organizationId:"org",type:"recovery_completed"}],
    reservationGuestJourneySessions:[],
    reservationGuestJourneyCertifications:[]
  };
  const audits=[],events=[];
  const svc=new Service(
    {read:async()=>JSON.parse(JSON.stringify(state)),mutate:async fn=>fn(state)},
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>({profiles:[{id:"gp1",locations:["loc1"],name:"Alex Guest"}]})},
    {snapshot:async()=>({status:"operator-ux-ready-for-certification"})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.35.0");
  assert.equal(snap.status,"reservation-guest-journey-ready");
  assert.equal(snap.locations[0].systemEvidencePassed,9);
  assert.equal(snap.locations[0].stages.length,9);
  assert.equal(snap.policy.noSyntheticJourneyPass,true);

  const session=await svc.start("org",["loc1"],"loc1",{
    guestName:"Alex Guest",phone:"555-1000",occasion:"Anniversary",note:"End-to-end rehearsal"
  },"Tester");
  assert.equal(session.status,"ACTIVE");
  assert.equal(session.mode,"CONTROLLED_GUEST_JOURNEY_REHEARSAL");

  let orderBlocked=false;
  try{
    await svc.checkpoint("org",["loc1"],session.id,{stage:"SEATING",evidence:"Seat verified"},"Tester");
  }catch(e){orderBlocked=/prior journey stage/i.test(e.message);}
  assert(orderBlocked);

  for(const stage of svc.stageOrder){
    const cp=await svc.checkpoint("org",["loc1"],session.id,{
      stage,evidence:`${stage} exercised end-to-end by operator.`
    },"Tester");
    assert.equal(cp.status,"COMPLETED");
    assert.equal(cp.overrideUsed,false);
    assert.equal(cp.reservationMutationPerformed,false);
    assert.equal(cp.guestContactPerformed,false);
  }

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.locations[0].completedStages,9);
  assert.equal(snap.locations[0].journeyState,"READY_FOR_CERTIFICATION");

  const cert=await svc.certify("org",["loc1"],"loc1",{
    evidence:"Availability through historical continuity exercised in one coherent guest journey.",
    note:"Reservation and guest journey accepted for pilot."
  },"Tester");
  assert.equal(cert.status,"RESERVATION_GUEST_JOURNEY_CERTIFIED");
  assert.equal(cert.reservationMutationPerformedByCertification,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"reservation-guest-journey-certified");

  // A genuine evidence gap must require a documented rehearsal reason.
  state.guestEngagements=[];
  state.reservationGuestJourneySessions=[];
  state.reservationGuestJourneyCertifications=[];
  const session2=await svc.start("org",["loc1"],"loc1",{guestName:"Gap Test"},"Tester");
  for(const stage of svc.stageOrder.slice(0,7)){
    await svc.checkpoint("org",["loc1"],session2.id,{stage,evidence:`${stage} verified.`},"Tester");
  }
  let gapBlocked=false;
  try{
    await svc.checkpoint("org",["loc1"],session2.id,{stage:"GUEST_RECOVERY",evidence:"Recovery workflow reviewed."},"Tester");
  }catch(e){gapBlocked=/override reason/i.test(e.message);}
  assert(gapBlocked);

  const overridden=await svc.checkpoint("org",["loc1"],session2.id,{
    stage:"GUEST_RECOVERY",
    evidence:"Recovery workflow exercised without contacting a real guest.",
    overrideReason:"Controlled pilot rehearsal because no historical recovery engagement exists."
  },"Tester");
  assert.equal(overridden.overrideUsed,true);
  assert.equal(overridden.guestContactPerformed,false);

  console.log(JSON.stringify({
    ok:true,version:"51.35.0",
    stages:9,
    inquiryAvailability:true,
    reservation:true,
    confirmation:true,
    modificationCancellation:true,
    arrivalWaitlist:true,
    seating:true,
    guestContextOccasionNotes:true,
    guestRecoveryLinkage:true,
    historyContinuity:true,
    stageOrderEnforced:true,
    evidenceGapOverrideGuard:true,
    humanEndToEndCertification:true,
    noSyntheticJourneyPass:true,
    noAutomaticGuestContact:true,
    noAutomaticReservationMutation:true,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
