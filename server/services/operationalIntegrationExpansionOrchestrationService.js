"use strict";

class OperationalIntegrationExpansionOrchestrationService {
  constructor(database,auditService,realtimeHub,expansionRepeatabilityCertificationService,multiLocationExpansionControlService,expansionCohortObservationService){
    Object.assign(this,{database,auditService,realtimeHub,expansionRepeatabilityCertificationService,multiLocationExpansionControlService,expansionCohortObservationService});
  }
  now(){return new Date().toISOString();}
  async plans(org){
    const db=await this.database.read();
    return (db.operationalExpansionOrchestrationPlans||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }
  async decisions(org){
    const db=await this.database.read();
    return (db.operationalExpansionOrchestrationDecisions||[]).filter(x=>x.organizationId===org).sort((a,b)=>new Date(b.decidedAt)-new Date(a.decidedAt));
  }
  async snapshot(org,allowed){
    const [repeatability,expansion,cohortObservation,plans,decisions]=await Promise.all([
      this.expansionRepeatabilityCertificationService.snapshot(org,allowed),
      this.multiLocationExpansionControlService.snapshot(org,allowed),
      this.expansionCohortObservationService.snapshot(org,allowed),
      this.plans(org),this.decisions(org)
    ]);

    const plan=plans[0]||null;
    const decision=decisions.find(x=>x.planId===plan?.id)||null;
    const certificationReady=repeatability.certification?.status==="REPEATABILITY_CERTIFIED";
    const approvedTargets=expansion.approvedTargets||[];
    const cohortState=cohortObservation.cohorts||[];
    const staged=plan?.stages||[];

    const checks=[
      {id:"REPEATABILITY_CERTIFIED",passed:certificationReady,actual:repeatability.certification?.status||"not certified"},
      {id:"ROLLOUT_TEMPLATE_AVAILABLE",passed:!!repeatability.rolloutTemplate,actual:repeatability.rolloutTemplate?"available":"missing"},
      {id:"APPROVED_TARGETS_AVAILABLE",passed:approvedTargets.length>0,actual:`${approvedTargets.length} approved target(s)`},
      {id:"ORCHESTRATION_PLAN",passed:!!plan,actual:plan?.name||"not defined"},
      {id:"STAGED_SEQUENCE",passed:staged.length>0&&staged.every((x,i)=>x.sequence===i+1),actual:`${staged.length} stage(s)`},
      {id:"OWNER_MATRIX",passed:!!plan?.owners?.executive&&!!plan?.owners?.operations&&!!plan?.owners?.technical&&!!plan?.owners?.support,actual:plan?.owners?.executive?"complete":"incomplete"},
      {id:"CAPACITY_LIMIT",passed:Number(plan?.capacity?.maxConcurrentLocations)>0&&Number(plan?.capacity?.maxConcurrentIncidents)>=0,actual:plan?`${plan.capacity.maxConcurrentLocations} locations / ${plan.capacity.maxConcurrentIncidents} incidents`:"not set"},
      {id:"DEPENDENCY_MATRIX",passed:!!plan?.dependencies?.configuration&&!!plan?.dependencies?.connectors&&!!plan?.dependencies?.training&&!!plan?.dependencies?.support&&!!plan?.dependencies?.rollback,actual:plan?.dependencies?.configuration?"complete":"incomplete"},
      {id:"OPERATING_HANDOFF",passed:!!plan?.operatingHandoff,actual:plan?.operatingHandoff?"recorded":"missing"},
      {id:"ESCALATION_MODEL",passed:!!plan?.escalationModel,actual:plan?.escalationModel?"recorded":"missing"},
      {id:"OBSERVATION_MODEL",passed:!!plan?.observationModel,actual:plan?.observationModel?"recorded":"missing"},
      {id:"CHANGE_FREEZE_RULE",passed:!!plan?.changeFreezeRule,actual:plan?.changeFreezeRule?"recorded":"missing"},
      {id:"HUMAN_ORCHESTRATION_DECISION",passed:!!decision,actual:decision?.decision||"not decided"}
    ];

    const readyWithoutDecision=checks.slice(0,-1).every(x=>x.passed);
    return {
      version:"52.75.0",
      generatedAt:this.now(),
      status:decision?.decision==="READY"?"operational-orchestration-ready":
             decision?.decision==="PAUSE"?"operational-orchestration-paused":
             decision?.decision==="HOLD"?"operational-orchestration-held":
             plan?"operational-orchestration-in-review":"operational-orchestration-required",
      headline:`${checks.filter(x=>x.passed).length}/${checks.length} orchestration gates pass; ${approvedTargets.length} approved target(s); ${staged.length} stage(s).`,
      repeatabilityStatus:repeatability.status,
      certificationReady,
      rolloutTemplate:repeatability.rolloutTemplate||null,
      approvedTargets,
      priorCohortState:cohortState.map(x=>({cohortId:x.cohortId,cohortName:x.cohortName,state:x.state,decision:x.decision?.decision||null})),
      plan,decision,checks,readyWithoutDecision,
      policy:{
        repeatabilityCertificationRequired:true,
        stagedSequenceRequired:true,
        ownerMatrixRequired:true,
        capacityLimitsRequired:true,
        dependencyMatrixRequired:true,
        operatingHandoffRequired:true,
        escalationModelRequired:true,
        observationModelRequired:true,
        changeFreezeRuleRequired:true,
        humanReadyPauseHoldDecisionRequired:true,
        readyDecisionDoesNotDeploy:true,
        readyDecisionDoesNotActivateLocations:true,
        pauseHoldDoNotMutateRestaurantState:true,
        noAutomaticExpansionOrchestration:true,
        autonomousProductionChanges:false
      }
    };
  }
  async createPlan(org,allowed,input,actor){
    const repeatability=await this.expansionRepeatabilityCertificationService.snapshot(org,allowed);
    if(repeatability.certification?.status!=="REPEATABILITY_CERTIFIED")throw new Error("Repeatability certification is required before operational orchestration.");
    const expansion=await this.multiLocationExpansionControlService.snapshot(org,allowed);
    const approved=new Set((expansion.approvedTargets||[]).map(x=>x.locationId));
    const stages=Array.isArray(input.stages)?input.stages:[];
    if(!stages.length)throw new Error("At least one orchestration stage is required.");
    const normalizedStages=stages.map((stage,i)=>{
      const ids=(Array.isArray(stage.locationIds)?stage.locationIds:[]).filter(id=>approved.has(id));
      if(!ids.length)throw new Error(`Stage ${i+1} requires at least one approved target location.`);
      const entryCriteria=String(stage.entryCriteria||"").trim(),exitCriteria=String(stage.exitCriteria||"").trim();
      if(!entryCriteria||!exitCriteria)throw new Error(`Stage ${i+1} requires entry and exit criteria.`);
      return {
        id:`stage_${i+1}`,sequence:i+1,name:String(stage.name||`Stage ${i+1}`).trim().slice(0,160),
        locationIds:ids,
        entryCriteria:entryCriteria.slice(0,2600),
        exitCriteria:exitCriteria.slice(0,2600),
        observationWindow:String(stage.observationWindow||"").trim().slice(0,240),
        status:"PLANNED"
      };
    });
    const owners={
      executive:String(input.executiveOwner||"").trim(),
      operations:String(input.operationsOwner||"").trim(),
      technical:String(input.technicalOwner||"").trim(),
      support:String(input.supportOwner||"").trim()
    };
    if(Object.values(owners).some(x=>!x))throw new Error("Executive, operations, technical, and support owners are required.");
    const capacity={
      maxConcurrentLocations:Math.max(1,Number(input.maxConcurrentLocations)||0),
      maxConcurrentIncidents:Math.max(0,Number(input.maxConcurrentIncidents)||0)
    };
    const dependencies={
      configuration:String(input.configurationDependency||"").trim(),
      connectors:String(input.connectorDependency||"").trim(),
      training:String(input.trainingDependency||"").trim(),
      support:String(input.supportDependency||"").trim(),
      rollback:String(input.rollbackDependency||"").trim()
    };
    if(Object.values(dependencies).some(x=>!x))throw new Error("Configuration, connector, training, support, and rollback dependencies are required.");
    for(const key of ["operatingHandoff","escalationModel","observationModel","changeFreezeRule","evidence"]){
      if(!String(input[key]||"").trim())throw new Error(`${key} is required.`);
    }
    const record={
      id:`oeo_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId:org,status:"ACTIVE",createdAt:this.now(),createdBy:actor,
      name:String(input.name||"Operational Expansion Orchestration").trim().slice(0,180),
      repeatabilityCertificationId:repeatability.certification.id,
      rolloutTemplate:repeatability.rolloutTemplate,
      stages:normalizedStages,owners,capacity,dependencies,
      operatingHandoff:String(input.operatingHandoff).trim().slice(0,3500),
      escalationModel:String(input.escalationModel).trim().slice(0,3500),
      observationModel:String(input.observationModel).trim().slice(0,3500),
      changeFreezeRule:String(input.changeFreezeRule).trim().slice(0,3000),
      evidence:String(input.evidence).trim().slice(0,4000),
      note:String(input.note||"").trim().slice(0,1800),
      deploymentPerformed:false,locationsActivated:false,restaurantStateMutated:false
    };
    await this.database.mutate(db=>{
      db.operationalExpansionOrchestrationPlans||=[];
      for(const x of db.operationalExpansionOrchestrationPlans.filter(x=>x.organizationId===org&&x.status==="ACTIVE"))x.status="SUPERSEDED";
      db.operationalExpansionOrchestrationPlans.push(record);
      return record;
    });
    await this.auditService.record({organizationId:org,actor,action:"Operational expansion orchestration plan created; no deployment or activation performed",category:"operational_orchestration"});
    this.realtimeHub.publish("operational-orchestration:plan-created",{organizationId:org,id:record.id});
    return record;
  }
  async decide(org,allowed,planId,input,actor){
    const state=await this.snapshot(org,allowed);
    if(!state.plan||state.plan.id!==planId)throw new Error("Active orchestration plan not found.");
    const decision=String(input.decision||"").toUpperCase();
    const evidence=String(input.evidence||"").trim(),reason=String(input.reason||"").trim();
    if(!["READY","PAUSE","HOLD"].includes(decision))throw new Error("Decision must be READY, PAUSE, or HOLD.");
    if(!evidence)throw new Error("Human orchestration decision evidence is required.");
    if(decision==="READY"&&!state.readyWithoutDecision&&!reason)throw new Error("READY with open orchestration gates requires an executive override reason.");
    if(["PAUSE","HOLD"].includes(decision)&&!reason)throw new Error(`${decision} requires a documented human reason.`);
    const record={
      id:`oed_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,planId,
      decision,decidedAt:this.now(),decidedBy:actor,evidence:evidence.slice(0,4000),reason:reason.slice(0,2400),
      gateSnapshot:{passed:state.checks.filter(x=>x.passed).length,total:state.checks.length,checks:state.checks},
      deploymentPerformedByDecision:false,locationsActivatedByDecision:false,
      restaurantStateMutatedByDecision:false,autonomousProductionChanges:false
    };
    await this.database.mutate(db=>{db.operationalExpansionOrchestrationDecisions||=[];db.operationalExpansionOrchestrationDecisions.push(record);return record;});
    await this.auditService.record({organizationId:org,actor,action:`Operational orchestration decision ${decision} recorded; no deployment or activation executed`,category:"operational_orchestration"});
    this.realtimeHub.publish("operational-orchestration:decision",{organizationId:org,planId,id:record.id,decision});
    return record;
  }
}
module.exports=OperationalIntegrationExpansionOrchestrationService;
