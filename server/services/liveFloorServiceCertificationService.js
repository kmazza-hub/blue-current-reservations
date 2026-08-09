"use strict";
class LiveFloorServiceCertificationService {
  constructor(database,auditService,realtimeHub,reservationGuestJourneyCertificationService){Object.assign(this,{database,auditService,realtimeHub,reservationGuestJourneyCertificationService});this.stageOrder=["TABLE_STATE","OCCUPANCY","SECTION_SERVER_ASSIGNMENT","RESERVATION_TABLE_LINKAGE","WAITLIST_TABLE_LINKAGE","TABLE_TURNS_RESET","SERVICE_TIMING","GUEST_MOVEMENT","SEATING_PRESSURE","SERVICE_EVENT_CONTINUITY"];}
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async sessions(organizationId){const db=await this.database.read();return (db.liveFloorServiceCertificationSessions||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));}
  async certifications(organizationId){const db=await this.database.read();return (db.liveFloorServiceCertifications||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));}
  model(db,organizationId,locationId){
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const sections=(db.sections||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const staff=(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const seatingEvents=(db.seatingEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const serviceFlows=(db.serviceFlows||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const serviceEvents=(db.serviceEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const occupied=tables.filter(x=>["seated","occupied"].includes(String(x.status||"").toLowerCase()));
    const available=tables.filter(x=>["available","open"].includes(String(x.status||"").toLowerCase()));
    const resetting=tables.filter(x=>["dirty","cleaning","resetting"].includes(String(x.status||"").toLowerCase()));
    const linkedReservations=reservations.filter(r=>r.tableId&&tables.some(t=>t.id===r.tableId));
    const seatedWaitlist=waitlist.filter(w=>w.status==="seated"&&w.tableId&&tables.some(t=>t.id===w.tableId));
    const assignedTables=tables.filter(t=>String(t.section||t.sectionId||"").trim()&&String(t.server||t.serverId||"").trim());
    const timedFlows=serviceFlows.filter(f=>f.seatedAt||f.readyAt||f.deliveredAt||f.updatedAt);
    return {tables,sections,staff,reservations,waitlist,seatingEvents,serviceFlows,serviceEvents,occupied,available,resetting,linkedReservations,seatedWaitlist,assignedTables,timedFlows};
  }
  stageChecks(m,stage){
    const capacity=m.tables.reduce((n,t)=>n+Number(t.seats||0),0),occupiedSeats=m.occupied.reduce((n,t)=>n+Number(t.partySize||0),0),occupancyPct=capacity?Math.round(occupiedSeats/capacity*100):0;
    const tableStates=new Set(m.tables.map(t=>String(t.status||"").toLowerCase()).filter(Boolean));
    const movementEvents=[...m.seatingEvents,...m.serviceEvents].filter(e=>/seat|table|guest|flow|deliver|course/i.test(`${e.type||""} ${e.summary||""}`));
    const turnEvidence=[...m.seatingEvents,...m.serviceEvents].filter(e=>/clear|clean|reset|turn|available/i.test(`${e.type||""} ${e.summary||""}`));
    const pressureEvidence=m.waitlist.some(w=>w.status==="waiting")||occupancyPct>=70;
    const map={
      TABLE_STATE:[{id:"tables",label:"Floor has authoritative table records",passed:m.tables.length>0,actual:`${m.tables.length} tables`},{id:"states",label:"Table status values are present",passed:tableStates.size>0,actual:`${tableStates.size} distinct state(s)`}],
      OCCUPANCY:[{id:"capacity",label:"Seat capacity can be calculated",passed:capacity>0,actual:`${capacity} seats`},{id:"occupancy",label:"Occupancy can be calculated from current table state",passed:m.tables.length>0,actual:`${occupiedSeats}/${capacity||0} occupied seats · ${occupancyPct}%`}],
      SECTION_SERVER_ASSIGNMENT:[{id:"sections",label:"Section structure exists",passed:m.sections.length>0,actual:`${m.sections.length} section(s)`},{id:"assignments",label:"Tables carry section/server assignment context",passed:m.assignedTables.length>0,actual:`${m.assignedTables.length}/${m.tables.length} assigned table(s)`}],
      RESERVATION_TABLE_LINKAGE:[{id:"reservation-link",label:"Reservation-to-table linkage exists",passed:m.linkedReservations.length>0,actual:`${m.linkedReservations.length}/${m.reservations.length} linked reservation(s)`}],
      WAITLIST_TABLE_LINKAGE:[{id:"waitlist",label:"Waitlist operating context exists",passed:m.waitlist.length>0,actual:`${m.waitlist.length} waitlist record(s)`},{id:"waitlist-seat",label:"Waitlist-to-table seating linkage exists",passed:m.seatedWaitlist.length>0||m.seatingEvents.some(e=>e.type==="waitlist.seated"),actual:`${m.seatedWaitlist.length} linked seated waitlist · ${m.seatingEvents.filter(e=>e.type==="waitlist.seated").length} seating event(s)`}],
      TABLE_TURNS_RESET:[{id:"reset-context",label:"Table reset/turn evidence exists",passed:m.resetting.length>0||turnEvidence.length>0||m.available.length>0,actual:`${m.resetting.length} resetting · ${m.available.length} available · ${turnEvidence.length} reset/turn event(s)`}],
      SERVICE_TIMING:[{id:"service-flow",label:"Service flow records exist",passed:m.serviceFlows.length>0,actual:`${m.serviceFlows.length} service flow(s)`},{id:"timing",label:"Service timing timestamps exist",passed:m.timedFlows.length>0,actual:`${m.timedFlows.length} timed flow(s)`}],
      GUEST_MOVEMENT:[{id:"movement",label:"Guest/table movement event continuity exists",passed:movementEvents.length>0,actual:`${movementEvents.length} movement-related event(s)`}],
      SEATING_PRESSURE:[{id:"pressure",label:"Seating-pressure context can be observed",passed:pressureEvidence,actual:`${m.waitlist.filter(w=>w.status==="waiting").length} waiting · ${occupancyPct}% occupancy`}],
      SERVICE_EVENT_CONTINUITY:[{id:"events",label:"Live service event history exists",passed:m.serviceEvents.length>0,actual:`${m.serviceEvents.length} service event(s)`}]
    };return map[stage]||[];
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,guestJourney,sessions,certs]=await Promise.all([this.database.read(),this.reservationGuestJourneyCertificationService.snapshot(organizationId,allowedLocationIds),this.sessions(organizationId),this.certifications(organizationId)]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds)).map(loc=>{
      const m=this.model(db,organizationId,loc.id),session=sessions.find(x=>x.locationId===loc.id&&x.status==="ACTIVE")||sessions.find(x=>x.locationId===loc.id)||null,certification=certs.find(x=>x.locationId===loc.id)||null;
      const completed=new Set((session?.checkpoints||[]).filter(x=>x.status==="COMPLETED").map(x=>x.stage));
      const stages=this.stageOrder.map((stage,index)=>{const checks=this.stageChecks(m,stage),systemEvidence=checks.every(x=>x.passed),previous=index===0||completed.has(this.stageOrder[index-1]),checkpoint=(session?.checkpoints||[]).filter(x=>x.stage===stage).slice(-1)[0]||null,complete=checkpoint?.status==="COMPLETED";return{stage,index:index+1,label:stage.replaceAll("_"," "),checks,systemEvidence,previousComplete:previous,checkpoint,state:complete?"COMPLETED":!session?"SESSION_REQUIRED":!previous?"WAITING_FOR_PRIOR_STAGE":systemEvidence?"READY_FOR_CHECKPOINT":"EVIDENCE_GAP"};});
      const systemEvidencePassed=stages.filter(x=>x.systemEvidence).length,completedStages=stages.filter(x=>x.state==="COMPLETED").length,capacity=m.tables.reduce((n,t)=>n+Number(t.seats||0),0),occupiedSeats=m.occupied.reduce((n,t)=>n+Number(t.partySize||0),0);
      return{locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,session,certification,stages,systemEvidencePassed,completedStages,totalStages:this.stageOrder.length,floorSummary:{tables:m.tables.length,sections:m.sections.length,staff:m.staff.length,capacity,occupiedTables:m.occupied.length,occupiedSeats,occupancyPercent:capacity?Math.round(occupiedSeats/capacity*100):0,reservations:m.reservations.length,linkedReservations:m.linkedReservations.length,waitlist:m.waitlist.length,serviceFlows:m.serviceFlows.length,serviceEvents:m.serviceEvents.length},floorServiceState:certification?.status==="LIVE_FLOOR_SERVICE_CERTIFIED"?"FLOOR_SERVICE_CERTIFIED":completedStages===this.stageOrder.length?"READY_FOR_CERTIFICATION":session?.status==="ACTIVE"?"FLOOR_SERVICE_REHEARSAL_ACTIVE":"FLOOR_SERVICE_REHEARSAL_NOT_STARTED"};
    });
    const total=locations.length*this.stageOrder.length;
    return{version:"51.40.0",generatedAt:this.now(),status:locations.length===0?"restaurant-required":locations.every(x=>x.floorServiceState==="FLOOR_SERVICE_CERTIFIED")?"live-floor-service-certified":locations.some(x=>x.floorServiceState==="FLOOR_SERVICE_REHEARSAL_ACTIVE")?"live-floor-service-in-progress":"live-floor-service-ready",headline:`${locations.reduce((n,x)=>n+x.systemEvidencePassed,0)}/${total} floor/service stages have supporting system evidence; ${locations.reduce((n,x)=>n+x.completedStages,0)}/${total} have human checkpoint evidence.`,stageOrder:this.stageOrder,locations,guestJourneyStatus:guestJourney.status,policy:{existingFloorServiceReused:true,tableStateReadOnlyForCertification:true,occupancyDerivedFromAuthoritativeState:true,humanCheckpointEvidenceRequired:true,evidenceGapOverrideRequiresReason:true,stageOrderEnforced:true,certificationHumanRequired:true,noSyntheticFloorPass:true,noAutomaticTableMutation:true,noAutomaticGuestMovement:true,autonomousProductionChanges:false}};
  }
  async start(organizationId,allowedLocationIds,locationId,input,actor){
    if(!this.allowed(locationId,allowedLocationIds))throw new Error("Location is outside your authorized scope.");
    const snap=await this.snapshot(organizationId,allowedLocationIds),loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant location not found.");if(loc.session?.status==="ACTIVE")throw new Error("An active live-floor/service rehearsal already exists.");
    const now=this.now(),record={id:`lfsc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,locationName:loc.locationName,status:"ACTIVE",mode:"CONTROLLED_FLOOR_SERVICE_REHEARSAL",startedAt:now,startedBy:actor,shiftLabel:String(input.shiftLabel||"Dinner").trim().slice(0,80),manager:String(input.manager||actor||"").trim().slice(0,160),targetOccupancyPercent:Math.max(0,Math.min(Number(input.targetOccupancyPercent)||85,100)),note:String(input.note||"").trim().slice(0,1200),checkpoints:[]};
    await this.database.mutate(db=>{db.liveFloorServiceCertificationSessions||=[];db.liveFloorServiceCertificationSessions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Live floor/service rehearsal started for ${locationId}`,category:"pilot_floor_service"});this.realtimeHub.publish("live-floor-service:started",{organizationId,locationId,id:record.id});return record;
  }
  async checkpoint(organizationId,allowedLocationIds,sessionId,input,actor){
    const stage=String(input.stage||"").toUpperCase();if(!this.stageOrder.includes(stage))throw new Error("Invalid live floor/service stage.");
    const snap=await this.snapshot(organizationId,allowedLocationIds),loc=snap.locations.find(x=>x.session?.id===sessionId);if(!loc||loc.session.status!=="ACTIVE")throw new Error("Active live floor/service rehearsal not found.");
    const state=loc.stages.find(x=>x.stage===stage);if(state.state==="COMPLETED")throw new Error(`${stage} is already complete.`);if(!state.previousComplete)throw new Error(`${stage} cannot be completed before the prior floor/service stage.`);
    const evidence=String(input.evidence||"").trim().slice(0,2400);if(!evidence)throw new Error("Human floor/service checkpoint evidence is required.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1800);if(!state.systemEvidence&&!overrideReason)throw new Error(`${stage} lacks supporting system evidence. A documented rehearsal override reason is required.`);
    const now=this.now(),record={id:`lfscp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,stage,status:"COMPLETED",completedAt:now,completedBy:actor,evidence,systemEvidencePresent:state.systemEvidence,overrideUsed:!state.systemEvidence,overrideReason,systemCheckSnapshot:state.checks,tableMutationPerformed:false,guestMovementPerformed:false};
    const updated=await this.database.mutate(db=>{const session=(db.liveFloorServiceCertificationSessions||[]).find(x=>x.id===sessionId&&x.organizationId===organizationId);if(!session)return null;session.checkpoints||=[];session.checkpoints.push(record);if(stage==="SERVICE_EVENT_CONTINUITY"){session.status="COMPLETED";session.completedAt=now;session.completedBy=actor;}return{...session};});
    if(!updated)throw new Error("Live floor/service rehearsal not found.");await this.auditService.record({organizationId,actor,action:`Floor/service checkpoint ${stage} completed for ${updated.locationId}${record.overrideUsed?" with documented evidence-gap override":""}`,category:"pilot_floor_service"});this.realtimeHub.publish("live-floor-service:checkpoint",{organizationId,locationId:updated.locationId,sessionId,stage,overrideUsed:record.overrideUsed});return record;
  }
  async certify(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds),loc=snap.locations.find(x=>x.locationId===locationId);if(!loc)throw new Error("Restaurant location not found.");if(loc.completedStages!==this.stageOrder.length)throw new Error("All live floor/service checkpoints must be completed before certification.");
    const evidence=String(input.evidence||"").trim().slice(0,3000),note=String(input.note||"").trim().slice(0,1800);if(!evidence)throw new Error("Human live-floor/service certification evidence is required.");if(!note)throw new Error("Human floor/service certification note is required.");
    const record={id:`lfscert_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,locationName:loc.locationName,status:"LIVE_FLOOR_SERVICE_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,evidence,note,completedStages:loc.completedStages,totalStages:this.stageOrder.length,systemEvidencePassed:loc.systemEvidencePassed,sessionId:loc.session?.id||null,tableMutationPerformedByCertification:false,guestMovementPerformedByCertification:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.liveFloorServiceCertifications||=[];db.liveFloorServiceCertifications.push(record);return record;});await this.auditService.record({organizationId,actor,action:`Live floor and service certified for ${locationId}`,category:"pilot_floor_service"});this.realtimeHub.publish("live-floor-service:certified",{organizationId,locationId,id:record.id});return record;
  }
}
module.exports=LiveFloorServiceCertificationService;
