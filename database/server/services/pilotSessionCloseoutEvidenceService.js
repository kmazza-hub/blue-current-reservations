"use strict";

class PilotSessionCloseoutEvidenceService{
  constructor(database,runtimeService,observabilityService){
    this.database=database;
    this.runtime=runtimeService;
    this.observability=observabilityService;
  }
  now(){return new Date().toISOString();}

  async assess(organizationId,sessionId){
    const [session,timeline,db]=await Promise.all([
      this.runtime.session(organizationId,sessionId),
      this.observability.timeline(organizationId,sessionId),
      this.database.read()
    ]);
    const openIncidents=timeline.incidents.filter(x=>x.status!=="RESOLVED");
    const existing=(db.pilotSessionCloseouts||{})[sessionId]||null;
    const checks={
      sessionStopped:session.state==="STOPPED",
      allIncidentsResolved:openIncidents.length===0,
      serviceTimelineAvailable:Array.isArray(timeline.timeline)&&timeline.timeline.length>0,
      noAutonomousProductionChanges:session.controls?.autonomousProductionChanges===false,
      providerWriteBackDisabled:session.controls?.providerWriteBackEnabled===false
    };
    const blocking=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    return {
      version:"90.0.0",phase:"C",organizationId,sessionId,
      gate:"PILOT_SESSION_CLOSEOUT_AND_EVIDENCE_CAPTURE",
      closeoutEligible:blocking.length===0,
      decision:blocking.length?"HOLD":"CLOSEOUT_ELIGIBLE",
      checks,blocking,
      unresolvedIncidentIds:openIncidents.map(x=>x.id),
      evidenceSummary:{
        sessionState:session.state,
        sessionStartedAt:session.startedAt||null,
        sessionStoppedAt:session.stoppedAt||null,
        metricCount:timeline.summary.metrics,
        incidentCount:timeline.summary.incidents,
        timelineEventCount:timeline.timeline.length,
        launchApprovalId:session.launchApprovalId||null
      },
      existingCloseout:existing
    };
  }

  async closeout(organizationId,sessionId,input={},actor){
    const assessment=await this.assess(organizationId,sessionId);
    if(!assessment.closeoutEligible){
      const e=new Error(`Pilot session closeout is on HOLD: ${assessment.blocking.join(", ")}`);
      e.statusCode=409;e.details=assessment;throw e;
    }
    const operatorSummary=String(input.operatorSummary||"").trim();
    const outcome=String(input.outcome||"").trim().toUpperCase();
    const lessons=String(input.lessonsLearned||"").trim();
    const allowed=["SUCCESS","SUCCESS_WITH_FOLLOWUP","INCONCLUSIVE","UNSUCCESSFUL"];
    if(operatorSummary.length<20){const e=new Error("A meaningful operator summary is required.");e.statusCode=400;throw e;}
    if(!allowed.includes(outcome)){const e=new Error(`outcome must be one of: ${allowed.join(", ")}`);e.statusCode=400;throw e;}
    if(lessons.length<10){const e=new Error("Lessons learned are required.");e.statusCode=400;throw e;}

    const [session,timeline]=await Promise.all([
      this.runtime.session(organizationId,sessionId),
      this.observability.timeline(organizationId,sessionId)
    ]);
    const closeout={
      id:`psce-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"90.0.0",organizationId,sessionId,
      status:"CLOSED",outcome,
      operatorSummary:operatorSummary.slice(0,5000),
      lessonsLearned:lessons.slice(0,5000),
      followUp:String(input.followUp||"").trim().slice(0,5000)||null,
      closedAt:this.now(),closedBy:actor||"operator",
      evidence:{
        launchApprovalId:session.launchApprovalId||null,
        approvedEvidence:session.approvedEvidence||null,
        session:{
          id:session.id,label:session.label,state:session.state,
          startedAt:session.startedAt,startedBy:session.startedBy,
          stoppedAt:session.stoppedAt,stoppedBy:session.stoppedBy,
          stopReason:session.stopReason||null,
          controls:session.controls
        },
        runtimeSummary:timeline.summary,
        incidents:timeline.incidents,
        metrics:timeline.metrics,
        serviceTimeline:timeline.timeline
      },
      integrity:{
        capturedAt:this.now(),
        unresolvedIncidentsAtCloseout:0,
        humanCloseoutRequired:true,
        providerWriteBack:false,
        autonomousProductionChanges:false
      }
    };
    await this.database.mutate(db=>{
      db.pilotSessionCloseouts=db.pilotSessionCloseouts||{};
      if(db.pilotSessionCloseouts[sessionId]){
        const e=new Error("Pilot session has already been closed out.");e.statusCode=409;throw e;
      }
      db.pilotSessionCloseouts[sessionId]=closeout;
      db.pilotSessionCloseoutAudit=db.pilotSessionCloseoutAudit||[];
      db.pilotSessionCloseoutAudit.push(closeout);
      return true;
    });
    return closeout;
  }

  async get(organizationId,sessionId){
    const db=await this.database.read();
    const row=(db.pilotSessionCloseouts||{})[sessionId]||null;
    if(!row||row.organizationId!==organizationId){
      const e=new Error("Pilot session closeout not found.");e.statusCode=404;throw e;
    }
    return row;
  }

  async portfolio(organizationId){
    const db=await this.database.read();
    const rows=Object.values(db.pilotSessionCloseouts||{})
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.closedAt)-new Date(a.closedAt));
    const outcomes=rows.reduce((acc,x)=>{acc[x.outcome]=(acc[x.outcome]||0)+1;return acc;},{});
    return {
      version:"90.0.0",phase:"C",organizationId,
      gate:"PILOT_SESSION_CLOSEOUT_AND_EVIDENCE_CAPTURE",
      closedSessions:rows.length,outcomes,closeouts:rows,
      phaseCStatus:rows.length?"EVIDENCE_AVAILABLE":"AWAITING_FIRST_CLOSEOUT",
      nextGate:rows.length?"PILOT_LEARNING_REVIEW_AND_NEXT_SESSION_DECISION":"COMPLETE_FIRST_SESSION_CLOSEOUT",
      safety:{automaticPilotExpansion:false,automaticProductionChange:false}
    };
  }
}
module.exports=PilotSessionCloseoutEvidenceService;
