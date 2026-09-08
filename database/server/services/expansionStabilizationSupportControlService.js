"use strict";

class ExpansionStabilizationSupportControlService{
  constructor(database,launchService,continuityService){
    this.database=database;
    this.launch=launchService;
    this.continuity=continuityService;
  }

  now(){return new Date().toISOString();}
  key(o,l){return `${o}:${l}`;}
  ageHours(value){
    const t=new Date(value||0).getTime();
    if(!Number.isFinite(t)||!t)return null;
    return Math.max(0,(Date.now()-t)/3600000);
  }

  async configure(o,allowed=[],locationId,input={},actor){
    const launch=await this.launch.status(o,allowed,locationId);
    if(launch.activation?.status!=="ACTIVE"){
      const e=new Error("Stabilization can only be configured for an active expansion launch.");
      e.statusCode=409;throw e;
    }
    const config={
      organizationId:o,locationId,
      supportOwner:String(input.supportOwner||"").trim().slice(0,120),
      launchOwner:String(input.launchOwner||"").trim().slice(0,120),
      stabilizationHours:Math.max(24,Math.min(336,Number(input.stabilizationHours)||72)),
      maxOpenIncidents:Math.max(0,Number(input.maxOpenIncidents)||2),
      maxCriticalIncidents:Math.max(0,Number(input.maxCriticalIncidents)||0),
      rollbackDrillConfirmed:Boolean(input.rollbackDrillConfirmed),
      supportCoverageConfirmed:Boolean(input.supportCoverageConfirmed),
      dailyReviewConfirmed:Boolean(input.dailyReviewConfirmed),
      notes:String(input.notes||"").slice(0,2000),
      configuredAt:this.now(),configuredBy:actor||"admin"
    };
    if(!config.supportOwner||!config.launchOwner){
      const e=new Error("Stabilization requires both support and launch owners.");e.statusCode=400;throw e;
    }
    await this.database.mutate(db=>{
      db.expansionStabilizationConfig=db.expansionStabilizationConfig||{};
      db.expansionStabilizationConfig[this.key(o,locationId)]=config;
      return true;
    });
    return this.status(o,allowed,locationId);
  }

