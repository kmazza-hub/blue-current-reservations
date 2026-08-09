"use strict";

class PilotExecutionObservationService {
  constructor(database,auditService,realtimeHub,pilotLaunchControlService){
    Object.assign(this,{database,auditService,realtimeHub,pilotLaunchControlService});
    this.milestones=[
      "PILOT_START",
      "FIRST_OPERATOR_LOGIN",
      "FIRST_RESERVATION_WORKFLOW",
      "FIRST_SEATING_WORKFLOW",
      "FIRST_SERVICE_FLOW",
      "FIRST_KITCHEN_WORKFLOW",
      "SUPPORT_BRIDGE_ACTIVE"
    ];
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async sessions(org){
    const db=await this.database.read();
    return (db.pilotExecutionSessions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  }
  async observations(org){
    const db=await this.database.read();
    return (db.pilotExecutionObservations||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.observedAt)-new Date(a.observedAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.pilotExecutionDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  async snapshot(org,allowed){
    const [launch,sessions,observations,decisions]=await Promise.all([
      this.pilotLaunchControlService.snapshot(org,allowed),
      this.sessions(org),this.observations(org),this.decisions(org)
    ]);
    const locations=(launch.locations||[]).map(loc=>{
      const session=sessions.find(x=>x.locationId===loc.locationId&&x.status==="ACTIVE")||sessions.find(x=>x.locationId===loc.locationId)||null;
      const history=observations.filter(x=>x.locationId===loc.locationId);
      const latest=history[0]||null;
      const decision=decisions.find(x=>x.locationId===loc.locationId)||null;
      const completed=new Set(session?.milestones?.filter(x=>x.status==="CONFIRMED").map(x=>x.milestone)||[]);
      const milestoneState=this.milestones.map(m=>({milestone:m,status:completed.has(m)?"CONFIRMED":"OPEN"}));
      const incidents=history.filter(x=>["high","critical"].includes(x.severity));
      const latestHealthy=!!latest&&Object.values(latest.health||{}).every(Boolean);
      const allMilestones=milestoneState.every(x=>x.status==="CONFIRMED");
      return {
        locationId:loc.locationId,locationName:loc.locationName,
        launchAuthorization:loc.authorization||null,
        launchReady:loc.launchReady,
        session,milestones:milestoneState,
        confirmedMilestones:milestoneState.filter(x=>x.status==="CONFIRMED").length,
        totalMilestones:this.milestones.length,
        observations:history,latestObservation:latest,
        highCriticalIncidents:incidents.length,
        currentDecision:decision,
        executionReady:loc.authorization?.status==="PILOT_LAUNCH_AUTHORIZED",
        continueEligible:!!session&&session.status==="ACTIVE"&&allMilestones&&latestHealthy&&incidents.length===0,
        executionState:decision?.decision||session?.status||"NOT_STARTED"
      };
    });
    return {
      version:"51.60.0",generatedAt:this.now(),
      status:locations.some(x=>x.session?.status==="ACTIVE")?"pilot-execution-observing":locations.some(x=>x.currentDecision?.decision==="CONTINUE")?"pilot-execution-continue-approved":"pilot-execution-awaiting-start",
      headline:`${locations.filter(x=>x.session?.status==="ACTIVE").length} active pilot execution session(s); ${locations.reduce((n,x)=>n+x.highCriticalIncidents,0)} high/critical incident observation(s).`,
      locations,
      policy:{
        launchAuthorizationRequired:true,
        explicitHumanStartRecordRequired:true,
        milestoneEvidenceRequired:true,
        liveHealthObservationRequired:true,
        humanContinueHoldRollbackDecisionRequired:true,
        decisionDoesNotExecuteRollback:true,
        noAutonomousPilotExecution:true,
        noAutomaticGuestActions:true,
        noAutomaticOperationalMutation:true,
        autonomousProductionChanges:false
      }
    };
  }
  async start(org,allowed,locationId,input,actor){
    if(!this.allowed(locationId,allowed))throw new Error("Location is outside your authorized scope.");
    const snap=await this.snapshot(org,allowed);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Pilot location not found.");
    if(loc.launchAuthorization?.status!=="PILOT_LAUNCH_AUTHORIZED")throw new Error("Human pilot launch authorization is required before execution can start.");
    if(loc.session?.status==="ACTIVE")throw new Error("An active pilot execution session already exists.");
    const evidence=String(input.evidence||"").trim().slice(0,3000);
    if(!evidence)throw new Error("Human pilot-start evidence is required.");
    const now=this.now();
    const record={
      id:`pes_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId,locationName:loc.locationName,
      status:"ACTIVE",startedAt:now,startedBy:actor,
      launchAuthorizationId:loc.launchAuthorization.id,
      launchOwner:String(input.launchOwner||loc.launchAuthorization.launchOwner||actor).trim().slice(0,160),
      supportBridge:String(input.supportBridge||"").trim().slice(0,240),
      evidence,note:String(input.note||"").trim().slice(0,1800),
      milestones:[{milestone:"PILOT_START",status:"CONFIRMED",confirmedAt:now,confirmedBy:actor,evidence}],
      runtimeStartedByService:false,guestActionPerformed:false,operationalMutationPerformed:false
    };
    await this.database.mutate(db=>{db.pilotExecutionSessions||=[];db.pilotExecutionSessions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot execution start recorded for ${locationId}; Blue Current did not start runtime or perform guest/operational actions`,category:"pilot_execution"});
    this.realtimeHub.publish("pilot-execution:started",{organizationId:org,locationId,id:record.id});
    return record;
  }
  async confirmMilestone(org,allowed,sessionId,input,actor){
    const milestone=String(input.milestone||"").toUpperCase();
    if(!this.milestones.includes(milestone)||milestone==="PILOT_START")throw new Error("Invalid pilot execution milestone.");
    const snap=await this.snapshot(org,allowed);
    const loc=snap.locations.find(x=>x.session?.id===sessionId);
    if(!loc||loc.session.status!=="ACTIVE")throw new Error("Active pilot execution session not found.");
    const evidence=String(input.evidence||"").trim().slice(0,2600);
    if(!evidence)throw new Error("Human milestone evidence is required.");
    if(loc.session.milestones?.some(x=>x.milestone===milestone&&x.status==="CONFIRMED"))throw new Error(`${milestone} is already confirmed.`);
    const order=this.milestones.indexOf(milestone);
    const prior=this.milestones[order-1];
    if(prior&&!loc.session.milestones?.some(x=>x.milestone===prior&&x.status==="CONFIRMED"))throw new Error(`${milestone} cannot be confirmed before ${prior}.`);
    const record={id:`pem_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,milestone,status:"CONFIRMED",confirmedAt:this.now(),confirmedBy:actor,evidence,systemActionPerformed:false};
    await this.database.mutate(db=>{const s=(db.pilotExecutionSessions||[]).find(x=>x.id===sessionId&&x.organizationId===org);if(!s)return null;s.milestones||=[];s.milestones.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot execution milestone ${milestone} confirmed for ${loc.locationId}`,category:"pilot_execution"});
    this.realtimeHub.publish("pilot-execution:milestone",{organizationId:org,locationId:loc.locationId,sessionId,milestone});
    return record;
  }
  async observe(org,allowed,sessionId,input,actor){
    const snap=await this.snapshot(org,allowed);
    const loc=snap.locations.find(x=>x.session?.id===sessionId);
    if(!loc||loc.session.status!=="ACTIVE")throw new Error("Active pilot execution session not found.");
    const severity=String(input.severity||"none").toLowerCase();
    if(!["none","low","medium","high","critical"].includes(severity))throw new Error("Severity must be none, low, medium, high, or critical.");
    const health={
      apiHealthy:input.apiHealthy===true,
      authenticationHealthy:input.authenticationHealthy===true,
      reservationHealthy:input.reservationHealthy===true,
      floorHealthy:input.floorHealthy===true,
      kitchenHealthy:input.kitchenHealthy===true,
      supportBridgeHealthy:input.supportBridgeHealthy===true
    };
    const incident=String(input.incident||"").trim().slice(0,2200);
    if(["high","critical"].includes(severity)&&!incident)throw new Error("High/Critical observation requires an incident description.");
    const record={
      id:`peo_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId:loc.locationId,locationName:loc.locationName,sessionId,
      observedAt:this.now(),observedBy:actor,severity,health,incident,
      note:String(input.note||"").trim().slice(0,1800),
      automaticMitigationPerformed:false,rollbackExecuted:false
    };
    await this.database.mutate(db=>{db.pilotExecutionObservations||=[];db.pilotExecutionObservations.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Pilot execution health observation for ${loc.locationId}: ${severity}`,category:"pilot_execution"});
    this.realtimeHub.publish("pilot-execution:observed",{organizationId:org,locationId:loc.locationId,sessionId,severity});
    return record;
  }
  async decide(org,allowed,sessionId,input,actor){
    const snap=await this.snapshot(org,allowed);
    const loc=snap.locations.find(x=>x.session?.id===sessionId);
    if(!loc||loc.session.status!=="ACTIVE")throw new Error("Active pilot execution session not found.");
    const decision=String(input.decision||"").toUpperCase();
    if(!["CONTINUE","HOLD","ROLLBACK"].includes(decision))throw new Error("Decision must be CONTINUE, HOLD, or ROLLBACK.");
    const evidence=String(input.evidence||"").trim().slice(0,3200);
    if(!evidence)throw new Error("Human pilot execution decision evidence is required.");
    const reason=String(input.reason||"").trim().slice(0,2200);
    if(["HOLD","ROLLBACK"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented human reason.`);
    if(decision==="CONTINUE"&&!loc.continueEligible&&!reason)throw new Error("CONTINUE with open milestones, unhealthy latest observation, or high/critical incidents requires a documented executive reason.");
    const record={
      id:`ped_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,locationId:loc.locationId,locationName:loc.locationName,sessionId,
      decision,decidedAt:this.now(),decidedBy:actor,evidence,reason,
      milestoneSnapshot:{confirmed:loc.confirmedMilestones,total:loc.totalMilestones},
      latestObservationId:loc.latestObservation?.id||null,
      highCriticalIncidents:loc.highCriticalIncidents,
      automaticActionPerformed:false,
      rollbackExecuted:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{
      db.pilotExecutionDecisions||=[];db.pilotExecutionDecisions.push(record);
      const s=(db.pilotExecutionSessions||[]).find(x=>x.id===sessionId&&x.organizationId===org);
      if(s&&["HOLD","ROLLBACK"].includes(decision)){s.status=decision==="HOLD"?"HELD":"ROLLBACK_RECOMMENDED";s.decisionAt=record.decidedAt;}
      if(s&&decision==="CONTINUE"){s.lastContinueAt=record.decidedAt;}
      return record;
    });
    await this.auditService.record({organizationId:org,actor,action:`Pilot execution decision ${decision} recorded for ${loc.locationId}; no automatic rollback or operational action executed`,category:"pilot_execution"});
    this.realtimeHub.publish("pilot-execution:decision",{organizationId:org,locationId:loc.locationId,sessionId,decision});
    return record;
  }
}
module.exports=PilotExecutionObservationService;
