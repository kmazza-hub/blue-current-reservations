"use strict";

class PilotRuntimeSessionControlService{
  constructor(database,launchControlService){
    this.database=database;
    this.launchControlService=launchControlService;
  }
  now(){return new Date().toISOString();}
  activeState(state){return ["ACTIVE","PAUSED"].includes(state);}

  async start(organizationId,input={},actor){
    const launch=await this.launchControlService.current(organizationId);
    if(!launch.current){
      const e=new Error("Current controlled-pilot launch approval is required before a runtime session can start.");
      e.statusCode=409;e.details=launch;throw e;
    }
    const db=await this.database.read();
    const existing=(db.pilotRuntimeSessions||[]).find(x=>x.organizationId===organizationId&&this.activeState(x.state));
    if(existing){const e=new Error("An active or paused pilot runtime session already exists.");e.statusCode=409;throw e;}
    const label=String(input.label||"Controlled pilot service").trim().slice(0,160);
    const session={
      id:`prsc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.50.0",organizationId,label,state:"ACTIVE",
      startedAt:this.now(),startedBy:actor||"admin",
      launchApprovalId:launch.approval.id,
      approvedEvidence:launch.approval.evidence,
      controls:{
        providerWriteBackEnabled:false,
        autonomousProductionChanges:false,
        automaticExpansion:false,
        guestCommunicationEnabled:false,
        humanPauseStopRequired:false,
        evidenceDriftStopsProgression:true
      },
      events:[{type:"SESSION_STARTED",at:this.now(),actor:actor||"admin"}]
    };
    await this.database.mutate(store=>{
      store.pilotRuntimeSessions=store.pilotRuntimeSessions||[];
      store.pilotRuntimeSessions.push(session);return true;
    });
    return session;
  }

  async session(organizationId,sessionId){
    const db=await this.database.read();
    const row=(db.pilotRuntimeSessions||[]).find(x=>x.organizationId===organizationId&&x.id===sessionId);
    if(!row){const e=new Error("Pilot runtime session not found.");e.statusCode=404;throw e;}
    return row;
  }

  async checkEnvelope(organizationId,sessionId){
    const [row,launch]=await Promise.all([this.session(organizationId,sessionId),this.launchControlService.current(organizationId)]);
    const evidence=row.approvedEvidence||{},current=launch.assessment?.evidence||{};
    const evidenceMatches=Boolean(
      launch.approval?.id===row.launchApprovalId &&
      evidence.configurationUpdatedAt===current.configurationUpdatedAt &&
      evidence.locationCertificationId===current.locationCertificationId &&
      evidence.workflowBindingId===current.workflowBindingId &&
      evidence.simulationRunId===current.simulationRunId &&
      evidence.operatorAcceptanceId===current.operatorAcceptanceId
    );
    const checks={
      sessionControllable:this.activeState(row.state),
      launchApprovalCurrent:launch.current===true,
      approvedEvidenceUnchanged:evidenceMatches,
      providerWriteBackLockedOff:row.controls.providerWriteBackEnabled===false,
      autonomousProductionChangesLockedOff:row.controls.autonomousProductionChanges===false,
      automaticExpansionLockedOff:row.controls.automaticExpansion===false,
      guestCommunicationLockedOff:row.controls.guestCommunicationEnabled===false
    };
    const violations=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    return {version:"89.50.0",organizationId,sessionId,state:row.state,withinEnvelope:violations.length===0,checks,violations};
  }

  async transition(organizationId,sessionId,action,input={},actor){
    const allowed={PAUSE:["ACTIVE"],RESUME:["PAUSED"],STOP:["ACTIVE","PAUSED"]};
    if(!allowed[action]){const e=new Error("Unknown pilot session action.");e.statusCode=400;throw e;}
    const row=await this.session(organizationId,sessionId);
    if(!allowed[action].includes(row.state)){const e=new Error(`Cannot ${action.toLowerCase()} a session in ${row.state} state.`);e.statusCode=409;throw e;}
    if(action==="RESUME"){
      const envelope=await this.checkEnvelope(organizationId,sessionId);
      if(!envelope.withinEnvelope){const e=new Error(`Cannot resume outside approved operating envelope: ${envelope.violations.join(", ")}`);e.statusCode=409;e.details=envelope;throw e;}
    }
    const reason=String(input.reason||"").trim();
    if(["PAUSE","STOP"].includes(action)&&reason.length<10){const e=new Error(`${action} requires a meaningful reason.`);e.statusCode=400;throw e;}
    let updated;
    await this.database.mutate(db=>{
      updated=(db.pilotRuntimeSessions||[]).find(x=>x.organizationId===organizationId&&x.id===sessionId);
      updated.state=action==="PAUSE"?"PAUSED":action==="RESUME"?"ACTIVE":"STOPPED";
      updated.events=updated.events||[];
      updated.events.push({type:`SESSION_${action}D`,at:this.now(),actor:actor||"admin",reason:reason||null});
      if(action==="PAUSE"){updated.pausedAt=this.now();updated.pausedBy=actor||"admin";}
      if(action==="RESUME"){updated.resumedAt=this.now();updated.resumedBy=actor||"admin";}
      if(action==="STOP"){updated.stoppedAt=this.now();updated.stoppedBy=actor||"admin";updated.stopReason=reason;}
      return true;
    });
    return updated;
  }

  async enforce(organizationId,sessionId,actor="system"){
    const envelope=await this.checkEnvelope(organizationId,sessionId);
    if(envelope.withinEnvelope)return {action:"NONE",...envelope};
    const row=await this.session(organizationId,sessionId);
    if(row.state==="ACTIVE"){
      await this.database.mutate(db=>{
        const target=(db.pilotRuntimeSessions||[]).find(x=>x.organizationId===organizationId&&x.id===sessionId);
        target.state="PAUSED";
        target.pausedAt=this.now();target.pausedBy=actor;
        target.events=target.events||[];
        target.events.push({type:"SESSION_AUTO_PAUSED_GUARDRAIL",at:this.now(),actor,violations:envelope.violations});
        return true;
      });
      return {action:"AUTO_PAUSED",...envelope};
    }
    return {action:"BLOCKED",...envelope};
  }

  async current(organizationId){
    const db=await this.database.read();
    const sessions=(db.pilotRuntimeSessions||[]).filter(x=>x.organizationId===organizationId);
    const active=sessions.find(x=>this.activeState(x.state))||null;
    const envelope=active?await this.checkEnvelope(organizationId,active.id):null;
    return {
      version:"89.50.0",phase:"C",organizationId,
      gate:"PILOT_RUNTIME_GUARDRAILS_AND_SESSION_CONTROL",
      status:active?active.state:"NO_ACTIVE_SESSION",
      activeSession:active,envelope,totalSessions:sessions.length,
      nextGate:active&&envelope?.withinEnvelope?"PILOT_RUNTIME_OBSERVABILITY_AND_INCIDENT_CONTROL":"START_OR_RESTORE_CONTROLLED_SESSION",
      safety:{providerWriteBack:false,autonomousProductionChanges:false,automaticExpansion:false,guestCommunication:false}
    };
  }
}
module.exports=PilotRuntimeSessionControlService;
