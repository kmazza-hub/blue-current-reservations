"use strict";

class ProductionOperationsHandoffService {
  constructor(database,auditService,realtimeHub,launchStabilizationService,reliabilityAutomationService,multiLocationPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,launchStabilizationService,reliabilityAutomationService,multiLocationPerformanceService});
  }
  now(){return new Date().toISOString();}
  async acceptances(organizationId){
    const db=await this.database.read();
    return (db.productionOperationsAcceptances||[])
      .filter(x=>x.organizationId===organizationId)
      .sort((a,b)=>new Date(b.acceptedAt)-new Date(a.acceptedAt));
  }
  async snapshot(organizationId,allowedLocationIds){
    const [stabilization,reliability,portfolio,acceptances]=await Promise.all([
      this.launchStabilizationService.snapshot(organizationId,allowedLocationIds),
      this.reliabilityAutomationService.evaluate(organizationId),
      this.multiLocationPerformanceService.snapshot(organizationId,allowedLocationIds),
      this.acceptances(organizationId)
    ]);
    const pmap=new Map((portfolio.locations||[]).map(x=>[x.locationId,x]));
    const latestAcceptance=new Map();
    for(const x of acceptances)if(!latestAcceptance.has(x.locationId))latestAcceptance.set(x.locationId,x);

    const locations=(stabilization.locations||[])
      .filter(x=>x.declaration?.decision==="STABLE")
      .map(loc=>{
        const live=pmap.get(loc.locationId)||{};
        const acceptance=latestAcceptance.get(loc.locationId)||null;
        const gates=[
          {id:"stable",label:"Human STABLE declaration recorded",passed:loc.declaration?.decision==="STABLE",actual:loc.declaration?.decision||"open"},
          {id:"platform-reliability",label:"Platform reliability is not breached",passed:reliability.status!=="breached",actual:reliability.status},
          {id:"restaurant-readiness",label:"Restaurant readiness is at least 70",passed:Number(live.readinessScore||0)>=70,actual:Number(live.readinessScore||0)},
          {id:"leadership-attention",label:"No High/Critical operating attention",passed:!["high","critical"].includes(live.attentionLevel),actual:live.attentionLevel||"unknown"},
          {id:"predictive-pressure",label:"No urgent predictive intervention",passed:Number(live.urgentPredictiveInterventions||0)===0,actual:Number(live.urgentPredictiveInterventions||0)}
        ];
        const passed=gates.filter(x=>x.passed).length;
        return {
          locationId:loc.locationId,locationName:loc.locationName,wave:loc.wave,
          gates,passed,total:gates.length,
          productionReady:passed===gates.length,
          readinessScore:Number(live.readinessScore||0),
          attentionLevel:live.attentionLevel||"unknown",
          urgentPredictiveInterventions:Number(live.urgentPredictiveInterventions||0),
          platformReliability:{status:reliability.status,score:reliability.score,breached:reliability.breached,warning:reliability.warning,errorBudgetRemaining:reliability.errorBudgetRemaining},
          acceptance,
          productionState:acceptance?.status==="ACCEPTED_INTO_PRODUCTION_OPERATIONS"?"PRODUCTION_OPERATIONS_ACCEPTED":"AWAITING_PRODUCTION_HANDOFF"
        };
      });

    return {
      version:"50.5.0",generatedAt:this.now(),
      status:locations.length===0?"stable-location-required":locations.every(x=>x.acceptance?.status==="ACCEPTED_INTO_PRODUCTION_OPERATIONS")?"production-handoff-complete":"production-handoff-review",
      headline:locations.length===0?"A human STABLE launch declaration is required before production-operations handoff.":`${locations.filter(x=>x.productionReady).length}/${locations.length} stabilized location(s) currently pass production-operations acceptance gates.`,
      platformReliability:{status:reliability.status,score:reliability.score,breached:reliability.breached,warning:reliability.warning,errorBudgetRemaining:reliability.errorBudgetRemaining,objectives:reliability.objectives},
      locations,acceptanceHistory:acceptances,
      policy:{
        stableDeclarationRequired:true,
        adminAcceptanceRequired:true,
        supportOwnershipRequired:true,
        acceptanceDoesNotModifyRuntime:true,
        automaticAcceptance:false,
        automaticRemediation:false,
        autonomousProductionChanges:false
      }
    };
  }
  async accept(organizationId,allowedLocationIds,locationId,input,actor){
    const snap=await this.snapshot(organizationId,allowedLocationIds);
    const loc=snap.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Location must be human-declared STABLE before production-operations acceptance.");
    const supportOwner=String(input.supportOwner||"").trim().slice(0,160);
    const escalationOwner=String(input.escalationOwner||"").trim().slice(0,160);
    if(!supportOwner)throw new Error("Production support owner is required.");
    if(!escalationOwner)throw new Error("Escalation owner is required.");
    const overrideReason=String(input.overrideReason||"").trim().slice(0,1500);
    if(!loc.productionReady&&!overrideReason)throw new Error("Production acceptance gates are open. A documented executive override reason is required.");
    const now=this.now();
    const record={
      id:`poa_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      organizationId,locationId,locationName:loc.locationName,wave:loc.wave,
      status:"ACCEPTED_INTO_PRODUCTION_OPERATIONS",
      acceptedBy:actor,acceptedAt:now,
      supportOwner,escalationOwner,
      supportHours:String(input.supportHours||"24x7 launch support; business-hours steady state").slice(0,240),
      maintenanceWindow:String(input.maintenanceWindow||"").slice(0,240),
      overrideUsed:!loc.productionReady,overrideReason,
      acceptanceSnapshot:{passed:loc.passed,total:loc.total,gates:loc.gates,platformReliability:loc.platformReliability},
      note:String(input.note||"").slice(0,1000),
      runtimeMutationPerformed:false
    };
    await this.database.mutate(db=>{db.productionOperationsAcceptances||=[];db.productionOperationsAcceptances.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Production operations handoff accepted for ${locationId}; support owner ${supportOwner}; runtime mutation not performed`,category:"production_operations"});
    this.realtimeHub.publish("production-operations:accepted",{id:record.id,organizationId,locationId,supportOwner,overrideUsed:record.overrideUsed});
    return record;
  }
}
module.exports=ProductionOperationsHandoffService;
