"use strict";

class ProductionIncidentCommandService {
  constructor(database,auditService,realtimeHub,productionHealthSupportService,reliabilityAutomationService,telemetryService){
    Object.assign(this,{database,auditService,realtimeHub,productionHealthSupportService,reliabilityAutomationService,telemetryService});
  }
  now(){return new Date().toISOString();}
  async incidents(organizationId){
    const db=await this.database.read();
    return (db.productionIncidentCommands||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [support,reliability,telemetry,commands]=await Promise.all([
      this.productionHealthSupportService.snapshot(organizationId,allowedLocationIds),
      this.reliabilityAutomationService.evaluate(organizationId),
      this.telemetryService.snapshot(),
      this.incidents(organizationId)
    ]);
    const openObservability=(telemetry.incidents?.records||[])
      .filter(x=>!["resolved","closed"].includes(x.status)&&(!x.organizationId||x.organizationId===organizationId));
    const openSupport=(support.eventHistory||[]).filter(x=>!["resolved","closed"].includes(x.status));
    const activeCommands=commands.filter(x=>!["resolved","closed"].includes(x.status));

    const affectedLocationIds=new Set([
      ...openSupport.map(x=>x.locationId).filter(Boolean),
      ...activeCommands.flatMap(x=>x.affectedLocationIds||[])
    ]);

    const locations=(support.locations||[]).filter(x=>affectedLocationIds.has(x.locationId)||x.healthState!=="healthy");
    const signals=[
      ...openSupport.map(x=>({
        id:x.id,type:"support",severity:x.severity,title:x.title,
        locationId:x.locationId,locationName:x.locationName,status:x.status,owner:x.supportOwner,
        linkedIncidentId:x.linkedIncidentId||null
      })),
      ...openObservability.map(x=>({
        id:x.id,type:"observability",severity:x.severity,title:x.title||"Observability incident",
        locationId:null,locationName:null,status:x.status,owner:x.owner||null,linkedIncidentId:x.id
      }))
    ];

    return {
      version:"50.15.0",generatedAt:this.now(),
      status:activeCommands.some(x=>x.severity==="critical")?"incident-command-critical":
        activeCommands.length?"incident-command-active":
        signals.length?"incident-command-signals-open":"incident-command-clear",
      headline:activeCommands.length
        ? `${activeCommands.length} active production incident command(s) require human ownership and recovery tracking.`
        : signals.length
          ? `${signals.length} open production/support signal(s) are available for incident-command intake.`
          : "No active production incident command or open critical production signals.",
      platform:{
        reliabilityStatus:reliability.status,
        reliabilityScore:reliability.score,
        breachedObjectives:reliability.breached,
        warningObjectives:reliability.warning,
        errorBudgetRemaining:reliability.errorBudgetRemaining,
        openObservabilityIncidents:openObservability.length,
        criticalObservabilityIncidents:openObservability.filter(x=>x.severity==="critical").length
      },
      affectedLocations:locations,
      sourceSignals:signals,
      activeCommands,
      commandHistory:commands,
      policy:{
        incidentCreationHumanInitiated:true,
        containmentHumanDirected:true,
        communicationHumanDirected:true,
        recoveryEvidenceHumanRecorded:true,
        resolutionHumanDeclared:true,
        automaticContainment:false,
        automaticRemediation:false,
        automaticResolution:false,
        autonomousProductionChanges:false
      }
    };
  }
  async create(organizationId,allowedLocationIds,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const title=String(input.title||"").trim().slice(0,180);
    if(!title)throw new Error("Incident title is required.");
    const severity=String(input.severity||"warning").toLowerCase();
    if(!["info","warning","critical"].includes(severity))throw new Error("Severity must be info, warning, or critical.");
    const affectedLocationIds=[...new Set((Array.isArray(input.affectedLocationIds)?input.affectedLocationIds:[]).map(String))];
    const allowed=new Set((allowedLocationIds||[]).map(String));
    if(!allowed.has("*")){
      const invalid=affectedLocationIds.filter(x=>!allowed.has(x));
      if(invalid.length)throw new Error(`Affected scope contains unauthorized location(s): ${invalid.join(", ")}`);
    }
    const commander=String(input.commander||actor||"").trim().slice(0,160);
    if(!commander)throw new Error("Incident commander is required.");
    const now=this.now();
    const record={
      id:`pic_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,title,severity,status:"open",
      commander,
      affectedLocationIds,
      affectedDomains:(Array.isArray(input.affectedDomains)?input.affectedDomains:[]).map(String).slice(0,20),
      businessImpact:String(input.businessImpact||"").trim().slice(0,1800),
      serviceImpact:String(input.serviceImpact||"").trim().slice(0,1800),
      containmentStatus:"NOT_STARTED",
      communicationStatus:"NOT_STARTED",
      linkedSupportEventIds:(Array.isArray(input.linkedSupportEventIds)?input.linkedSupportEventIds:[]).map(String).slice(0,50),
      linkedObservabilityIncidentIds:(Array.isArray(input.linkedObservabilityIncidentIds)?input.linkedObservabilityIncidentIds:[]).map(String).slice(0,50),
      linkedSloState:{status:snap.platform.reliabilityStatus,breached:snap.platform.breachedObjectives,warning:snap.platform.warningObjectives,errorBudgetRemaining:snap.platform.errorBudgetRemaining},
      runbook:String(input.runbook||"").trim().slice(0,2000),
      recoveryEvidence:[],
      communications:[],
      timeline:[{action:"created",actor,detail:String(input.note||title).slice(0,800),createdAt:now}],
      createdBy:actor,createdAt:now,updatedAt:now,
      automatedContainmentPerformed:false,
      automatedRemediationPerformed:false
    };
    await this.database.mutate(db=>{db.productionIncidentCommands||=[];db.productionIncidentCommands.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Production incident command created: ${record.id} (${severity})`,category:"production_incident"});
    this.realtimeHub.publish("production-incident:created",{id:record.id,organizationId,severity,commander});
    return record;
  }
  async update(organizationId,incidentId,input,actor){
    const action=String(input.action||"").toLowerCase();
    if(!["acknowledge","contain","communicate","recover","resolve"].includes(action))throw new Error("Action must be acknowledge, contain, communicate, recover, or resolve.");
    const now=this.now();
    const record=await this.database.mutate(db=>{
      db.productionIncidentCommands||=[];
      const x=db.productionIncidentCommands.find(i=>i.id===incidentId&&i.organizationId===organizationId);
      if(!x)return null;
      if(action==="acknowledge")x.status="acknowledged";
      if(action==="contain"){x.status="contained";x.containmentStatus="HUMAN_RECORDED_CONTAINMENT";}
      if(action==="communicate"){
        x.communicationStatus="CHECKPOINT_RECORDED";
        x.communications||=[];
        x.communications.push({actor,detail:String(input.note||"").slice(0,1200),createdAt:now});
      }
      if(action==="recover"){
        x.status="recovering";
        x.recoveryEvidence||=[];
        x.recoveryEvidence.push({actor,detail:String(input.note||"").slice(0,1500),createdAt:now});
      }
      if(action==="resolve"){
        const resolution=String(input.note||"").trim();
        if(!resolution)throw new Error("Resolution requires human-recorded recovery evidence or resolution note.");
        x.status="resolved";
        x.resolvedBy=actor;
        x.resolvedAt=now;
        x.resolution=resolution.slice(0,1800);
      }
      x.updatedAt=now;
      x.timeline||=[];
      x.timeline.push({action,actor,detail:String(input.note||"").slice(0,1200),createdAt:now});
      return {...x};
    });
    if(!record)throw new Error("Production incident command not found.");
    await this.auditService.record({organizationId,actor,action:`Production incident command ${action}: ${incidentId}`,category:"production_incident"});
    this.realtimeHub.publish("production-incident:updated",{id:incidentId,organizationId,status:record.status});
    return record;
  }
}
module.exports=ProductionIncidentCommandService;
