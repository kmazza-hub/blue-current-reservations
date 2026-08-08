"use strict";

class ManagerOperatingRhythmService {
  constructor(database,auditService,realtimeHub,commandCenterService,hospitalityPerformanceService,hospitalityActionWorkspaceService,serviceProfitabilityIntelligenceService,predictiveShiftControlService){
    Object.assign(this,{database,auditService,realtimeHub,commandCenterService,hospitalityPerformanceService,hospitalityActionWorkspaceService,serviceProfitabilityIntelligenceService,predictiveShiftControlService});
  }
  now(){return new Date().toISOString();}
  async snapshot(organizationId,locationId="loc_marina"){
    const [db,command,performance,actions,profit,predictive]=await Promise.all([
      this.database.read(),
      this.commandCenterService.snapshot(organizationId,locationId),
      this.hospitalityPerformanceService.snapshot(organizationId,locationId),
      this.hospitalityActionWorkspaceService.list(organizationId,locationId),
      this.serviceProfitabilityIntelligenceService.snapshot(organizationId,locationId),
      this.predictiveShiftControlService.snapshot(organizationId,locationId)
    ]);

    const plans=(db.managerShiftPlans||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const latestPlan=plans[0]||null;
    const handoffs=(db.shiftHandoffs||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const latestHandoff=handoffs[0]||null;
    const closeouts=(db.managerShiftCloseouts||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const latestCloseout=closeouts[0]||null;

    const priorities=(performance.opportunities||[]).slice(0,5).map((x,i)=>({
      rank:i+1,id:x.id,title:x.title,category:x.category,owner:x.owner,severity:x.severity,estimatedImpactDollars:x.estimatedImpactDollars,nextAction:x.nextAction
    }));
    const activeActions=(actions.workspaces||[]).filter(x=>!["completed","cancelled"].includes(x.status)).slice(0,8);
    const completedActions=(actions.workspaces||[]).filter(x=>x.status==="completed").slice(0,8);
    const predictiveInterventions=(predictive.interventions||[]).slice(0,6);

    const stages=[
      {id:"pre_shift",label:"Pre-shift",complete:Boolean(latestPlan),detail:latestPlan?`${latestPlan.priorities.length} priorities planned`:"Shift plan not yet committed"},
      {id:"live_service",label:"Live service",complete:activeActions.length>0||predictiveInterventions.length>0,detail:`${activeActions.length} active action(s) · ${predictiveInterventions.length} predictive intervention(s)`},
      {id:"profit_control",label:"Profit control",complete:Boolean(profit?.summary),detail:`${profit.summary?.modeledControllableMarginPercent||0}% modeled controllable margin`},
      {id:"handoff",label:"Handoff",complete:Boolean(latestHandoff),detail:latestHandoff?`${latestHandoff.shift} handoff by ${latestHandoff.authorName}`:"No handoff posted"},
      {id:"closeout",label:"Post-shift",complete:Boolean(latestCloseout),detail:latestCloseout?`${latestCloseout.resultStatus} · ${latestCloseout.completedActions} completed action(s)`:"Closeout not yet posted"}
    ];

    const rhythmScore=Math.round(stages.filter(x=>x.complete).length/stages.length*100);
    const narrative=[];
    narrative.push(`Readiness ${command?.readiness?.score??"—"} · ${priorities.length} prioritized operating opportunities.`);
    if(predictive.summary?.timeToConstraintMinutes!=null)narrative.push(`${predictive.summary.firstConstraint} pressure is forecast to cross threshold in ${predictive.summary.timeToConstraintMinutes} minutes.`);
    if(activeActions.length)narrative.push(`${activeActions.length} manager-owned action${activeActions.length===1?" is":"s are"} active.`);
    narrative.push(`Modeled controllable contribution is $${Number(profit.summary?.modeledControllableContributionDollars||0).toLocaleString()} at ${profit.summary?.modeledControllableMarginPercent||0}% margin.`);
    if(actions.summary?.measuredOutcomes)narrative.push(`${actions.summary.measuredOutcomes} completed action outcome${actions.summary.measuredOutcomes===1?" has":"s have"} been measured at ${actions.summary.realizationRatePercent||0}% realization.`);

    return {
      version:"47.30.0",generatedAt:this.now(),organizationId,locationId,
      headline:latestPlan?`The shift is operating against ${latestPlan.priorities.length} committed priorities.`:"Build the shift plan before service so every manager starts from the same priorities.",
      summary:{
        rhythmScore,readinessScore:command?.readiness?.score||0,
        priorityCount:priorities.length,activeActions:activeActions.length,
        completedActions:completedActions.length,predictiveInterventions:predictiveInterventions.length,
        modeledControllableContributionDollars:profit.summary?.modeledControllableContributionDollars||0,
        modeledControllableMarginPercent:profit.summary?.modeledControllableMarginPercent||0,
        realizedImpactDollars:actions.summary?.realizedImpactDollars||0,
        realizationRatePercent:actions.summary?.realizationRatePercent||0
      },
      stages,priorities,latestPlan,activeActions,completedActions,predictiveInterventions,
      profitability:{summary:profit.summary,topConstraint:profit.constraints?.[0]||null},
      latestHandoff,latestCloseout,narrative,
      policy:{humanOwned:true,automaticExecution:false,continuousShiftRecord:true}
    };
  }

  async createPlan(organizationId,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,locationId);
    const selected=(Array.isArray(input.priorityIds)&&input.priorityIds.length?input.priorityIds:snapshot.priorities.slice(0,3).map(x=>x.id));
    const priorityMap=new Map(snapshot.priorities.map(x=>[x.id,x]));
    const priorities=selected.map(id=>priorityMap.get(id)).filter(Boolean).slice(0,5);
    if(!priorities.length)throw new Error("At least one current operating priority is required.");
    const now=this.now();
    const record={
      id:`msp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,
      shift:String(input.shift||"dinner").slice(0,40),
      manager:String(input.manager||actor||"Manager").slice(0,120),
      priorities,
      operatingIntent:String(input.operatingIntent||"Protect service execution, guest experience, and controllable contribution.").slice(0,800),
      readinessAtPlan:snapshot.summary.readinessScore,
      profitAtPlan:snapshot.profitability.summary,
      predictiveAtPlan:snapshot.predictiveInterventions.slice(0,3),
      createdBy:actor,createdAt:now
    };
    await this.database.mutate(db=>{db.managerShiftPlans||=[];db.managerShiftPlans.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Manager shift plan created: ${record.shift} · ${record.id}`,category:"manager_operating_rhythm"});
    this.realtimeHub.publish("manager-rhythm:plan-created",record);
    return record;
  }

  async createHandoff(organizationId,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,locationId),now=this.now();
    const highlights=[
      ...snapshot.completedActions.slice(0,3).map(x=>`${x.title} · ${x.outcomeMeasurement?.outcomeStatus||"completed"}`),
      ...(snapshot.profitability.topConstraint?[`Top remaining profit constraint: ${snapshot.profitability.topConstraint.label}`]:[])
    ].slice(0,5);
    const needsAttention=[
      ...snapshot.activeActions.slice(0,3).map(x=>`${x.title} · ${x.status}`),
      ...snapshot.predictiveInterventions.slice(0,2).map(x=>`${x.type} in ${x.etaMinutes}m`)
    ].slice(0,5);
    const summary=String(input.summary||snapshot.narrative.join(" ")).slice(0,1200);
    const record={
      id:`handoff_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,
      shift:String(input.shift||"closing").slice(0,40),summary,highlights,needsAttention,
      authorName:String(input.manager||actor||"Manager").slice(0,120),createdAt:now,updatedAt:now,acknowledgements:[]
    };
    await this.database.mutate(db=>{db.shiftHandoffs||=[];db.shiftHandoffs.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Manager rhythm handoff posted: ${record.shift}`,category:"manager_operating_rhythm"});
    this.realtimeHub.publish("manager-rhythm:handoff-created",record);
    return record;
  }

  async closeout(organizationId,locationId,input,actor){
    const snapshot=await this.snapshot(organizationId,locationId),now=this.now();
    const incomplete=snapshot.activeActions.length;
    const resultStatus=incomplete===0?"closed-clean":incomplete<=2?"closed-with-carryover":"carryover-required";
    const record={
      id:`msc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,
      shift:String(input.shift||snapshot.latestPlan?.shift||"dinner").slice(0,40),
      manager:String(input.manager||actor||"Manager").slice(0,120),
      resultStatus,
      priorityCount:snapshot.summary.priorityCount,
      completedActions:snapshot.summary.completedActions,
      activeCarryoverActions:snapshot.summary.activeActions,
      realizedImpactDollars:snapshot.summary.realizedImpactDollars,
      realizationRatePercent:snapshot.summary.realizationRatePercent,
      endingControllableContributionDollars:snapshot.summary.modeledControllableContributionDollars,
      endingControllableMarginPercent:snapshot.summary.modeledControllableMarginPercent,
      remainingTopConstraint:snapshot.profitability.topConstraint||null,
      note:String(input.note||"").slice(0,1000),
      createdBy:actor,createdAt:now
    };
    await this.database.mutate(db=>{db.managerShiftCloseouts||=[];db.managerShiftCloseouts.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Manager shift closeout: ${record.resultStatus} · ${record.id}`,category:"manager_operating_rhythm"});
    this.realtimeHub.publish("manager-rhythm:closeout-created",record);
    return record;
  }
}
module.exports=ManagerOperatingRhythmService;
