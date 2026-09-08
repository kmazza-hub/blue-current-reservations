"use strict";

class PredictiveShiftControlService {
  constructor(database,auditService,realtimeHub,commandCenterService,workforceIntelligenceService,serviceProfitabilityIntelligenceService){
    Object.assign(this,{database,auditService,realtimeHub,commandCenterService,workforceIntelligenceService,serviceProfitabilityIntelligenceService});
  }
  now(){return new Date().toISOString();}
  clamp(n,min=0,max=100){return Math.max(min,Math.min(max,Number(n)||0));}
  round(n,d=0){const p=10**d;return Math.round((Number(n)||0)*p)/p;}
  severity(score){return score>=88?"critical":score>=75?"high":score>=60?"watch":"stable";}
  intervention(type,etaMinutes,pressure,detail,action,owner,expectedImpact){
    return {id:`psi_${type}`,type,etaMinutes,pressure,severity:this.severity(pressure),detail,action,owner,expectedImpact,requiresApproval:true,automaticExecution:false};
  }
  async snapshot(organizationId,locationId="loc_marina"){
    const [db,command,workforce,profitability]=await Promise.all([
      this.database.read(),
      this.commandCenterService.snapshot(organizationId,locationId),
      this.workforceIntelligenceService.snapshot(organizationId,locationId),
      this.serviceProfitabilityIntelligenceService.snapshot(organizationId,locationId)
    ]);
    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["cancelled","completed","no_show"].includes(x.status));
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["seated","cancelled"].includes(x.status));
    const tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["served","cancelled"].includes(x.status));
    const stations=(db.kitchenStations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const decisions=(db.predictiveShiftDecisions||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId).slice(-40).reverse();

    const totalSeats=tables.reduce((s,x)=>s+Number(x.seats||0),0);
    const seatedSeats=tables.filter(x=>x.status==="seated").reduce((s,x)=>s+Math.max(Number(x.partySize||0),Number(x.seats||0)*.65),0);
    const availableSeats=tables.filter(x=>x.status==="available").reduce((s,x)=>s+Number(x.seats||0),0);
    const unavailableSeats=tables.filter(x=>["blocked","cleaning"].includes(x.status)).reduce((s,x)=>s+Number(x.seats||0),0);
    const reservationCovers=reservations.reduce((s,x)=>s+Number(x.partySize||0),0);
    const unassignedCovers=reservations.filter(x=>!x.tableId).reduce((s,x)=>s+Number(x.partySize||0),0);
    const waitCovers=waitlist.reduce((s,x)=>s+Number(x.partySize||0),0);
    const longWaitCovers=waitlist.filter(x=>Number(x.quotedMinutes||0)>=20).reduce((s,x)=>s+Number(x.partySize||0),0);

    const nowMs=Date.now();
    const delayed=tickets.map(t=>({...t,ageMinutes:Math.max(0,Math.round((nowMs-new Date(t.createdAt||nowMs).getTime())/60000))})).filter(t=>t.ageMinutes>Number(t.targetMinutes||18));
    const kitchenLoad=tickets.reduce((s,t)=>s+(t.items||[]).reduce((q,i)=>q+Number(i.qty||1),0),0);
    const readyTickets=tickets.filter(x=>["ready","plating"].includes(x.status)).length;
    const unavailableStations=stations.filter(x=>x.status&&x.status!=="open"&&x.status!=="active").length;

    const coverage=workforce?.roleCoverage||[];
    const staffRequired=coverage.reduce((s,x)=>s+Number(x.required||0),0);
    const staffScheduled=coverage.reduce((s,x)=>s+Number(x.scheduled||0),0);
    const staffingGap=coverage.reduce((s,x)=>s+Math.max(0,Number(x.required||0)-Number(x.scheduled||0)),0);
    const laborPercent=Number(workforce?.summary?.laborPercent||0);
    const targetLaborPercent=Number(workforce?.summary?.targetLaborPercent||18);
    const revenueTrend=Number(profitability?.summary?.revenueTrend||0);
    const modeledLeakage=Number(profitability?.summary?.modeledLeakageDollars||0);
    const averageCheck=Number(profitability?.summary?.averageCheck||command?.business?.averageCheck||30);

    const seatUtilization=totalSeats?seatedSeats/totalSeats*100:0;
    const demandInventoryCovers=reservationCovers+waitCovers;
    const hostBase=this.clamp(seatUtilization*.55+(totalSeats?unavailableSeats/totalSeats*100:0)*.20+(availableSeats?Math.min(100,unassignedCovers/availableSeats*100):unassignedCovers?100:0)*.15+Math.min(100,longWaitCovers*8)*.10);
    const kitchenBase=this.clamp(Math.min(100,tickets.length*11)*.28+Math.min(100,delayed.length*24)*.42+Math.min(100,kitchenLoad*4)*.18+Math.min(100,readyTickets*18)*.08+Math.min(100,unavailableStations*35)*.04);
    const laborBase=this.clamp((staffRequired?Math.min(100,staffingGap/Math.max(1,staffRequired)*160):0)*.65+Math.max(0,laborPercent-targetLaborPercent)*5*.20+Math.min(100,Number(workforce?.summary?.calloutRisk||0)*28)*.15);
    const revenueBase=this.clamp(Math.max(0,-revenueTrend)*7*.55+Math.min(100,modeledLeakage/50)*.45);

    const horizons=[0,15,30,45,60,90],demandRamp={0:0,15:.18,30:.38,45:.60,60:.78,90:.52},kitchenRamp={0:0,15:.22,30:.45,45:.70,60:.86,90:.64},laborRamp={0:0,15:.10,30:.24,45:.42,60:.58,90:.70};
    const demandWaveStrength=this.clamp(totalSeats?demandInventoryCovers/Math.max(1,totalSeats)*100:0);
    const kitchenWaveStrength=this.clamp(reservationCovers*.9+waitCovers*1.4+unassignedCovers*.8);
    const laborWaveStrength=this.clamp(demandInventoryCovers*1.3+staffingGap*22);
    const revenueWaveStrength=this.clamp(Math.max(0,-revenueTrend)*8+modeledLeakage/70);

    const forecast=horizons.map(minutes=>{
      const host=this.clamp(hostBase+demandWaveStrength*demandRamp[minutes]);
      const kitchen=this.clamp(kitchenBase+kitchenWaveStrength*kitchenRamp[minutes]);
      const labor=this.clamp(laborBase+laborWaveStrength*laborRamp[minutes]);
      const revenue=this.clamp(revenueBase+revenueWaveStrength*(minutes/90)*.35);
      const overall=this.round(host*.34+kitchen*.34+labor*.20+revenue*.12);
      return {minutes,overall,host:this.round(host),kitchen:this.round(kitchen),labor:this.round(labor),revenue:this.round(revenue),severity:this.severity(overall)};
    });

    const dimensions=["host","kitchen","labor","revenue"],crossings=[];
    for(const dimension of dimensions){const hit=forecast.find(x=>x.minutes>0&&x[dimension]>=75);if(hit)crossings.push({dimension,etaMinutes:hit.minutes,pressure:hit[dimension]});}
    crossings.sort((a,b)=>a.etaMinutes-b.etaMinutes||b.pressure-a.pressure);
    const first=crossings[0]||null,interventions=[];
    for(const x of crossings){
      if(x.dimension==="host")interventions.push(this.intervention("host-table-capacity",x.etaMinutes,x.pressure,`${reservationCovers} active reservation covers + ${waitCovers} waitlist covers are approaching ${availableSeats} currently available seats.`,"Pre-assign unassigned parties, clear cleaning tables, and verify blocked tables before the arrival wave.","Host Lead",`Protect approximately $${Math.round((unassignedCovers+waitCovers)*averageCheck*.20).toLocaleString()} of demand exposure`));
      if(x.dimension==="kitchen")interventions.push(this.intervention("kitchen-throughput",x.etaMinutes,x.pressure,`${tickets.length} active tickets, ${delayed.length} delayed tickets, and ${kitchenLoad} active item units are compounding with incoming demand.`,"Rebalance the highest-load station, stage expo support, and protect the oldest ticket before the next seating wave.","Kitchen Manager",`Protect ${delayed.length||tickets.length} ticket${(delayed.length||tickets.length)===1?"":"s"} and future table turns`));
      if(x.dimension==="labor")interventions.push(this.intervention("labor-capacity",x.etaMinutes,x.pressure,`${staffScheduled} scheduled people are covering ${staffRequired} modeled required positions with a current gap of ${staffingGap}.`,"Move coverage before demand peaks; fill the highest-impact role gap without adding unnecessary labor.","General Manager","Protect service capacity while holding labor discipline"));
      if(x.dimension==="revenue")interventions.push(this.intervention("revenue-pace",x.etaMinutes,x.pressure,`Revenue trend is ${revenueTrend>=0?"+":""}${revenueTrend}% with $${Math.round(modeledLeakage).toLocaleString()} of current modeled operating exposure.`,"Protect conversion and service capacity first; use remaining table inventory for the highest-value incremental demand.","General Manager","Protect near-term revenue capture"));
    }

    const decisionMap=new Map(decisions.map(x=>[x.interventionId,x]));
    const ranked=interventions.sort((a,b)=>a.etaMinutes-b.etaMinutes||b.pressure-a.pressure).map((x,i)=>({...x,rank:i+1,lastDecision:decisionMap.get(x.id)||null}));
    const completeness=[tables.length>0,reservations.length>0,tickets.length>0,Boolean(workforce?.summary),Boolean(profitability?.summary),Boolean(command?.business)].filter(Boolean).length;
    const confidence=this.clamp(62+completeness*5-Math.min(12,Math.abs(revenueTrend)));

    return {
      version:"47.25.0",generatedAt:this.now(),organizationId,locationId,
      headline:first?`${first.dimension==="host"?"Host/table":first.dimension.charAt(0).toUpperCase()+first.dimension.slice(1)} pressure is forecast to cross the action threshold in about ${first.etaMinutes} minutes.`:"No modeled service dimension crosses the intervention threshold in the next 90 minutes.",
      summary:{confidence:this.round(confidence),firstConstraint:first?.dimension||null,timeToConstraintMinutes:first?.etaMinutes??null,firstConstraintPressure:first?.pressure??null,peakOverallPressure:Math.max(...forecast.map(x=>x.overall)),interventionCount:ranked.length,reservationCovers,waitCovers,availableSeats,unavailableSeats,activeTickets:tickets.length,delayedTickets:delayed.length,staffingGap,revenueTrend},
      signals:{tables:{totalSeats:this.round(totalSeats),seatedSeats:this.round(seatedSeats),availableSeats,unavailableSeats,seatUtilizationPercent:this.round(seatUtilization)},demand:{reservationCovers,unassignedCovers,waitCovers,longWaitCovers,demandInventoryCovers},kitchen:{activeTickets:tickets.length,delayedTickets:delayed.length,kitchenLoad,readyTickets,unavailableStations},labor:{staffScheduled,staffRequired,staffingGap,laborPercent:this.round(laborPercent,1),targetLaborPercent:this.round(targetLaborPercent,1)},economics:{revenueTrend:this.round(revenueTrend,1),modeledLeakageDollars:Math.round(modeledLeakage),averageCheck:this.round(averageCheck,2)}},
      baseline:{host:this.round(hostBase),kitchen:this.round(kitchenBase),labor:this.round(laborBase),revenue:this.round(revenueBase)},
      forecast,interventions:ranked,decisions,
      thresholds:{watch:60,action:75,critical:88,horizonMinutes:90},
      methodology:{model:"transparent operating-pressure heuristic",machineLearning:false,inputs:["reservation/waitlist demand inventory","table/seat availability","kitchen ticket load and delay","workforce role coverage","revenue trend","modeled profitability leakage"],caveat:"This is a decision-support forecast, not a guaranteed prediction. Managers approve every intervention."},
      policy:{humanApprovalRequired:true,automaticExecution:false}
    };
  }
  async decide(organizationId,locationId,interventionId,input,actor){
    const allowed=new Set(["accepted","snoozed","dismissed","completed"]),decision=allowed.has(input.decision)?input.decision:"accepted",snapshot=await this.snapshot(organizationId,locationId),intervention=snapshot.interventions.find(x=>x.id===interventionId);
    if(!intervention)throw new Error("Predictive intervention is no longer active.");
    const record={id:`psd_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,interventionId,decision,owner:String(input.owner||intervention.owner||actor).slice(0,120),note:String(input.note||"").slice(0,500),etaMinutes:intervention.etaMinutes,pressure:intervention.pressure,actor,createdAt:this.now()};
    await this.database.mutate(db=>{db.predictiveShiftDecisions||=[];db.predictiveShiftDecisions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Predictive shift intervention ${decision}: ${interventionId}`,category:"predictive_shift_control"});
    this.realtimeHub.publish("predictive-shift:decision",record);return record;
  }
}
module.exports=PredictiveShiftControlService;
