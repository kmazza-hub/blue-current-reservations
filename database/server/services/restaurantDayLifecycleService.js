"use strict";

class RestaurantDayLifecycleService {
  constructor(database,auditService,realtimeHub,pilotOperationalReadinessService){
    Object.assign(this,{database,auditService,realtimeHub,pilotOperationalReadinessService});
    this.stageOrder=[
      "OPENING","PRE_SHIFT","RESERVATIONS","SEATING",
      "ACTIVE_SERVICE","KITCHEN_COORDINATION","GUEST_RECOVERY","CLOSING"
    ];
  }
  now(){return new Date().toISOString();}
  allowed(locationId,allowed=[]){return allowed.includes("*")||allowed.includes(locationId);}
  async sessions(organizationId){
    const db=await this.database.read();
    return (db.restaurantDayLifecycleSessions||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  }
  counts(db,organizationId,locationId){
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId)||null;
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const sections=(db.sections||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const activePeople=[
      ...(db.staff||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status==="active"),
      ...(db.employees||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status==="active")
    ];
    const kitchenStations=(db.kitchenStations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const memberships=(db.memberships||[]).filter(x=>x.organizationId===organizationId&&((x.locationIds||[]).includes("*")||(x.locationIds||[]).includes(locationId)));
    const connectors=(db.liveConnectors||[]).filter(x=>x.organizationId===organizationId&&(!x.locationId||x.locationId===locationId));
    const configuredConnectors=connectors.filter(x=>String(x.status||"").toLowerCase()!=="not-configured");
    return {location,tables,sections,reservations,activePeople,kitchenStations,memberships,configuredConnectors};
  }
  stageChecks(db,organizationId,locationId,stage,baselineLocation){
    const c=this.counts(db,organizationId,locationId);
    const reservationPath=c.reservations.length>0||c.configuredConnectors.some(x=>x.type==="reservations");
    const kitchenPath=c.kitchenStations.length>0||c.configuredConnectors.some(x=>x.type==="kitchen");
    const workforcePath=c.activePeople.length>0||c.configuredConnectors.some(x=>x.type==="labor");
    const common={locationName:c.location?.name||c.location?.displayName||locationId};
    const map={
      OPENING:[
        {id:"location",label:"Restaurant record available",passed:!!c.location,actual:c.location?.id||"missing"},
        {id:"floor",label:"Tables and sections loaded for opening",passed:c.tables.length>0&&c.sections.length>0,actual:`${c.tables.length} tables · ${c.sections.length} sections`},
        {id:"access",label:"Authorized operating access exists",passed:c.memberships.length>0,actual:`${c.memberships.length} membership(s)`}
      ],
      PRE_SHIFT:[
        {id:"workforce",label:"Active workforce is available for pre-shift",passed:workforcePath,actual:`${c.activePeople.length} active people`},
        {id:"sections",label:"Section model is available for assignments",passed:c.sections.length>0,actual:`${c.sections.length} sections`},
        {id:"baseline",label:"Restaurant is present in V51 pilot baseline",passed:!!baselineLocation,actual:baselineLocation?`${baselineLocation.readinessPercent}% baseline`:"missing"}
      ],
      RESERVATIONS:[
        {id:"reservation-path",label:"Reservation operating path is available",passed:reservationPath,actual:`${c.reservations.length} reservations · ${c.configuredConnectors.filter(x=>x.type==="reservations").length} connector(s)`},
        {id:"floor-link",label:"Floor model is available to receive reservations",passed:c.tables.length>0,actual:`${c.tables.length} tables`}
      ],
      SEATING:[
        {id:"floor",label:"Floor/table model is active for seating",passed:c.tables.length>0&&c.sections.length>0,actual:`${c.tables.length} tables · ${c.sections.length} sections`},
        {id:"reservation-context",label:"Reservation context is available at the host stand",passed:reservationPath,actual:`${c.reservations.length} reservations`}
      ],
      ACTIVE_SERVICE:[
        {id:"floor",label:"Dining-room model is available during service",passed:c.tables.length>0,actual:`${c.tables.length} tables`},
        {id:"workforce",label:"Active service workforce is available",passed:workforcePath,actual:`${c.activePeople.length} active people`},
        {id:"sections",label:"Service sections are configured",passed:c.sections.length>0,actual:`${c.sections.length} sections`}
      ],
      KITCHEN_COORDINATION:[
        {id:"kitchen",label:"Kitchen stations or kitchen connector are available",passed:kitchenPath,actual:`${c.kitchenStations.length} stations · ${c.configuredConnectors.filter(x=>x.type==="kitchen").length} connector(s)`},
        {id:"service-context",label:"Restaurant service context exists",passed:c.tables.length>0&&workforcePath,actual:`${c.tables.length} tables · ${c.activePeople.length} active people`}
      ],
      GUEST_RECOVERY:[
        {id:"guest-context",label:"Guest/reservation context is available for recovery",passed:reservationPath,actual:`${c.reservations.length} reservations`},
        {id:"operator-access",label:"Authorized operator access exists for recovery documentation",passed:c.memberships.length>0,actual:`${c.memberships.length} membership(s)`}
      ],
      CLOSING:[
        {id:"restaurant-context",label:"Restaurant operating context remains available for closeout",passed:!!c.location,actual:c.location?.id||"missing"},
        {id:"workforce-context",label:"Workforce context is available for closing verification",passed:workforcePath,actual:`${c.activePeople.length} active people`}
      ]
    };
    return {checks:map[stage]||[],...common};
  }
  async snapshot(organizationId,allowedLocationIds){
    const [db,baseline,sessions]=await Promise.all([
      this.database.read(),
      this.pilotOperationalReadinessService.snapshot(organizationId,allowedLocationIds),
      this.sessions(organizationId)
    ]);
    const baselineMap=new Map((baseline.locations||[]).map(x=>[x.locationId,x]));
    const inScope=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds));
    const locations=inScope.map(loc=>{
      const session=sessions.find(x=>x.locationId===loc.id&&x.status==="ACTIVE")||
        sessions.find(x=>x.locationId===loc.id)||null;
      const checkpoints=session?.checkpoints||[];
      const completed=new Set(checkpoints.filter(x=>x.status==="COMPLETED").map(x=>x.stage));
      const stages=this.stageOrder.map((stage,index)=>{
        const evaluated=this.stageChecks(db,organizationId,loc.id,stage,baselineMap.get(loc.id));
        const prerequisitesPassed=evaluated.checks.every(x=>x.passed);
        const priorStage=index===0?null:this.stageOrder[index-1];
        const previousComplete=!priorStage||completed.has(priorStage);
        const checkpoint=checkpoints.filter(x=>x.stage===stage).slice(-1)[0]||null;
        const complete=checkpoint?.status==="COMPLETED";
        return {
          stage,index:index+1,label:stage.replaceAll("_"," "),
          prerequisitesPassed,previousComplete,
          state:complete?"COMPLETED":!session?"SESSION_REQUIRED":previousComplete&&prerequisitesPassed?"READY_FOR_CHECKPOINT":previousComplete?"BLOCKED":"WAITING_FOR_PRIOR_STAGE",
          checks:evaluated.checks,
          blockerCount:evaluated.checks.filter(x=>!x.passed).length,
          checkpoint
        };
      });
      const completedCount=stages.filter(x=>x.state==="COMPLETED").length;
      const nextStage=stages.find(x=>x.state!=="COMPLETED")||null;
      return {
        locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,
        pilotBaseline:baselineMap.get(loc.id)||null,
        session,
        stages,
        completedStages:completedCount,totalStages:this.stageOrder.length,
        lifecyclePercent:Math.round(completedCount/this.stageOrder.length*100),
        nextStage:nextStage?.stage||null,
        lifecycleState:completedCount===this.stageOrder.length?"DAY_LIFECYCLE_COMPLETE":session?.status==="ACTIVE"?"DAY_LIFECYCLE_ACTIVE":"DAY_LIFECYCLE_NOT_STARTED"
      };
    });
    return {
      version:"51.10.0",generatedAt:this.now(),
      status:locations.length===0?"restaurant-required":locations.every(x=>x.lifecycleState==="DAY_LIFECYCLE_COMPLETE")?"restaurant-day-certified":locations.some(x=>x.lifecycleState==="DAY_LIFECYCLE_ACTIVE")?"restaurant-day-in-progress":"restaurant-day-ready-for-rehearsal",
      headline:locations.length===0?"No authorized restaurant locations are available for day-lifecycle testing.":`${locations.filter(x=>x.lifecycleState==="DAY_LIFECYCLE_COMPLETE").length}/${locations.length} restaurant day lifecycle(s) have completed all eight human-recorded checkpoints.`,
      stageOrder:this.stageOrder,
      locations,
      baselineStatus:baseline.status,
      policy:{
        rehearsalAllowedBeforePilotGo:true,
        checkpointEvidenceHumanRecorded:true,
        stageOrderEnforced:true,
        prerequisiteOverrideRequiresReason:true,
        operationalModulesNotMutated:true,
        automaticStageCompletion:false,
        automaticOperationalActions:false,
        autonomousProductionChanges:false
      }
    };
  }
  async start(organizationId,allowedLocationIds,locationId,input,actor){
    if(!this.allowed(locationId,allowedLocationIds))throw new Error("Location is outside your authorized scope.");
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant location not found.");
    if(loc.session?.status==="ACTIVE")throw new Error("An active restaurant-day lifecycle session already exists.");
    const now=this.now();
    const record={
      id:`rdl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,
      mode:loc.pilotBaseline?.pilotReady===true?"PILOT_OPERATING_REHEARSAL":"PILOT_READINESS_REHEARSAL",
      status:"ACTIVE",startedAt:now,startedBy:actor,
      serviceDate:String(input.serviceDate||now.slice(0,10)).slice(0,20),
      shiftLabel:String(input.shiftLabel||"Dinner").trim().slice(0,80),
      manager:String(input.manager||actor||"").trim().slice(0,160),
      note:String(input.note||"").trim().slice(0,1000),
      checkpoints:[]
    };
    await this.database.mutate(db=>{db.restaurantDayLifecycleSessions||=[];db.restaurantDayLifecycleSessions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Restaurant-day lifecycle rehearsal started for ${locationId}: ${record.shiftLabel}`,category:"pilot_operations"});
    this.realtimeHub.publish("restaurant-day:started",{id:record.id,organizationId,locationId,mode:record.mode});
    return record;
  }
  async checkpoint(organizationId,allowedLocationIds,sessionId,input,actor){
    const stage=String(input.stage||"").toUpperCase();
    if(!this.stageOrder.includes(stage))throw new Error("Invalid restaurant-day lifecycle stage.");
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.session?.id===sessionId);
    if(!loc)throw new Error("Active restaurant-day lifecycle session not found.");
    if(loc.session.status!=="ACTIVE")throw new Error("Restaurant-day lifecycle session is not active.");
    const stageState=loc.stages.find(x=>x.stage===stage);
    if(stageState.state==="COMPLETED")throw new Error(`${stage} is already complete.`);
    if(!stageState.previousComplete)throw new Error(`${stage} cannot be completed before the prior lifecycle stage.`);
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1500);
    if(!stageState.prerequisitesPassed&&!overrideReason)throw new Error(`${stage} has open prerequisites. A documented rehearsal override reason is required.`);
    const evidence=String(input.evidence||"").trim().slice(0,1800);
    if(!evidence)throw new Error("Human-recorded checkpoint evidence is required.");
    const now=this.now();
    const record={
      id:`rdc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      stage,status:"COMPLETED",completedAt:now,completedBy:actor,
      evidence,
      overrideUsed:!stageState.prerequisitesPassed,overrideReason,
      prerequisiteSnapshot:{passed:stageState.checks.filter(x=>x.passed).length,total:stageState.checks.length,checks:stageState.checks},
      operationalMutationPerformed:false
    };
    const updated=await this.database.mutate(db=>{
      const session=(db.restaurantDayLifecycleSessions||[]).find(x=>x.id===sessionId&&x.organizationId===organizationId);
      if(!session)return null;
      session.checkpoints||=[];session.checkpoints.push(record);
      if(stage==="CLOSING"){
        session.status="COMPLETED";session.completedAt=now;session.completedBy=actor;
      }
      return {...session};
    });
    if(!updated)throw new Error("Restaurant-day lifecycle session not found.");
    await this.auditService.record({organizationId,actor,action:`Restaurant-day checkpoint ${stage} completed for ${updated.locationId}${record.overrideUsed?" with documented rehearsal override":""}`,category:"pilot_operations"});
    this.realtimeHub.publish("restaurant-day:checkpoint",{sessionId,organizationId,locationId:updated.locationId,stage,overrideUsed:record.overrideUsed});
    return record;
  }
}
module.exports=RestaurantDayLifecycleService;
