"use strict";

class ReservationGuestJourneyCertificationService {
  constructor(database,auditService,realtimeHub,guestIntelligenceService,operatorUxHardeningService){
    Object.assign(this,{database,auditService,realtimeHub,guestIntelligenceService,operatorUxHardeningService});
    this.stageOrder=[
      "INQUIRY_AVAILABILITY",
      "RESERVATION",
      "CONFIRMATION",
      "MODIFICATION_CANCELLATION",
      "ARRIVAL_WAITLIST",
      "SEATING",
      "GUEST_CONTEXT",
      "GUEST_RECOVERY",
      "HISTORY_CONTINUITY"
    ];
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async sessions(organizationId){
    const db=await this.database.read();
    return (db.reservationGuestJourneySessions||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  }
  async certifications(organizationId){
    const db=await this.database.read();
    return (db.reservationGuestJourneyCertifications||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  guestKey(x){return String(x?.phone||x?.guestName||x?.name||"").trim().toLowerCase();}
  evidenceModel(db,organizationId,locationId,guestSnapshot){
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const reservationEvents=(db.reservationEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const seatingEvents=(db.seatingEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const guestEngagements=(db.guestEngagements||[]).filter(x=>x.organizationId===organizationId);
    const profiles=(guestSnapshot?.profiles||[]).filter(x=>!x.locations?.length||x.locations.includes(locationId));
    const guestVisits=new Map();
    for(const r of reservations){const key=this.guestKey(r);if(key)guestVisits.set(key,(guestVisits.get(key)||0)+1);}
    const repeatGuests=[...guestVisits.values()].filter(x=>x>1).length;
    return {reservations,reservationEvents,waitlist,seatingEvents,tables,guestEngagements,profiles,repeatGuests};
  }
  stageChecks(model,stage){
    const confirmed=model.reservations.filter(x=>x.status==="confirmed").length;
    const arrived=model.reservations.filter(x=>x.status==="arrived").length;
    const seated=model.reservations.filter(x=>x.status==="seated").length;
    const modified=model.reservationEvents.filter(x=>x.type==="reservation.updated").length;
    const cancelled=model.reservations.filter(x=>x.status==="cancelled"||x.status==="canceled").length;
    const seatedEvents=model.reservationEvents.filter(x=>x.type==="reservation.seated").length+model.seatingEvents.filter(x=>/seated/i.test(x.type||"")).length;
    const notes=model.reservations.filter(x=>String(x.notes||"").trim()||x.vip||String(x.accessibility||"").trim()).length;
    const recovery=model.guestEngagements.filter(x=>x.type==="recovery_completed").length;
    const map={
      INQUIRY_AVAILABILITY:[
        {id:"floor-capacity",label:"Table inventory exists to answer availability",passed:model.tables.length>0,actual:`${model.tables.length} tables`},
        {id:"reservation-context",label:"Reservation operating context exists",passed:model.reservations.length>0,actual:`${model.reservations.length} reservation(s)`}
      ],
      RESERVATION:[
        {id:"reservation-record",label:"Reservation creation path has authoritative records",passed:model.reservations.length>0,actual:`${model.reservations.length} reservation(s)`}
      ],
      CONFIRMATION:[
        {id:"confirmed-state",label:"Confirmed reservation state exists",passed:confirmed>0,actual:`${confirmed} confirmed`}
      ],
      MODIFICATION_CANCELLATION:[
        {id:"change-history",label:"Reservation modification/cancellation evidence exists",passed:modified>0||cancelled>0,actual:`${modified} update event(s) · ${cancelled} cancelled`}
      ],
      ARRIVAL_WAITLIST:[
        {id:"arrival-wait-context",label:"Arrival or waitlist state exists",passed:arrived>0||model.waitlist.length>0,actual:`${arrived} arrived · ${model.waitlist.length} waitlist`}
      ],
      SEATING:[
        {id:"seating-continuity",label:"Seating state/event evidence exists",passed:seated>0||seatedEvents>0||model.tables.some(x=>x.status==="seated"),actual:`${seated} seated reservations · ${seatedEvents} seating events`}
      ],
      GUEST_CONTEXT:[
        {id:"guest-context",label:"Guest notes, VIP/accessibility, or guest profile context exists",passed:notes>0||model.profiles.length>0,actual:`${notes} contextual reservations · ${model.profiles.length} guest profiles`}
      ],
      GUEST_RECOVERY:[
        {id:"recovery-linkage",label:"Guest recovery engagement evidence exists",passed:recovery>0,actual:`${recovery} recovery engagement(s)`}
      ],
      HISTORY_CONTINUITY:[
        {id:"history",label:"Guest/reservation history continuity exists",passed:model.reservationEvents.length>0||model.repeatGuests>0,actual:`${model.reservationEvents.length} reservation events · ${model.repeatGuests} repeat guest key(s)`}
      ]
    };
    return map[stage]||[];
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,guestSnapshot,ux,sessions,certs]=await Promise.all([
      this.database.read(),
      this.guestIntelligenceService.snapshot(organizationId),
      this.operatorUxHardeningService.snapshot(organizationId,allowedLocationIds),
      this.sessions(organizationId),
      this.certifications(organizationId)
    ]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds)).map(loc=>{
      const model=this.evidenceModel(db,organizationId,loc.id,guestSnapshot);
      const session=sessions.find(x=>x.locationId===loc.id&&x.status==="ACTIVE")||sessions.find(x=>x.locationId===loc.id)||null;
      const certification=certs.find(x=>x.locationId===loc.id)||null;
      const completed=new Set((session?.checkpoints||[]).filter(x=>x.status==="COMPLETED").map(x=>x.stage));
      const stages=this.stageOrder.map((stage,index)=>{
        const checks=this.stageChecks(model,stage);
        const systemEvidence=checks.every(x=>x.passed);
        const previous=index===0||completed.has(this.stageOrder[index-1]);
        const checkpoint=(session?.checkpoints||[]).filter(x=>x.stage===stage).slice(-1)[0]||null;
        const complete=checkpoint?.status==="COMPLETED";
        return {
          stage,index:index+1,label:stage.replaceAll("_"," "),
          systemEvidence,previousComplete:previous,checks,checkpoint,
          state:complete?"COMPLETED":!session?"SESSION_REQUIRED":!previous?"WAITING_FOR_PRIOR_STAGE":systemEvidence?"READY_FOR_CHECKPOINT":"EVIDENCE_GAP"
        };
      });
      const systemEvidencePassed=stages.filter(x=>x.systemEvidence).length;
      const completedStages=stages.filter(x=>x.state==="COMPLETED").length;
      return {
        locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,
        modelSummary:{
          reservations:model.reservations.length,reservationEvents:model.reservationEvents.length,
          waitlist:model.waitlist.length,seatingEvents:model.seatingEvents.length,
          tables:model.tables.length,guestProfiles:model.profiles.length,
          recoveryEngagements:model.guestEngagements.filter(x=>x.type==="recovery_completed").length,
          repeatGuests:model.repeatGuests
        },
        session,certification,stages,
        systemEvidencePassed,totalStages:this.stageOrder.length,
        completedStages,
        journeyPercent:Math.round(completedStages/this.stageOrder.length*100),
        journeyState:certification?.status==="RESERVATION_GUEST_JOURNEY_CERTIFIED"?"JOURNEY_CERTIFIED":completedStages===this.stageOrder.length?"READY_FOR_CERTIFICATION":session?.status==="ACTIVE"?"JOURNEY_REHEARSAL_ACTIVE":"JOURNEY_REHEARSAL_NOT_STARTED"
      };
    });
    const total=locations.length*this.stageOrder.length;
    const evidencePassed=locations.reduce((n,x)=>n+x.systemEvidencePassed,0);
    const completed=locations.reduce((n,x)=>n+x.completedStages,0);
    return {
      version:"51.35.0",generatedAt:this.now(),
      status:locations.length===0?"restaurant-required":locations.every(x=>x.journeyState==="JOURNEY_CERTIFIED")?"reservation-guest-journey-certified":locations.some(x=>x.journeyState==="JOURNEY_REHEARSAL_ACTIVE")?"reservation-guest-journey-in-progress":"reservation-guest-journey-ready",
      headline:`${evidencePassed}/${total} journey stages have supporting system evidence; ${completed}/${total} have human checkpoint evidence.`,
      stageOrder:this.stageOrder,locations,
      uxStatus:ux.status,
      policy:{
        existingReservationWorkflowReused:true,
        existingFloorWorkflowReused:true,
        existingGuestIntelligenceReused:true,
        humanCheckpointEvidenceRequired:true,
        evidenceGapOverrideRequiresReason:true,
        stageOrderEnforced:true,
        certificationHumanRequired:true,
        noSyntheticJourneyPass:true,
        noAutomaticGuestContact:true,
        noAutomaticReservationMutation:true,
        autonomousProductionChanges:false
      }
    };
  }
  async start(organizationId,allowedLocationIds,locationId,input,actor){
    if(!this.allowed(locationId,allowedLocationIds))throw new Error("Location is outside your authorized scope.");
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant location not found.");
    if(loc.session?.status==="ACTIVE")throw new Error("An active reservation/guest journey rehearsal already exists.");
    const now=this.now();
    const record={
      id:`rgj_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,status:"ACTIVE",
      mode:"CONTROLLED_GUEST_JOURNEY_REHEARSAL",
      startedAt:now,startedBy:actor,
      guestName:String(input.guestName||"Pilot Guest").trim().slice(0,160),
      phone:String(input.phone||"").trim().slice(0,80),
      occasion:String(input.occasion||"").trim().slice(0,160),
      note:String(input.note||"").trim().slice(0,1200),
      checkpoints:[]
    };
    await this.database.mutate(db=>{db.reservationGuestJourneySessions||=[];db.reservationGuestJourneySessions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Reservation/guest journey rehearsal started for ${locationId}`,category:"pilot_guest_journey"});
    this.realtimeHub.publish("reservation-guest-journey:started",{organizationId,locationId,id:record.id});
    return record;
  }
  async checkpoint(organizationId,allowedLocationIds,sessionId,input,actor){
    const stage=String(input.stage||"").toUpperCase();
    if(!this.stageOrder.includes(stage))throw new Error("Invalid reservation/guest journey stage.");
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.session?.id===sessionId);
    if(!loc||loc.session.status!=="ACTIVE")throw new Error("Active reservation/guest journey rehearsal not found.");
    const state=loc.stages.find(x=>x.stage===stage);
    if(state.state==="COMPLETED")throw new Error(`${stage} is already complete.`);
    if(!state.previousComplete)throw new Error(`${stage} cannot be completed before the prior journey stage.`);
    const evidence=String(input.evidence||"").trim().slice(0,2200);
    if(!evidence)throw new Error("Human journey checkpoint evidence is required.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1800);
    if(!state.systemEvidence&&!overrideReason)throw new Error(`${stage} lacks supporting system evidence. A documented rehearsal override reason is required.`);
    const now=this.now();
    const record={
      id:`rgjc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      stage,status:"COMPLETED",completedAt:now,completedBy:actor,evidence,
      systemEvidencePresent:state.systemEvidence,
      overrideUsed:!state.systemEvidence,overrideReason,
      systemCheckSnapshot:state.checks,
      reservationMutationPerformed:false,
      guestContactPerformed:false
    };
    const updated=await this.database.mutate(db=>{
      const session=(db.reservationGuestJourneySessions||[]).find(x=>x.id===sessionId&&x.organizationId===organizationId);
      if(!session)return null;
      session.checkpoints||=[];session.checkpoints.push(record);
      if(stage==="HISTORY_CONTINUITY"){session.status="COMPLETED";session.completedAt=now;session.completedBy=actor;}
      return {...session};
    });
    if(!updated)throw new Error("Reservation/guest journey rehearsal not found.");
    await this.auditService.record({organizationId,actor,action:`Guest journey checkpoint ${stage} completed for ${updated.locationId}${record.overrideUsed?" with documented evidence-gap override":""}`,category:"pilot_guest_journey"});
    this.realtimeHub.publish("reservation-guest-journey:checkpoint",{organizationId,locationId:updated.locationId,sessionId,stage,overrideUsed:record.overrideUsed});
    return record;
  }
  async certify(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant location not found.");
    if(loc.completedStages!==this.stageOrder.length)throw new Error("All reservation/guest journey checkpoints must be completed before certification.");
    const evidence=String(input.evidence||"").trim().slice(0,2800);
    const note=String(input.note||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human end-to-end guest journey evidence is required.");
    if(!note)throw new Error("Human journey certification note is required.");
    const record={
      id:`rgjc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,
      status:"RESERVATION_GUEST_JOURNEY_CERTIFIED",
      certifiedAt:this.now(),certifiedBy:actor,evidence,note,
      completedStages:loc.completedStages,totalStages:this.stageOrder.length,
      systemEvidencePassed:loc.systemEvidencePassed,
      sessionId:loc.session?.id||null,
      reservationMutationPerformedByCertification:false,
      guestContactPerformedByCertification:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.reservationGuestJourneyCertifications||=[];db.reservationGuestJourneyCertifications.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Reservation and guest journey certified for ${locationId}`,category:"pilot_guest_journey"});
    this.realtimeHub.publish("reservation-guest-journey:certified",{organizationId,locationId,id:record.id});
    return record;
  }
}
module.exports=ReservationGuestJourneyCertificationService;
