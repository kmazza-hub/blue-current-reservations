"use strict";
class AutonomousOperationsService {
  constructor(database,auditService,realtimeHub,executiveCommandCenterService){Object.assign(this,{database,auditService,realtimeHub,executiveCommandCenterService});}
  clamp(v,min,max){return Math.max(min,Math.min(max,Math.round(v)));}
  now(){return new Date().toISOString();}
  async policy(org){const db=await this.database.read();return (db.autonomousPolicies||[]).find(x=>x.organizationId===org)||{enabled:false,mode:"manual",autoExecuteRiskLevels:[],approvalRequiredRiskLevels:["low","medium","high"],maxActionsPerCycle:0,forecastHorizonMinutes:120};}
  forecastLocation(x){
    const demandFactor=1+(x.occupancy-65)/250+(x.waitlist||0)/120;
    const revenueNextHour=Math.max(0,Math.round(x.revenue*.085*demandFactor));
    const closeRevenue=Math.round(x.revenue+revenueNextHour*4.2);
    const waitlistPeak=Math.max(x.waitlist||0,Math.round((x.waitlist||0)+(x.occupancy>80?5:1)+(x.averageTicketMinutes>18?3:0)));
    const ticketPeak=this.clamp(x.averageTicketMinutes+(x.occupancy>80?4:1)+(x.readyTickets>2?2:0),8,40);
    const staffingNeed=Math.max(0,Math.ceil((x.occupancy-76)/12)+(ticketPeak>21?1:0));
    return {locationId:x.locationId,name:x.name,revenueNextHour,projectedCloseRevenue:closeRevenue,projectedWaitlistPeak:waitlistPeak,projectedTicketPeak:ticketPeak,additionalStaffNeeded:staffingNeed,confidence:this.clamp(90-Math.abs(x.revenueTrend)*.5,68,96)};
  }
  buildActions(snapshot,forecasts){const actions=[];for(const x of snapshot.locations){const f=forecasts.find(y=>y.locationId===x.locationId);if(f.projectedTicketPeak>=23)actions.push({key:`${x.locationId}_pace`,locationId:x.locationId,locationName:x.name,type:'reservation_pacing',title:'Reduce seating velocity',description:`Apply a 4-minute seating buffer before ticket time reaches ${f.projectedTicketPeak} minutes.`,risk:'low',expectedImpact:'Reduce peak ticket time 8–14%',command:{bufferMinutes:4}});if(f.additionalStaffNeeded>0)actions.push({key:`${x.locationId}_staff`,locationId:x.locationId,locationName:x.name,type:'staffing',title:'Activate staffing contingency',description:`Request ${f.additionalStaffNeeded} additional team member${f.additionalStaffNeeded===1?'':'s'} for the projected demand window.`,risk:'medium',expectedImpact:'Protect service capacity',command:{additionalStaff:f.additionalStaffNeeded}});if(x.readyTickets>=3)actions.push({key:`${x.locationId}_runner`,locationId:x.locationId,locationName:x.name,type:'expo',title:'Assign temporary food runner',description:`Expo has ${x.readyTickets} ready tickets. Assign the least-loaded eligible server for 10 minutes.`,risk:'low',expectedImpact:'Reduce food pickup delay 20–35%',command:{durationMinutes:10}});if(x.revenueTrend<=-5&&x.occupancy<65)actions.push({key:`${x.locationId}_demand`,locationId:x.locationId,locationName:x.name,type:'demand',title:'Launch manager-approved demand offer',description:'Prepare a targeted same-day offer for opted-in guests; approval is required before sending.',risk:'high',expectedImpact:'Increase near-term covers',command:{discountPercent:10}});}return actions.slice(0,12);}
  profit(location){const revenue=location.revenue,labor=Math.round(revenue*(.26+(location.activeStaff>18?.025:0))),food=Math.round(revenue*(.29+(location.averageTicketMinutes>20?.018:0))),waste=Math.round(revenue*(.018+(location.readyTickets>2?.009:0))),operating=Math.max(0,revenue-labor-food-waste-Math.round(revenue*.17));return{locationId:location.locationId,name:location.name,revenue,labor,laborPercent:Math.round(labor/revenue*1000)/10,food,foodPercent:Math.round(food/revenue*1000)/10,waste,operatingProfit:operating,margin:Math.round(operating/revenue*1000)/10,revenuePerLaborHour:Math.round(revenue/Math.max(1,location.activeStaff*7.5)),revenuePerSeat:Math.round(revenue/Math.max(1,location.totalTables*4))};}
  timeline(existing,actions){const generated=actions.slice(0,6).map((a,i)=>({id:`evt_${a.key}`,time:new Date(Date.now()-i*7*60000).toISOString(),locationId:a.locationId,locationName:a.locationName,category:a.type,title:a.title,detail:a.description,status:'recommended'}));return [...generated,...existing].sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,30);}
  async snapshot(org){const executive=await this.executiveCommandCenterService.snapshot(org),policy=await this.policy(org),db=await this.database.read(),forecasts=executive.locations.map(x=>this.forecastLocation(x)),suggested=this.buildActions(executive,forecasts),stored=(db.autonomousActions||[]).filter(x=>x.organizationId===org).slice(-30).reverse(),byKey=new Map(stored.map(x=>[x.key,x]));const actions=suggested.map(x=>({...x,id:byKey.get(x.key)?.id||`auto_${x.key}`,status:byKey.get(x.key)?.status||'recommended',createdAt:byKey.get(x.key)?.createdAt||this.now(),executedAt:byKey.get(x.key)?.executedAt||null}));const profits=executive.locations.map(x=>this.profit(x)),portfolioProfit={revenue:profits.reduce((s,x)=>s+x.revenue,0),operatingProfit:profits.reduce((s,x)=>s+x.operatingProfit,0),laborPercent:Math.round(profits.reduce((s,x)=>s+x.labor,0)/Math.max(1,profits.reduce((s,x)=>s+x.revenue,0))*1000)/10,foodPercent:Math.round(profits.reduce((s,x)=>s+x.food,0)/Math.max(1,profits.reduce((s,x)=>s+x.revenue,0))*1000)/10,margin:Math.round(profits.reduce((s,x)=>s+x.operatingProfit,0)/Math.max(1,profits.reduce((s,x)=>s+x.revenue,0))*1000)/10};return{generatedAt:this.now(),policy,portfolio:executive.portfolio,locations:executive.locations,forecasts,actions,profits,portfolioProfit,timeline:this.timeline((db.operationsTimeline||[]).filter(x=>x.organizationId===org),actions)};}
  async runCycle(org,actor){const snap=await this.snapshot(org),policy=snap.policy;let executed=0;const records=[];for(const action of snap.actions){let status='recommended';if(policy.enabled&&policy.autoExecuteRiskLevels.includes(action.risk)&&executed<policy.maxActionsPerCycle){status='executed';executed++;}const record={...action,id:`auto_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId:org,status,createdAt:this.now(),executedAt:status==='executed'?this.now():null,actor:status==='executed'?'Autonomous Operations Director':actor};records.push(record);}await this.database.mutate(db=>{db.autonomousActions||=[];db.operationsTimeline||=[];db.autonomousActions.push(...records);for(const r of records)db.operationsTimeline.push({id:`evt_${r.id}`,organizationId:org,time:this.now(),locationId:r.locationId,locationName:r.locationName,category:r.type,title:r.title,detail:r.status==='executed'?`Executed automatically: ${r.description}`:`Approval queued: ${r.description}`,status:r.status});return records;});await this.auditService.record({organizationId:org,actor,action:`Autonomous operations cycle completed: ${executed} actions executed`,category:'autonomous_operations'});this.realtimeHub.publish('autonomous:cycle-completed',{organizationId:org,executed,total:records.length});return this.snapshot(org);}
  async decide(id,input,actor,org){const status=['approved','rejected','executed'].includes(input.status)?input.status:'rejected';const updated=await this.database.mutate(db=>{const item=(db.autonomousActions||[]).find(x=>x.id===id);if(!item)return null;item.status=status;item.decidedAt=this.now();item.executedAt=status==='executed'?this.now():item.executedAt;item.decisionNote=String(input.note||'');db.operationsTimeline||=[];db.operationsTimeline.push({id:`evt_${Date.now()}`,organizationId:org,time:this.now(),locationId:item.locationId,locationName:item.locationName,category:item.type,title:`Action ${status}: ${item.title}`,detail:item.decisionNote||item.description,status});return item;});if(!updated)return null;await this.auditService.record({organizationId:org,actor,action:`Autonomous action ${status}: ${updated.title}`,category:'autonomous_operations'});this.realtimeHub.publish('autonomous:action-decided',updated);return updated;}
  async updatePolicy(input,actor,org){const updated=await this.database.mutate(db=>{db.autonomousPolicies||=[];let p=db.autonomousPolicies.find(x=>x.organizationId===org);if(!p){p={id:`auto_policy_${org}`,organizationId:org};db.autonomousPolicies.push(p);}Object.assign(p,{enabled:Boolean(input.enabled),mode:['manual','guarded','autonomous'].includes(input.mode)?input.mode:'guarded',autoExecuteRiskLevels:Array.isArray(input.autoExecuteRiskLevels)?input.autoExecuteRiskLevels:['low'],maxActionsPerCycle:this.clamp(Number(input.maxActionsPerCycle||3),0,10),forecastHorizonMinutes:this.clamp(Number(input.forecastHorizonMinutes||120),30,360),updatedAt:this.now()});return p;});await this.auditService.record({organizationId:org,actor,action:`Autonomous policy updated: ${updated.mode}`,category:'autonomous_operations'});this.realtimeHub.publish('autonomous:policy-updated',updated);return updated;}
  autonomousSeverity(score){return score>=85?"critical":score>=65?"high":score>=40?"watch":"stable";}
  buildV45Observation(snapshot){
    const capturedAt=this.now();
    const locations=(snapshot.locations||[]).map(location=>{
      const forecast=(snapshot.forecasts||[]).find(x=>x.locationId===location.locationId)||{};
      const profit=(snapshot.profits||[]).find(x=>x.locationId===location.locationId)||{};
      return {
        locationId:location.locationId,name:location.name,
        evidence:{
          occupancy:Number(location.occupancy||0),
          waitlist:Number(location.waitlist||0),
          averageTicketMinutes:Number(location.averageTicketMinutes||0),
          readyTickets:Number(location.readyTickets||0),
          activeStaff:Number(location.activeStaff||0),
          health:Number(location.health||0),
          revenue:Number(location.revenue||0),
          revenueTrend:Number(location.revenueTrend||0),
          projectedTicketPeak:Number(forecast.projectedTicketPeak||0),
          projectedWaitlistPeak:Number(forecast.projectedWaitlistPeak||0),
          additionalStaffNeeded:Number(forecast.additionalStaffNeeded||0),
          forecastConfidence:Number(forecast.confidence||0),
          laborPercent:Number(profit.laborPercent||0),
          foodPercent:Number(profit.foodPercent||0),
          margin:Number(profit.margin||0)
        }
      };
    });
    return {capturedAt,organizationId:snapshot.portfolio?.organizationId||null,portfolio:{health:Number(snapshot.portfolio?.health||0),atRiskLocations:Number(snapshot.portfolio?.atRiskLocations||0),revenue:Number(snapshot.portfolioProfit?.revenue||0),operatingProfit:Number(snapshot.portfolioProfit?.operatingProfit||0),margin:Number(snapshot.portfolioProfit?.margin||0),laborPercent:Number(snapshot.portfolioProfit?.laborPercent||0),foodPercent:Number(snapshot.portfolioProfit?.foodPercent||0)},locations,source:"autonomous-operations-snapshot",executionMode:"observation-only",liveExecutionAllowed:false,liveStateChanged:false};
  }
  detectV45Anomalies(observation){
    const anomalies=[];
    const add=(location,domain,score,title,evidence,reason)=>{
      anomalies.push({id:`V45-ANOM-${location.locationId}-${domain}`,locationId:location.locationId,locationName:location.name,domain,score:this.clamp(score,0,100),severity:this.autonomousSeverity(score),title,evidence,reason,detectedAt:observation.capturedAt,executionMode:"observation-only",liveStateChanged:false});
    };
    for(const location of observation.locations){
      const e=location.evidence;
      const kitchenScore=Math.max(0,(e.projectedTicketPeak-16)*5+(e.readyTickets>=3?18:0));
      if(kitchenScore>=40)add(location,"kitchen-throughput",kitchenScore,"Kitchen throughput pressure",[{metric:"projectedTicketPeak",value:e.projectedTicketPeak,unit:"minutes"},{metric:"readyTickets",value:e.readyTickets}],`Projected ticket pressure and ready-ticket accumulation indicate a throughput constraint.`);
      const pacingScore=Math.max(0,(e.occupancy-75)*2+(e.projectedWaitlistPeak-3)*3+(e.projectedTicketPeak-18)*2);
      if(pacingScore>=40)add(location,"reservation-pacing",pacingScore,"Reservation pacing mismatch",[{metric:"occupancy",value:e.occupancy,unit:"percent"},{metric:"projectedWaitlistPeak",value:e.projectedWaitlistPeak},{metric:"projectedTicketPeak",value:e.projectedTicketPeak,unit:"minutes"}],"Demand is projected to arrive faster than current service capacity.");
      const staffingScore=Math.max(0,e.additionalStaffNeeded*28+(e.occupancy-80)*1.3+(e.projectedTicketPeak-20)*2);
      if(staffingScore>=40)add(location,"staffing",staffingScore,"Staffing coverage risk",[{metric:"additionalStaffNeeded",value:e.additionalStaffNeeded},{metric:"activeStaff",value:e.activeStaff},{metric:"occupancy",value:e.occupancy,unit:"percent"}],"Forecast demand exceeds modeled staffing coverage.");
      const guestScore=Math.max(0,(e.projectedWaitlistPeak-5)*5+(e.averageTicketMinutes-18)*3+(100-e.health)*1.2);
      if(guestScore>=40)add(location,"guest-recovery",guestScore,"Guest experience risk",[{metric:"projectedWaitlistPeak",value:e.projectedWaitlistPeak},{metric:"averageTicketMinutes",value:e.averageTicketMinutes,unit:"minutes"},{metric:"health",value:e.health}],"Wait and service-duration signals indicate elevated guest-recovery risk.");
      const revenueScore=Math.max(0,Math.abs(Math.min(0,e.revenueTrend))*6+(65-e.occupancy)*1.5);
      if(e.revenueTrend<=-4&&revenueScore>=40)add(location,"revenue-opportunity",revenueScore,"Revenue underperformance signal",[{metric:"revenueTrend",value:e.revenueTrend,unit:"percent"},{metric:"occupancy",value:e.occupancy,unit:"percent"},{metric:"margin",value:e.margin,unit:"percent"}],"Revenue trend and capacity utilization indicate an opportunity requiring manager review.");
    }
    return anomalies.sort((a,b)=>b.score-a.score);
  }
  buildV45Recommendations(observation,anomalies){
    const recommendations=[];
    const domainTemplates={
      "kitchen-throughput":{agent:"kitchen-flow-advisor",title:"Prepare kitchen throughput response",action:"Model runner/expo support and fire pacing for the next 20–30 minutes.",risk:"medium"},
      "reservation-pacing":{agent:"operations-optimizer",title:"Prepare reservation pacing adjustment",action:"Simulate a temporary seating buffer and party sequencing change.",risk:"medium"},
      "staffing":{agent:"staffing-advisor",title:"Prepare staffing coverage response",action:"Model redeployment or contingency coverage without changing the live schedule.",risk:"medium"},
      "guest-recovery":{agent:"guest-experience-advisor",title:"Prepare proactive guest recovery",action:"Identify at-risk guest moments and draft manager-touch priorities.",risk:"medium"},
      "revenue-opportunity":{agent:"revenue-planner",title:"Prepare revenue recovery option",action:"Model demand/capacity options; do not publish offers or discounts.",risk:"high"}
    };
    anomalies.slice(0,12).forEach((anomaly,index)=>{
      const template=domainTemplates[anomaly.domain];if(!template)return;
      recommendations.push({id:`V45-REC-${Date.now().toString(36).toUpperCase()}-${index+1}`,anomalyId:anomaly.id,locationId:anomaly.locationId,locationName:anomaly.locationName,domain:anomaly.domain,agentType:template.agent,title:template.title,recommendation:template.action,risk:template.risk,confidence:this.clamp(60+anomaly.score*.35,60,95),evidence:anomaly.evidence,reason:anomaly.reason,status:"recommended",approvalRequired:true,simulationRequired:true,executionMode:"governed-dry-run",liveExecutionAllowed:false,liveStateChanged:false,createdAt:observation.capturedAt});
    });
    return recommendations;
  }
  simulateV45Recommendations(observation,recommendations){
    const byLocation=new Map(observation.locations.map(x=>[x.locationId,x.evidence]));
    return recommendations.map((r,index)=>{
      const e=byLocation.get(r.locationId)||{};
      let modeled={};
      if(r.domain==="kitchen-throughput")modeled={ticketMinutesDelta:-Math.max(2,Math.min(6,Math.round((e.projectedTicketPeak||18)*.18))),throughputPercentDelta:Math.max(4,Math.min(14,Math.round((e.projectedTicketPeak||18)*.4)))};
      else if(r.domain==="reservation-pacing")modeled={ticketMinutesDelta:-Math.max(1,Math.min(5,Math.round(((e.projectedTicketPeak||18)-16)*.28))),waitlistDelta:Math.max(-5,-Math.round((e.projectedWaitlistPeak||4)*.22))};
      else if(r.domain==="staffing")modeled={serviceCapacityPercentDelta:Math.min(18,Math.max(5,(e.additionalStaffNeeded||1)*6)),laborPercentDelta:Math.min(2.5,Math.max(.4,(e.additionalStaffNeeded||1)*.7))};
      else if(r.domain==="guest-recovery")modeled={guestRiskPercentDelta:-Math.min(30,Math.max(8,Math.round((100-(e.health||80))*.8))),retentionProtection:"modeled-positive"};
      else modeled={revenueOpportunity:"modeled-only",discountPublished:false};
      return {id:`V45-SIM-${Date.now().toString(36).toUpperCase()}-${index+1}`,recommendationId:r.id,locationId:r.locationId,domain:r.domain,baseline:e,modeled,confidence:this.clamp(r.confidence-5,50,92),assumptions:["Uses current Blue Current operating snapshot and heuristic response model.","Does not modify reservations, labor schedules, floor state, kitchen tickets, guest records, offers, or messaging."],status:"simulated",executionMode:"simulation-only",liveExecutionAllowed:false,liveStateChanged:false,createdAt:observation.capturedAt};
    });
  }
  async v45DecisionCycle(org,actor="Operator"){
    const snapshot=await this.snapshot(org);
    const observation=this.buildV45Observation(snapshot);
    observation.organizationId=org;
    const anomalies=this.detectV45Anomalies(observation);
    const recommendations=this.buildV45Recommendations(observation,anomalies);
    const simulations=this.simulateV45Recommendations(observation,recommendations);
    const cycle={id:`V45-CYCLE-${Date.now().toString(36).toUpperCase()}`,organizationId:org,observation,anomalies,recommendations,simulations,summary:{locationsObserved:observation.locations.length,anomalies:anomalies.length,critical:anomalies.filter(x=>x.severity==="critical").length,recommendations:recommendations.length,simulations:simulations.length},governance:{stage:"recommendation-and-simulation",approvalRequired:true,executionMode:"governed-dry-run",liveExecutionAllowed:false,liveStateChanged:false},createdBy:actor,createdAt:this.now()};
    await this.database.mutate(db=>{db.v45AutonomousDecisionCycles||={};const list=db.v45AutonomousDecisionCycles[org]||[];list.unshift(cycle);db.v45AutonomousDecisionCycles[org]=list.slice(0,100);return cycle;});
    await this.auditService.record({organizationId:org,actor,action:`V45 governed autonomous decision cycle prepared: ${cycle.id}`,category:"v45-autonomous-operations"});
    this.realtimeHub.publish("v45-autonomous-cycle-prepared",{organizationId:org,id:cycle.id,summary:cycle.summary,liveExecutionAllowed:false});
    return {...cycle,build:"45.5.0-autonomous-assistance-foundation"};
  }
  async v45DecisionCycles(org){
    const db=await this.database.read(),items=db.v45AutonomousDecisionCycles?.[org]||[];
    return {organizationId:org,count:items.length,items:items.slice(0,50),latest:items[0]||null,build:"45.5.0-autonomous-assistance-foundation"};
  }
  async v45Readiness(org){
    const db=await this.database.read(),cycles=db.v45AutonomousDecisionCycles?.[org]||[],latest=cycles[0]||null;
    const checks=[
      {id:"observation",label:"Evidence-backed operational observation",pass:Boolean(latest?.observation?.locations?.length),detail:`${latest?.observation?.locations?.length||0} location(s) observed`},
      {id:"anomaly",label:"Cross-domain anomaly detection",pass:Boolean(latest)&&Array.isArray(latest.anomalies),detail:`${latest?.anomalies?.length||0} anomaly signal(s)`},
      {id:"recommendation",label:"Agent-scoped recommendations",pass:Boolean(latest)&&Array.isArray(latest.recommendations)&&latest.recommendations.every(x=>Boolean(x.agentType)&&x.approvalRequired===true),detail:`${latest?.recommendations?.length||0} recommendation(s)`},
      {id:"simulation",label:"Intervention simulation before execution",pass:Boolean(latest)&&latest.recommendations.length===latest.simulations.length&&latest.simulations.every(x=>x.executionMode==="simulation-only"),detail:`${latest?.simulations?.length||0} simulation(s)`},
      {id:"evidence",label:"Recommendation evidence retained",pass:Boolean(latest)&&latest.recommendations.every(x=>Array.isArray(x.evidence)&&x.evidence.length>0),detail:"Recommendations retain originating operational evidence"},
      {id:"approval",label:"Human approval remains required",pass:Boolean(latest)&&latest.recommendations.every(x=>x.approvalRequired===true),detail:"No V45 recommendation bypasses approval"},
      {id:"live-safety",label:"Autonomous assistance cannot mutate live state",pass:cycles.every(c=>c.governance?.liveExecutionAllowed===false&&c.governance?.liveStateChanged===false&&(c.recommendations||[]).every(x=>x.liveExecutionAllowed===false&&x.liveStateChanged===false)&&(c.simulations||[]).every(x=>x.liveExecutionAllowed===false&&x.liveStateChanged===false)),detail:"Observation, anomaly, recommendation, and simulation layers are isolated from live restaurant state"}
    ];
    const score=Math.round(checks.reduce((sum,c)=>sum+(c.pass?100:0),0)/checks.length),blockers=checks.filter(x=>!x.pass).map(x=>`${x.label}: ${x.detail}`);
    return {organizationId:org,version:"45.5.0",score,status:score===100?"v45-autonomous-assistance-ready":score>=57?"conditional":"blocked",trusted:score===100,blockers,checks,latestCycleId:latest?.id||null,safety:{stage:"recommendation-and-simulation",liveExecutionAllowed:false,liveStateChanged:false},generatedAt:this.now(),build:"45.5.0-autonomous-assistance-foundation"};
  }
  async ask(question,org){const snap=await this.snapshot(org),q=String(question||'').toLowerCase(),risk=[...snap.locations].sort((a,b)=>(a.health-b.health)||(b.averageTicketMinutes-a.averageTicketMinutes))[0],top=[...snap.locations].sort((a,b)=>b.revenue-a.revenue)[0];let answer;if(q.includes('revenue')||q.includes('forecast'))answer=`Projected portfolio close is $${snap.forecasts.reduce((s,x)=>s+x.projectedCloseRevenue,0).toLocaleString()}. ${top.name} currently leads at $${top.revenue.toLocaleString()}.`;else if(q.includes('help')||q.includes('risk')||q.includes('behind'))answer=`${risk.name} needs the most attention. Health is ${risk.health}, average tickets are ${risk.averageTicketMinutes} minutes, and operating risk is ${risk.risk}.`;else if(q.includes('cook')||q.includes('staff')){const need=snap.forecasts.filter(x=>x.additionalStaffNeeded>0);answer=need.length?`${need.map(x=>`${x.name}: ${x.additionalStaffNeeded} additional`).join('; ')} team member coverage is forecast.`:'No location currently crosses the additional-staff threshold.';}else if(q.includes('profit')||q.includes('margin'))answer=`Modeled operating profit is $${snap.portfolioProfit.operatingProfit.toLocaleString()} at a ${snap.portfolioProfit.margin}% margin. Labor is ${snap.portfolioProfit.laborPercent}% and food cost is ${snap.portfolioProfit.foodPercent}%.`;else answer=`Portfolio health is ${snap.portfolio.health}. There are ${snap.actions.length} active operating actions; ${snap.actions.filter(x=>x.risk==='low').length} are low risk and eligible for guarded automation.`;return{question,answer,generatedAt:this.now(),evidence:{portfolioHealth:snap.portfolio.health,actions:snap.actions.length,atRiskLocations:snap.portfolio.atRiskLocations}};}
}
module.exports=AutonomousOperationsService;
