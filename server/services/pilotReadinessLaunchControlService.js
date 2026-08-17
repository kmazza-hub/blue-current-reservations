"use strict";

class PilotReadinessLaunchControlService{
  constructor(database,configurationService,certificationService,bindingService,simulationService,acceptanceService){
    this.database=database;
    this.configurationService=configurationService;
    this.certificationService=certificationService;
    this.bindingService=bindingService;
    this.simulationService=simulationService;
    this.acceptanceService=acceptanceService;
  }
  now(){return new Date().toISOString();}

  async assess(organizationId){
    const [configuration,certification,binding,simulation,acceptance,db]=await Promise.all([
      this.configurationService.get(organizationId),
      this.certificationService.current(organizationId),
      this.bindingService.current(organizationId),
      this.simulationService.status(organizationId),
      this.acceptanceService.current(organizationId),
      this.database.read()
    ]);
    const holds=(db.pilotLaunchHolds||[]).filter(x=>x.organizationId===organizationId&&x.status==="ACTIVE");
    const checks={
      restaurantConfigurationReady:configuration.readiness?.ready===true,
      locationCertificationCurrent:certification.current===true,
      workflowBindingCurrent:binding.ready===true,
      serviceSimulationCurrent:simulation.current===true,
      operatorAcceptanceCurrent:acceptance.current===true,
      noActiveLaunchHolds:holds.length===0,
      providerWriteBackLockedOff:configuration.configuration?.pilot?.writeBackEnabled===false,
      autonomousProductionChangesLockedOff:configuration.configuration?.pilot?.autonomousProductionChanges===false
    };
    const blocking=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    return {
      version:"89.25.0",phase:"C",organizationId,
      gate:"PILOT_READINESS_AND_LAUNCH_CONTROL",
      decision:blocking.length?"HOLD":"GO_ELIGIBLE",
      goEligible:blocking.length===0,
      checks,blocking,
      activeHolds:holds,
      evidence:{
        configurationUpdatedAt:configuration.configuration?.updatedAt||null,
        locationCertificationId:certification.certification?.id||null,
        workflowBindingId:binding.binding?.id||null,
        simulationRunId:simulation.latest?.id||null,
        operatorAcceptanceId:acceptance.acceptance?.id||null
      },
      safety:{
        assessmentDoesNotLaunch:true,
        explicitHumanLaunchApprovalRequired:true,
        providerWriteBackEnabled:false,
        autonomousProductionChanges:false
      }
    };
  }

  async addHold(organizationId,input={},actor){
    const reason=String(input.reason||"").trim();
    if(reason.length<10){const e=new Error("A meaningful launch hold reason is required.");e.statusCode=400;throw e;}
    const hold={
      id:`plh-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,status:"ACTIVE",reason:reason.slice(0,2500),
      createdAt:this.now(),createdBy:actor||"admin"
    };
    await this.database.mutate(db=>{
      db.pilotLaunchHolds=db.pilotLaunchHolds||[];
      db.pilotLaunchHolds.push(hold);return true;
    });
    return hold;
  }

  async releaseHold(organizationId,holdId,input={},actor){
    const statement=String(input.statement||"").trim();
    if(statement.length<10){const e=new Error("A meaningful hold release statement is required.");e.statusCode=400;throw e;}
    let released=null;
    await this.database.mutate(db=>{
      const row=(db.pilotLaunchHolds||[]).find(x=>x.organizationId===organizationId&&x.id===holdId&&x.status==="ACTIVE");
      if(!row)return false;
      row.status="RELEASED";row.releasedAt=this.now();row.releasedBy=actor||"admin";row.releaseStatement=statement.slice(0,2500);
      released=row;return true;
    });
    if(!released){const e=new Error("Active launch hold not found.");e.statusCode=404;throw e;}
    return released;
  }

  async approve(organizationId,input={},actor){
    const assessment=await this.assess(organizationId);
    if(!assessment.goEligible){
      const e=new Error(`Pilot launch is on HOLD: ${assessment.blocking.join(", ")}`);
      e.statusCode=409;e.details=assessment;throw e;
    }
    const statement=String(input.statement||"").trim();
    if(statement.length<20){const e=new Error("A meaningful human pilot launch approval statement is required.");e.statusCode=400;throw e;}
    const approval={
      id:`plac-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.25.0",organizationId,status:"APPROVED_FOR_CONTROLLED_PILOT",
      approvedAt:this.now(),approvedBy:actor||"admin",
      statement:statement.slice(0,2500),evidence:assessment.evidence,
      controls:{
        controlledPilotOnly:true,
        providerWriteBackEnabled:false,
        autonomousProductionChanges:false,
        automaticExpansion:false
      }
    };
    await this.database.mutate(db=>{
      db.pilotLaunchApprovals=db.pilotLaunchApprovals||{};
      db.pilotLaunchApprovals[organizationId]=approval;
      db.pilotLaunchApprovalAudit=db.pilotLaunchApprovalAudit||[];
      db.pilotLaunchApprovalAudit.push(approval);
      return true;
    });
    return approval;
  }

  async current(organizationId){
    const [db,assessment]=await Promise.all([this.database.read(),this.assess(organizationId)]);
    const approval=(db.pilotLaunchApprovals||{})[organizationId]||null;
    const e=assessment.evidence;
    const a=approval?.evidence||{};
    const evidenceCurrent=Boolean(approval&&
      a.configurationUpdatedAt===e.configurationUpdatedAt&&
      a.locationCertificationId===e.locationCertificationId&&
      a.workflowBindingId===e.workflowBindingId&&
      a.simulationRunId===e.simulationRunId&&
      a.operatorAcceptanceId===e.operatorAcceptanceId
    );
    const current=Boolean(approval&&assessment.goEligible&&evidenceCurrent);
    return {
      version:"89.25.0",phase:"C",organizationId,
      status:current?"CONTROLLED_PILOT_APPROVED":approval?"REAPPROVAL_REQUIRED":assessment.goEligible?"AWAITING_HUMAN_GO":"HOLD",
      current,approval,assessment,
      nextGate:current?"PILOT_RUNTIME_GUARDRAILS_AND_SESSION_CONTROL":"RESOLVE_READINESS_OR_APPROVE_GO",
      safety:{automaticLaunch:false,automaticExpansion:false,providerWriteBack:false,autonomousProductionChanges:false}
    };
  }
}
module.exports=PilotReadinessLaunchControlService;
