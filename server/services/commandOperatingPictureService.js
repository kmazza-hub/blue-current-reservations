"use strict";

class CommandOperatingPictureService{
  constructor(database,{pilotReadinessCommandCenterService=null,operatorWorkflowCertificationService=null}={}){
    this.database=database;
    this.pilotReadiness=pilotReadinessCommandCenterService;
    this.operatorWorkflow=operatorWorkflowCertificationService;
  }

  _num(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
  _activeTable(table){return ["seated","occupied","dining"].includes(String(table.status||"").toLowerCase());}
  _activeTicket(ticket){return !["served","cancelled","canceled","complete","completed"].includes(String(ticket.status||"").toLowerCase());}

  async snapshot(organizationId,allowedLocationIds=[],requestedLocationId=null){
    const db=await this.database.read();
    const canAccess=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&canAccess(x.id));
    if(!locations.length){
      const error=new Error("No authorized Blue Current locations are available.");
      error.statusCode=403;throw error;
    }
    const location=requestedLocationId
      ? locations.find(x=>x.id===requestedLocationId)
      : locations[0];
    if(!location){
      const error=new Error("Requested location is not available.");
      error.statusCode=404;throw error;
    }

    const sameLoc=item=>item?.organizationId===organizationId&&item?.locationId===location.id;
    const tables=(db.tables||[]).filter(sameLoc);
    const reservations=(db.reservations||[]).filter(sameLoc);
    const waitlist=(db.waitlist||[]).filter(sameLoc);
    const staff=(db.staff||[]).filter(sameLoc);
    const tickets=(db.kitchenTickets||[]).filter(sameLoc);
    const inventory=(db.inventoryItems||[]).filter(sameLoc);
    const laborPlan=(db.laborPlans||[]).filter(sameLoc).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0]||null;
    const config=(db.configurations||[]).find(x=>x.locationId===location.id)||{};
    const activeTables=tables.filter(x=>this._activeTable(x));
    const activeCovers=activeTables.reduce((sum,x)=>sum+this._num(x.partySize),0);
    const capacity=this._num(location.capacity,tables.reduce((sum,x)=>sum+this._num(x.seats),0));
    const occupancy=capacity>0?Math.round(activeCovers/capacity*100):0;
    const waiting=waitlist.filter(x=>String(x.status||"waiting").toLowerCase()==="waiting");
    const avgWait=waiting.length?Math.round(waiting.reduce((s,x)=>s+this._num(x.quotedMinutes),0)/waiting.length):0;
    const activeTickets=tickets.filter(x=>this._activeTicket(x));
    const kitchenTarget=activeTickets.length
      ? Math.round(activeTickets.reduce((s,x)=>s+this._num(x.targetMinutes,18),0)/activeTickets.length)
      : 0;
    const foodReady=activeTickets.reduce((count,t)=>count+(t.items||[]).filter(i=>String(i.status).toLowerCase()==="ready").length,0);
    const activeStaff=staff.filter(x=>["active","working","clocked-in","on"].includes(String(x.status||"").toLowerCase())).length;
    const lowStock=inventory.filter(x=>this._num(x.par)>0&&this._num(x.onHand)<this._num(x.par)*0.6);
    const highRiskTickets=activeTickets.filter(x=>["vip","high","urgent"].includes(String(x.priority||"").toLowerCase())||String(x.status||"").toLowerCase()==="held");

    const now=Date.now();
    const upcoming=reservations
      .filter(r=>["confirmed","arrived","booked","pending"].includes(String(r.status||"").toLowerCase()))
      .sort((a,b)=>new Date(a.reservationTime)-new Date(b.reservationTime));
    const next30=upcoming.filter(r=>{
      const at=new Date(r.reservationTime).getTime();
      return Number.isFinite(at)&&at>=now&&at<=now+30*60*1000;
    });
    const next30Covers=next30.reduce((s,r)=>s+this._num(r.partySize),0);

