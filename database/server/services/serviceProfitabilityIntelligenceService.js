"use strict";

class ServiceProfitabilityIntelligenceService {
  constructor(database,auditService,realtimeHub,commandCenterService,workforceIntelligenceService,inventoryIntelligenceService,guestIntelligenceService,executiveCommandCenterService){
    Object.assign(this,{database,auditService,realtimeHub,commandCenterService,workforceIntelligenceService,inventoryIntelligenceService,guestIntelligenceService,executiveCommandCenterService});
  }
  money(n){return Math.max(0,Math.round(Number(n)||0));}
  pct(n){return Math.round((Number(n)||0)*10)/10;}
  constraint(id,label,category,loss,why,nextAction,confidence=85,metrics={}){
    return {id,label,category,modeledLeakageDollars:this.money(loss),why,nextAction,confidence,metrics};
  }
  async snapshot(organizationId,locationId="loc_marina"){
    const [db,command,workforce,inventory,guest,executive]=await Promise.all([
      this.database.read(),
      this.commandCenterService.snapshot(organizationId,locationId),
      this.workforceIntelligenceService.snapshot(organizationId,locationId),
      this.inventoryIntelligenceService.snapshot(organizationId,locationId),
      this.guestIntelligenceService.snapshot(organizationId),
      this.executiveCommandCenterService.snapshot(organizationId)
    ]);
    const salesForecast=Number(command?.business?.forecastRevenue||workforce?.summary?.salesForecast||0);
    const covers=Number(command?.operation?.covers||0);
    const averageCheck=Number(command?.business?.averageCheck|| (covers?salesForecast/covers:0));
    const projectedLabor=Number(workforce?.summary?.projectedLabor||command?.operation?.projectedLabor||0);
    const targetLaborPercent=Number(workforce?.summary?.targetLaborPercent||18);
    const targetLaborDollars=salesForecast*targetLaborPercent/100;
    const actualFoodCostPercent=Number(inventory?.summary?.actualFoodCost||0);
    const targetFoodCostPercent=Number(inventory?.summary?.targetFoodCostPercent||29);
    const modeledFoodCostDollars=salesForecast*actualFoodCostPercent/100;
    const targetFoodCostDollars=salesForecast*targetFoodCostPercent/100;
    const wasteCost=Number(inventory?.summary?.wasteCost||0);

    const tables=(db.tables||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const serviceFlows=(db.serviceFlows||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["served","cancelled"].includes(x.status));
    const waitlist=(db.waitlist||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["seated","cancelled"].includes(x.status));
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["cancelled","completed","no_show"].includes(x.status));
    const cfg=(db.configurations||[]).find(x=>x.locationId===locationId)||{};
    const executiveLocation=(executive?.locations||[]).find(x=>x.locationId===locationId)||{};

    const now=Date.now();
    const delayed=tickets.map(t=>({...t,ageMinutes:Math.max(0,Math.round((now-new Date(t.createdAt||now).getTime())/60000))}))
      .filter(t=>t.ageMinutes>Number(t.targetMinutes||18));
    const delayedCovers=delayed.reduce((sum,t)=>{
      const flow=serviceFlows.find(f=>f.ticketId===t.id);
      return sum+Number(flow?.partySize||2);
    },0);
    const longWait=waitlist.filter(x=>Number(x.quotedMinutes||0)>=Number(cfg.waitThreshold||20));
    const waitCovers=longWait.reduce((s,x)=>s+Number(x.partySize||0),0);
    const unavailableSeats=tables.filter(x=>["blocked","cleaning"].includes(x.status)).reduce((s,x)=>s+Number(x.seats||0),0);
    const totalSeats=tables.reduce((s,x)=>s+Number(x.seats||0),0);
    const unassignedCovers=reservations.filter(x=>["confirmed","booked","pending","arrived"].includes(x.status)&&!x.tableId).reduce((s,x)=>s+Number(x.partySize||0),0);

    const foodCostVariance=Math.max(0,modeledFoodCostDollars-targetFoodCostDollars);
    const laborVariance=Math.max(0,projectedLabor-targetLaborDollars);
    const kitchenExposure=delayedCovers*averageCheck*0.20;
    const lostDemandExposure=waitCovers*averageCheck*0.35;
    const tableCapacityExposure=unavailableSeats*averageCheck*0.20;
    const reservationExposure=unassignedCovers*averageCheck*0.12;
    const guestExposure=Number(guest?.summary?.recoverableRevenue||0);
    const revenueTarget=Number(cfg.revenueTarget||0);
    const revenueGap=Math.max(0,revenueTarget-salesForecast);

    const constraints=[
      foodCostVariance>0&&this.constraint("profit_food_cost","Food-cost variance","food-cost",foodCostVariance,`Modeled food cost is ${this.pct(actualFoodCostPercent)}% against a ${this.pct(targetFoodCostPercent)}% target.`,"Review recipe cost, purchasing, portioning, and today's highest-cost variance before the next service window.",94,{actualFoodCostPercent,targetFoodCostPercent}),
      laborVariance>0&&this.constraint("profit_labor","Labor above target","labor",laborVariance,`Projected labor is $${this.money(projectedLabor).toLocaleString()} against a $${this.money(targetLaborDollars).toLocaleString()} target.`,"Reconcile coverage against demand and remove avoidable late labor without breaking service coverage.",91,{projectedLabor,targetLaborDollars,targetLaborPercent}),
      delayedCovers>0&&this.constraint("profit_kitchen","Kitchen throughput drag","kitchen",kitchenExposure,`${delayed.length} delayed ticket(s) expose approximately ${delayedCovers} covers to slower turns and recovery risk.`,"Rebalance the constrained station and expedite the oldest high-value ticket.",90,{delayedTickets:delayed.length,delayedCovers}),
      waitCovers>0&&this.constraint("profit_waitlist","Waitlist conversion leakage","demand",lostDemandExposure,`${waitCovers} covers are sitting at or beyond the configured wait threshold.`,"Protect conversion by matching flexible parties to the next viable tables and resetting quotes early.",84,{longWaitParties:longWait.length,waitCovers}),
      unavailableSeats>0&&this.constraint("profit_tables","Unavailable seat capacity","table-productivity",tableCapacityExposure,`${unavailableSeats} of ${totalSeats} seats are blocked or cleaning while demand is active.`,"Clear cleanable tables and verify blocked inventory is operationally necessary.",82,{unavailableSeats,totalSeats}),
      unassignedCovers>0&&this.constraint("profit_reservations","Unassigned reservation exposure","reservations",reservationExposure,`${unassignedCovers} booked/arrived covers do not currently have a table assignment.`,"Pre-assign the highest-value upcoming parties and protect turn sequencing.",86,{unassignedCovers}),
      guestExposure>0&&this.constraint("profit_guest_recovery","Recoverable guest revenue","guest",guestExposure,`${guest?.summary?.atRiskGuests||0} at-risk guest relationship(s) represent modeled recoverable revenue.`,"Assign personal recovery outreach to the highest-value at-risk guests.",80,{atRiskGuests:guest?.summary?.atRiskGuests||0}),
      revenueGap>0&&this.constraint("profit_revenue_gap","Revenue target gap","revenue",revenueGap,`Sales forecast is $${this.money(salesForecast).toLocaleString()} against a $${this.money(revenueTarget).toLocaleString()} configured target.`,"Use open inventory, reservation capture, and guest demand channels before the next peak.",78,{salesForecast,revenueTarget})
    ].filter(Boolean).sort((a,b)=>b.modeledLeakageDollars-a.modeledLeakageDollars);

    const controllableContribution=Math.max(0,salesForecast-modeledFoodCostDollars-projectedLabor-wasteCost);
    const controllableMarginPercent=salesForecast?controllableContribution/salesForecast*100:0;
    const targetContribution=Math.max(0,salesForecast-targetFoodCostDollars-targetLaborDollars);
    const modeledLeakage=constraints.reduce((s,x)=>s+x.modeledLeakageDollars,0);
    const topConstraint=constraints[0]||null;

    return {
      version:"47.20.0",generatedAt:new Date().toISOString(),organizationId,locationId,
      headline:topConstraint?`${topConstraint.label} is the largest modeled controllable profit constraint right now.`:"No material controllable profit constraint is currently modeled.",
      summary:{
        salesForecast:this.money(salesForecast),covers,averageCheck:this.pct(averageCheck),
        modeledFoodCostDollars:this.money(modeledFoodCostDollars),actualFoodCostPercent:this.pct(actualFoodCostPercent),targetFoodCostPercent:this.pct(targetFoodCostPercent),
        projectedLaborDollars:this.money(projectedLabor),laborPercent:salesForecast?this.pct(projectedLabor/salesForecast*100):0,targetLaborPercent:this.pct(targetLaborPercent),
        wasteDollars:this.money(wasteCost),
        modeledControllableContributionDollars:this.money(controllableContribution),
        modeledControllableMarginPercent:this.pct(controllableMarginPercent),
        targetControllableContributionDollars:this.money(targetContribution),
        modeledLeakageDollars:this.money(modeledLeakage),
        constraintCount:constraints.length,
        revenueTrend:this.pct(executiveLocation?.revenueTrend||0)
      },
      productivity:{
        seatedTables:tables.filter(x=>x.status==="seated").length,
        availableTables:tables.filter(x=>x.status==="available").length,
        unavailableSeats,totalSeats,
        delayedTickets:delayed.length,delayedCovers,
        waitlistParties:waitlist.length,longWaitParties:longWait.length,waitCovers,
        unassignedReservationCovers:unassignedCovers
      },
      constraints,
      bridge:[
        {id:"sales",label:"Sales forecast",value:this.money(salesForecast),direction:"base"},
        {id:"food",label:"Modeled food cost",value:-this.money(modeledFoodCostDollars),direction:"cost"},
        {id:"labor",label:"Projected labor",value:-this.money(projectedLabor),direction:"cost"},
        {id:"waste",label:"Recorded waste",value:-this.money(wasteCost),direction:"cost"},
        {id:"contribution",label:"Modeled controllable contribution",value:this.money(controllableContribution),direction:"result"}
      ],
      methodology:{
        label:"Modeled controllable contribution",
        included:["sales forecast","modeled food cost","projected labor","recorded waste","operational leakage signals"],
        excluded:["rent/occupancy","utilities","insurance","depreciation","taxes","financing","corporate overhead","unmodeled POS discounts/comps"],
        caveat:"This is an operating decision model, not GAAP net income or a restaurant P&L."
      }
    };
  }
  async capture(organizationId,locationId,actor){
    const snapshot=await this.snapshot(organizationId,locationId);
    const record={id:`profit_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,capturedAt:snapshot.generatedAt,capturedBy:actor,summary:snapshot.summary,productivity:snapshot.productivity,topConstraint:snapshot.constraints[0]||null,methodology:snapshot.methodology};
    await this.database.mutate(db=>{db.profitSnapshots||=[];db.profitSnapshots.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Service profitability snapshot captured: ${record.id}`,category:"service_profitability"});
    this.realtimeHub.publish("service-profitability:snapshot",record);
    return record;
  }
}
module.exports=ServiceProfitabilityIntelligenceService;
