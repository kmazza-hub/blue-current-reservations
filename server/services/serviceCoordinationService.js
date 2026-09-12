"use strict";
const models = require("../../shared/models");
class ServiceCoordinationService {
  constructor(database,auditService,realtimeHub){this.database=database;this.auditService=auditService;this.realtimeHub=realtimeHub;}
  async snapshot(locationId){
    const db=await this.database.read();
    const flows=(db.serviceFlows||[]).filter(x=>x.locationId===locationId);
    const tickets=(db.kitchenTickets||[]).filter(x=>x.locationId===locationId);
    const staff=(db.staff||[]).filter(x=>x.locationId===locationId);
    const tables=(db.tables||[]).filter(x=>x.locationId===locationId);
    const alerts=this.buildAlerts(flows,tickets,staff);
    return {flows,tickets,staff,tables,alerts,events:(db.serviceEvents||[]).filter(x=>x.locationId===locationId).slice(-50).reverse(),metrics:this.metrics(flows,tickets)};
  }
  metrics(flows,tickets){
    const active=flows.filter(x=>x.course!=="closed");
    const ready=active.filter(x=>x.expoStatus==="ready").length;
    const highRisk=active.filter(x=>["high","critical"].includes(x.risk)).length;
    const pickup=active.filter(x=>x.readyAt&&!x.deliveredAt).map(x=>Math.max(0,Math.floor((Date.now()-new Date(x.readyAt))/60000)));
    return {activeTables:active.length,readyForRunner:ready,highRisk,averagePickupMinutes:pickup.length?Math.round(pickup.reduce((a,b)=>a+b,0)/pickup.length):0,operationalHealth:Math.max(0,100-highRisk*9-ready*4)};
  }
  buildAlerts(flows,tickets,staff){
    const alerts=[];
    for(const flow of flows){
      if(flow.expoStatus==="ready") alerts.push({id:`ready_${flow.id}`,severity:"high",type:"expo",title:`${flow.tableName} ready for runner`,detail:`${flow.serverName} · ${flow.guestName}`});
      if(flow.risk==="critical") alerts.push({id:`risk_${flow.id}`,severity:"critical",type:"service",title:`${flow.tableName} service risk`,detail:"Guest journey has exceeded the operating SLA."});
      else if(flow.risk==="high") alerts.push({id:`risk_${flow.id}`,severity:"high",type:"service",title:`${flow.tableName} requires attention`,detail:"Ticket pace and table timing indicate elevated risk."});
    }
    const grill=tickets.flatMap(x=>x.items||[]).filter(x=>x.stationId==="station_grill"&&x.status!=="ready").length;
    if(grill>=4) alerts.push({id:"grill_load",severity:"high",type:"kitchen",title:"Grill station is approaching capacity",detail:`${grill} active grill items are in production.`});
    return alerts;
  }
  async updateFlow(id,patch,actor,organizationId){
    const allowed=["course","kitchenStatus","expoStatus","risk","runnerId","runnerName","readyAt","deliveredAt"];
    const safe={}; for(const k of allowed) if(Object.hasOwn(patch,k)) safe[k]=patch[k];
    const result=await this.database.mutate(db=>{const flow=(db.serviceFlows||[]).find(x=>x.id===id);if(!flow||flow.organizationId!==organizationId)return null;const now=new Date().toISOString();Object.assign(flow,safe,{updatedAt:now});flow.timeline||=[];if(patch.course)flow.timeline.push({stage:patch.course,at:now});const table=(db.tables||[]).find(x=>x.id===flow.tableId&&x.organizationId===organizationId)||null,reservation=flow.reservationId?(db.reservations||[]).find(x=>x.id===flow.reservationId&&x.organizationId===organizationId):null;if(patch.course==="check"&&table){table.status="check";table.updatedAt=now;}if(patch.course==="closed"){flow.closedAt=now;flow.risk="normal";if(reservation){reservation.status="completed";reservation.completedAt=now;reservation.updatedAt=now;}if(table){table.status="cleaning";table.guestName="";table.partySize=0;table.seatedAt=null;table.cleaningAt=now;table.updatedAt=now;}db.operationalValueEvents||=[];db.operationalValueEvents.push({id:`value_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,organizationId,locationId:flow.locationId,reservationId:flow.reservationId||null,tableId:flow.tableId||null,type:"service-closed-from-floor",measuredMinutes:flow.seatedAt?Math.max(0,Math.round((Date.now()-new Date(flow.seatedAt).getTime())/60000)):0,linkedStepsCompleted:3,manualStepsAvoided:1,evidence:["service flow closed","reservation completed","table sent to cleaning"],attribution:"MEASURED_WORKFLOW_EVENT",createdAt:now});}db.serviceEvents||=[];const event=models.operationalEvent({organizationId,locationId:flow.locationId,type:"service:flow-updated",actor,summary:`${flow.tableName} advanced to ${flow.course}`,payload:safe});db.serviceEvents.push(event);return {flow,event,table,reservation};});
    if(!result)return null;await this.auditService.record({organizationId,actor,action:`${result.flow.tableName} service flow updated`,category:"service"});this.realtimeHub.publish("service:flow-updated",{...result.flow,organizationId});if(result.table)this.realtimeHub.publish("floor:table-updated",{...result.table,organizationId});if(result.reservation)this.realtimeHub.publish("reservation:completed",{reservation:result.reservation,table:result.table,serviceFlow:result.flow,organizationId});return result.flow;
  }
  async markDelivered(id,actor,organizationId){return this.updateFlow(id,{expoStatus:"delivered",kitchenStatus:"served",deliveredAt:new Date().toISOString(),course:"food-delivered",risk:"normal"},actor,organizationId);}
  async createFromTable(input,actor,organizationId){
    const table=await this.database.get("tables",input.tableId);
    if(!table||table.organizationId!==organizationId||table.locationId!==input.locationId){const error=new Error("Table is not available for this service flow.");error.statusCode=400;throw error;}
    if(input.serverId){const server=await this.database.get("staff",input.serverId);if(!server||server.organizationId!==organizationId||server.locationId!==input.locationId){const error=new Error("Staff member is not available for this service flow.");error.statusCode=400;throw error;}}
    const now=new Date().toISOString(); const flow={id:`svc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId:input.locationId,tableId:input.tableId,tableName:input.tableName||"Open",serverId:input.serverId||null,serverName:input.serverName||"Unassigned",guestName:input.guestName||"Walk-in",partySize:Number(input.partySize||2),course:"seated",kitchenStatus:"not-fired",expoStatus:"waiting",risk:"normal",seatedAt:now,updatedAt:now,timeline:[{stage:"seated",at:now}]};
    await this.database.create("serviceFlows",flow);await this.auditService.record({organizationId,actor,action:`Service started for ${flow.tableName}`,category:"service"});this.realtimeHub.publish("service:guest-seated",flow);return flow;
  }
}
module.exports=ServiceCoordinationService;