  async recordIncident(o,allowed=[],locationId,input={},actor){
    await this.status(o,allowed,locationId);
    const severity=["WATCH","DEGRADED","CRITICAL"].includes(input.severity)?input.severity:"WATCH";
    const incident={
      id:`esi-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId,severity,
      type:String(input.type||"launch").slice(0,100),
      summary:String(input.summary||"Expansion stabilization incident").trim().slice(0,600),
      status:"OPEN",openedAt:this.now(),openedBy:actor||"operator",
      resolvedAt:null,resolvedBy:null,resolution:null
    };
    await this.database.mutate(db=>{
      db.expansionStabilizationIncidents=db.expansionStabilizationIncidents||[];
      db.expansionStabilizationIncidents.push(incident);return true;
    });
    return {incident,status:await this.status(o,allowed,locationId)};
  }

  async resolveIncident(o,allowed=[],locationId,incidentId,input={},actor){
    await this.status(o,allowed,locationId);
    const resolution=String(input.resolution||"").trim().slice(0,1500);
    if(resolution.length<10){const e=new Error("Incident resolution requires detail.");e.statusCode=400;throw e;}
    await this.database.mutate(db=>{
      const incident=(db.expansionStabilizationIncidents||[]).find(x=>x.id===incidentId&&x.organizationId===o&&x.locationId===locationId);
      if(!incident){const e=new Error("Stabilization incident not found.");e.statusCode=404;throw e;}
      incident.status="RESOLVED";incident.resolvedAt=this.now();incident.resolvedBy=actor||"admin";incident.resolution=resolution;
      return true;
    });
    return this.status(o,allowed,locationId);
  }

  async status(o,allowed=[],locationId){
    const launch=await this.launch.status(o,allowed,locationId);
    const db=await this.database.read();
    const config=(db.expansionStabilizationConfig||{})[this.key(o,locationId)]||null;
    const incidents=(db.expansionStabilizationIncidents||[]).filter(x=>x.organizationId===o&&x.locationId===locationId);
    const open=incidents.filter(x=>x.status!=="RESOLVED");
    const critical=open.filter(x=>x.severity==="CRITICAL");
    const continuity=await this.continuity.evaluate(o,allowed,locationId);
    const provider=launch.provider?.bestCandidate?.provider||null;
    const providerState=continuity.providers?.find(x=>x.provider===provider)||null;
    const activationAt=launch.activation?.activatedAt||null;
    const elapsed=this.ageHours(activationAt);

    const checks={
      productionActive:launch.activation?.status==="ACTIVE",
      stabilizationConfigured:Boolean(config),
      supportOwnerAssigned:Boolean(config?.supportOwner),
      launchOwnerAssigned:Boolean(config?.launchOwner),
      supportCoverageConfirmed:Boolean(config?.supportCoverageConfirmed),
      rollbackDrillConfirmed:Boolean(config?.rollbackDrillConfirmed),
      dailyReviewConfirmed:Boolean(config?.dailyReviewConfirmed),
      providerContinuityStable:Boolean(providerState&&providerState.continuity==="STABLE"),
      providerTrusted:Boolean(providerState&&providerState.fallback==="TRUSTED_LIVE"),
      incidentVolumeWithinLimit:Boolean(config)&&open.length<=config.maxOpenIncidents,
      criticalIncidentLimitMet:Boolean(config)&&critical.length<=config.maxCriticalIncidents,
      minimumStabilizationWindowMet:Boolean(config)&&elapsed!==null&&elapsed>=config.stabilizationHours
    };

    const hardBlockers=[];
    for(const k of [
      "productionActive","stabilizationConfigured","supportOwnerAssigned","launchOwnerAssigned",
      "supportCoverageConfirmed","rollbackDrillConfirmed","providerContinuityStable","providerTrusted",
      "incidentVolumeWithinLimit","criticalIncidentLimitMet"
    ]) if(!checks[k])hardBlockers.push(k);

    const conditions=[];
    if(!checks.dailyReviewConfirmed)conditions.push("dailyReviewNotConfirmed");
    if(!checks.minimumStabilizationWindowMet)conditions.push("minimumStabilizationWindowNotMet");

    const state=hardBlockers.length?"UNSTABLE":
      conditions.length?"STABILIZING":
      "READY_TO_GRADUATE";

    const graduation=(db.expansionStabilizationGraduations||{})[this.key(o,locationId)]||null;

    return {
      version:"82.75.0",generatedAt:this.now(),organizationId:o,locationId,
      state,hardBlockers,conditions,config,
      activationAt,elapsedHours:elapsed,
      incidentSummary:{total:incidents.length,open:open.length,criticalOpen:critical.length,resolved:incidents.length-open.length},
      providerContinuity:providerState?{
        provider:providerState.provider,
        continuity:providerState.continuity,
        fallback:providerState.fallback,
        recoveryReady:providerState.recoveryReady
      }:null,
      graduation,
      policy:{
        stabilizationRequiredAfterExpansionLaunch:true,
        supportOwnershipRequired:true,
        minimumStabilizationWindowRequired:true,
        incidentThresholdsRequired:true,
        rollbackReadinessRequired:true,
        stableTrustedProviderRequired:true,
        humanGraduationRequired:true,
        noAutomaticGraduation:true,
        noAutomaticRollbackSuppression:true
      }
    };
  }

  async graduate(o,allowed=[],locationId,input={},actor){
    const status=await this.status(o,allowed,locationId);
    if(status.hardBlockers.length||status.conditions.length){
      const blockers=[...status.hardBlockers,...status.conditions];
      const e=new Error(`Expansion stabilization graduation blocked: ${blockers.join(", ")}`);e.statusCode=409;throw e;
    }
    const rationale=String(input.rationale||"").trim().slice(0,2500);
    if(rationale.length<10){const e=new Error("Graduation requires a rationale.");e.statusCode=400;throw e;}

    const record={
      id:`esg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId,status:"GRADUATED",
      graduatedAt:this.now(),graduatedBy:actor||"executive",
      rationale,
      normalOperationsEligible:true,
      autonomousProductionChangesAllowed:false,
      broaderProviderAuthorityAuthorized:false
    };
    await this.database.mutate(db=>{
      db.expansionStabilizationGraduations=db.expansionStabilizationGraduations||{};
      db.expansionStabilizationGraduationHistory=db.expansionStabilizationGraduationHistory||[];
      db.expansionStabilizationGraduations[this.key(o,locationId)]=record;
      db.expansionStabilizationGraduationHistory.push(record);
      return true;
    });
    return {graduation:record,status:await this.status(o,allowed,locationId)};
  }
}
module.exports=ExpansionStabilizationSupportControlService;
