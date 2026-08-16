"use strict";

class ControlledExpansionLocationReadinessService{
  constructor(database,executiveReviewService,providerReadinessService){
    this.database=database;this.executive=executiveReviewService;this.providerReadiness=providerReadinessService;
  }
  now(){return new Date().toISOString();}
  key(o,l){return `${o}:${l}`;}

  async expansionAuthorized(o,pilotLocationId){
    const db=await this.database.read();
    const current=(db.pilotExecutiveCurrentDecision||{})[this.key(o,pilotLocationId)]||null;
    return Boolean(current&&current.decision==="EXPAND");
  }

  async setReadiness(o,allowed=[],locationId,input={},actor){
    const db=await this.database.read();
    const allowedLocation=id=>allowed.includes("*")||allowed.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===o&&x.id===locationId&&allowedLocation(x.id));
    if(!location){const e=new Error("Expansion location is not authorized.");e.statusCode=403;throw e;}

    const readiness={
      organizationId:o,locationId,
      pilotSourceLocationId:String(input.pilotSourceLocationId||"").trim(),
      launchOwner:String(input.launchOwner||"").trim().slice(0,120),
      trainingLead:String(input.trainingLead||"").trim().slice(0,120),
      supportOwner:String(input.supportOwner||"").trim().slice(0,120),
      operatingConfigurationConfirmed:Boolean(input.operatingConfigurationConfirmed),
      staffTrainingConfirmed:Boolean(input.staffTrainingConfirmed),
      managerTrainingConfirmed:Boolean(input.managerTrainingConfirmed),
      fallbackProcedureConfirmed:Boolean(input.fallbackProcedureConfirmed),
      emergencyContactsConfirmed:Boolean(input.emergencyContactsConfirmed),
      supportCoverageConfirmed:Boolean(input.supportCoverageConfirmed),
      openingHoursConfirmed:Boolean(input.openingHoursConfirmed),
      floorConfigurationConfirmed:Boolean(input.floorConfigurationConfirmed),
      menuConfigurationConfirmed:Boolean(input.menuConfigurationConfirmed),
      notes:String(input.notes||"").slice(0,2500),
      updatedAt:this.now(),updatedBy:actor||"admin"
    };
    await this.database.mutate(state=>{
      state.expansionLocationReadiness=state.expansionLocationReadiness||{};
      state.expansionLocationReadiness[this.key(o,locationId)]=readiness;return true;
    });
    return this.evaluate(o,allowed,locationId);
  }

  async evaluate(o,allowed=[],locationId){
    const db=await this.database.read();
    const allowedLocation=id=>allowed.includes("*")||allowed.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===o&&x.id===locationId&&allowedLocation(x.id));
    if(!location){const e=new Error("Expansion location is not authorized.");e.statusCode=403;throw e;}
    const config=(db.expansionLocationReadiness||{})[this.key(o,locationId)]||{};
    const pilotSource=config.pilotSourceLocationId||null;
    const executiveAuthorized=pilotSource?await this.expansionAuthorized(o,pilotSource):false;

    let provider=null;
    try{
      provider=await this.providerReadiness.evaluate(o,allowed,locationId);
    }catch{provider=null;}

    const providerCandidate=provider?.bestCandidate||null;
    const providerChecks={
      locationMapped:Boolean(providerCandidate),
      providerConnectionStarted:Boolean(provider&&provider.decision!=="NOT_CONNECTED"),
      providerReady:Boolean(provider&&provider.decision==="READY")
    };

    const checks={
      executiveExpansionApproved:executiveAuthorized,
      pilotSourceDefined:Boolean(pilotSource),
      launchOwnerAssigned:Boolean(config.launchOwner),
      trainingLeadAssigned:Boolean(config.trainingLead),
      supportOwnerAssigned:Boolean(config.supportOwner),
      operatingConfigurationConfirmed:Boolean(config.operatingConfigurationConfirmed),
      staffTrainingConfirmed:Boolean(config.staffTrainingConfirmed),
      managerTrainingConfirmed:Boolean(config.managerTrainingConfirmed),
      fallbackProcedureConfirmed:Boolean(config.fallbackProcedureConfirmed),
      emergencyContactsConfirmed:Boolean(config.emergencyContactsConfirmed),
      supportCoverageConfirmed:Boolean(config.supportCoverageConfirmed),
      openingHoursConfirmed:Boolean(config.openingHoursConfirmed),
      floorConfigurationConfirmed:Boolean(config.floorConfigurationConfirmed),
      menuConfigurationConfirmed:Boolean(config.menuConfigurationConfirmed),
      providerLocationMapped:providerChecks.locationMapped,
      providerConnectionStarted:providerChecks.providerConnectionStarted
    };

    const hardBlockers=[];
    for(const name of [
      "executiveExpansionApproved","pilotSourceDefined","launchOwnerAssigned",
      "fallbackProcedureConfirmed","emergencyContactsConfirmed","supportCoverageConfirmed",
      "operatingConfigurationConfirmed","providerLocationMapped"
    ]) if(!checks[name]) hardBlockers.push(name);

    const conditions=[];
    for(const name of [
      "trainingLeadAssigned","supportOwnerAssigned","staffTrainingConfirmed",
      "managerTrainingConfirmed","openingHoursConfirmed","floorConfigurationConfirmed",
      "menuConfigurationConfirmed","providerConnectionStarted"
    ]) if(!checks[name]) conditions.push(name);

    const decision=hardBlockers.length?"NOT_READY":conditions.length?"READY_WITH_CONDITIONS":"READY_FOR_ROLLOUT_PREP";

    return {
      version:"82.25.0",generatedAt:this.now(),organizationId:o,
      location:{id:location.id,name:location.name},
      pilotSourceLocationId:pilotSource,
      decision,checks,hardBlockers,conditions,
      providerReadiness:provider?{
        decision:provider.decision,
        bestCandidate:provider.bestCandidate,
        readyProviders:provider.readyProviders
      }:null,
      ownership:{
        launchOwner:config.launchOwner||null,
        trainingLead:config.trainingLead||null,
        supportOwner:config.supportOwner||null
      },
      policy:{
        executiveExpansionApprovalRequired:true,
        eachLocationIndependentlyCertified:true,
        localFallbackRequired:true,
        launchOwnershipRequired:true,
        providerMappingRequired:true,
        trainingRequiredBeforeLaunch:true,
        noAutomaticLocationActivation:true,
        noAutomaticMultiLocationRollout:true,
        rolloutPrepDoesNotEqualProductionCutover:true
      }
    };
  }

  async approveRolloutPrep(o,allowed=[],locationId,input={},actor){
    const evaluation=await this.evaluate(o,allowed,locationId);
    if(evaluation.decision==="NOT_READY"){
      const e=new Error(`Location rollout preparation blocked: ${evaluation.hardBlockers.join(", ")}`);e.statusCode=409;throw e;
    }
    if(evaluation.decision==="READY_WITH_CONDITIONS"&&!input.acceptConditions){
      const e=new Error("Location readiness conditions require explicit acceptance.");e.statusCode=409;throw e;
    }
    const approval={
      id:`erl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId,
      status:"ROLLOUT_PREP_APPROVED",
      conditions:evaluation.conditions,
      approvedAt:this.now(),approvedBy:actor||"executive",
      rationale:String(input.rationale||"").trim().slice(0,2500),
      productionActivationAuthorized:false,
      providerAuthorityAuthorized:false
    };
    if(approval.rationale.length<10){const e=new Error("Rollout preparation approval requires a rationale.");e.statusCode=400;throw e;}
    await this.database.mutate(db=>{
      db.expansionRolloutPrepApprovals=db.expansionRolloutPrepApprovals||{};
      db.expansionRolloutPrepHistory=db.expansionRolloutPrepHistory||[];
      db.expansionRolloutPrepApprovals[this.key(o,locationId)]=approval;
      db.expansionRolloutPrepHistory.push(approval);
      return true;
    });
    return {approval,evaluation:await this.evaluate(o,allowed,locationId)};
  }
}
module.exports=ControlledExpansionLocationReadinessService;