    // Seed/demo datasets can be intentionally historical. Report this rather than presenting them as current telemetry.
    const timestamps=[
      ...reservations.map(x=>x.updatedAt||x.createdAt||x.reservationTime),
      ...tickets.map(x=>x.updatedAt||x.createdAt),
      ...waitlist.map(x=>x.updatedAt||x.createdAt)
    ].map(x=>new Date(x).getTime()).filter(Number.isFinite);
    const newestTimestamp=timestamps.length?Math.max(...timestamps):null;
    const dataAgeHours=newestTimestamp?Math.round((now-newestTimestamp)/3600000):null;
    const dataMode=dataAgeHours!==null&&dataAgeHours>24?"historical-demo":"live-current";

    const attention=[];
    const add=(severity,domain,title,detail,workspace,metric=null)=>attention.push({severity,domain,title,detail,workspace,metric});
    if(highRiskTickets.length)add("high","kitchen","Kitchen pressure needs attention",`${highRiskTickets.length} priority/held ticket${highRiskTickets.length===1?" requires":"s require"} review.`,"kitchen",highRiskTickets.length);
    if(foodReady>0)add("high","kitchen","Food is ready to run",`${foodReady} item${foodReady===1?" is":"s are"} ready at expo.`,"kitchen",foodReady);
    if(avgWait>this._num(config.waitThreshold,20))add("high","guests","Wait is above target",`Average quoted wait is ${avgWait} minutes.`,"guests",avgWait);
    if(occupancy>this._num(config.occupancyThreshold,90))add("watch","service","Dining room is near capacity",`${occupancy}% of configured capacity is currently seated.`,"service",occupancy);
    if(lowStock.length)add("watch","inventory","Inventory needs review",`${lowStock.length} item${lowStock.length===1?" is":"s are"} below 60% of par.`,"inventory",lowStock.length);
    const vipArrival=upcoming.find(x=>x.vip);
    if(vipArrival)add("guest","guests","VIP guest context is ready",`${vipArrival.guestName||"VIP guest"} is in the active reservation queue.`,"guests",vipArrival.id);
    if(!attention.length)add("normal","service","No immediate operational exceptions","Blue Current has no rule-based service exceptions in the current snapshot.","service",0);

    const revenueTarget=this._num(laborPlan?.salesForecast||config.revenueTarget);
    const laborBudget=this._num(laborPlan?.laborBudget);
    const laborPercent=this._num(laborPlan?.targetLaborPercent);
    const openReservationCovers=upcoming.reduce((s,r)=>s+this._num(r.partySize),0);

    let readiness=null,operator=null;
    try{
      if(this.pilotReadiness)readiness=await this.pilotReadiness.snapshot(organizationId,[location.id]);
    }catch{}
    try{
      if(this.operatorWorkflow)operator=await this.operatorWorkflow.certify(organizationId,[location.id]);
    }catch{}

    return {
      version:"76.0.0",generatedAt:new Date().toISOString(),organizationId,
      dataMode,dataAgeHours,
      location:{id:location.id,name:location.name,capacity,timezone:location.timezone||null},
      locations:locations.map(x=>({id:x.id,name:x.name,capacity:this._num(x.capacity)})),
      service:{
        activeCovers,activeTables:activeTables.length,totalTables:tables.length,occupancyPercent:occupancy,
        waitlistParties:waiting.length,averageQuotedWaitMinutes:avgWait,activeStaff,
        activeKitchenTickets:activeTickets.length,foodReadyItems:foodReady,kitchenTargetMinutes:kitchenTarget,
        upcomingReservations:upcoming.length,upcomingReservationCovers:openReservationCovers
      },
      next30Minutes:{reservations:next30.length,covers:next30Covers,expectedTurns:null,source:dataMode==="live-current"?"clock-window":"historical-data"},
      financial:{
        salesForecast:revenueTarget||null,laborBudget:laborBudget||null,targetLaborPercent:laborPercent||null,
        actualRevenue:null,actualLaborPercent:null,
        actualsAvailable:false
      },
      inventory:{items:inventory.length,lowStockItems:lowStock.length},
      attention:attention.slice(0,5),
      readiness:readiness?{decision:readiness.decision,blockerCount:readiness.blockerCount}:null,
      operator:operator?{ready:operator.operatorPilotReady,blockerCount:operator.blockerCount}:null,
      truth:{
        derivedFromPersistedState:true,
        syntheticCommandMetrics:false,
        revenueActualNotInvented:true,
        expectedTurnsNotInvented:true
      }
    };
  }
}
module.exports=CommandOperatingPictureService;
