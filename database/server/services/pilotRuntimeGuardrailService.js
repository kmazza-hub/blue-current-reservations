"use strict";

class PilotRuntimeGuardrailService{
  constructor(database,cutoverService,continuityService){
    this.database=database;
    this.cutover=cutoverService;
    this.continuity=continuityService;
  }
  now(){return new Date().toISOString();}
  key(org,location){return `${org}:${location}`;}

  async evaluate(organizationId,allowedLocationIds=[],locationId){
    const db=await this.database.read();
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId&&allowed(x.id));
    if(!location){const e=new Error("Pilot runtime location is not authorized.");e.statusCode=403;throw e;}

    const cutover=await this.cutover.status(organizationId,allowedLocationIds,locationId);
    const continuity=await this.continuity.evaluate(organizationId,allowedLocationIds,locationId);
    const stored=(db.pilotRuntimeGuardrails||{})[this.key(organizationId,locationId)]||{};
    const incidents=(db.pilotRuntimeIncidents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.status!=="RESOLVED");
    const provider=cutover.provider;
    const providerState=continuity.providers.find(x=>x.provider===provider)||null;

    const signals={
      providerAuthorityActive:cutover.mode==="PROVIDER_AUTHORITY",
      providerContinuityStable:!provider||providerState?.continuity==="STABLE",
      providerTrusted:!provider||providerState?.fallback==="TRUSTED_LIVE",
      openCriticalIncident:incidents.some(x=>x.severity==="CRITICAL"),
      openIncidentCount:incidents.length,
      operatorHold:Boolean(stored.operatorHold),
      emergencyLocalMode:Boolean(stored.emergencyLocalMode)
    };

    let state="NORMAL";
    let action="CONTINUE";
    if(signals.emergencyLocalMode||signals.openCriticalIncident){
      state="EMERGENCY_LOCAL"; action="LOCAL_ONLY";
    }else if(signals.operatorHold){
      state="OPERATOR_HOLD"; action="HOLD_EXTERNAL_AUTHORITY";
    }else if(signals.providerAuthorityActive&&(!signals.providerContinuityStable||!signals.providerTrusted)){
      state="DEGRADED"; action="ROLLBACK_RECOMMENDED";
    }else if(signals.openIncidentCount){
      state="WATCH"; action="CONTINUE_WITH_OPERATOR_AWARENESS";
    }

    return {
      version:"80.25.0",generatedAt:this.now(),organizationId,
      location:{id:location.id,name:location.name},
      state,action,signals,
      activeProvider:provider,
      cutoverMode:cutover.mode,
      openIncidents:incidents.map(x=>({id:x.id,severity:x.severity,type:x.type,openedAt:x.openedAt,summary:x.summary,status:x.status})),
      controls:{
        externalWritesAllowed:state==="NORMAL"&&cutover.mode==="PROVIDER_AUTHORITY",
        autonomousProductionChangesAllowed:false,
        destructiveAutomationAllowed:false,
        localOperationsAvailable:true,
        operatorOverrideAvailable:true
      },
      policy:{
        humanInTheLoopRequired:true,
        serviceMustContinueWithoutProvider:true,
        criticalIncidentForcesLocalMode:true,
        continuityLossRequiresOperatorAttention:true,
        externalWritesBlockedDuringHold:true,
        noAutonomousProductionChanges:true,
        noDestructiveAutomation:true,
        incidentCaptureRequired:true,
        recoveryRequiresHumanClearance:true
      }
    };
  }

  async setHold(organizationId,allowedLocationIds=[],locationId,enabled,actor,reason){
    await this.evaluate(organizationId,allowedLocationIds,locationId);
    await this.database.mutate(db=>{
      db.pilotRuntimeGuardrails=db.pilotRuntimeGuardrails||{};
      const key=this.key(organizationId,locationId),prior=db.pilotRuntimeGuardrails[key]||{};
      db.pilotRuntimeGuardrails[key]={...prior,operatorHold:Boolean(enabled),holdReason:reason||null,holdChangedAt:this.now(),holdChangedBy:actor||"unknown"};
      return true;
    });
    return this.evaluate(organizationId,allowedLocationIds,locationId);
  }

  async emergencyLocal(organizationId,allowedLocationIds=[],locationId,actor,reason){
    await this.evaluate(organizationId,allowedLocationIds,locationId);
    await this.database.mutate(db=>{
      db.pilotRuntimeGuardrails=db.pilotRuntimeGuardrails||{};
      const key=this.key(organizationId,locationId),prior=db.pilotRuntimeGuardrails[key]||{};
      db.pilotRuntimeGuardrails[key]={...prior,emergencyLocalMode:true,emergencyReason:reason||"operator emergency local mode",emergencyAt:this.now(),emergencyBy:actor||"unknown"};
      return true;
    });
    if((await this.cutover.status(organizationId,allowedLocationIds,locationId)).mode==="PROVIDER_AUTHORITY"){
      await this.cutover.rollback(organizationId,allowedLocationIds,locationId,reason||"runtime emergency local mode",actor||"unknown");
    }
    return this.evaluate(organizationId,allowedLocationIds,locationId);
  }

  async recordIncident(organizationId,allowedLocationIds=[],locationId,input={},actor){
    await this.evaluate(organizationId,allowedLocationIds,locationId);
    const severity=["WATCH","DEGRADED","CRITICAL"].includes(input.severity)?input.severity:"WATCH";
    const incident={
      id:`pri-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,locationId,severity,type:String(input.type||"runtime").slice(0,80),
      summary:String(input.summary||"Pilot runtime incident").slice(0,500),
      openedAt:this.now(),openedBy:actor||"unknown",status:"OPEN"
    };
    await this.database.mutate(db=>{db.pilotRuntimeIncidents=db.pilotRuntimeIncidents||[];db.pilotRuntimeIncidents.push(incident);return true;});
    if(severity==="CRITICAL") await this.emergencyLocal(organizationId,allowedLocationIds,locationId,actor,incident.summary);
    return {incident,runtime:await this.evaluate(organizationId,allowedLocationIds,locationId)};
  }

  async clearEmergency(organizationId,allowedLocationIds=[],locationId,actor,reason){
    const current=await this.evaluate(organizationId,allowedLocationIds,locationId);
    if(current.openIncidents.some(x=>x.severity==="CRITICAL")){
      const e=new Error("Critical pilot incidents must be resolved before emergency local mode can be cleared.");e.statusCode=409;throw e;
    }
    await this.database.mutate(db=>{
      db.pilotRuntimeGuardrails=db.pilotRuntimeGuardrails||{};
      const key=this.key(organizationId,locationId),prior=db.pilotRuntimeGuardrails[key]||{};
      db.pilotRuntimeGuardrails[key]={...prior,emergencyLocalMode:false,emergencyClearedAt:this.now(),emergencyClearedBy:actor||"unknown",emergencyClearReason:reason||null};
      return true;
    });
    return this.evaluate(organizationId,allowedLocationIds,locationId);
  }
}
module.exports=PilotRuntimeGuardrailService;
