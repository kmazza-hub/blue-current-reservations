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

  validateObservation(input){
    const score=Number(input.score);
    if(!this.dimensions().some(x=>x.id===input.dimension)) return "Unknown acceptance dimension.";
    if(!Number.isFinite(score)||score<1||score>5) return "score must be between 1 and 5.";
    if(String(input.note||"").trim().length<10) return "A meaningful operator note is required.";
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
    const error=this.validateObservation(input);
    if(error){const e=new Error(error);e.statusCode=400;throw e;}
    const row={
      id:`poa-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.0.0",organizationId,
      bindingId:binding.binding.id,
      simulationRunId:simulation.latest.id,
      dimension:input.dimension,
      score:Number(input.score),
      note:String(input.note).trim().slice(0,2500),
      blocker:Boolean(input.blocker),
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
      x.simulationRunId===simulation.latest?.id
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
    const ready=Boolean(simulation.current&&binding.ready&&missing.length===0&&blockers.length===0&&lowScores.length===0);
    return {
      version:"89.0.0",phase:"C",organizationId,
      gate:"PILOT_OBSERVATION_AND_OPERATOR_ACCEPTANCE",
      status:ready?"ACCEPTANCE_READY":"OBSERVATION_REQUIRED",
      ready,dimensions:byDimension,missingDimensions:missing,
      blockerCount:blockers.length,lowScoreDimensions:lowScores,
      observations,
      policy:{
        minimumAverageScore:3.5,
        everyDimensionRequired:true,
        unresolvedBlockersAllowed:false,
        humanAcceptanceRequired:true,
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
    const simulation=await this.simulationService.status(organizationId);
    const binding=await this.bindingService.current(organizationId);
    const acceptance={
      id:`poac-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      version:"89.0.0",organizationId,status:"ACCEPTED",
      bindingId:binding.binding.id,simulationRunId:simulation.latest.id,
      acceptedAt:this.now(),acceptedBy:actor||"operator",
      statement:statement.slice(0,2500),
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
