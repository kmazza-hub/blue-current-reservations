"use strict";

class PilotOperatorAcceptanceService{
  constructor(database,simulationService,bindingService){
    this.database=database;
    this.simulationService=simulationService;
    this.bindingService=bindingService;
  }
  now(){return new Date().toISOString();}
  dimensions(){return [
    {id:"clarity",label:"Operational clarity"},
    {id:"usefulness",label:"Decision usefulness"},
    {id:"responseQuality",label:"Response quality"},
    {id:"workflowFriction",label:"Workflow friction"},
    {id:"exceptionHandling",label:"Exception handling"},
    {id:"serviceFit",label:"Fit during live service"},
    {id:"trust",label:"Operator trust"}
  ];}

  workflowSteps(){return [
    "launch","reservation","arrival","waitlist","seating",
    "floor","service","kitchen","staff","interruption-recovery"
  ];}

  validateObservation(input,binding){
    const score=Number(input.score);
    if(!this.dimensions().some(x=>x.id===input.dimension)) return "Unknown acceptance dimension.";
    if(!Number.isFinite(score)||score<1||score>5) return "score must be between 1 and 5.";
    if(String(input.note||"").trim().length<10) return "A meaningful operator note is required.";
    if(input.evidenceType!=="PHYSICAL_IPAD") return "evidenceType must be PHYSICAL_IPAD.";
    if(!["LAN","HOSTED_PILOT"].includes(input.environment)) return "environment must be LAN or HOSTED_PILOT.";
    if(!this.workflowSteps().includes(input.workflowStep)) return "Unknown physical acceptance workflow step.";
    if(!String(input.deviceId||"").trim()) return "deviceId is required.";
    if(!String(input.deviceModel||"").trim()) return "deviceModel is required.";
    if(!String(input.osVersion||"").trim()) return "osVersion is required.";
    if(!String(input.network||"").trim()) return "network is required.";
    if(!String(input.operatorName||"").trim()) return "operatorName is required.";
    if(!String(input.locationId||"").trim()) return "locationId is required.";
    if(binding?.binding?.locationId&&input.locationId!==binding.binding.locationId) return "Observation location does not match the current pilot binding.";
    if(!["CLEAR","FRICTION","BLOCKED"].includes(input.outcome)) return "outcome must be CLEAR, FRICTION, or BLOCKED.";
    const capturedAt=new Date(input.capturedAt).getTime();
    if(!input.capturedAt||Number.isNaN(capturedAt)||capturedAt>Date.now()+60_000) return "capturedAt must be a valid non-future timestamp.";
    return null;
  }

