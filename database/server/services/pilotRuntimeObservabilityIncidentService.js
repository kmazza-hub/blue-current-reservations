"use strict";

class PilotRuntimeObservabilityIncidentService{
  constructor(database,runtimeSessionService){
    this.database=database;
    this.runtime=runtimeSessionService;
  }
  now(){return new Date().toISOString();}
  severities(){return ["INFO","WARNING","HIGH","CRITICAL"];}

  async recordMetric(organizationId,input={},actor){
    const sessionId=String(input.sessionId||"").trim();
    const name=String(input.name||"").trim().slice(0,120);
    const value=Number(input.value);
    if(!sessionId||!name||!Number.isFinite(value)){
      const e=new Error("sessionId, metric name, and numeric value are required.");e.statusCode=400;throw e;
    }
    const session=await this.runtime.session(organizationId,sessionId);
    if(!["ACTIVE","PAUSED"].includes(session.state)){
      const e=new Error("Metrics can only be recorded for active or paused pilot sessions.");e.statusCode=409;throw e;
    }
    const row={
      id:`prm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,sessionId,name,value,
      unit:String(input.unit||"").trim().slice(0,40)||null,
      source:String(input.source||"BLUE_CURRENT").trim().slice(0,120),
      observedAt:input.observedAt||this.now(),
      recordedAt:this.now(),recordedBy:actor||"system"
    };
    await this.database.mutate(db=>{
      db.pilotRuntimeMetrics=db.pilotRuntimeMetrics||[];
      db.pilotRuntimeMetrics.push(row);return true;
    });
    return row;
  }

  async createIncident(organizationId,input={},actor){
    const sessionId=String(input.sessionId||"").trim();
    const title=String(input.title||"").trim().slice(0,180);
    const description=String(input.description||"").trim().slice(0,3000);
    const severity=String(input.severity||"WARNING").toUpperCase();
    if(!sessionId||title.length<5||description.length<10||!this.severities().includes(severity)){
      const e=new Error("sessionId, valid severity, title, and description are required.");e.statusCode=400;throw e;
    }
    const session=await this.runtime.session(organizationId,sessionId);
    if(!["ACTIVE","PAUSED"].includes(session.state)){
      const e=new Error("Incidents can only be opened for active or paused pilot sessions.");e.statusCode=409;throw e;
    }
    const incident={
      id:`pri-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.75.0",organizationId,sessionId,
      title,description,severity,status:"OPEN",
      category:String(input.category||"RUNTIME").toUpperCase().slice(0,80),
      createdAt:this.now(),createdBy:actor||"operator",
      acknowledgedAt:null,acknowledgedBy:null,
      escalatedAt:null,escalatedBy:null,escalationNote:null,
      resolvedAt:null,resolvedBy:null,resolution:null,
      autonomousOperationalAction:false
    };
    await this.database.mutate(db=>{
      db.pilotRuntimeIncidents=db.pilotRuntimeIncidents||[];
      db.pilotRuntimeIncidents.push(incident);
      return true;
    });

    // Critical incidents pause the pilot runtime as a safety guardrail.
    if(severity==="CRITICAL"&&session.state==="ACTIVE"){
      await this.runtime.transition(organizationId,sessionId,"PAUSE",{reason:`Critical pilot incident opened: ${title}`},actor||"operator");
    }
    return incident;
  }

  async incident(organizationId,incidentId){
    const db=await this.database.read();
    const row=(db.pilotRuntimeIncidents||[]).find(x=>x.organizationId===organizationId&&x.id===incidentId);
    if(!row){const e=new Error("Pilot runtime incident not found.");e.statusCode=404;throw e;}
    return row;
  }

  async acknowledge(organizationId,incidentId,input={},actor){
    const note=String(input.note||"").trim().slice(0,2000);
    let result=null;
    await this.database.mutate(db=>{
      const row=(db.pilotRuntimeIncidents||[]).find(x=>x.organizationId===organizationId&&x.id===incidentId);
      if(!row){const e=new Error("Pilot runtime incident not found.");e.statusCode=404;throw e;}
      if(row.status==="RESOLVED"){const e=new Error("Resolved incidents cannot be acknowledged.");e.statusCode=409;throw e;}
      row.status="ACKNOWLEDGED";row.acknowledgedAt=this.now();row.acknowledgedBy=actor||"operator";row.acknowledgementNote=note||null;
      result={...row};return true;
    });
    return result;
  }

  async escalate(organizationId,incidentId,input={},actor){
    const note=String(input.note||"").trim().slice(0,2500);
    if(note.length<10){const e=new Error("Escalation requires a meaningful note.");e.statusCode=400;throw e;}
    let result=null;
    await this.database.mutate(db=>{
      const row=(db.pilotRuntimeIncidents||[]).find(x=>x.organizationId===organizationId&&x.id===incidentId);
      if(!row){const e=new Error("Pilot runtime incident not found.");e.statusCode=404;throw e;}
      if(row.status==="RESOLVED"){const e=new Error("Resolved incidents cannot be escalated.");e.statusCode=409;throw e;}
      row.status="ESCALATED";row.escalatedAt=this.now();row.escalatedBy=actor||"operator";row.escalationNote=note;
      result={...row};return true;
    });
    return result;
  }

