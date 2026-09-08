"use strict";

class ProductionHealthSupportService {
  constructor(database,auditService,realtimeHub,productionOperationsHandoffService,reliabilityAutomationService,telemetryService,multiLocationPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,productionOperationsHandoffService,reliabilityAutomationService,telemetryService,multiLocationPerformanceService});
  }
  now(){return new Date().toISOString();}
  async events(organizationId){
    const db=await this.database.read();
    return (db.productionSupportEvents||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  inMaintenanceWindow(value){
    if(!value)return false;
    const v=String(value).toLowerCase();
    return v.includes("now")||v.includes("active");
  }
  async snapshot(organizationId,allowedLocationIds){
    const [handoff,reliability,telemetry,portfolio,events]=await Promise.all([
      this.productionOperationsHandoffService.snapshot(organizationId,allowedLocationIds),
      this.reliabilityAutomationService.evaluate(organizationId),
      this.telemetryService.snapshot(),
      this.multiLocationPerformanceService.snapshot(organizationId,allowedLocationIds),
      this.events(organizationId)
    ]);
    const pmap=new Map((portfolio.locations||[]).map(x=>[x.locationId,x]));
    const openIncidents=(telemetry.incidents?.records||[]).filter(x=>!["resolved","closed"].includes(x.status)&&(!x.organizationId||x.organizationId===organizationId));
    const locations=(handoff.locations||[])
      .filter(x=>x.acceptance?.status==="ACCEPTED_INTO_PRODUCTION_OPERATIONS")
      .map(loc=>{
        const live=pmap.get(loc.locationId)||{};
        const relatedEvents=events.filter(e=>e.locationId===loc.locationId);
        const openSupport=relatedEvents.filter(e=>!["resolved","closed"].includes(e.status));
        const criticalSupport=openSupport.filter(e=>e.severity==="critical").length;
        const healthChecks=[
          {id:"platform-slo",label:"Platform SLO state not breached",passed:reliability.status!=="breached",actual:reliability.status},
          {id:"platform-incidents",label:"No open critical platform incident",passed:openIncidents.filter(x=>x.severity==="critical").length===0,actual:openIncidents.filter(x=>x.severity==="critical").length},
          {id:"readiness",label:"Restaurant readiness at least 70",passed:Number(live.readinessScore||0)>=70,actual:Number(live.readinessScore||0)},
          {id:"attention",label:"Operating attention not High/Critical",passed:!["high","critical"].includes(live.attentionLevel),actual:live.attentionLevel||"unknown"},
          {id:"predictive",label:"No urgent predictive intervention",passed:Number(live.urgentPredictiveInterventions||0)===0,actual:Number(live.urgentPredictiveInterventions||0)},
          {id:"support",label:"No open critical production support event",passed:criticalSupport===0,actual:criticalSupport}
        ];
        const passed=healthChecks.filter(x=>x.passed).length;
        const severity=passed===healthChecks.length?"healthy":criticalSupport||reliability.status==="breached"||["high","critical"].includes(live.attentionLevel)?"critical":"degraded";
        return {
          locationId:loc.locationId,locationName:loc.locationName,wave:loc.wave,
          supportOwner:loc.acceptance.supportOwner,
          escalationOwner:loc.acceptance.escalationOwner,
          supportHours:loc.acceptance.supportHours,
          maintenanceWindow:loc.acceptance.maintenanceWindow,
          maintenanceWindowActive:this.inMaintenanceWindow(loc.acceptance.maintenanceWindow),
          readinessScore:Number(live.readinessScore||0),
          attentionLevel:live.attentionLevel||"unknown",
          urgentPredictiveInterventions:Number(live.urgentPredictiveInterventions||0),
          healthChecks,healthPassed:passed,healthTotal:healthChecks.length,
          healthState:severity,
          openSupportEvents:openSupport.length,
          latestSupportEvent:relatedEvents[0]||null,
          supportTimeline:relatedEvents
        };
      });
    return {
      version:"50.10.0",generatedAt:this.now(),
      status:locations.length===0?"production-acceptance-required":locations.some(x=>x.healthState==="critical")?"production-support-critical":locations.some(x=>x.healthState==="degraded")?"production-support-degraded":"production-support-healthy",
      headline:locations.length===0?"Production-operations acceptance is required before support command begins.":`${locations.filter(x=>x.healthState==="healthy").length}/${locations.length} accepted production location(s) are currently healthy.`,
      platform:{
        reliabilityStatus:reliability.status,
        reliabilityScore:reliability.score,
        breachedObjectives:reliability.breached,
        warningObjectives:reliability.warning,
        errorBudgetRemaining:reliability.errorBudgetRemaining,
        openIncidents:openIncidents.length,
        criticalIncidents:openIncidents.filter(x=>x.severity==="critical").length,
        p95LatencyMs:telemetry.requests?.p95LatencyMs||0,
        serverErrors:telemetry.requests?.serverErrors||0
      },
      locations,eventHistory:events,
      policy:{
        supportActionsHumanInitiated:true,
        escalationHumanInitiated:true,
        incidentLinkageReadOnly:true,
        automaticAcknowledgement:false,
        automaticEscalation:false,
        automaticRemediation:false,
        autonomousProductionChanges:false
      }
    };
  }
  async createEvent(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location is not accepted into production operations.");
    const severity=String(input.severity||"warning").toLowerCase();
    if(!["info","warning","critical"].includes(severity))throw new Error("Severity must be info, warning, or critical.");
    const title=String(input.title||"").trim().slice(0,180);
    if(!title)throw new Error("Support event title is required.");
    const now=this.now();
    const record={
      id:`pse_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,
      severity,title,
      description:String(input.description||"").trim().slice(0,1500),
      status:"open",
      supportOwner:loc.supportOwner,
      escalationOwner:loc.escalationOwner,
      linkedIncidentId:String(input.linkedIncidentId||"").trim().slice(0,180)||null,
      createdBy:actor,createdAt:now,updatedAt:now,
      timeline:[{action:"created",actor,detail:String(input.description||title).slice(0,600),createdAt:now}]
    };
    await this.database.mutate(db=>{db.productionSupportEvents||=[];db.productionSupportEvents.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Production support event created for ${locationId}: ${title}`,category:"production_support"});
    this.realtimeHub.publish("production-support:event-created",{id:record.id,organizationId,locationId,severity});
    return record;
  }
  async updateEvent(organizationId,eventId,input,actor){
    const action=String(input.action||"").toLowerCase();
    if(!["acknowledge","escalate","resolve"].includes(action))throw new Error("Action must be acknowledge, escalate, or resolve.");
    const now=this.now();
    const record=await this.database.mutate(db=>{
      db.productionSupportEvents||=[];
      const e=db.productionSupportEvents.find(x=>x.id===eventId&&x.organizationId===organizationId);
      if(!e)return null;
      if(action==="acknowledge")e.status="acknowledged";
      if(action==="escalate"){e.status="escalated";e.escalatedAt=now;e.escalatedBy=actor;}
      if(action==="resolve"){e.status="resolved";e.resolvedAt=now;e.resolvedBy=actor;}
      e.updatedAt=now;e.timeline||=[];e.timeline.push({action,actor,detail:String(input.note||"").slice(0,800),createdAt:now});
      return {...e};
    });
    if(!record)throw new Error("Production support event not found.");
    await this.auditService.record({organizationId,actor,action:`Production support event ${action}: ${eventId}`,category:"production_support"});
    this.realtimeHub.publish("production-support:event-updated",{id:eventId,organizationId,status:record.status});
    return record;
  }
}
module.exports=ProductionHealthSupportService;
