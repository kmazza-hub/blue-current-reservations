"use strict";

class LivePilotShiftCommandService{
  constructor(database,shiftCertificationService,runtimeService,recoveryService,cutoverService,continuityService){
    this.database=database;this.shiftCertification=shiftCertificationService;this.runtime=runtimeService;
    this.recovery=recoveryService;this.cutover=cutoverService;this.continuity=continuityService;
  }
  now(){return new Date().toISOString();}
  key(org,location){return `${org}:${location}`;}

  async snapshot(organizationId,allowedLocationIds=[],locationId){
    const certification=await this.shiftCertification.evaluate(organizationId,allowedLocationIds,locationId);
    const runtime=await this.runtime.evaluate(organizationId,allowedLocationIds,locationId);
    const incidents=await this.recovery.list(organizationId,allowedLocationIds,locationId);
    const cutover=await this.cutover.status(organizationId,allowedLocationIds,locationId);
    const continuity=await this.continuity.evaluate(organizationId,allowedLocationIds,locationId);
    const db=await this.database.read();
    const active=(db.livePilotShifts||{})[this.key(organizationId,locationId)]||null;

    return {
      version:"81.0.0",generatedAt:this.now(),organizationId,locationId,
      shift:active,
      phase:active?.status==="ACTIVE"?"LIVE":active?.status==="CLOSED"?"CLOSED":"PRE_SHIFT",
      certificationDecision:certification.decision,
      runtimeState:runtime.state,
      runtimeAction:runtime.action,
      cutoverMode:cutover.mode,
      provider:cutover.provider,
      continuityDecision:continuity.decision,
      openIncidentCount:incidents.counts.open+incidents.counts.investigating,
      criticalIncidentCount:incidents.incidents.filter(x=>x.severity==="CRITICAL"&&x.status!=="RESOLVED").length,
      localFallbackAvailable:runtime.controls.localOperationsAvailable,
      externalWritesAllowed:runtime.controls.externalWritesAllowed,
      autonomousProductionChangesAllowed:false,
      command:{
        canStart:!active||active.status==="CLOSED",
        canClose:Boolean(active&&active.status==="ACTIVE"),
        operatorInterventionRequired:runtime.state!=="NORMAL"||certification.decision!=="GO",
        recommendedAction:
          runtime.state==="EMERGENCY_LOCAL"?"OPERATE_LOCAL":
          runtime.state==="DEGRADED"?"REVIEW_AND_ROLLBACK":
          certification.decision==="NO_GO"?"DO_NOT_START":
          certification.decision==="GO_WITH_CONDITIONS"?"REVIEW_CONDITIONS":
          active?.status==="ACTIVE"?"CONTINUE_SERVICE":"READY_TO_START"
      },
      policy:{
        certifiedShiftRequiredToStart:true,
        oneActiveShiftPerLocation:true,
        humanStartRequired:true,
        humanCloseRequired:true,
        localFallbackAlwaysVisible:true,
        incidentStateAlwaysVisible:true,
        authorityStateAlwaysVisible:true,
        noAutonomousProductionChanges:true
      }
    };
  }

  async start(organizationId,allowedLocationIds=[],locationId,input={},actor){
    const db=await this.database.read();
    const prior=(db.livePilotShifts||{})[this.key(organizationId,locationId)]||null;
    if(prior?.status==="ACTIVE"){const e=new Error("A pilot shift is already active for this location.");e.statusCode=409;throw e;}

    const evaluation=await this.shiftCertification.evaluate(organizationId,allowedLocationIds,locationId);
    const currentCertification=evaluation.priorCertification;
    if(!currentCertification||!["GO","GO_WITH_CONDITIONS"].includes(currentCertification.decision)){
      const e=new Error("A current human shift certification is required before live pilot start.");e.statusCode=409;throw e;
    }
    if(evaluation.decision==="NO_GO"){
      const e=new Error(`Live pilot start blocked: ${evaluation.hardBlockers.join(", ")}`);e.statusCode=409;throw e;
    }
    if(evaluation.decision==="GO_WITH_CONDITIONS"&&!input.acceptConditions){
      const e=new Error("Current shift conditions require explicit acceptance at live start.");e.statusCode=409;throw e;
    }

    const record={
      id:`lps-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,locationId,status:"ACTIVE",
      shiftLabel:String(input.shiftLabel||currentCertification.shiftLabel||"pilot service").slice(0,120),
      startedAt:this.now(),startedBy:actor||"admin",
      certificationId:currentCertification.id,
      startDecision:evaluation.decision,
      acceptedConditions:evaluation.conditions,
      closedAt:null,closedBy:null,closeout:null
    };
    await this.database.mutate(state=>{
      state.livePilotShifts=state.livePilotShifts||{};
      state.livePilotShiftHistory=state.livePilotShiftHistory||[];
      state.livePilotShifts[this.key(organizationId,locationId)]=record;
      state.livePilotShiftHistory.push(record);
      return true;
    });
    return this.snapshot(organizationId,allowedLocationIds,locationId);
  }

  async close(organizationId,allowedLocationIds=[],locationId,input={},actor){
    const current=await this.snapshot(organizationId,allowedLocationIds,locationId);
    if(!current.shift||current.shift.status!=="ACTIVE"){const e=new Error("No active pilot shift exists for this location.");e.statusCode=409;throw e;}
    const now=this.now();
    await this.database.mutate(db=>{
      const shift=db.livePilotShifts[this.key(organizationId,locationId)];
      shift.status="CLOSED";shift.closedAt=now;shift.closedBy=actor||"admin";
      shift.closeout={
        serviceOutcome:String(input.serviceOutcome||"").slice(0,1000),
        operatorNotes:String(input.operatorNotes||"").slice(0,2000),
        guestImpact:String(input.guestImpact||"").slice(0,1000),
        followUpRequired:Boolean(input.followUpRequired),
        incidentCountAtClose:current.openIncidentCount,
        criticalIncidentCountAtClose:current.criticalIncidentCount,
        runtimeStateAtClose:current.runtimeState,
        cutoverModeAtClose:current.cutoverMode
      };
      return true;
    });
    return this.snapshot(organizationId,allowedLocationIds,locationId);
  }
}
module.exports=LivePilotShiftCommandService;
