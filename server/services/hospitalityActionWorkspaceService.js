"use strict";

class HospitalityActionWorkspaceService {
  constructor(database,auditService,realtimeHub,hospitalityPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,hospitalityPerformanceService});
  }
  now(){return new Date().toISOString();}
  clamp(n,min=0,max=1){return Math.max(min,Math.min(max,Number(n)||0));}
  normalizeStatus(value){return new Set(["accepted","in_progress","blocked","completed","cancelled"]).has(value)?value:"in_progress";}
  async liveOpportunity(organizationId,locationId,opportunityId){
    const performance=await this.hospitalityPerformanceService.snapshot(organizationId,locationId);
    return performance.opportunities.find(x=>x.id===opportunityId)||null;
  }
  measurementFrom(workspace,currentOpportunity,at=this.now()){
    const expected=Math.max(0,Number(workspace.expectedImpactDollars||0));
    const currentExposure=currentOpportunity?Math.max(0,Number(currentOpportunity.estimatedImpactDollars||0)):0;
    const improvement=expected>0?this.clamp((expected-currentExposure)/expected):currentOpportunity?0:1;
    const realized=Math.round(expected*improvement);
    const startedAt=workspace.startedAt||workspace.createdAt;
    const resolutionMinutes=Math.max(0,Math.round((new Date(at).getTime()-new Date(startedAt).getTime())/60000));
    const targetMet=currentOpportunity===null || currentExposure<=expected*.25;
    const outcomeStatus=targetMet?"improved":currentExposure<expected?"partial":"not-improved";
    return {
      capturedAt:at,
      baselineExposureDollars:expected,
      remainingExposureDollars:currentExposure,
      improvementPercent:Math.round(improvement*100),
      realizedImpactDollars:realized,
      expectedImpactDollars:expected,
      realizationRatePercent:expected?Math.round(realized/expected*100):0,
      resolutionMinutes,
      targetMet,
      outcomeStatus,
      currentOpportunity:currentOpportunity?{id:currentOpportunity.id,score:currentOpportunity.score,severity:currentOpportunity.severity,estimatedImpactDollars:currentExposure,metadata:currentOpportunity.metadata||{}}:null,
      evidence:currentOpportunity?"The opportunity still exists in the live performance queue.":"The original opportunity is no longer present in the live performance queue."
    };
  }
  async list(organizationId,locationId){
    const db=await this.database.read();
    const items=(db.hospitalityActionWorkspaces||[])
      .filter(x=>x.organizationId===organizationId&&x.locationId===locationId)
      .sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
    const active=items.filter(x=>!["completed","cancelled"].includes(x.status)),completed=items.filter(x=>x.status==="completed"),blocked=active.filter(x=>x.status==="blocked"),overdue=active.filter(x=>x.targetAt&&new Date(x.targetAt).getTime()<Date.now());
    const measured=completed.filter(x=>x.outcomeMeasurement);
    const expectedCompleted=measured.reduce((s,x)=>s+Number(x.outcomeMeasurement.expectedImpactDollars||0),0),realized=measured.reduce((s,x)=>s+Number(x.outcomeMeasurement.realizedImpactDollars||0),0);
    return {
      version:"47.15.0",generatedAt:this.now(),organizationId,locationId,
      summary:{
        total:items.length,active:active.length,blocked:blocked.length,overdue:overdue.length,
        expectedImpactDollars:active.reduce((s,x)=>s+Number(x.expectedImpactDollars||0),0),
        completed:completed.length,measuredOutcomes:measured.length,
        realizedImpactDollars:realized,
        realizationRatePercent:expectedCompleted?Math.round(realized/expectedCompleted*100):0,
        averageResolutionMinutes:measured.length?Math.round(measured.reduce((s,x)=>s+Number(x.outcomeMeasurement.resolutionMinutes||0),0)/measured.length):0,
        improved:measured.filter(x=>x.outcomeMeasurement.outcomeStatus==="improved").length,
        notImproved:measured.filter(x=>x.outcomeMeasurement.outcomeStatus==="not-improved").length
      },
      workspaces:items.slice(0,100),
      outcomes:measured.map(x=>({workspaceId:x.id,title:x.title,category:x.category,owner:x.owner,...x.outcomeMeasurement})).slice(0,100),
      policy:{humanOwned:true,automaticExecution:false,outcomeMeasurement:"live-opportunity-baseline-comparison",completionDoesNotImplySuccess:true}
    };
  }
  async createFromOpportunity(organizationId,locationId,opportunity,input={},actor="Manager"){
    if(!opportunity?.id)throw new Error("A valid opportunity is required.");
    const now=this.now(),targetMinutes=Math.max(5,Math.min(1440,Number(input.targetMinutes)||60));
    let created=null;
    await this.database.mutate(db=>{
      db.hospitalityActionWorkspaces||=[];
      const existing=db.hospitalityActionWorkspaces.find(x=>x.organizationId===organizationId&&x.locationId===locationId&&x.opportunityId===opportunity.id&&!["completed","cancelled"].includes(x.status));
      if(existing){created=existing;return existing;}
      created={
        id:`haw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,opportunityId:opportunity.id,
        title:opportunity.title,category:opportunity.category,severity:opportunity.severity,owner:String(input.owner||opportunity.owner||actor||"Manager").slice(0,120),
        status:"accepted",why:opportunity.why,nextAction:opportunity.nextAction,expectedImpactDollars:Number(opportunity.estimatedImpactDollars||0),impactLabel:opportunity.impactLabel||"",confidence:Number(opportunity.confidence||0),
        targetMetric:String(input.targetMetric||this.defaultMetric(opportunity)).slice(0,240),targetValue:String(input.targetValue||this.defaultTarget(opportunity)).slice(0,120),
        targetAt:new Date(Date.now()+targetMinutes*60000).toISOString(),
        baseline:{capturedAt:now,score:opportunity.score,severity:opportunity.severity,metadata:opportunity.metadata||{},estimatedImpactDollars:Number(opportunity.estimatedImpactDollars||0)},
        updates:[{id:`hau_${Date.now()}`,status:"accepted",note:String(input.note||"Action accepted from Hospitality Performance Command").slice(0,500),actor,at:now}],
        createdBy:actor,createdAt:now,updatedAt:now,startedAt:null,completedAt:null,outcomeMeasurement:null
      };
      db.hospitalityActionWorkspaces.push(created);return created;
    });
    await this.auditService.record({organizationId,actor,action:`Hospitality action workspace created: ${created.id} · ${created.title}`,category:"hospitality_performance"});
    this.realtimeHub.publish("hospitality-action:created",created);return created;
  }
  defaultMetric(o){return ({kitchen:"Oldest delayed ticket / ticket recovery",reservations:"Unassigned parties / wait exposure",labor:"Labor coverage / labor cost",inventory:"Availability / food-cost variance",guests:"At-risk guest recovery",revenue:"Revenue pacing gap"})[o.category]||"Operating condition";}
  defaultTarget(o){if(o.category==="kitchen")return "Return delayed tickets to service target";if(o.category==="reservations")return "Clear preventable assignment/wait exposure";if(o.category==="labor")return "Restore planned coverage and labor efficiency";if(o.category==="inventory")return "Resolve flagged availability or margin variance";if(o.category==="guests")return "Recover priority guest relationship";if(o.category==="revenue")return "Reduce modeled revenue pacing gap";return "Resolve opportunity";}
  async update(organizationId,locationId,workspaceId,input,actor){
    const db=await this.database.read(),existing=(db.hospitalityActionWorkspaces||[]).find(x=>x.id===workspaceId&&x.organizationId===organizationId&&x.locationId===locationId);
    if(!existing)throw new Error("Hospitality action workspace not found.");
    const status=this.normalizeStatus(input.status||existing.status),now=this.now();
    let measurement=null;
    if(status==="completed")measurement=this.measurementFrom(existing,await this.liveOpportunity(organizationId,locationId,existing.opportunityId),now);
    let updated=null;
    await this.database.mutate(data=>{
      const item=(data.hospitalityActionWorkspaces||[]).find(x=>x.id===workspaceId&&x.organizationId===organizationId&&x.locationId===locationId);
      if(!item)throw new Error("Hospitality action workspace not found.");
      if(input.owner!==undefined)item.owner=String(input.owner||item.owner).slice(0,120);
      if(input.targetMetric!==undefined)item.targetMetric=String(input.targetMetric||item.targetMetric).slice(0,240);
      if(input.targetValue!==undefined)item.targetValue=String(input.targetValue||item.targetValue).slice(0,120);
      if(input.targetAt!==undefined&&input.targetAt)item.targetAt=new Date(input.targetAt).toISOString();
      item.status=status;item.updatedAt=now;
      if(status==="in_progress"&&!item.startedAt)item.startedAt=now;
      if(status==="completed"){item.completedAt=now;item.outcomeMeasurement=measurement;}
      else if(item.status!=="completed"){item.completedAt=null;}
      item.updates||=[];item.updates.push({id:`hau_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,status,note:String(input.note||"Status updated").slice(0,500),actor,at:now});
      updated=item;return item;
    });
    await this.auditService.record({organizationId,actor,action:`Hospitality action ${updated.status}: ${updated.id}${measurement?` · ${measurement.outcomeStatus} · $${measurement.realizedImpactDollars} realized`:""}`,category:"hospitality_performance"});
    this.realtimeHub.publish("hospitality-action:updated",updated);return updated;
  }
  async remeasure(organizationId,locationId,workspaceId,actor){
    const db=await this.database.read(),existing=(db.hospitalityActionWorkspaces||[]).find(x=>x.id===workspaceId&&x.organizationId===organizationId&&x.locationId===locationId);
    if(!existing||existing.status!=="completed")throw new Error("A completed hospitality action is required.");
    const measurement=this.measurementFrom(existing,await this.liveOpportunity(organizationId,locationId,existing.opportunityId),this.now());
    let updated=null;await this.database.mutate(data=>{const item=(data.hospitalityActionWorkspaces||[]).find(x=>x.id===workspaceId);item.outcomeMeasurement=measurement;item.updatedAt=this.now();updated=item;return item;});
    await this.auditService.record({organizationId,actor,action:`Hospitality outcome remeasured: ${workspaceId} · ${measurement.outcomeStatus}`,category:"hospitality_performance"});
    this.realtimeHub.publish("hospitality-outcome:measured",updated);return updated;
  }
}
module.exports=HospitalityActionWorkspaceService;
