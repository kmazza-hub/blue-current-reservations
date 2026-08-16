"use strict";

class ExpansionLaunchCertificationActivationService{
  constructor(database,locationReadinessService,providerReadinessService,continuityService){
    this.database=database;
    this.locationReadiness=locationReadinessService;
    this.providerReadiness=providerReadinessService;
    this.continuity=continuityService;
  }

  now(){return new Date().toISOString();}
  key(o,l){return `${o}:${l}`;}

  async status(o,allowed=[],locationId){
    const readiness=await this.locationReadiness.evaluate(o,allowed,locationId);
    const db=await this.database.read();
    const prep=(db.expansionRolloutPrepApprovals||{})[this.key(o,locationId)]||null;
    const activation=(db.expansionProductionActivations||{})[this.key(o,locationId)]||null;

    let provider=null,continuity=null;
    try{provider=await this.providerReadiness.evaluate(o,allowed,locationId);}catch{}
    try{continuity=await this.continuity.evaluate(o,allowed,locationId);}catch{}

    const providerCandidate=provider?.bestCandidate||null;
    const providerContinuity=continuity?.providers?.find(x=>x.provider===providerCandidate?.provider)||null;

    const checks={
      rolloutPrepApproved:Boolean(prep&&prep.status==="ROLLOUT_PREP_APPROVED"),
      locationReadinessAcceptable:["READY_FOR_ROLLOUT_PREP","READY_WITH_CONDITIONS"].includes(readiness.decision),
      launchOwnerAssigned:Boolean(readiness.ownership?.launchOwner),
      trainingLeadAssigned:Boolean(readiness.ownership?.trainingLead),
      supportOwnerAssigned:Boolean(readiness.ownership?.supportOwner),
      fallbackConfirmed:Boolean(readiness.checks?.fallbackProcedureConfirmed),
      supportCoverageConfirmed:Boolean(readiness.checks?.supportCoverageConfirmed),
      emergencyContactsConfirmed:Boolean(readiness.checks?.emergencyContactsConfirmed),
      providerMapped:Boolean(readiness.checks?.providerLocationMapped),
      providerReady:Boolean(provider&&provider.decision==="READY"),
      providerContinuityStable:Boolean(providerContinuity&&providerContinuity.continuity==="STABLE"),
      providerTrusted:Boolean(providerContinuity&&providerContinuity.fallback==="TRUSTED_LIVE")
    };

    const hardBlockers=[];
    for(const k of [
      "rolloutPrepApproved","locationReadinessAcceptable","launchOwnerAssigned",
      "fallbackConfirmed","supportCoverageConfirmed","emergencyContactsConfirmed",
      "providerMapped","providerReady","providerContinuityStable","providerTrusted"
    ]) if(!checks[k]) hardBlockers.push(k);

    const conditions=[];
    for(const k of ["trainingLeadAssigned","supportOwnerAssigned"]) if(!checks[k]) conditions.push(k);

    const canCertify=hardBlockers.length===0;
    const active=activation?.status==="ACTIVE";

    return {
      version:"82.50.0",generatedAt:this.now(),organizationId:o,locationId,
      state:active?"PRODUCTION_ACTIVE":canCertify?(conditions.length?"CERTIFIABLE_WITH_CONDITIONS":"CERTIFIABLE"):"BLOCKED",
      checks,hardBlockers,conditions,
      rolloutPrepApproval:prep,
      activation,
      provider:provider?{
        decision:provider.decision,
        bestCandidate:provider.bestCandidate,
        readyProviders:provider.readyProviders
      }:null,
      continuity:providerContinuity?{
        provider:providerContinuity.provider,
        continuity:providerContinuity.continuity,
        fallback:providerContinuity.fallback,
        recoveryReady:providerContinuity.recoveryReady
      }:null,
      policy:{
        rolloutPrepRequired:true,
        explicitLaunchCertificationRequired:true,
        explicitHumanActivationRequired:true,
        stableTrustedProviderRequired:true,
        localFallbackRequired:true,
        productionActivationDoesNotGrantBroaderProviderAuthority:true,
        noAutomaticActivation:true,
        rollbackAvailable:true,
        noAutomaticMultiLocationActivation:true
      }
    };
  }

