"use strict";

class HospitalityActionWorkspaceService {
  constructor(database,auditService,realtimeHub,hospitalityPerformanceService){
    Object.assign(this,{database,auditService,realtimeHub,hospitalityPerformanceService});
  }
  now(){return new Date().toISOString();}
  normalizeStatus(value){return new Set(["accepted","in_progress","blocked","completed","cancelled"]).has(value)?value:"in_progress";}
  async list(organizationId,locationId){
    const db=await this.database.read();
    const items=(db.hospitalityActionWorkspaces||[])
      .filter(x=>x.organizationId===organizationId&&x.locationId===locationId)
      .sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
    const active=items.filter(x=>!["completed","cancelled"].includes(x.status));
    const blocked=active.filter(x=>x.status==="blocked");
    const overdue=active.filter(x=>x.targetAt&&new Date(x.targetAt).getTime()<Date.now());
    return {
      version:"47.10.0",generatedAt:this.now(),organizationId,locationId,
      summary:{
        total:items.length,active:active.length,blocked:blocked.length,overdue:overdue.length,
        expectedImpactDollars:active.reduce((s,x)=>s+Number(x.expectedImpactDollars||0),0),
        completed:items.filter(x=>x.status==="completed").length
      },
      workspaces:items.slice(0,100),
      policy:{humanOwned:true,automaticExecution:false,outcomeMeasurement:"next-wave"}
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
        id:`haw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        organizationId,locationId,opportunityId:opportunity.id,
        title:opportunity.title,category:opportunity.category,severity:opportunity.severity,
        owner:String(input.owner||opportunity.owner||actor||"Manager").slice(0,120),
        status:"accepted",
        why:opportunity.why,nextAction:opportunity.nextAction,
        expectedImpactDollars:Number(opportunity.estimatedImpactDollars||0),
        impactLabel:opportunity.impactLabel||"",
        confidence:Number(opportunity.confidence||0),
        targetMetric:String(input.targetMetric||this.defaultMetric(opportunity)).slice(0,240),
        targetValue:String(input.targetValue||this.defaultTarget(opportunity)).slice(0,120),
        targetAt:new Date(Date.now()+targetMinutes*60000).toISOString(),
        baseline:{capturedAt:now,score:opportunity.score,metadata:opportunity.metadata||{},estimatedImpactDollars:Number(opportunity.estimatedImpactDollars||0)},
        updates:[{id:`hau_${Date.now()}`,status:"accepted",note:String(input.note||"Action accepted from Hospitality Performance Command").slice(0,500),actor,at:now}],
        createdBy:actor,createdAt:now,updatedAt:now,completedAt:null,
        realizedImpactDollars:null,outcomeNote:""
      };
      db.hospitalityActionWorkspaces.push(created);
      return created;
    });
    await this.auditService.record({organizationId,actor,action:`Hospitality action workspace created: ${created.id} · ${created.title}`,category:"hospitality_performance"});
    this.realtimeHub.publish("hospitality-action:created",created);
    return created;
  }
  defaultMetric(o){
    return ({kitchen:"Oldest delayed ticket / ticket recovery",reservations:"Unassigned parties / wait exposure",labor:"Labor coverage / labor cost",inventory:"Availability / food-cost variance",guests:"At-risk guest recovery",revenue:"Revenue pacing gap"})[o.category]||"Operating condition";
  }
  defaultTarget(o){
    const m=o.metadata||{};
    if(o.category==="kitchen")return "Return delayed tickets to service target";
    if(o.category==="reservations")return "Clear preventable assignment/wait exposure";
    if(o.category==="labor")return "Restore planned coverage and labor efficiency";
    if(o.category==="inventory")return "Resolve flagged availability or margin variance";
    if(o.category==="guests")return `Recover priority guest relationship`;
    if(o.category==="revenue")return "Reduce modeled revenue pacing gap";
    return "Resolve opportunity";
  }
  async update(organizationId,locationId,workspaceId,input,actor){
    let updated=null;
    await this.database.mutate(db=>{
      db.hospitalityActionWorkspaces||=[];
      const item=db.hospitalityActionWorkspaces.find(x=>x.id===workspaceId&&x.organizationId===organizationId&&x.locationId===locationId);
      if(!item)throw new Error("Hospitality action workspace not found.");
      const status=this.normalizeStatus(input.status||item.status),now=this.now();
      if(input.owner!==undefined)item.owner=String(input.owner||item.owner).slice(0,120);
      if(input.targetMetric!==undefined)item.targetMetric=String(input.targetMetric||item.targetMetric).slice(0,240);
      if(input.targetValue!==undefined)item.targetValue=String(input.targetValue||item.targetValue).slice(0,120);
      if(input.targetAt!==undefined&&input.targetAt)item.targetAt=new Date(input.targetAt).toISOString();
      item.status=status;item.updatedAt=now;
      if(status==="completed"&&!item.completedAt)item.completedAt=now;
      if(status!=="completed")item.completedAt=null;
      item.updates||=[];
      item.updates.push({id:`hau_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,status,note:String(input.note||"Status updated").slice(0,500),actor,at:now});
      updated=item;return item;
    });
    await this.auditService.record({organizationId,actor,action:`Hospitality action ${updated.status}: ${updated.id}`,category:"hospitality_performance"});
    this.realtimeHub.publish("hospitality-action:updated",updated);
    return updated;
  }
}
module.exports=HospitalityActionWorkspaceService;
