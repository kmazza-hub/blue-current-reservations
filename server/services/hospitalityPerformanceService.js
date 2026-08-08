"use strict";

class HospitalityPerformanceService {
  constructor(database,auditService,realtimeHub,commandCenterService,workforceIntelligenceService,inventoryIntelligenceService,guestIntelligenceService,executiveCommandCenterService){
    Object.assign(this,{database,auditService,realtimeHub,commandCenterService,workforceIntelligenceService,inventoryIntelligenceService,guestIntelligenceService,executiveCommandCenterService});
  }
  clamp(n,min=0,max=100){return Math.max(min,Math.min(max,Number(n)||0));}
  severityWeight(severity){return ({critical:100,high:82,medium:62,normal:48,low:30}[String(severity||"").toLowerCase()]||50);}
  money(value){return Math.max(0,Math.round(Number(value)||0));}
  opportunity({id,category,title,why,nextAction,owner="Manager",severity="medium",impactDollars=0,impactLabel="",confidence=80,source,locationId,metadata={}}){
    const urgency=this.severityWeight(severity),impactScore=this.clamp(impactDollars>1000?95:impactDollars>500?82:impactDollars>200?68:impactDollars>50?52:impactDollars>0?40:30);
    const score=Math.round(urgency*.40+impactScore*.35+this.clamp(confidence)*.25);
    return {id,category,title,why,nextAction,owner,severity,score,estimatedImpactDollars:this.money(impactDollars),impactLabel:impactLabel|| (impactDollars?`≈ $${this.money(impactDollars).toLocaleString()} opportunity`:"Operational protection"),confidence:this.clamp(confidence),source,locationId,metadata,status:"open"};
  }
  kitchenOpportunities(db,organizationId,locationId){
    const now=Date.now(),tickets=(db.kitchenTickets||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["served","cancelled"].includes(x.status));
    if(!tickets.length)return [];
    const aged=tickets.map(t=>({...t,ageMinutes:Math.max(0,Math.round((now-new Date(t.createdAt||now).getTime())/60000))})).filter(t=>t.ageMinutes>Number(t.targetMinutes||18));
    if(!aged.length)return [];
    const worst=[...aged].sort((a,b)=>b.ageMinutes-a.ageMinutes)[0],avg=Math.round(aged.reduce((s,x)=>s+x.ageMinutes,0)/aged.length);
    return [this.opportunity({id:`perf_kitchen_${locationId}`,category:"kitchen",title:`Recover ${aged.length} delayed kitchen ticket${aged.length===1?"":"s"}`,why:`${aged.length} active ticket${aged.length===1?" is":"s are"} beyond target; the oldest is ${worst.ageMinutes} minutes.`,nextAction:"Open Kitchen Command, rebalance station load, and expedite the oldest ticket first.",owner:"Kitchen Manager",severity:worst.ageMinutes>=30?"critical":"high",impactDollars:aged.length*45,impactLabel:`Protect ${aged.length} guest experience${aged.length===1?"":"s"} · avg delay ${avg} min`,confidence:94,source:"kitchenTickets",locationId,metadata:{agedTickets:aged.length,oldestMinutes:worst.ageMinutes,averageAgeMinutes:avg}})];
  }
  reservationOpportunities(db,organizationId,locationId){
    const reservations=(db.reservations||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["cancelled","completed","no_show"].includes(x.status)),waitlist=(db.waitlist||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId&&!["seated","cancelled"].includes(x.status)),unassigned=reservations.filter(x=>["confirmed","booked","pending"].includes(x.status)&&!x.tableId),longWait=waitlist.filter(x=>Number(x.quotedMinutes||0)>=25),out=[];
    if(unassigned.length)out.push(this.opportunity({id:`perf_res_assignment_${locationId}`,category:"reservations",title:`Pre-assign ${unassigned.length} reservation${unassigned.length===1?"":"s"} before arrival`,why:`${unassigned.length} active reservation${unassigned.length===1?" has":"s have"} no table assignment.`,nextAction:"Open Reservations, match parties to tables, and protect high-value/VIP requests first.",owner:"Host Lead",severity:unassigned.length>=4?"high":"medium",impactDollars:unassigned.reduce((s,x)=>s+Number(x.partySize||0)*18,0),impactLabel:`Protect ${unassigned.reduce((s,x)=>s+Number(x.partySize||0),0)} booked covers`,confidence:92,source:"reservations",locationId,metadata:{unassignedReservations:unassigned.length}}));
    if(longWait.length)out.push(this.opportunity({id:`perf_wait_${locationId}`,category:"reservations",title:`Reduce ${longWait.length} long waitlist quote${longWait.length===1?"":"s"}`,why:`${longWait.length} waiting part${longWait.length===1?"y is":"ies are"} quoted at least 25 minutes.`,nextAction:"Review table turns and available inventory; seat the longest-waiting flexible party first.",owner:"Host Lead",severity:"high",impactDollars:longWait.reduce((s,x)=>s+Number(x.partySize||0)*22,0),impactLabel:"Protect walk-in conversion and guest sentiment",confidence:88,source:"waitlist",locationId,metadata:{longWaits:longWait.length}}));
    return out;
  }
  guestOpportunities(guest,locationId){
    const recoverable=Number(guest?.summary?.recoverableRevenue||0),atRisk=Number(guest?.summary?.atRiskGuests||0);
    if(!atRisk||!recoverable)return [];
    return [this.opportunity({id:`perf_guest_recovery_${locationId}`,category:"guests",title:`Recover ${atRisk} at-risk guest relationship${atRisk===1?"":"s"}`,why:`Guest Intelligence estimates $${recoverable.toLocaleString()} in recoverable revenue.`,nextAction:"Open Guest Intelligence, prioritize the highest-value at-risk guest, and assign a personal recovery touch.",owner:"General Manager",severity:recoverable>=1000?"high":"medium",impactDollars:recoverable,impactLabel:`≈ $${recoverable.toLocaleString()} recoverable revenue`,confidence:82,source:"guestIntelligence",locationId,metadata:{atRiskGuests:atRisk,recoverableRevenue:recoverable}})];
  }
  workforceOpportunities(workforce,locationId){
    return (workforce?.recommendations||[]).filter(x=>x.id!=="wf_hold_plan").slice(0,3).map((x,i)=>{
      const save=(String(x.impact||"").match(/\$(\d[\d,]*)/)||[])[1],impact=save?Number(save.replace(/,/g,"")):(x.severity==="high"?350:150);
      return this.opportunity({id:`perf_workforce_${x.id}`,category:"labor",title:x.title,why:x.reason,nextAction:x.action,owner:"General Manager",severity:x.severity||"medium",impactDollars:impact,impactLabel:x.impact||"Protect labor efficiency",confidence:86-i*3,source:"workforceIntelligence",locationId,metadata:{recommendationId:x.id}});
    });
  }
  inventoryOpportunities(inventory,locationId){
    return (inventory?.recommendations||[]).filter(x=>x.id!=="inv_hold").slice(0,3).map((x,i)=>{
      const recover=(String(x.impact||"").match(/\$(\d[\d,]*)/)||[])[1],impact=recover?Number(recover.replace(/,/g,"")):(x.severity==="critical"?500:180);
      return this.opportunity({id:`perf_inventory_${x.id}`,category:"inventory",title:x.title,why:x.reason,nextAction:x.type==="reorder"?"Open Inventory and approve the draft replenishment quantity.":"Open Inventory Intelligence and resolve the flagged cost/waste variance.",owner:"Kitchen Manager",severity:x.severity||"medium",impactDollars:impact,impactLabel:x.impact||"Protect product availability and margin",confidence:90-i*3,source:"inventoryIntelligence",locationId,metadata:{recommendationId:x.id}});
    });
  }
  revenueOpportunities(command,executiveLocation,locationId){
    const out=[],forecast=Number(command?.business?.forecastRevenue||0),trend=Number(executiveLocation?.revenueTrend||0),occupancy=Number(executiveLocation?.occupancy||0);
    if(trend<0){const gap=Math.max(100,Math.round(Number(executiveLocation?.yesterdayRevenue||0)-Number(executiveLocation?.revenue||0)));out.push(this.opportunity({id:`perf_revenue_pace_${locationId}`,category:"revenue",title:"Close the revenue pacing gap",why:`Current modeled revenue is pacing ${Math.abs(trend).toFixed(1)}% below yesterday.`,nextAction:"Review open reservation inventory, call capture, and high-value guest opportunities before the next demand window.",owner:"General Manager",severity:trend<=-7?"high":"medium",impactDollars:gap,impactLabel:`≈ $${gap.toLocaleString()} pacing gap`,confidence:84,source:"executiveCommand",locationId,metadata:{revenueTrend:trend,occupancy}}));}
    else if(occupancy<70&&forecast>0)out.push(this.opportunity({id:`perf_revenue_capacity_${locationId}`,category:"revenue",title:"Use available capacity to capture incremental demand",why:`Modeled occupancy is ${occupancy}% with revenue forecast at $${forecast.toLocaleString()}.`,nextAction:"Review reservation availability and activate the highest-fit guest/demand channel for the next open window.",owner:"General Manager",severity:"medium",impactDollars:Math.round(forecast*.03),impactLabel:"Target 3% incremental revenue capture",confidence:76,source:"commandCenter",locationId,metadata:{occupancy,forecastRevenue:forecast}}));
    return out;
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
    const executiveLocation=(executive.locations||[]).find(x=>x.locationId===locationId)||null;
    const opportunities=[
      ...this.kitchenOpportunities(db,organizationId,locationId),
      ...this.reservationOpportunities(db,organizationId,locationId),
      ...this.workforceOpportunities(workforce,locationId),
      ...this.inventoryOpportunities(inventory,locationId),
      ...this.guestOpportunities(guest,locationId),
      ...this.revenueOpportunities(command,executiveLocation,locationId)
    ].sort((a,b)=>b.score-a.score||b.estimatedImpactDollars-a.estimatedImpactDollars);
    const decisions=(db.hospitalityPerformanceDecisions||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId).slice(-50).reverse();
    const decisionMap=new Map(decisions.map(x=>[x.opportunityId,x]));
    const ranked=opportunities.map((x,i)=>({...x,rank:i+1,lastDecision:decisionMap.get(x.id)||null}));
    const totalImpact=ranked.filter(x=>!["dismissed","completed"].includes(x.lastDecision?.decision)).reduce((s,x)=>s+x.estimatedImpactDollars,0);
    const categories={};for(const x of ranked)categories[x.category]=(categories[x.category]||0)+1;
    return {
      version:"47.15.0",generatedAt:new Date().toISOString(),organizationId,locationId,
      headline:ranked[0]?`#1 opportunity: ${ranked[0].title}`:"No material performance opportunities are active.",
      summary:{openOpportunities:ranked.length,totalEstimatedImpactDollars:totalImpact,highPriority:ranked.filter(x=>["critical","high"].includes(x.severity)).length,categories,readinessScore:command?.readiness?.score||null,portfolioRevenueTrend:executive?.portfolio?.revenueTrend||0},
      opportunities:ranked.slice(0,12),decisions,
      sourceHealth:{commandCenter:Boolean(command),workforce:Boolean(workforce),inventory:Boolean(inventory),guest:Boolean(guest),executive:Boolean(executive)},
      policy:{rankBy:"urgency + estimated impact + confidence",humanDecisionRequired:true,automaticExecution:false}
    };
  }
  async decide(organizationId,locationId,opportunityId,input,actor){
    const allowed=new Set(["accepted","snoozed","dismissed","completed"]);
    const decision=allowed.has(input.decision)?input.decision:"accepted",record={id:`hpd_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,opportunityId,decision,owner:String(input.owner||actor||"Manager").slice(0,120),note:String(input.note||"").slice(0,500),actor,createdAt:new Date().toISOString()};
    await this.database.mutate(db=>{db.hospitalityPerformanceDecisions||=[];db.hospitalityPerformanceDecisions.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Hospitality performance opportunity ${decision}: ${opportunityId}`,category:"hospitality_performance"});
    this.realtimeHub.publish("hospitality-performance:decision",record);
    return record;
  }
}
module.exports=HospitalityPerformanceService;