  async resolve(organizationId,incidentId,input={},actor){
    const resolution=String(input.resolution||"").trim().slice(0,3000);
    if(resolution.length<10){const e=new Error("Resolution requires a meaningful summary.");e.statusCode=400;throw e;}
    let result=null;
    await this.database.mutate(db=>{
      const row=(db.pilotRuntimeIncidents||[]).find(x=>x.organizationId===organizationId&&x.id===incidentId);
      if(!row){const e=new Error("Pilot runtime incident not found.");e.statusCode=404;throw e;}
      if(row.status==="RESOLVED"){const e=new Error("Incident is already resolved.");e.statusCode=409;throw e;}
      row.status="RESOLVED";row.resolvedAt=this.now();row.resolvedBy=actor||"operator";row.resolution=resolution;
      result={...row};return true;
    });
    return result;
  }

  async timeline(organizationId,sessionId){
    const db=await this.database.read();
    const session=await this.runtime.session(organizationId,sessionId);
    const metrics=(db.pilotRuntimeMetrics||[]).filter(x=>x.organizationId===organizationId&&x.sessionId===sessionId);
    const incidents=(db.pilotRuntimeIncidents||[]).filter(x=>x.organizationId===organizationId&&x.sessionId===sessionId);
    const events=[
      ...(session.events||[]).map(x=>({kind:"SESSION",at:x.at,event:x})),
      ...metrics.map(x=>({kind:"METRIC",at:x.observedAt||x.recordedAt,event:x})),
      ...incidents.flatMap(x=>{
        const rows=[{kind:"INCIDENT_OPENED",at:x.createdAt,event:x}];
        if(x.acknowledgedAt)rows.push({kind:"INCIDENT_ACKNOWLEDGED",at:x.acknowledgedAt,event:{incidentId:x.id,by:x.acknowledgedBy,note:x.acknowledgementNote||null}});
        if(x.escalatedAt)rows.push({kind:"INCIDENT_ESCALATED",at:x.escalatedAt,event:{incidentId:x.id,by:x.escalatedBy,note:x.escalationNote}});
        if(x.resolvedAt)rows.push({kind:"INCIDENT_RESOLVED",at:x.resolvedAt,event:{incidentId:x.id,by:x.resolvedBy,resolution:x.resolution}});
        return rows;
      })
    ].sort((a,b)=>new Date(a.at)-new Date(b.at));
    return {
      version:"89.75.0",organizationId,sessionId,
      sessionState:session.state,
      summary:{
        metrics:metrics.length,
        incidents:incidents.length,
        openIncidents:incidents.filter(x=>x.status!=="RESOLVED").length,
        criticalOpen:incidents.filter(x=>x.severity==="CRITICAL"&&x.status!=="RESOLVED").length,
        escalated:incidents.filter(x=>x.status==="ESCALATED").length
      },
      incidents,metrics,timeline:events,
      policy:{
        criticalIncidentPausesActiveSession:true,
        incidentLifecycleHumanControlled:true,
        serviceTimelineImmutableHistoryIntent:true,
        observabilityDoesNotExecuteOperations:true,
        providerWriteBack:false,
        autonomousProductionChanges:false
      }
    };
  }

  async current(organizationId){
    const runtime=await this.runtime.current(organizationId);
    if(!runtime.activeSession){
      return {
        version:"89.75.0",phase:"C",organizationId,
        gate:"PILOT_RUNTIME_OBSERVABILITY_AND_INCIDENT_CONTROL",
        status:"NO_ACTIVE_SESSION",runtime,
        nextGate:"START_CONTROLLED_SESSION"
      };
    }
    const view=await this.timeline(organizationId,runtime.activeSession.id);
    const health=view.summary.criticalOpen>0?"CRITICAL":view.summary.openIncidents>0?"DEGRADED":"HEALTHY";
    return {
      version:"89.75.0",phase:"C",organizationId,
      gate:"PILOT_RUNTIME_OBSERVABILITY_AND_INCIDENT_CONTROL",
      status:health,
      runtimeHealth:health,
      runtime,
      observability:view,
      nextGate:health==="HEALTHY"?"PILOT_SESSION_CLOSEOUT_AND_EVIDENCE_CAPTURE":"RESOLVE_ACTIVE_INCIDENTS",
      safety:{providerWriteBack:false,autonomousProductionChanges:false}
    };
  }
}
module.exports=PilotRuntimeObservabilityIncidentService;
