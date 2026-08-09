"use strict";

class RestaurantWorkflowIntegrationService {
  constructor(database,auditService,realtimeHub,restaurantDayLifecycleService,reservationGuestJourneyCertificationService,liveFloorServiceCertificationService,operatorUxHardeningService){
    Object.assign(this,{database,auditService,realtimeHub,restaurantDayLifecycleService,reservationGuestJourneyCertificationService,liveFloorServiceCertificationService,operatorUxHardeningService});
    this.workflowOrder=["OPENING","RESERVATION","ARRIVAL","SEATING","ACTIVE_SERVICE","KITCHEN","GUEST_RECOVERY","CLOSEOUT"];
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async observations(org){
    const db=await this.database.read();
    return (db.restaurantWorkflowIntegrationObservations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));
  }
  async certifications(org){
    const db=await this.database.read();
    return (db.restaurantWorkflowIntegrationCertifications||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  model(db,org,locationId){
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const tables=(db.tables||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const seatingEvents=(db.seatingEvents||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const serviceFlows=(db.serviceFlows||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const serviceEvents=(db.serviceEvents||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const kitchenTickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const kitchenEvents=(db.kitchenEvents||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const guestRecovery=(db.guestRecoveryCases||db.guestRecovery||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const closeouts=(db.shiftCloseouts||db.restaurantDayCloseouts||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
    const arrivals=reservations.filter(x=>["arrived","checked_in","seated","completed"].includes(String(x.status||"").toLowerCase()));
    const seated=reservations.filter(x=>x.tableId||["seated","completed"].includes(String(x.status||"").toLowerCase()));
    return {reservations,tables,waitlist,seatingEvents,serviceFlows,serviceEvents,kitchenTickets,kitchenEvents,guestRecovery,closeouts,arrivals,seated};
  }
  systemChecks(m){
    return [
      {id:"OPENING_CONTEXT",label:"Opening/shift operating context exists",passed:m.tables.length>0,actual:`${m.tables.length} table(s)`},
      {id:"RESERVATION_CONTEXT",label:"Reservation workflow has authoritative records",passed:m.reservations.length>0,actual:`${m.reservations.length} reservation(s)`},
      {id:"ARRIVAL_CONTEXT",label:"Guest arrival/check-in can be evidenced",passed:m.arrivals.length>0||m.waitlist.length>0,actual:`${m.arrivals.length} arrival(s) · ${m.waitlist.length} waitlist record(s)`},
      {id:"SEATING_CONTEXT",label:"Seating/table linkage can be evidenced",passed:m.seated.length>0||m.seatingEvents.length>0,actual:`${m.seated.length} seated reservation(s) · ${m.seatingEvents.length} seating event(s)`},
      {id:"SERVICE_CONTEXT",label:"Active-service continuity exists",passed:m.serviceFlows.length>0||m.serviceEvents.length>0,actual:`${m.serviceFlows.length} flow(s) · ${m.serviceEvents.length} event(s)`},
      {id:"KITCHEN_CONTEXT",label:"Kitchen workflow has authoritative records",passed:m.kitchenTickets.length>0||m.kitchenEvents.length>0,actual:`${m.kitchenTickets.length} ticket(s) · ${m.kitchenEvents.length} event(s)`},
      {id:"GUEST_RECOVERY_CONTEXT",label:"Guest-recovery path is available for exceptions",passed:true,actual:`${m.guestRecovery.length} recorded recovery case(s); workflow available`},
      {id:"CLOSEOUT_CONTEXT",label:"Shift closeout is represented in operating workflow",passed:true,actual:`${m.closeouts.length} recorded closeout(s); closeout workflow available`}
    ];
  }
  async snapshot(org,allowed){
    const [db,day,reservationJourney,floor,ux,observations,certs]=await Promise.all([
      this.database.read(),
      this.restaurantDayLifecycleService.snapshot(org,allowed),
      this.reservationGuestJourneyCertificationService.snapshot(org,allowed),
      this.liveFloorServiceCertificationService.snapshot(org,allowed),
      this.operatorUxHardeningService.snapshot(org,allowed),
      this.observations(org),this.certifications(org)
    ]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===org&&this.allowed(x.id,allowed)).map(loc=>{
      const m=this.model(db,org,loc.id);
      const system=this.systemChecks(m);
      const human=observations.filter(x=>x.locationId===loc.id);
      const latest=human[0]||null;
      const openFindings=human.flatMap(x=>x.findings||[]).filter(x=>x.status!=="RESOLVED");
      const highCritical=openFindings.filter(x=>["high","critical"].includes(String(x.severity).toLowerCase()));
      const certification=certs.find(x=>x.locationId===loc.id)||null;
      const dayLoc=(day.locations||[]).find(x=>x.locationId===loc.id)||null;
      const reservationLoc=(reservationJourney.locations||[]).find(x=>x.locationId===loc.id)||null;
      const floorLoc=(floor.locations||[]).find(x=>x.locationId===loc.id)||null;
      const checks=[
        ...system,
        {id:"DAY_LIFECYCLE_LINK",label:"Restaurant-day lifecycle is integrated",passed:!!dayLoc,actual:dayLoc?.dayState||dayLoc?.state||"not available"},
        {id:"RESERVATION_JOURNEY_LINK",label:"Reservation/guest-journey certification layer is integrated",passed:!!reservationLoc,actual:reservationLoc?.guestJourneyState||reservationLoc?.reservationState||"available"},
        {id:"LIVE_FLOOR_LINK",label:"Live floor/service certification layer is integrated",passed:!!floorLoc,actual:floorLoc?.floorServiceState||"available"},
        {id:"OPERATOR_UX_LINK",label:"Operator UX hardening remains active",passed:!["operator-ux-hardening-required"].includes(ux.status),actual:ux.status},
        {id:"HUMAN_END_TO_END_OBSERVATION",label:"Human end-to-end restaurant workflow observation is recorded",passed:!!latest,actual:latest?.observedAt||"not observed"},
        {id:"HANDOFF_CONTINUITY",label:"Reservation → seating → service → kitchen handoffs were verified",passed:latest?.handoffContinuity==="PASS",actual:latest?.handoffContinuity||"not assessed"},
        {id:"OPERATOR_FRICTION",label:"No unresolved high/critical operator-friction finding",passed:highCritical.length===0,actual:`${highCritical.length} high/critical finding(s)`},
        {id:"SERVICE_FAILURE_RECOVERY",label:"Failure/recovery path was reviewed by an operator",passed:!!latest?.failureRecoveryEvidence,actual:latest?.failureRecoveryEvidence?"recorded":"not assessed"},
        {id:"SHIFT_COMPLETION",label:"End-to-end shift completion was reviewed",passed:latest?.shiftCompletion==="PASS",actual:latest?.shiftCompletion||"not assessed"}
      ];
      return {
        locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,
        checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
        workflowReady:checks.every(x=>x.passed),
        systemEvidence:system,humanObservations:human.slice(0,10),latestObservation:latest,
        openFindings,highCriticalFindings:highCritical,certification,
        linkedStates:{dayLifecycle:dayLoc?.dayState||dayLoc?.state||null,reservationJourney:reservationLoc?.guestJourneyState||reservationLoc?.reservationState||null,liveFloor:floorLoc?.floorServiceState||null,operatorUx:ux.status},
        state:certification?.status==="RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED"?"WORKFLOW_CERTIFIED":latest?"WORKFLOW_OBSERVED":"WORKFLOW_OBSERVATION_REQUIRED"
      };
    });
    return {
      version:"53.25.0",generatedAt:this.now(),
      status:locations.some(x=>x.certification?.status==="RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED")?"restaurant-workflow-integration-certified":locations.some(x=>x.latestObservation)?"restaurant-workflow-integration-in-review":"restaurant-workflow-observation-required",
      headline:`${locations.filter(x=>x.workflowReady).length}/${locations.length} location(s) satisfy end-to-end restaurant workflow gates; ${locations.reduce((n,x)=>n+x.highCriticalFindings.length,0)} high/critical friction finding(s).`,
      workflowOrder:this.workflowOrder,locations,
      policy:{
        existingWorkflowBehaviorPreserved:true,
        endToEndHumanObservationRequired:true,
        handoffContinuityRequired:true,
        failureRecoveryReviewRequired:true,
        operatorFrictionMustRemainVisible:true,
        humanWorkflowCertificationRequired:true,
        certificationDoesNotExecuteRestaurantActions:true,
        noAutomaticReservationMutation:true,
        noAutomaticSeatingMutation:true,
        noAutomaticKitchenMutation:true,
        autonomousProductionChanges:false
      }
    };
  }
  async observe(org,allowed,locationId,input,actor){
    if(!this.allowed(locationId,allowed))throw new Error("Location is outside your authorized scope.");
    const handoff=String(input.handoffContinuity||"").toUpperCase(),completion=String(input.shiftCompletion||"").toUpperCase();
    if(!["PASS","FAIL"].includes(handoff))throw new Error("handoffContinuity must be PASS or FAIL.");
    if(!["PASS","FAIL"].includes(completion))throw new Error("shiftCompletion must be PASS or FAIL.");
    const failureRecoveryEvidence=String(input.failureRecoveryEvidence||"").trim();
    const operatorEvidence=String(input.operatorEvidence||"").trim();
    if(!failureRecoveryEvidence||!operatorEvidence)throw new Error("Failure/recovery evidence and operator evidence are required.");
    const findings=(Array.isArray(input.findings)?input.findings:[]).map((x,i)=>({
      id:String(x.id||`finding_${i+1}`),workflow:String(x.workflow||"GENERAL").toUpperCase(),
      severity:String(x.severity||"medium").toLowerCase(),issue:String(x.issue||"").trim().slice(0,1800),
      status:String(x.status||"OPEN").toUpperCase()
    })).filter(x=>x.issue);
    const record={
      id:`rwi_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,
      observedAt:this.now(),observedBy:actor,handoffContinuity:handoff,shiftCompletion:completion,
      failureRecoveryEvidence:failureRecoveryEvidence.slice(0,3500),operatorEvidence:operatorEvidence.slice(0,3500),
      findings,note:String(input.note||"").trim().slice(0,2200),
      reservationMutatedByObservation:false,seatingMutatedByObservation:false,kitchenMutatedByObservation:false
    };
    await this.database.mutate(db=>{db.restaurantWorkflowIntegrationObservations||=[];db.restaurantWorkflowIntegrationObservations.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`End-to-end restaurant workflow observation recorded for ${locationId}`,category:"restaurant_workflow_integration"});
    this.realtimeHub.publish("restaurant-workflow-integration:observed",{organizationId:org,locationId,id:record.id});
    return record;
  }
  async certify(org,allowed,locationId,input,actor){
    const state=await this.snapshot(org,allowed),loc=state.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location not found.");
    if(!loc.workflowReady)throw new Error("All restaurant workflow integration gates must pass before certification.");
    const evidence=String(input.evidence||"").trim(),note=String(input.note||"").trim();
    if(!evidence||!note)throw new Error("Human certification evidence and note are required.");
    const record={
      id:`rwic_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,locationId,locationName:loc.locationName,
      status:"RESTAURANT_WORKFLOW_INTEGRATION_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,
      evidence:evidence.slice(0,4000),note:note.slice(0,2200),gateSnapshot:loc.checks,
      restaurantActionsExecutedByCertification:false,workflowRedesignedByCertification:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.restaurantWorkflowIntegrationCertifications||=[];db.restaurantWorkflowIntegrationCertifications.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Restaurant workflow integration certified for ${locationId}; no restaurant action executed`,category:"restaurant_workflow_integration"});
    this.realtimeHub.publish("restaurant-workflow-integration:certified",{organizationId:org,locationId,id:record.id});
    return record;
  }
}
module.exports=RestaurantWorkflowIntegrationService;
