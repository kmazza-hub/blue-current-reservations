"use strict";

class PilotShiftCertificationService{
  constructor(database,runtimeService,recoveryService,continuityService,cutoverService){
    this.database=database;this.runtime=runtimeService;this.recovery=recoveryService;
    this.continuity=continuityService;this.cutover=cutoverService;
  }
  now(){return new Date().toISOString();}
  key(org,location){return `${org}:${location}`;}

  async evaluate(organizationId,allowedLocationIds=[],locationId){
    const db=await this.database.read();
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId&&allowed(x.id));
    if(!location){const e=new Error("Pilot shift location is not authorized.");e.statusCode=403;throw e;}

    const runtime=await this.runtime.evaluate(organizationId,allowedLocationIds,locationId);
    const recovery=await this.recovery.list(organizationId,allowedLocationIds,locationId);
    const continuity=await this.continuity.evaluate(organizationId,allowedLocationIds,locationId);
    const cutover=await this.cutover.status(organizationId,allowedLocationIds,locationId);
    const operator=(db.pilotShiftOperatorReadiness||{})[this.key(organizationId,locationId)]||{};
    const unresolvedCritical=recovery.incidents.filter(x=>x.severity==="CRITICAL"&&x.status!=="RESOLVED");
    const unresolvedAny=recovery.incidents.filter(x=>x.status!=="RESOLVED");
    const provider=cutover.provider;
    const providerState=continuity.providers.find(x=>x.provider===provider)||null;

    const checks={
      localFallbackAvailable:runtime.controls.localOperationsAvailable===true,
      noCriticalIncident:unresolvedCritical.length===0,
      runtimeNotEmergency:runtime.state!=="EMERGENCY_LOCAL",
      runtimeNotOperatorHold:runtime.state!=="OPERATOR_HOLD",
      operatorLeadAssigned:Boolean(operator.leadName),
      operatorBriefingConfirmed:Boolean(operator.briefingConfirmed),
      rollbackProcedureConfirmed:Boolean(operator.rollbackProcedureConfirmed),
      emergencyContactConfirmed:Boolean(operator.emergencyContactConfirmed),
      providerContinuityAcceptable:cutover.mode!=="PROVIDER_AUTHORITY" || providerState?.continuity==="STABLE",
      providerTrustAcceptable:cutover.mode!=="PROVIDER_AUTHORITY" || providerState?.fallback==="TRUSTED_LIVE"
    };

    const hardBlockers=[];
    if(!checks.localFallbackAvailable)hardBlockers.push("localFallbackUnavailable");
    if(!checks.noCriticalIncident)hardBlockers.push("unresolvedCriticalIncident");
    if(!checks.runtimeNotEmergency)hardBlockers.push("emergencyLocalModeActive");
    if(!checks.providerContinuityAcceptable)hardBlockers.push("providerContinuityNotStable");
    if(!checks.providerTrustAcceptable)hardBlockers.push("providerNotTrusted");

    const conditions=[];
    if(!checks.runtimeNotOperatorHold)conditions.push("operatorHoldActive");
    if(!checks.operatorLeadAssigned)conditions.push("operatorLeadNotAssigned");
    if(!checks.operatorBriefingConfirmed)conditions.push("operatorBriefingNotConfirmed");
    if(!checks.rollbackProcedureConfirmed)conditions.push("rollbackProcedureNotConfirmed");
    if(!checks.emergencyContactConfirmed)conditions.push("emergencyContactNotConfirmed");
    if(unresolvedAny.length&&!unresolvedCritical.length)conditions.push("nonCriticalIncidentsOpen");

    const decision=hardBlockers.length?"NO_GO":conditions.length?"GO_WITH_CONDITIONS":"GO";
    const prior=(db.pilotShiftCertifications||{})[this.key(organizationId,locationId)]||null;

    return {
      version:"80.75.0",generatedAt:this.now(),organizationId,
      location:{id:location.id,name:location.name},
      decision,checks,hardBlockers,conditions,
      runtimeState:runtime.state,
      cutoverMode:cutover.mode,
      activeProvider:provider,
      operatorReadiness:operator,
      unresolvedIncidentCount:unresolvedAny.length,
      priorCertification:prior,
      policy:{
        preShiftCertificationRequired:true,
        humanCertificationRequired:true,
        noGoCannotBeOverriddenByAutomation:true,
        localFallbackRequired:true,
        unresolvedCriticalIncidentBlocksShift:true,
        providerContinuityRequiredForProviderAuthority:true,
        goDoesNotEnableAutonomousProductionChanges:true
      }
    };
  }

  async setOperatorReadiness(organizationId,allowedLocationIds=[],locationId,input={},actor){
    await this.evaluate(organizationId,allowedLocationIds,locationId);
    const readiness={
      leadName:String(input.leadName||"").trim().slice(0,120),
      briefingConfirmed:Boolean(input.briefingConfirmed),
      rollbackProcedureConfirmed:Boolean(input.rollbackProcedureConfirmed),
      emergencyContactConfirmed:Boolean(input.emergencyContactConfirmed),
      notes:String(input.notes||"").slice(0,1000),
      updatedAt:this.now(),updatedBy:actor||"operator"
    };
    await this.database.mutate(db=>{
      db.pilotShiftOperatorReadiness=db.pilotShiftOperatorReadiness||{};
      db.pilotShiftOperatorReadiness[this.key(organizationId,locationId)]=readiness;return true;
    });
    return this.evaluate(organizationId,allowedLocationIds,locationId);
  }

  async certify(organizationId,allowedLocationIds=[],locationId,input={},actor){
    const evaluation=await this.evaluate(organizationId,allowedLocationIds,locationId);
    if(evaluation.decision==="NO_GO"){
      const e=new Error(`Pilot shift certification blocked: ${evaluation.hardBlockers.join(", ")}`);e.statusCode=409;throw e;
    }
    if(evaluation.decision==="GO_WITH_CONDITIONS"&&!input.acceptConditions){
      const e=new Error("Pilot shift has conditions that require explicit human acceptance.");e.statusCode=409;throw e;
    }
    const certification={
      id:`psc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,locationId,
      decision:evaluation.decision,
      conditions:evaluation.conditions,
      certifiedAt:this.now(),
      certifiedBy:actor||"admin",
      shiftLabel:String(input.shiftLabel||"pilot service").slice(0,120),
      notes:String(input.notes||"").slice(0,1000),
      autonomousProductionChangesAllowed:false
    };
    await this.database.mutate(db=>{
      db.pilotShiftCertifications=db.pilotShiftCertifications||{};
      db.pilotShiftCertificationHistory=db.pilotShiftCertificationHistory||[];
      db.pilotShiftCertifications[this.key(organizationId,locationId)]=certification;
      db.pilotShiftCertificationHistory.push(certification);
      return true;
    });
    return {certification,evaluation:await this.evaluate(organizationId,allowedLocationIds,locationId)};
  }
}
module.exports=PilotShiftCertificationService;
