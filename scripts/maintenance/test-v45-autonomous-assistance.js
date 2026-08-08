"use strict";
const assert=require("assert"),AutonomousOperationsService=require("../../server/services/autonomousOperationsService");
class MemoryDatabase{constructor(seed={}){this.data=structuredClone(seed);}async read(){return structuredClone(this.data);}async mutate(fn){return structuredClone(fn(this.data));}}
(async()=>{
 const org="org-test",db=new MemoryDatabase(),audits=[],events=[];
 const svc=new AutonomousOperationsService(db,{record:async x=>audits.push(x)},{publish:(t,p)=>events.push({t,p})},{snapshot:async()=>({})});
 svc.snapshot=async()=>({
   portfolio:{organizationId:org,health:71,atRiskLocations:1},
   locations:[
    {locationId:"loc-a",name:"Harbor",occupancy:92,waitlist:9,averageTicketMinutes:24,readyTickets:4,activeStaff:15,health:68,revenue:12500,revenueTrend:-2,totalTables:30},
    {locationId:"loc-b",name:"Market",occupancy:58,waitlist:1,averageTicketMinutes:14,readyTickets:0,activeStaff:11,health:86,revenue:7200,revenueTrend:-7,totalTables:24}
   ],
   forecasts:[
    {locationId:"loc-a",name:"Harbor",projectedTicketPeak:29,projectedWaitlistPeak:14,additionalStaffNeeded:2,confidence:89},
    {locationId:"loc-b",name:"Market",projectedTicketPeak:16,projectedWaitlistPeak:2,additionalStaffNeeded:0,confidence:91}
   ],
   profits:[
    {locationId:"loc-a",laborPercent:31.5,foodPercent:30.1,margin:17.4},
    {locationId:"loc-b",laborPercent:29.2,foodPercent:28.8,margin:18.1}
   ],
   portfolioProfit:{revenue:19700,operatingProfit:3500,margin:17.8,laborPercent:30.6,foodPercent:29.6}
 });
 const cycle=await svc.v45DecisionCycle(org,"Tester");
 assert.equal(cycle.governance.liveExecutionAllowed,false);
 assert.equal(cycle.governance.liveStateChanged,false);
 assert.equal(cycle.observation.locations.length,2);
 assert.ok(cycle.anomalies.length>=4);
 assert.ok(cycle.recommendations.length>=4);
 assert.equal(cycle.recommendations.length,cycle.simulations.length);
 assert.ok(cycle.recommendations.every(x=>x.approvalRequired&&x.simulationRequired&&x.liveExecutionAllowed===false));
 assert.ok(cycle.simulations.every(x=>x.executionMode==="simulation-only"&&x.liveStateChanged===false));
 const domains=new Set(cycle.anomalies.map(x=>x.domain));
 assert.ok(domains.has("kitchen-throughput"));
 assert.ok(domains.has("reservation-pacing"));
 assert.ok(domains.has("staffing"));
 assert.ok(domains.has("guest-recovery"));
 assert.ok(domains.has("revenue-opportunity"));
 const list=await svc.v45DecisionCycles(org);
 assert.equal(list.count,1);
 const ready=await svc.v45Readiness(org);
 assert.equal(ready.score,100);
 assert.equal(ready.trusted,true);
 assert.equal(ready.status,"v45-autonomous-assistance-ready");
 console.log(JSON.stringify({ok:true,version:ready.version,cycleId:cycle.id,locations:cycle.summary.locationsObserved,anomalies:cycle.summary.anomalies,recommendations:cycle.summary.recommendations,simulations:cycle.summary.simulations,domains:[...domains],readiness:ready.score,liveExecutionAllowed:false,audits:audits.length,events:events.length},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
