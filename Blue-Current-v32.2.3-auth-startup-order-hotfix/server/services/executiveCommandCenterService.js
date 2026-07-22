"use strict";
class ExecutiveCommandCenterService {
  constructor(database,auditService,realtimeHub,aiRestaurantBrainService){
    Object.assign(this,{database,auditService,realtimeHub,aiRestaurantBrainService});
  }
  deterministic(id,seed,min,max){
    let h=seed;
    for(const c of id) h=(h*31+c.charCodeAt(0))%100000;
    return min+(h%(max-min+1));
  }
  async locationSnapshot(location){
    const db=await this.database.read(), id=location.id;
    const tables=(db.tables||[]).filter(x=>x.locationId===id);
    const activeTables=tables.filter(x=>["occupied","seated","dining"].includes(x.status)).length;
    const reservations=(db.reservations||[]).filter(x=>x.locationId===id&&!["cancelled","completed"].includes(x.status)).length;
    const waitlist=(db.waitlist||[]).filter(x=>x.locationId===id&&!["seated","cancelled"].includes(x.status)).length;
    const tickets=(db.kitchenTickets||[]).filter(x=>x.locationId===id&&!["served","cancelled"].includes(x.status));
    const staff=(db.staff||[]).filter(x=>x.locationId===id&&x.status!=="off").length;
    let health=null;
    if(id==="loc_marina"){try{health=(await this.aiRestaurantBrainService.snapshot(id)).health.overall}catch{}}
    const revenue=id==="loc_marina"?18420:this.deterministic(id,71,11800,22600);
    const yesterday=Math.round(revenue/(1+this.deterministic(id,19,-7,12)/100));
    const total=tables.length||this.deterministic(id,7,20,38);
    const active=activeTables||this.deterministic(id,5,8,Math.max(9,total-2));
    const avgTicket=id==="loc_marina"
      ? Math.max(8,Math.round(tickets.reduce((s,t)=>s+Math.max(0,Math.floor((Date.now()-new Date(t.createdAt).getTime())/60000)),0)/Math.max(1,tickets.length)))
      : this.deterministic(id,29,12,23);
    return {
      locationId:id,name:location.name,city:location.city,state:location.state,status:location.status||"open",
      health:health||this.deterministic(id,43,78,96),revenue,yesterdayRevenue:yesterday,
      revenueTrend:Math.round((revenue-yesterday)/yesterday*1000)/10,
      guestCount:id==="loc_marina"?active*3+reservations*2:this.deterministic(id,83,78,184),
      occupancy:Math.round(active/total*100),activeTables:active,totalTables:total,reservations,waitlist,
      activeTickets:tickets.length||this.deterministic(id,31,3,13),
      readyTickets:tickets.filter(x=>x.status==="ready").length,
      averageTicketMinutes:avgTicket,activeStaff:staff||this.deterministic(id,67,8,21),
      acceptedAiDecisions:(db.aiDecisionHistory||[]).filter(x=>x.locationId===id&&x.status==="accepted").length,
      risk:(health||90)<82||avgTicket>20?"high":(health||90)<90||avgTicket>17?"medium":"low"
    };
  }
  portfolio(ls){
    const sum=k=>ls.reduce((s,x)=>s+x[k],0), rev=sum("revenue"), y=sum("yesterdayRevenue"),
      active=sum("activeTables"), total=sum("totalTables");
    return {
      health:Math.round(sum("health")/ls.length),revenue:rev,yesterdayRevenue:y,
      revenueTrend:Math.round((rev-y)/y*1000)/10,guestCount:sum("guestCount"),
      occupancy:Math.round(active/total*100),activeTables:active,totalTables:total,
      activeLocations:ls.filter(x=>x.status==="open").length,
      atRiskLocations:ls.filter(x=>x.risk==="high").length,
      averageTicketMinutes:Math.round(sum("averageTicketMinutes")/ls.length),
      acceptedAiDecisions:sum("acceptedAiDecisions")
    };
  }
  alerts(ls){
    const out=[];
    for(const x of ls){
      if(x.health<82) out.push({id:`a_${x.locationId}_h`,locationId:x.locationId,locationName:x.name,severity:"critical",title:"Restaurant health below threshold",detail:`${x.name} is operating at ${x.health}.`,action:"Open location"});
      if(x.averageTicketMinutes>20) out.push({id:`a_${x.locationId}_t`,locationId:x.locationId,locationName:x.name,severity:"high",title:"Kitchen timing intervention needed",detail:`Average ticket time is ${x.averageTicketMinutes} minutes.`,action:"Review kitchen"});
      if(x.revenueTrend<=-5) out.push({id:`a_${x.locationId}_r`,locationId:x.locationId,locationName:x.name,severity:"medium",title:"Revenue pacing below yesterday",detail:`${x.name} is pacing ${Math.abs(x.revenueTrend)}% below yesterday.`,action:"Review demand"});
    }
    return out;
  }
  async snapshot(org){
    const db=await this.database.read(), raw=(db.locations||[]).filter(x=>x.organizationId===org), ls=[];
    for(const x of raw) ls.push(await this.locationSnapshot(x));
    const p=this.portfolio(ls), alerts=this.alerts(ls), top=[...ls].sort((a,b)=>b.revenue-a.revenue)[0];
    return {
      generatedAt:new Date().toISOString(),portfolio:p,locations:ls.sort((a,b)=>b.revenue-a.revenue),alerts,
      goals:(db.executiveGoals||[]).filter(x=>x.organizationId===org),
      brief:{
        headline:`Portfolio revenue is pacing ${p.revenueTrend>=0?p.revenueTrend+"% above":Math.abs(p.revenueTrend)+"% below"} yesterday.`,
        summary:`${p.activeLocations} locations are open with ${p.guestCount} modeled guests and portfolio health ${p.health}.`,
        highlights:[`${top.name} leads revenue at $${top.revenue.toLocaleString()}.`,alerts[0]?`${alerts[0].locationName} needs attention: ${alerts[0].title.toLowerCase()}.`:"No material portfolio alerts are active."]
      }
    };
  }
  async updateGoal(id,patch,actor,org){
    const goal=await this.database.update("executiveGoals",id,{target:Number(patch.target),updatedAt:new Date().toISOString()});
    if(!goal) return null;
    await this.auditService.record({organizationId:org,actor,action:`Executive goal updated: ${goal.label}`,category:"executive"});
    this.realtimeHub.publish("executive:goal-updated",{...goal,organizationId:org});
    return goal;
  }
}
module.exports=ExecutiveCommandCenterService;
