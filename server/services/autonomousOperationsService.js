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
  v45InterventionPolicies(){
    return {
      version:"45.10.0",
      defaultMode:"governed-dry-run",
      liveExecutionAllowed:false,
      domains:{
        "kitchen-throughput":{
          policyId:"V45-POL-KITCHEN",risk:"medium",approvalRole:"manager",
          allowedProposalTypes:["temporary-runner-support","fire-pacing-plan","expo-support-plan"],
          limits:{maxDurationMinutes:30,maxAdditionalRunners:1},
          prohibited:["close-kitchen-station","modify-live-ticket","void-item","change-menu-availability"]
        },
        "reservation-pacing":{
          policyId:"V45-POL-PACING",risk:"medium",approvalRole:"manager",
          allowedProposalTypes:["temporary-seating-buffer","party-sequencing-plan"],
          limits:{maxBufferMinutes:10,maxDurationMinutes:45},
          prohibited:["cancel-reservation","move-reservation-without-confirmation","close-inventory","change-live-booking"]
        },
        "staffing":{
          policyId:"V45-POL-STAFFING",risk:"medium",approvalRole:"manager",
          allowedProposalTypes:["redeployment-plan","contingency-coverage-plan"],
          limits:{maxAdditionalStaff:3,maxDurationMinutes:120},
          prohibited:["clock-in-employee","clock-out-employee","publish-shift","change-pay-rate"]
        },
        "guest-recovery":{
          policyId:"V45-POL-GUEST",risk:"medium",approvalRole:"manager",
          allowedProposalTypes:["manager-touch-plan","recovery-priority-plan"],
          limits:{maxOpenCases:8},
          prohibited:["send-message","issue-refund","issue-comp","alter-guest-profile"]
        },
        "revenue-opportunity":{
          policyId:"V45-POL-REVENUE",risk:"high",approvalRole:"general-manager",
          allowedProposalTypes:["demand-capacity-plan","revenue-recovery-plan"],
          limits:{maxModeledDiscountPercent:10,maxDurationMinutes:180},
          prohibited:["publish-offer","send-campaign","change-price","apply-discount"]
        }
      }
    };
  }
  buildV45InterventionProposals(cycle,actor="Operator"){
    const policies=this.v45InterventionPolicies();
    const simulations=new Map((cycle.simulations||[]).map(x=>[x.recommendationId,x]));
    return (cycle.recommendations||[]).map((recommendation,index)=>{
      const policy=policies.domains[recommendation.domain];
      if(!policy)return null;
      const simulation=simulations.get(recommendation.id)||null;
      const proposalType={
        "kitchen-throughput":"fire-pacing-plan",
        "reservation-pacing":"temporary-seating-buffer",
        "staffing":"contingency-coverage-plan",
        "guest-recovery":"manager-touch-plan",
        "revenue-opportunity":"revenue-recovery-plan"
      }[recommendation.domain];
      return {
        id:`V45-INT-${Date.now().toString(36).toUpperCase()}-${index+1}`,
        organizationId:cycle.organizationId,cycleId:cycle.id,recommendationId:recommendation.id,simulationId:simulation?.id||null,
        locationId:recommendation.locationId,locationName:recommendation.locationName,domain:recommendation.domain,
        proposalType,title:recommendation.title,proposedAction:recommendation.recommendation,
        agentType:recommendation.agentType,risk:policy.risk,confidence:recommendation.confidence,
        policy:{policyId:policy.policyId,approvalRole:policy.approvalRole,limits:policy.limits,prohibited:policy.prohibited},
        evidence:recommendation.evidence||[],simulation:simulation?{modeled:simulation.modeled,confidence:simulation.confidence,assumptions:simulation.assumptions}:null,
        status:"draft",approvalStatus:"not-requested",approvalRequired:true,rehearsalRequired:true,
        executionMode:"governed-dry-run",liveExecutionAllowed:false,liveStateChanged:false,
        createdBy:actor,createdAt:this.now()
      };
    }).filter(Boolean);
  }
  detectV45InterventionConflicts(proposals){
    const conflicts=[];
    const pairs=[];
    for(let i=0;i<proposals.length;i++)for(let j=i+1;j<proposals.length;j++)pairs.push([proposals[i],proposals[j]]);
    const conflict=(a,b,type,severity,reason)=>conflicts.push({
      id:`V45-CONF-${a.id}-${b.id}`,proposalIds:[a.id,b.id],locationId:a.locationId===b.locationId?a.locationId:null,
      type,severity,reason,status:"unresolved",liveExecutionAllowed:false,liveStateChanged:false
    });
    for(const [a,b] of pairs){
      if(a.locationId!==b.locationId)continue;
      const domains=new Set([a.domain,b.domain]);
      if(domains.has("reservation-pacing")&&domains.has("revenue-opportunity"))
        conflict(a,b,"capacity-vs-demand","high","Demand stimulation conflicts with a simultaneous seating-capacity protection plan at the same location.");
      if(domains.has("kitchen-throughput")&&domains.has("revenue-opportunity"))
        conflict(a,b,"throughput-vs-demand","high","Revenue stimulation should not proceed while kitchen throughput is under active pressure.");
      if(a.domain===b.domain)
        conflict(a,b,"duplicate-domain-plan","medium","Multiple intervention proposals target the same operating domain at the same location.");
      if(domains.has("staffing")&&domains.has("reservation-pacing")&&a.risk==="high"&&b.risk==="high")
        conflict(a,b,"high-risk-concurrency","high","Concurrent high-risk staffing and pacing changes require sequencing.");
    }
    return conflicts;
  }
  rehearseV45Interventions(proposals,conflicts){
    const byLocation={};
    for(const proposal of proposals){
      (byLocation[proposal.locationId] ||= []).push(proposal);
    }
    const locationPlans=Object.entries(byLocation).map(([locationId,items])=>{
      const blocking=conflicts.filter(c=>c.locationId===locationId&&c.status==="unresolved"&&c.severity==="high");
      const ordered=[...items].sort((a,b)=>{
        const order={"kitchen-throughput":1,"staffing":2,"reservation-pacing":3,"guest-recovery":4,"revenue-opportunity":5};
        return (order[a.domain]||9)-(order[b.domain]||9);
      });
      return {
        locationId,locationName:items[0]?.locationName||locationId,
        sequence:ordered.map((p,index)=>({step:index+1,proposalId:p.id,domain:p.domain,title:p.title,rehearsalOnly:true})),
        blockingConflicts:blocking.map(x=>x.id),
        status:blocking.length?"blocked-by-conflict":"rehearsed",
        liveExecutionAllowed:false,liveStateChanged:false
      };
    });
    const blocking=conflicts.filter(c=>c.severity==="high"&&c.status==="unresolved");
    return {
      status:blocking.length?"blocked":"ready-for-approval-review",
      proposals:proposals.length,locations:locationPlans.length,conflictCount:conflicts.length,blockingConflicts:blocking.length,
      locationPlans,
      governance:{rehearsalOnly:true,approvalRequired:true,executionMode:"governed-dry-run",liveExecutionAllowed:false,liveStateChanged:false}
    };
  }
  async v45InterventionProposals(org,actor=null,input=null){
    const db=await this.database.read();
    const stored=db.v45InterventionProposals?.[org]||[];
    if(!input)return {organizationId:org,count:stored.length,items:stored.slice(0,100),latest:stored[0]||null,policies:this.v45InterventionPolicies(),build:"45.10.0-governed-intervention-planning"};
    const cycles=db.v45AutonomousDecisionCycles?.[org]||[];
    const cycle=(input.cycleId?cycles.find(x=>x.id===input.cycleId):cycles[0])||null;
    if(!cycle)throw new Error("Run a V45 autonomous assistance cycle before preparing intervention proposals.");
    const proposals=this.buildV45InterventionProposals(cycle,actor||"Operator");
    const conflicts=this.detectV45InterventionConflicts(proposals);
    await this.database.mutate(data=>{
      data.v45InterventionProposals||={};data.v45InterventionConflicts||={};
      const p=data.v45InterventionProposals[org]||[];p.unshift(...proposals);data.v45InterventionProposals[org]=p.slice(0,300);
      const c=data.v45InterventionConflicts[org]||[];c.unshift(...conflicts);data.v45InterventionConflicts[org]=c.slice(0,500);
      return true;
    });
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 intervention proposals prepared from ${cycle.id}: ${proposals.length} proposal(s), ${conflicts.length} conflict(s)`,category:"v45-intervention-planning"});
    this.realtimeHub.publish("v45-intervention-proposals-prepared",{organizationId:org,cycleId:cycle.id,count:proposals.length,conflicts:conflicts.length,liveExecutionAllowed:false});
    return {organizationId:org,cycleId:cycle.id,proposals,conflicts,policies:this.v45InterventionPolicies(),build:"45.10.0-governed-intervention-planning"};
  }
  async v45InterventionRehearsals(org,actor=null,input=null){
    const db=await this.database.read(),stored=db.v45InterventionRehearsals?.[org]||[];
    if(!input)return {organizationId:org,count:stored.length,items:stored.slice(0,100),latest:stored[0]||null,build:"45.10.0-governed-intervention-planning"};
    const allProposals=db.v45InterventionProposals?.[org]||[];
    let proposals=Array.isArray(input.proposalIds)&&input.proposalIds.length?allProposals.filter(x=>input.proposalIds.includes(x.id)):allProposals.filter(x=>x.cycleId===(input.cycleId||allProposals[0]?.cycleId));
    if(!proposals.length)throw new Error("Prepare V45 intervention proposals before rehearsal.");
    const conflicts=this.detectV45InterventionConflicts(proposals);
    const result=this.rehearseV45Interventions(proposals,conflicts);
    const rehearsal={id:`V45-REH-${Date.now().toString(36).toUpperCase()}`,organizationId:org,cycleId:proposals[0]?.cycleId||null,proposalIds:proposals.map(x=>x.id),conflicts,...result,createdBy:actor||"Operator",createdAt:this.now()};
    await this.database.mutate(data=>{data.v45InterventionRehearsals||={};const list=data.v45InterventionRehearsals[org]||[];list.unshift(rehearsal);data.v45InterventionRehearsals[org]=list.slice(0,150);return rehearsal;});
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 intervention rehearsal ${rehearsal.id}: ${rehearsal.status}`,category:"v45-intervention-rehearsal"});
    this.realtimeHub.publish("v45-intervention-rehearsed",{organizationId:org,id:rehearsal.id,status:rehearsal.status,blockingConflicts:rehearsal.blockingConflicts,liveExecutionAllowed:false});
    return {...rehearsal,build:"45.10.0-governed-intervention-planning"};
  }
  async v45InterventionReadiness(org){
    const db=await this.database.read();
    const proposals=db.v45InterventionProposals?.[org]||[],rehearsals=db.v45InterventionRehearsals?.[org]||[];
    const policies=this.v45InterventionPolicies(),latest=rehearsals[0]||null;
    const checks=[
      {id:"policies",label:"Domain-specific policy envelopes",pass:Object.keys(policies.domains).length===5&&Object.values(policies.domains).every(x=>x.approvalRole&&x.prohibited?.length),detail:`${Object.keys(policies.domains).length} governed domain policy envelope(s)`},
      {id:"proposals",label:"Immutable-style intervention proposal records",pass:proposals.length>0&&proposals.every(x=>x.approvalRequired&&x.rehearsalRequired),detail:`${proposals.length} intervention proposal(s)`},
      {id:"simulation-link",label:"Proposal retains simulation evidence",pass:proposals.length>0&&proposals.every(x=>Boolean(x.simulationId)&&Boolean(x.simulation)),detail:"Every proposal links recommendation evidence to its simulation"},
      {id:"risk-boundary",label:"Risk and approval roles declared",pass:proposals.length>0&&proposals.every(x=>Boolean(x.risk)&&Boolean(x.policy?.approvalRole)),detail:"Every proposal carries risk and approval ownership"},
      {id:"conflicts",label:"Cross-domain conflict detection",pass:Boolean(latest)&&Array.isArray(latest.conflicts),detail:`${latest?.conflicts?.length||0} conflict(s) identified in latest rehearsal`},
      {id:"rehearsal",label:"Multi-domain intervention rehearsal",pass:Boolean(latest)&&Array.isArray(latest.locationPlans)&&latest.locationPlans.length>0,detail:`${latest?.locationPlans?.length||0} location plan(s) rehearsed`},
      {id:"approval-gate",label:"Rehearsal cannot bypass human approval",pass:rehearsals.every(x=>x.governance?.approvalRequired===true),detail:"Rehearsal result stops at approval review"},
      {id:"live-safety",label:"Intervention planning cannot mutate live state",pass:proposals.every(x=>x.liveExecutionAllowed===false&&x.liveStateChanged===false)&&rehearsals.every(x=>x.governance?.liveExecutionAllowed===false&&x.governance?.liveStateChanged===false),detail:"Policies, proposals, conflicts, and rehearsals remain dry-run only"}
    ];
    const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length),blockers=checks.filter(x=>!x.pass).map(x=>`${x.label}: ${x.detail}`);
    return {organizationId:org,version:"45.10.0",score,status:score===100?"v45-intervention-planning-ready":score>=63?"conditional":"blocked",trusted:score===100,blockers,checks,latestRehearsalId:latest?.id||null,safety:{stage:"governed-intervention-planning",liveExecutionAllowed:false,liveStateChanged:false},generatedAt:this.now(),build:"45.10.0-governed-intervention-planning"};
  }
  hashV45AuthorizationPayload(value){
    const crypto=require("crypto");
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }
  v45ApprovalRoleRank(role){
    const rank={"manager":1,"general-manager":2,"regional-operator":3,"executive":4};
    return rank[String(role||"").toLowerCase()]||0;
  }
  buildV45ApprovalPacket(rehearsal,proposals,actor="Operator"){
    if(!rehearsal)throw new Error("A conflict-free intervention rehearsal is required.");
    if(rehearsal.status!=="ready-for-approval-review"||Number(rehearsal.blockingConflicts||0)>0)
      throw new Error("Only a conflict-free rehearsal can enter approval review.");
    const proposalIds=new Set(rehearsal.proposalIds||[]);
    const scoped=proposals.filter(p=>proposalIds.has(p.id));
    if(!scoped.length)throw new Error("Rehearsal proposals are unavailable.");
    const highestRole=scoped.reduce((best,p)=>this.v45ApprovalRoleRank(p.policy?.approvalRole)>this.v45ApprovalRoleRank(best)?p.policy.approvalRole:best,"manager");
    const evidenceDigest=this.hashV45AuthorizationPayload(scoped.map(p=>({id:p.id,cycleId:p.cycleId,recommendationId:p.recommendationId,simulationId:p.simulationId,domain:p.domain,risk:p.risk,confidence:p.confidence,evidence:p.evidence,simulation:p.simulation,policy:p.policy})));
    const now=Date.now(),expiresAt=new Date(now+15*60*1000).toISOString();
    return {
      id:`V45-APR-${now.toString(36).toUpperCase()}`,organizationId:rehearsal.organizationId,rehearsalId:rehearsal.id,cycleId:rehearsal.cycleId,
      proposalIds:[...proposalIds],proposalCount:scoped.length,requiredApprovalRole:highestRole,
      status:"pending",scope:"command-draft-only",evidenceDigest,rehearsalSnapshot:{status:rehearsal.status,blockingConflicts:rehearsal.blockingConflicts,proposalIds:[...proposalIds]},
      approvalRequired:true,revalidationRequired:true,revocable:true,expiresAt,createdBy:actor,createdAt:new Date(now).toISOString(),
      liveExecutionAllowed:false,liveStateChanged:false
    };
  }
  async v45ApprovalPackets(org,actor=null,input=null){
    const db=await this.database.read(),stored=db.v45ApprovalPackets?.[org]||[];
    if(!input)return {organizationId:org,count:stored.length,pending:stored.filter(x=>x.status==="pending").length,approved:stored.filter(x=>x.status==="approved").length,items:stored.slice(0,100),build:"45.15.0-intervention-authorization"};
    const rehearsalId=String(input.rehearsalId||"").trim();
    const rehearsals=db.v45InterventionRehearsals?.[org]||[];
    const rehearsal=(rehearsalId?rehearsals.find(x=>x.id===rehearsalId):rehearsals[0])||null;
    const proposals=db.v45InterventionProposals?.[org]||[];
    const packet=this.buildV45ApprovalPacket(rehearsal,proposals,actor||"Operator");
    await this.database.mutate(data=>{data.v45ApprovalPackets||={};const list=data.v45ApprovalPackets[org]||[];list.unshift(packet);data.v45ApprovalPackets[org]=list.slice(0,300);return packet;});
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 approval packet prepared: ${packet.id}`,category:"v45-intervention-authorization"});
    this.realtimeHub.publish("v45-approval-packet-prepared",{organizationId:org,id:packet.id,scope:packet.scope,liveExecutionAllowed:false});
    return {organizationId:org,packet,build:"45.15.0-intervention-authorization"};
  }
  async v45RevalidateApprovalPacket(org,packetId){
    const db=await this.database.read();
    const packet=(db.v45ApprovalPackets?.[org]||[]).find(x=>x.id===packetId);
    if(!packet)throw new Error("V45 approval packet not found.");
    const rehearsal=(db.v45InterventionRehearsals?.[org]||[]).find(x=>x.id===packet.rehearsalId);
    const proposals=(db.v45InterventionProposals?.[org]||[]).filter(x=>packet.proposalIds.includes(x.id));
    const now=Date.now(),expired=new Date(packet.expiresAt).getTime()<=now;
    const digest=this.hashV45AuthorizationPayload(proposals.map(p=>({id:p.id,cycleId:p.cycleId,recommendationId:p.recommendationId,simulationId:p.simulationId,domain:p.domain,risk:p.risk,confidence:p.confidence,evidence:p.evidence,simulation:p.simulation,policy:p.policy})));
    const checks=[
      {id:"expiry",pass:!expired,detail:expired?"Approval packet expired":"Approval packet is within its authorization window"},
      {id:"rehearsal",pass:Boolean(rehearsal)&&rehearsal.status==="ready-for-approval-review"&&Number(rehearsal.blockingConflicts||0)===0,detail:rehearsal?`${rehearsal.status} · ${rehearsal.blockingConflicts||0} blocking conflict(s)`:"Rehearsal missing"},
      {id:"proposal-set",pass:proposals.length===packet.proposalIds.length,detail:`${proposals.length}/${packet.proposalIds.length} scoped proposal(s) available`},
      {id:"evidence-digest",pass:digest===packet.evidenceDigest,detail:digest===packet.evidenceDigest?"Evidence/policy digest unchanged":"Evidence or policy payload changed"},
      {id:"proposal-safety",pass:proposals.every(x=>x.liveExecutionAllowed===false&&x.liveStateChanged===false&&x.approvalRequired===true),detail:"All proposals remain governed and approval-required"},
      {id:"scope",pass:packet.scope==="command-draft-only"&&packet.liveExecutionAllowed===false,detail:"Authorization scope cannot execute live actions"}
    ];
    const valid=checks.every(x=>x.pass);
    return {organizationId:org,packetId,valid,expired,digest,checks,revalidatedAt:this.now(),liveExecutionAllowed:false,build:"45.15.0-intervention-authorization"};
  }
  async v45ApprovalDecision(org,actor,input={}){
    const packetId=String(input.packetId||"").trim(),decision=String(input.decision||"").trim().toLowerCase(),actorRole=String(input.actorRole||"manager").trim().toLowerCase();
    if(!packetId)throw new Error("packetId is required.");
    if(!["approve","reject","revoke"].includes(decision))throw new Error("decision must be approve, reject, or revoke.");
    const revalidation=await this.v45RevalidateApprovalPacket(org,packetId);
    const now=this.now();
    const result=await this.database.mutate(db=>{
      db.v45ApprovalPackets||={};const list=db.v45ApprovalPackets[org]||[];const packet=list.find(x=>x.id===packetId);if(!packet)throw new Error("V45 approval packet not found.");
      if(decision==="approve"){
        if(packet.status!=="pending")throw new Error(`Approval packet cannot be approved from status ${packet.status}.`);
        if(!revalidation.valid)throw new Error("Approval packet failed evidence/state revalidation.");
        if(this.v45ApprovalRoleRank(actorRole)<this.v45ApprovalRoleRank(packet.requiredApprovalRole))throw new Error(`Approval requires role ${packet.requiredApprovalRole} or higher.`);
        packet.status="approved";packet.approvedBy=actor||"Operator";packet.approvedRole=actorRole;packet.approvedAt=now;packet.revalidatedAt=revalidation.revalidatedAt;
      }else if(decision==="reject"){
        if(packet.status!=="pending")throw new Error(`Approval packet cannot be rejected from status ${packet.status}.`);
        packet.status="rejected";packet.rejectedBy=actor||"Operator";packet.rejectedAt=now;
      }else{
        if(packet.status!=="approved")throw new Error("Only an approved packet can be revoked.");
        packet.status="revoked";packet.revokedBy=actor||"Operator";packet.revokedAt=now;
      }
      packet.decisionNote=String(input.note||"").slice(0,500);packet.liveExecutionAllowed=false;packet.liveStateChanged=false;
      db.v45ApprovalDecisions||={};const decisions=db.v45ApprovalDecisions[org]||[];
      const record={id:`V45-APD-${Date.now().toString(36).toUpperCase()}`,organizationId:org,packetId,decision,actor:actor||"Operator",actorRole,note:packet.decisionNote,scope:"command-draft-only",liveExecutionAllowed:false,liveStateChanged:false,createdAt:now};
      decisions.unshift(record);db.v45ApprovalDecisions[org]=decisions.slice(0,500);return {packet:{...packet},decisionRecord:record};
    });
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 approval ${decision}: ${packetId}`,category:"v45-intervention-authorization"});
    this.realtimeHub.publish("v45-approval-decided",{organizationId:org,packetId,decision,status:result.packet.status,liveExecutionAllowed:false});
    return {organizationId:org,...result,revalidation,build:"45.15.0-intervention-authorization"};
  }
  async v45CommandDrafts(org,actor=null,input=null){
    const db=await this.database.read(),stored=db.v45CommandDrafts?.[org]||[];
    if(!input)return {organizationId:org,count:stored.length,items:stored.slice(0,100),latest:stored[0]||null,build:"45.15.0-intervention-authorization"};
    const packetId=String(input.packetId||"").trim();
    const packet=(db.v45ApprovalPackets?.[org]||[]).find(x=>x.id===packetId);
    if(!packet)throw new Error("V45 approval packet not found.");
    if(packet.status!=="approved")throw new Error("Command drafting requires an approved packet.");
    const revalidation=await this.v45RevalidateApprovalPacket(org,packetId);
    if(!revalidation.valid)throw new Error("Approved packet is stale or no longer valid; re-approval is required.");
    const proposals=(db.v45InterventionProposals?.[org]||[]).filter(x=>packet.proposalIds.includes(x.id));
    const commands=proposals.map((p,index)=>({
      id:`V45-CMD-${Date.now().toString(36).toUpperCase()}-${index+1}`,proposalId:p.id,locationId:p.locationId,domain:p.domain,
      commandType:p.proposalType,description:p.proposedAction,policyId:p.policy?.policyId,limits:p.policy?.limits,
      status:"draft-only",requiresSeparateExecutionCertification:true,executionEndpoint:null,
      executionMode:"command-draft-only",liveExecutionAllowed:false,liveStateChanged:false
    }));
    const draft={id:`V45-CDR-${Date.now().toString(36).toUpperCase()}`,organizationId:org,packetId,approvalScope:packet.scope,approvalExpiresAt:packet.expiresAt,revalidationDigest:revalidation.digest,commands,status:"drafted",executionCertified:false,liveExecutionAllowed:false,liveStateChanged:false,createdBy:actor||"Operator",createdAt:this.now()};
    await this.database.mutate(data=>{data.v45CommandDrafts||={};const list=data.v45CommandDrafts[org]||[];list.unshift(draft);data.v45CommandDrafts[org]=list.slice(0,200);return draft;});
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 non-executable command draft prepared: ${draft.id}`,category:"v45-command-draft"});
    this.realtimeHub.publish("v45-command-draft-prepared",{organizationId:org,id:draft.id,commands:commands.length,liveExecutionAllowed:false});
    return {organizationId:org,draft,revalidation,build:"45.15.0-intervention-authorization"};
  }
  async v45AuthorizationReadiness(org){
    const db=await this.database.read(),packets=db.v45ApprovalPackets?.[org]||[],decisions=db.v45ApprovalDecisions?.[org]||[],drafts=db.v45CommandDrafts?.[org]||[];
    const latestPacket=packets[0]||null,latestDraft=drafts[0]||null;
    let revalidation=null;if(latestPacket){try{revalidation=await this.v45RevalidateApprovalPacket(org,latestPacket.id);}catch{}}
    const checks=[
      {id:"packet",label:"Policy-aware approval packet",pass:Boolean(latestPacket)&&latestPacket.scope==="command-draft-only"&&Boolean(latestPacket.evidenceDigest),detail:latestPacket?`${latestPacket.id} · ${latestPacket.requiredApprovalRole}`:"No approval packet"},
      {id:"expiry",label:"Scoped approval expiry",pass:Boolean(latestPacket?.expiresAt),detail:latestPacket?.expiresAt||"No expiry"},
      {id:"revalidation",label:"Evidence and rehearsal revalidation",pass:Boolean(revalidation?.valid),detail:revalidation?`${revalidation.checks.filter(x=>x.pass).length}/${revalidation.checks.length} checks pass`:"No packet to revalidate"},
      {id:"role",label:"Approval role boundary",pass:Boolean(latestPacket?.requiredApprovalRole),detail:latestPacket?.requiredApprovalRole||"No role"},
      {id:"revocation",label:"Approval revocation architecture",pass:decisions.some(x=>x.decision==="revoke")||Boolean(latestPacket?.revocable),detail:"Approved authorization can be revoked before execution"},
      {id:"draft",label:"Command drafting separated from execution",pass:Boolean(latestDraft)&&latestDraft.executionCertified===false&&latestDraft.commands.every(x=>x.executionEndpoint===null&&x.liveExecutionAllowed===false),detail:`${latestDraft?.commands?.length||0} non-executable command draft(s)`},
      {id:"scope",label:"Authorization scope cannot grant live execution",pass:packets.every(x=>x.scope==="command-draft-only"&&x.liveExecutionAllowed===false)&&decisions.every(x=>x.liveExecutionAllowed===false)&&drafts.every(x=>x.liveExecutionAllowed===false),detail:"Authorization ends at command drafting"},
      {id:"live-safety",label:"No V45 authorization artifact mutates restaurant state",pass:packets.every(x=>x.liveStateChanged===false)&&decisions.every(x=>x.liveStateChanged===false)&&drafts.every(x=>x.liveStateChanged===false),detail:"Approval, revocation, revalidation, and command drafting remain isolated"}
    ];
    const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length),blockers=checks.filter(x=>!x.pass).map(x=>`${x.label}: ${x.detail}`);
    return {organizationId:org,version:"45.15.0",score,status:score===100?"v45-authorization-ready":score>=63?"conditional":"blocked",trusted:score===100,blockers,checks,latestPacketId:latestPacket?.id||null,latestDraftId:latestDraft?.id||null,safety:{stage:"approval-and-command-draft",liveExecutionAllowed:false,liveStateChanged:false},generatedAt:this.now(),build:"45.15.0-intervention-authorization"};
  }
  v45ExecutionAdapterRegistry(){
    return {
      version:"45.20.0",
      mode:"shadow-only",
      liveExecutionEnabled:false,
      emergencyStopDefault:true,
      adapters:{
        "temporary-runner-support":{
          adapterId:"V45-ADP-RUNNER",domain:"kitchen-throughput",allowedFields:["locationId","durationMinutes","additionalRunners"],
          limits:{durationMinutes:{min:5,max:30},additionalRunners:{min:0,max:1}},
          compensation:{type:"restore-role-assignment",supported:true},
          shadowHandler:"simulate-runner-support",liveHandler:null
        },
        "fire-pacing-plan":{
          adapterId:"V45-ADP-FIRE",domain:"kitchen-throughput",allowedFields:["locationId","durationMinutes","pacingMinutes"],
          limits:{durationMinutes:{min:5,max:30},pacingMinutes:{min:0,max:8}},
          compensation:{type:"restore-pacing-baseline",supported:true},
          shadowHandler:"simulate-fire-pacing",liveHandler:null
        },
        "temporary-seating-buffer":{
          adapterId:"V45-ADP-SEATING",domain:"reservation-pacing",allowedFields:["locationId","durationMinutes","bufferMinutes"],
          limits:{durationMinutes:{min:5,max:45},bufferMinutes:{min:0,max:10}},
          compensation:{type:"restore-seating-buffer",supported:true},
          shadowHandler:"simulate-seating-buffer",liveHandler:null
        },
        "contingency-coverage-plan":{
          adapterId:"V45-ADP-STAFF",domain:"staffing",allowedFields:["locationId","durationMinutes","additionalStaff"],
          limits:{durationMinutes:{min:15,max:120},additionalStaff:{min:0,max:3}},
          compensation:{type:"release-contingency-coverage",supported:true},
          shadowHandler:"simulate-staffing-coverage",liveHandler:null
        },
        "manager-touch-plan":{
          adapterId:"V45-ADP-GUEST",domain:"guest-recovery",allowedFields:["locationId","caseLimit"],
          limits:{caseLimit:{min:0,max:8}},
          compensation:{type:"close-unstarted-recovery-draft",supported:true},
          shadowHandler:"simulate-manager-touch",liveHandler:null
        },
        "revenue-recovery-plan":{
          adapterId:"V45-ADP-REVENUE",domain:"revenue-opportunity",allowedFields:["locationId","durationMinutes","modeledDiscountPercent"],
          limits:{durationMinutes:{min:15,max:180},modeledDiscountPercent:{min:0,max:10}},
          compensation:{type:"discard-unpublished-offer-draft",supported:true},
          shadowHandler:"simulate-revenue-recovery",liveHandler:null
        }
      }
    };
  }
  v45ExecutionEmergencyState(db,org){
    const current=db.v45ExecutionEmergencyStop?.[org];
    return current||{organizationId:org,engaged:true,reason:"Live execution boundary not certified",updatedBy:"System",updatedAt:this.now()};
  }
  v45CommandToAdapterPayload(command){
    const base={locationId:command.locationId};
    if(command.commandType==="fire-pacing-plan")return {...base,durationMinutes:20,pacingMinutes:4};
    if(command.commandType==="temporary-seating-buffer")return {...base,durationMinutes:30,bufferMinutes:4};
    if(command.commandType==="contingency-coverage-plan")return {...base,durationMinutes:60,additionalStaff:1};
    if(command.commandType==="manager-touch-plan")return {...base,caseLimit:4};
    if(command.commandType==="revenue-recovery-plan")return {...base,durationMinutes:60,modeledDiscountPercent:5};
    if(command.commandType==="temporary-runner-support")return {...base,durationMinutes:20,additionalRunners:1};
    return base;
  }
  v45ExecutionPreflight(draft,emergencyState){
    const registry=this.v45ExecutionAdapterRegistry(),checks=[];
    checks.push({id:"draft-status",pass:Boolean(draft)&&draft.status==="drafted"&&draft.executionCertified===false,detail:draft?`${draft.status} · certified=${draft.executionCertified}`:"Command draft missing"});
    checks.push({id:"emergency-stop",pass:Boolean(emergencyState?.engaged),detail:emergencyState?.engaged?"Emergency stop engaged":"Emergency stop not engaged"});
    const commandChecks=(draft?.commands||[]).map(command=>{
      const adapter=registry.adapters[command.commandType];
      const payload=this.v45CommandToAdapterPayload(command);
      let payloadValid=Boolean(adapter),reason=adapter?"":"No adapter registered";
      if(adapter){
        for(const [field,bounds] of Object.entries(adapter.limits||{})){
          const value=Number(payload[field]);
          if(!Number.isFinite(value)||value<bounds.min||value>bounds.max){payloadValid=false;reason=`${field} outside ${bounds.min}-${bounds.max}`;break;}
        }
      }
      return {commandId:command.id,commandType:command.commandType,adapterId:adapter?.adapterId||null,adapterPresent:Boolean(adapter),shadowHandler:Boolean(adapter?.shadowHandler),liveHandlerPresent:Boolean(adapter?.liveHandler),payloadValid,reason,payload,compensationSupported:Boolean(adapter?.compensation?.supported)};
    });
    checks.push({id:"adapter-allowlist",pass:commandChecks.every(x=>x.adapterPresent),detail:`${commandChecks.filter(x=>x.adapterPresent).length}/${commandChecks.length} command(s) allowlisted`});
    checks.push({id:"payload-limits",pass:commandChecks.every(x=>x.payloadValid),detail:`${commandChecks.filter(x=>x.payloadValid).length}/${commandChecks.length} payload(s) within limits`});
    checks.push({id:"shadow-handlers",pass:commandChecks.every(x=>x.shadowHandler),detail:"Every command has a shadow adapter"});
    checks.push({id:"no-live-handler",pass:commandChecks.every(x=>x.liveHandlerPresent===false),detail:"No allowlisted adapter exposes a live mutation handler"});
    checks.push({id:"compensation",pass:commandChecks.every(x=>x.compensationSupported),detail:"Every adapter declares a compensation contract"});
    const pass=checks.every(x=>x.pass);
    return {pass,checks,commands:commandChecks,mode:"shadow-only",liveExecutionEnabled:false,preflightAt:this.now()};
  }
  async v45ExecutionBoundary(org,actor=null,input=null){
    const db=await this.database.read(),state=this.v45ExecutionEmergencyState(db,org),registry=this.v45ExecutionAdapterRegistry();
    if(!input)return {organizationId:org,registry,emergencyStop:state,build:"45.20.0-shadow-execution-boundary"};
    const action=String(input.action||"").toLowerCase();
    if(action!=="engage-stop")throw new Error("Only engage-stop is supported while live execution is disabled.");
    const updated=await this.database.mutate(data=>{
      data.v45ExecutionEmergencyStop||={};const next={organizationId:org,engaged:true,reason:String(input.reason||"Operator emergency stop").slice(0,500),updatedBy:actor||"Operator",updatedAt:this.now()};
      data.v45ExecutionEmergencyStop[org]=next;return next;
    });
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 execution emergency stop engaged: ${updated.reason}`,category:"v45-execution-boundary"});
    this.realtimeHub.publish("v45-execution-stop-engaged",{organizationId:org,engaged:true,liveExecutionEnabled:false});
    return {organizationId:org,registry,emergencyStop:updated,build:"45.20.0-shadow-execution-boundary"};
  }
  async v45ShadowExecutions(org,actor=null,input=null){
    const db=await this.database.read(),stored=db.v45ShadowExecutions?.[org]||[];
    if(!input)return {organizationId:org,count:stored.length,items:stored.slice(0,100),latest:stored[0]||null,build:"45.20.0-shadow-execution-boundary"};
    const draftId=String(input.draftId||"").trim(),idempotencyKey=String(input.idempotencyKey||"").trim();
    if(!draftId)throw new Error("draftId is required.");
    if(!idempotencyKey)throw new Error("idempotencyKey is required for shadow execution.");
    const draft=(db.v45CommandDrafts?.[org]||[]).find(x=>x.id===draftId);
    if(!draft)throw new Error("V45 command draft not found.");
    const existing=stored.find(x=>x.draftId===draftId&&x.idempotencyKey===idempotencyKey);
    if(existing)return {organizationId:org,shadowExecution:existing,replayed:true,build:"45.20.0-shadow-execution-boundary"};
    const emergencyState=this.v45ExecutionEmergencyState(db,org),preflight=this.v45ExecutionPreflight(draft,emergencyState);
    if(!preflight.pass)throw new Error(`Shadow execution preflight failed: ${preflight.checks.filter(x=>!x.pass).map(x=>x.id).join(", ")}`);
    const results=preflight.commands.map((item,index)=>({
      id:`V45-SHD-CMD-${Date.now().toString(36).toUpperCase()}-${index+1}`,commandId:item.commandId,adapterId:item.adapterId,
      payload:item.payload,status:"shadow-simulated",wouldInvoke:item.shadowHandler?"shadow-adapter":null,liveHandlerPresent:false,
      compensation:{supported:item.compensationSupported,status:"not-needed-shadow-only"},
      liveExecutionAllowed:false,liveStateChanged:false
    }));
    const shadowExecution={id:`V45-SHD-${Date.now().toString(36).toUpperCase()}`,organizationId:org,draftId,idempotencyKey,mode:"shadow-only",status:"completed",preflight,results,canary:{enabled:true,percentage:0,liveTraffic:false,description:"Canary architecture present; live percentage locked to zero."},emergencyStopEngaged:true,liveExecutionAllowed:false,liveStateChanged:false,createdBy:actor||"Operator",createdAt:this.now()};
    await this.database.mutate(data=>{data.v45ShadowExecutions||={};const list=data.v45ShadowExecutions[org]||[];list.unshift(shadowExecution);data.v45ShadowExecutions[org]=list.slice(0,300);return shadowExecution;});
    await this.auditService.record({organizationId:org,actor:actor||"Operator",action:`V45 shadow execution completed: ${shadowExecution.id}`,category:"v45-shadow-execution"});
    this.realtimeHub.publish("v45-shadow-execution-completed",{organizationId:org,id:shadowExecution.id,commands:results.length,liveExecutionAllowed:false});
    return {organizationId:org,shadowExecution,replayed:false,build:"45.20.0-shadow-execution-boundary"};
  }
  async v45ExecutionReadiness(org){
    const db=await this.database.read(),registry=this.v45ExecutionAdapterRegistry(),state=this.v45ExecutionEmergencyState(db,org),shadows=db.v45ShadowExecutions?.[org]||[],drafts=db.v45CommandDrafts?.[org]||[];
    const latestShadow=shadows[0]||null;
    const adapters=Object.values(registry.adapters);
    const checks=[
      {id:"adapter-registry",label:"Strict action adapter allowlist",pass:adapters.length>=5&&adapters.every(x=>x.adapterId&&x.shadowHandler),detail:`${adapters.length} allowlisted shadow adapter(s)`},
      {id:"no-live-handlers",label:"Live mutation handlers absent",pass:adapters.every(x=>x.liveHandler===null),detail:"Every adapter live handler is null"},
      {id:"preflight",label:"Command preflight validation",pass:Boolean(latestShadow?.preflight?.pass),detail:latestShadow?`${latestShadow.preflight.checks.filter(x=>x.pass).length}/${latestShadow.preflight.checks.length} preflight checks pass`:"No shadow execution yet"},
      {id:"idempotency",label:"Shadow idempotency key",pass:Boolean(latestShadow?.idempotencyKey),detail:latestShadow?.idempotencyKey||"No idempotency record"},
      {id:"compensation",label:"Rollback / compensation contracts",pass:adapters.every(x=>x.compensation?.supported===true),detail:"Every allowlisted adapter declares compensation"},
      {id:"emergency-stop",label:"Emergency stop defaults engaged",pass:state.engaged===true,detail:state.reason||"Emergency stop engaged"},
      {id:"shadow",label:"Shadow execution available",pass:Boolean(latestShadow)&&latestShadow.mode==="shadow-only"&&latestShadow.liveStateChanged===false,detail:latestShadow?.id||"No shadow execution"},
      {id:"canary-zero",label:"Canary controls locked to zero live traffic",pass:Boolean(latestShadow?.canary?.enabled)&&latestShadow.canary.percentage===0&&latestShadow.canary.liveTraffic===false,detail:"Canary architecture is present with 0% live traffic"},
      {id:"draft-separation",label:"Command drafts remain non-executable",pass:drafts.every(x=>x.executionCertified===false&&x.liveExecutionAllowed===false),detail:`${drafts.length} draft(s) remain uncertified`},
      {id:"live-safety",label:"Execution boundary cannot mutate live restaurant state",pass:registry.liveExecutionEnabled===false&&shadows.every(x=>x.liveExecutionAllowed===false&&x.liveStateChanged===false),detail:"Execution boundary is shadow-only"}
    ];
    const score=Math.round(checks.reduce((s,x)=>s+(x.pass?100:0),0)/checks.length),blockers=checks.filter(x=>!x.pass).map(x=>`${x.label}: ${x.detail}`);
    return {organizationId:org,version:"45.20.0",score,status:score===100?"v45-shadow-execution-boundary-ready":score>=60?"conditional":"blocked",trusted:score===100,blockers,checks,latestShadowExecutionId:latestShadow?.id||null,safety:{executionMode:"shadow-only",liveExecutionEnabled:false,emergencyStopEngaged:state.engaged,canaryLivePercentage:0,liveExecutionAllowed:false,liveStateChanged:false},generatedAt:this.now(),build:"45.20.0-shadow-execution-boundary"};
  }
  async ask(question,org){const snap=await this.snapshot(org),q=String(question||'').toLowerCase(),risk=[...snap.locations].sort((a,b)=>(a.health-b.health)||(b.averageTicketMinutes-a.averageTicketMinutes))[0],top=[...snap.locations].sort((a,b)=>b.revenue-a.revenue)[0];let answer;if(q.includes('revenue')||q.includes('forecast'))answer=`Projected portfolio close is $${snap.forecasts.reduce((s,x)=>s+x.projectedCloseRevenue,0).toLocaleString()}. ${top.name} currently leads at $${top.revenue.toLocaleString()}.`;else if(q.includes('help')||q.includes('risk')||q.includes('behind'))answer=`${risk.name} needs the most attention. Health is ${risk.health}, average tickets are ${risk.averageTicketMinutes} minutes, and operating risk is ${risk.risk}.`;else if(q.includes('cook')||q.includes('staff')){const need=snap.forecasts.filter(x=>x.additionalStaffNeeded>0);answer=need.length?`${need.map(x=>`${x.name}: ${x.additionalStaffNeeded} additional`).join('; ')} team member coverage is forecast.`:'No location currently crosses the additional-staff threshold.';}else if(q.includes('profit')||q.includes('margin'))answer=`Modeled operating profit is $${snap.portfolioProfit.operatingProfit.toLocaleString()} at a ${snap.portfolioProfit.margin}% margin. Labor is ${snap.portfolioProfit.laborPercent}% and food cost is ${snap.portfolioProfit.foodPercent}%.`;else answer=`Portfolio health is ${snap.portfolio.health}. There are ${snap.actions.length} active operating actions; ${snap.actions.filter(x=>x.risk==='low').length} are low risk and eligible for guarded automation.`;return{question,answer,generatedAt:this.now(),evidence:{portfolioHealth:snap.portfolio.health,actions:snap.actions.length,atRiskLocations:snap.portfolio.atRiskLocations}};}
}
module.exports=AutonomousOperationsService;