  async certify(o,allowed=[],locationId,input={},actor){
    const status=await this.status(o,allowed,locationId);
    if(status.hardBlockers.length){
      const e=new Error(`Expansion launch certification blocked: ${status.hardBlockers.join(", ")}`);
      e.statusCode=409;throw e;
    }
    if(status.conditions.length&&!input.acceptConditions){
      const e=new Error("Launch conditions require explicit human acceptance.");
      e.statusCode=409;throw e;
    }

    const certification={
      id:`elc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId,status:"CERTIFIED",
      conditions:status.conditions,
      certifiedAt:this.now(),certifiedBy:actor||"executive",
      rationale:String(input.rationale||"").trim().slice(0,2500),
      productionActivationAuthorized:true,
      broaderProviderAuthorityAuthorized:false,
      multiLocationActivationAuthorized:false
    };
    if(certification.rationale.length<10){
      const e=new Error("Launch certification requires a rationale.");e.statusCode=400;throw e;
    }

    await this.database.mutate(db=>{
      db.expansionLaunchCertifications=db.expansionLaunchCertifications||{};
      db.expansionLaunchCertificationHistory=db.expansionLaunchCertificationHistory||[];
      db.expansionLaunchCertifications[this.key(o,locationId)]=certification;
      db.expansionLaunchCertificationHistory.push(certification);
      return true;
    });
    return {certification,status:await this.status(o,allowed,locationId)};
  }

  async activate(o,allowed=[],locationId,input={},actor){
    const db=await this.database.read();
    const cert=(db.expansionLaunchCertifications||{})[this.key(o,locationId)]||null;
    if(!cert||cert.status!=="CERTIFIED"||!cert.productionActivationAuthorized){
      const e=new Error("A valid launch certification is required before production activation.");
      e.statusCode=409;throw e;
    }

    const status=await this.status(o,allowed,locationId);
    if(status.hardBlockers.length){
      const e=new Error(`Production activation blocked by current conditions: ${status.hardBlockers.join(", ")}`);
      e.statusCode=409;throw e;
    }

    const record={
      id:`epa-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId:o,locationId,status:"ACTIVE",
      certificationId:cert.id,
      activatedAt:this.now(),activatedBy:actor||"executive",
      launchWindow:String(input.launchWindow||"").slice(0,120),
      notes:String(input.notes||"").slice(0,2000),
      providerAuthorityScope:"UNCHANGED",
      autonomousProductionChangesAllowed:false,
      rollbackAvailable:true
    };

    await this.database.mutate(state=>{
      state.expansionProductionActivations=state.expansionProductionActivations||{};
      state.expansionProductionActivationHistory=state.expansionProductionActivationHistory||[];
      state.expansionProductionActivations[this.key(o,locationId)]=record;
      state.expansionProductionActivationHistory.push(record);
      return true;
    });

    return this.status(o,allowed,locationId);
  }

  async rollback(o,allowed=[],locationId,input={},actor){
    const current=await this.status(o,allowed,locationId);
    if(current.activation?.status!=="ACTIVE"){
      const e=new Error("No active expansion production activation exists.");
      e.statusCode=409;throw e;
    }
    const reason=String(input.reason||"").trim().slice(0,2000);
    if(reason.length<10){const e=new Error("Rollback requires a reason.");e.statusCode=400;throw e;}

    const now=this.now();
    await this.database.mutate(db=>{
      const current=db.expansionProductionActivations[this.key(o,locationId)];
      current.status="ROLLED_BACK";
      current.rolledBackAt=now;
      current.rolledBackBy=actor||"executive";
      current.rollbackReason=reason;
      current.productionAuthorityActive=false;
      return true;
    });
    return this.status(o,allowed,locationId);
  }
}
module.exports=ExpansionLaunchCertificationActivationService;