  async observe(organizationId,input={},actor){
    const [simulation,binding]=await Promise.all([
      this.simulationService.status(organizationId),
      this.bindingService.current(organizationId)
    ]);
    if(!simulation.current||!binding.ready){
      const e=new Error("Current service simulation and workflow binding are required before operator observation.");
      e.statusCode=409;throw e;
    }
    const error=this.validateObservation(input,binding);
    if(error){const e=new Error(error);e.statusCode=400;throw e;}
    const row={
      id:`poa-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.0.0",organizationId,
      bindingId:binding.binding.id,
      simulationRunId:simulation.latest.id,
      dimension:input.dimension,
      workflowStep:input.workflowStep,
      evidenceType:"PHYSICAL_IPAD",
      environment:input.environment,
      deviceId:String(input.deviceId).trim().slice(0,160),
      deviceModel:String(input.deviceModel).trim().slice(0,160),
      osVersion:String(input.osVersion).trim().slice(0,80),
      network:String(input.network).trim().slice(0,160),
      operatorName:String(input.operatorName).trim().slice(0,160),
      locationId:String(input.locationId).trim().slice(0,160),
      outcome:input.outcome,
      capturedAt:new Date(input.capturedAt).toISOString(),
      score:Number(input.score),
      note:String(input.note).trim().slice(0,2500),
      blocker:input.outcome==="BLOCKED"||Boolean(input.blocker),
      observedAt:this.now(),
      observedBy:actor||"operator"
    };
    await this.database.mutate(db=>{
      db.pilotOperatorObservations=db.pilotOperatorObservations||[];
      db.pilotOperatorObservations.push(row);
      return true;
    });
    return row;
  }

  async assess(organizationId){
    const [db,simulation,binding]=await Promise.all([
      this.database.read(),
      this.simulationService.status(organizationId),
      this.bindingService.current(organizationId)
    ]);
    const observations=(db.pilotOperatorObservations||[]).filter(x=>
      x.organizationId===organizationId &&
      x.bindingId===binding.binding?.id &&
      x.simulationRunId===simulation.latest?.id&&
      x.evidenceType==="PHYSICAL_IPAD"
    );
    const byDimension={};
    for(const dimension of this.dimensions()){
      const rows=observations.filter(x=>x.dimension===dimension.id);
      byDimension[dimension.id]={
        label:dimension.label,
        count:rows.length,
        average:rows.length?Number((rows.reduce((a,x)=>a+x.score,0)/rows.length).toFixed(2)):null,
        blockers:rows.filter(x=>x.blocker).length
      };
    }
    const missing=this.dimensions().filter(x=>!byDimension[x.id].count).map(x=>x.id);
    const blockers=observations.filter(x=>x.blocker);
    const lowScores=Object.entries(byDimension).filter(([,x])=>x.average!==null&&x.average<3.5).map(([id])=>id);
    const missingWorkflowSteps=this.workflowSteps().filter(step=>!observations.some(x=>x.workflowStep===step));
    const missingHostedWorkflowSteps=this.workflowSteps().filter(step=>!observations.some(x=>x.workflowStep===step&&x.environment==="HOSTED_PILOT"));
    const locationMismatch=observations.some(x=>binding.binding?.locationId&&x.locationId!==binding.binding.locationId);
    const ready=Boolean(simulation.current&&binding.ready&&missing.length===0&&missingWorkflowSteps.length===0&&missingHostedWorkflowSteps.length===0&&blockers.length===0&&lowScores.length===0&&!locationMismatch);
    return {
      version:"89.0.0",phase:"C",organizationId,
      gate:"PILOT_OBSERVATION_AND_OPERATOR_ACCEPTANCE",
      status:ready?"ACCEPTANCE_READY":"OBSERVATION_REQUIRED",
      ready,dimensions:byDimension,missingDimensions:missing,
      workflowSteps:this.workflowSteps(),missingWorkflowSteps,missingHostedWorkflowSteps,
      physicalDeviceCount:new Set(observations.map(x=>x.deviceId)).size,
      locationMismatch,
      blockerCount:blockers.length,lowScoreDimensions:lowScores,
      observations,
      policy:{
        minimumAverageScore:3.5,
        everyDimensionRequired:true,
        unresolvedBlockersAllowed:false,
        humanAcceptanceRequired:true,
        physicalIPadEvidenceRequired:true,
        completeWorkflowEvidenceRequired:true,
        hostedPilotEvidenceRequired:true,
        simulationDoesNotSelfApprove:true,
        autonomousProductionChanges:false
      }
    };
  }

  async accept(organizationId,input={},actor){
    const assessment=await this.assess(organizationId);
    if(!assessment.ready){
      const e=new Error("Operator acceptance cannot be recorded until all observation gates pass.");
      e.statusCode=409;e.details=assessment;throw e;
    }
    const statement=String(input.statement||"").trim();
    if(statement.length<15){const e=new Error("A meaningful human acceptance statement is required.");e.statusCode=400;throw e;}
    if(input.physicalDeviceConfirmed!==true||input.hostedEnvironmentConfirmed!==true){const e=new Error("Physical device and hosted environment confirmation are required.");e.statusCode=400;throw e;}
    const simulation=await this.simulationService.status(organizationId);
    const binding=await this.bindingService.current(organizationId);
    const acceptance={
      id:`poac-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.0.0",organizationId,status:"ACCEPTED",
      bindingId:binding.binding.id,simulationRunId:simulation.latest.id,
      acceptedAt:this.now(),acceptedBy:actor||"operator",
      statement:statement.slice(0,2500),
      physicalDeviceConfirmed:true,
      hostedEnvironmentConfirmed:true,
      physicalDeviceCount:assessment.physicalDeviceCount,
      providerWriteBackEnabled:false,
      autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{
      db.pilotOperatorAcceptances=db.pilotOperatorAcceptances||{};
      db.pilotOperatorAcceptances[organizationId]=acceptance;
      return true;
    });
    return acceptance;
  }

  async current(organizationId){
    const [db,assessment,simulation,binding]=await Promise.all([
      this.database.read(),this.assess(organizationId),
      this.simulationService.status(organizationId),this.bindingService.current(organizationId)
    ]);
    const acceptance=(db.pilotOperatorAcceptances||{})[organizationId]||null;
    const current=Boolean(
      acceptance&&assessment.ready&&
      acceptance.bindingId===binding.binding?.id&&
      acceptance.simulationRunId===simulation.latest?.id
    );
    return {
      version:"89.0.0",phase:"C",organizationId,
      status:current?"OPERATOR_ACCEPTED":acceptance?"REACCEPTANCE_REQUIRED":"NOT_ACCEPTED",
      current,acceptance,assessment,
      nextGate:current?"PILOT_READINESS_AND_LAUNCH_CONTROL":"COMPLETE_OPERATOR_ACCEPTANCE",
      safety:{externalProviderWriteBack:false,autonomousProductionChanges:false}
    };
  }
}
module.exports=PilotOperatorAcceptanceService;
