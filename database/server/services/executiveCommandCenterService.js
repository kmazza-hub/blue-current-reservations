"use strict";
class ExecutiveCommandCenterService {
  constructor(database,auditService,realtimeHub,aiRestaurantBrainService){
    Object.assign(this,{database,auditService,realtimeHub,aiRestaurantBrainService});
  }
  latestFinancial(db,organizationId,locationId){
    const candidates=[
      ...(db.financialSnapshots||[]),
      ...(db.locationFinancials||[]),
      ...(db.revenueSnapshots||[])
    ].filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    return [...candidates].sort((a,b)=>new Date(b.generatedAt||b.createdAt||b.date||0)-new Date(a.generatedAt||a.createdAt||a.date||0))[0]||null;
  }
  numericFinancial(record,keyCandidates){
    if(!record)return null;
    for(const key of keyCandidates){
      const v=Number(record[key]);
      if(Number.isFinite(v))return v;
    }
    return null;
  }
  async locationSnapshot(location){
    const db=await this.database.read(),id=location.id,org=location.organizationId;
    const tables=(db.tables||[]).filter(x=>x.organizationId===org&&x.locationId===id);
    const activeTables=tables.filter(x=>["occupied","seated","dining"].includes(String(x.status||"").toLowerCase())).length;
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===org&&x.locationId===id&&!["cancelled","canceled","completed"].includes(String(x.status||"").toLowerCase()));
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===org&&x.locationId===id&&!["seated","cancelled","canceled"].includes(String(x.status||"").toLowerCase()));
    const tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===org&&x.locationId===id&&!["served","cancelled","canceled"].includes(String(x.status||"").toLowerCase()));
    const staff=(db.staff||[]).filter(x=>x.organizationId===org&&x.locationId===id&&x.status!=="off");
    let health=null;
    if(id==="loc_marina"){try{const h=(await this.aiRestaurantBrainService.snapshot(id))?.health?.overall;health=Number.isFinite(Number(h))?Number(h):null;}catch{}}
    const financial=this.latestFinancial(db,org,id);
    const revenue=this.numericFinancial(financial,["revenue","netSales","sales"]);
    const yesterday=this.numericFinancial(financial,["yesterdayRevenue","priorDayRevenue","previousDaySales"]);
    const total=tables.length||null;
    const occupancy=total?Math.round(activeTables/total*100):null;
    const guestCount=reservations.filter(r=>["arrived","seated","completed"].includes(String(r.status||"").toLowerCase())).reduce((n,r)=>n+Number(r.partySize||0),0)||null;
    const ticketMinutes=tickets.map(t=>Math.max(0,Math.floor((Date.now()-new Date(t.createdAt||t.updatedAt||Date.now()).getTime())/60000))).filter(Number.isFinite);
    const avgTicket=ticketMinutes.length?Math.round(ticketMinutes.reduce((a,b)=>a+b,0)/ticketMinutes.length):null;
    const revenueTrend=Number.isFinite(revenue)&&Number.isFinite(yesterday)&&yesterday!==0?Math.round((revenue-yesterday)/yesterday*1000)/10:null;
    const risk=Number.isFinite(health)&&health<82||Number.isFinite(avgTicket)&&avgTicket>20?"high":Number.isFinite(health)&&health<90||Number.isFinite(avgTicket)&&avgTicket>17?"medium":"unknown";
    return {
      locationId:id,name:location.name,city:location.city,state:location.state,status:location.status||"open",
      health,revenue,yesterdayRevenue:yesterday,revenueTrend,guestCount,
      occupancy,activeTables,totalTables:total,reservations:reservations.length,waitlist:waitlist.length,
      activeTickets:tickets.length,readyTickets:tickets.filter(x=>x.status==="ready").length,
      averageTicketMinutes:avgTicket,activeStaff:staff.length,
      acceptedAiDecisions:(db.aiDecisionHistory||[]).filter(x=>x.organizationId===org&&x.locationId===id&&x.status==="accepted").length,
      risk,
      provenance:{
        revenue:financial?"authoritative-financial-record":"unavailable",
        occupancy:tables.length?"tables":"unavailable",
        reservations:"reservations",
        waitlist:"waitlist",
        activeTickets:"kitchenTickets",
        activeStaff:"staff",
        guestCount:guestCount!==null?"reservation-party-size":"unavailable",
        health:health!==null?"ai-restaurant-brain":"unavailable"
      },
      syntheticFallbackUsed:false
    };
  }
  portfolio(ls){
    const values=k=>ls.map(x=>x[k]).filter(Number.isFinite);
    const sumNullable=k=>{const v=values(k);return v.length?v.reduce((a,b)=>a+b,0):null;};
    const avgNullable=k=>{const v=values(k);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;};
    const rev=sumNullable("revenue"),y=sumNullable("yesterdayRevenue");
    const active=sumNullable("activeTables"),total=sumNullable("totalTables");
    return {
      health:avgNullable("health"),revenue:rev,yesterdayRevenue:y,
      revenueTrend:Number.isFinite(rev)&&Number.isFinite(y)&&y!==0?Math.round((rev-y)/y*1000)/10:null,
      guestCount:sumNullable("guestCount"),
      occupancy:Number.isFinite(active)&&Number.isFinite(total)&&total>0?Math.round(active/total*100):null,
      activeTables:active,totalTables:total,
      activeLocations:ls.filter(x=>x.status==="open").length,
      atRiskLocations:ls.filter(x=>x.risk==="high").length,
      averageTicketMinutes:avgNullable("averageTicketMinutes"),
      acceptedAiDecisions:sumNullable("acceptedAiDecisions"),
      dataComplete:ls.every(x=>x.syntheticFallbackUsed===false&&Number.isFinite(x.revenue)&&Number.isFinite(x.occupancy))
    };
  }
  alerts(ls){
    const out=[];
    for(const x of ls){
      if(Number.isFinite(x.health)&&x.health<82)out.push({id:`a_${x.locationId}_h`,locationId:x.locationId,locationName:x.name,severity:"critical",title:"Restaurant health below threshold",detail:`${x.name} is operating at ${x.health}.`,action:"Open location"});
      if(Number.isFinite(x.averageTicketMinutes)&&x.averageTicketMinutes>20)out.push({id:`a_${x.locationId}_t`,locationId:x.locationId,locationName:x.name,severity:"high",title:"Kitchen timing intervention needed",detail:`Average ticket time is ${x.averageTicketMinutes} minutes.`,action:"Review kitchen"});
      if(Number.isFinite(x.revenueTrend)&&x.revenueTrend<=-5)out.push({id:`a_${x.locationId}_r`,locationId:x.locationId,locationName:x.name,severity:"medium",title:"Revenue pacing below yesterday",detail:`${x.name} is pacing ${Math.abs(x.revenueTrend)}% below yesterday.`,action:"Review demand"});
    }
    return out;
  }
  async snapshot(org){
    const db=await this.database.read(),raw=(db.locations||[]).filter(x=>x.organizationId===org),ls=[];
    for(const x of raw)ls.push(await this.locationSnapshot(x));
    const p=this.portfolio(ls),alerts=this.alerts(ls);
    const ranked=[...ls].filter(x=>Number.isFinite(x.revenue)).sort((a,b)=>b.revenue-a.revenue),top=ranked[0]||null;
    return {
      generatedAt:new Date().toISOString(),portfolio:p,
      locations:ls.sort((a,b)=>(Number.isFinite(b.revenue)?b.revenue:-Infinity)-(Number.isFinite(a.revenue)?a.revenue:-Infinity)),
      alerts,goals:(db.executiveGoals||[]).filter(x=>x.organizationId===org),
      dataPolicy:{syntheticFallbacks:false,missingAuthoritativeMetricsRemainNull:true,financialMetricsRequireFinancialSource:true},
      brief:{
        headline:Number.isFinite(p.revenueTrend)?`Portfolio revenue is pacing ${p.revenueTrend>=0?p.revenueTrend+"% above":Math.abs(p.revenueTrend)+"% below"} yesterday.`:"Portfolio revenue pacing is unavailable until authoritative financial data is connected.",
        summary:`${p.activeLocations} locations are open. Missing executive KPIs remain visibly unavailable rather than being modeled.`,
        highlights:[top?`${top.name} leads sourced revenue at $${top.revenue.toLocaleString()}.`:"No authoritative location revenue source is currently available.",alerts[0]?`${alerts[0].locationName} needs attention: ${alerts[0].title.toLowerCase()}.`:"No source-backed material portfolio alerts are active."]
      }
    };
  }
  async updateGoal(id,patch,actor,org){
    const current=await this.database.get("executiveGoals",id);
    if(!current || current.organizationId!==org)return null;
    const target=Number(patch.target);
    if(!Number.isFinite(target)){
      const error=new Error("Executive goal target must be numeric.");
      error.statusCode=400;
      throw error;
    }
    const goal=await this.database.update("executiveGoals",id,{target,updatedAt:new Date().toISOString()});
    if(!goal)return null;
    await this.auditService.record({organizationId:org,actor,action:`Executive goal updated: ${goal.label}`,category:"executive"});
    this.realtimeHub.publish("executive:goal-updated",{...goal,organizationId:org});
    return goal;
  }
}
module.exports=ExecutiveCommandCenterService;
