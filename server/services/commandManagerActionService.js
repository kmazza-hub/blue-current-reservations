"use strict";

class CommandManagerActionService{
  constructor(database,auditService,realtimeHub,commandOperatingPictureService){
    Object.assign(this,{database,auditService,realtimeHub,commandOperatingPictureService});
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}

  async list(organizationId,allowedLocationIds=[],locationId=null){
    const db=await this.database.read();
    return (db.commandManagerActions||[])
      .filter(x=>x.organizationId===organizationId&&this.allowed(x.locationId,allowedLocationIds)&&(!locationId||x.locationId===locationId))
      .sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
  }

  async createFromPriority(organizationId,allowedLocationIds,input={},actor){
    const locationId=String(input.locationId||"").trim();
    const priorityId=String(input.priorityId||"").trim();
    if(!locationId||!priorityId)throw Object.assign(new Error("locationId and priorityId are required."),{statusCode:400});
    if(!this.allowed(locationId,allowedLocationIds))throw Object.assign(new Error("Location access denied."),{statusCode:403});

    const picture=await this.commandOperatingPictureService.snapshot(organizationId,allowedLocationIds,locationId);
    const priority=(picture.prioritization?.topPriorities||[]).find(x=>x.id===priorityId);
    if(!priority)throw Object.assign(new Error("Priority is no longer active in the current Command picture."),{statusCode:409,code:"PRIORITY_NO_LONGER_ACTIVE"});

    const existing=(await this.list(organizationId,allowedLocationIds,locationId)).find(x=>
      x.priorityFingerprint===`${locationId}|${priority.domain}|${priority.title}`&&!["resolved","dismissed"].includes(x.status)
    );
    if(existing)return {...existing,duplicate:true};

    const now=this.now();
    const record={
      id:`cma_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      organizationId,locationId,locationName:picture.location?.name||locationId,
      priorityId,priorityFingerprint:`${locationId}|${priority.domain}|${priority.title}`,
      priorityRank:priority.rank,priorityScore:priority.score,
      domain:priority.domain,workspace:priority.workspace,severity:priority.severity,
      title:priority.title,detail:priority.detail,recommendation:priority.recommendation,
      owner:String(input.owner||priority.owner||"Manager").slice(0,120),
      status:"acknowledged",acknowledgedBy:actor,acknowledgedAt:now,
      createdBy:actor,createdAt:now,updatedAt:now,resolvedAt:null,resolvedBy:null,
      outcome:null,
      timeline:[{action:"acknowledged",actor,note:String(input.note||"").slice(0,600),createdAt:now}],
      source:{type:"command-priority",dataMode:picture.dataMode,confidence:priority.confidence||null},
      automaticAction:false
    };
    await this.database.mutate(db=>{db.commandManagerActions||=[];db.commandManagerActions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Command priority acknowledged: ${record.title}`,category:"command_action"});
    this.realtimeHub.publish("command:action-created",{organizationId,locationId,id:record.id,status:record.status});
    return record;
  }

  async update(organizationId,allowedLocationIds,actionId,input={},actor){
    const action=String(input.action||"").toLowerCase();
    if(!["assign","start","note","resolve","dismiss"].includes(action))throw Object.assign(new Error("Action must be assign, start, note, resolve, or dismiss."),{statusCode:400});
    const now=this.now();
    const record=await this.database.mutate(db=>{
      db.commandManagerActions||=[];
      const item=db.commandManagerActions.find(x=>x.id===actionId&&x.organizationId===organizationId&&this.allowed(x.locationId,allowedLocationIds));
      if(!item)return null;
      item.timeline||=[];
      const note=String(input.note||"").trim().slice(0,800);
      if(action==="assign"){
        const owner=String(input.owner||"").trim().slice(0,120);
        if(!owner)throw Object.assign(new Error("Owner is required."),{statusCode:400});
        item.owner=owner;item.status=item.status==="acknowledged"?"assigned":item.status;
      }else if(action==="start"){
        if(["resolved","dismissed"].includes(item.status))throw Object.assign(new Error("Closed actions cannot be restarted."),{statusCode:409});
        item.status="in_progress";item.startedAt=item.startedAt||now;item.startedBy=item.startedBy||actor;
      }else if(action==="resolve"){
        if(["resolved","dismissed"].includes(item.status))throw Object.assign(new Error("Action is already closed."),{statusCode:409});
        item.status="resolved";item.resolvedAt=now;item.resolvedBy=actor;
        item.outcome=String(input.outcome||note||"Resolved by manager.").slice(0,1000);
      }else if(action==="dismiss"){
        if(["resolved","dismissed"].includes(item.status))throw Object.assign(new Error("Action is already closed."),{statusCode:409});
        item.status="dismissed";item.resolvedAt=now;item.resolvedBy=actor;
        item.outcome=String(input.outcome||note||"Dismissed after manager review.").slice(0,1000);
      }
      item.updatedAt=now;
      item.timeline.push({action,actor,owner:item.owner,note,createdAt:now});
      return {...item};
    });
    if(!record)throw Object.assign(new Error("Command action not found."),{statusCode:404});
    await this.auditService.record({organizationId,actor,action:`Command action ${action}: ${record.title}`,category:"command_action"});
    this.realtimeHub.publish("command:action-updated",{organizationId,locationId:record.locationId,id:record.id,status:record.status});
    return record;
  }

  async summary(organizationId,allowedLocationIds=[],locationId=null){
    const actions=await this.list(organizationId,allowedLocationIds,locationId);
    const open=actions.filter(x=>!["resolved","dismissed"].includes(x.status));
    return {
      version:"77.0.0",generatedAt:this.now(),locationId,
      counts:{total:actions.length,open:open.length,acknowledged:open.filter(x=>x.status==="acknowledged").length,assigned:open.filter(x=>x.status==="assigned").length,inProgress:open.filter(x=>x.status==="in_progress").length,resolved:actions.filter(x=>x.status==="resolved").length,dismissed:actions.filter(x=>x.status==="dismissed").length},
      openActions:open.slice(0,12),recentClosed:actions.filter(x=>["resolved","dismissed"].includes(x.status)).slice(0,8),
      policy:{humanAcknowledgementRequired:true,humanAssignmentRequired:true,humanResolutionRequired:true,automaticAction:false,autonomousMutation:false}
    };
  }
}
module.exports=CommandManagerActionService;
