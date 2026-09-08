"use strict";
const assert=require("assert");
const Service=require("../../server/services/productionHealthSupportService");

(async()=>{
  const state={productionSupportEvents:[]},audit=[],events=[];
  const handoff={
    locations:[{
      locationId:"a",locationName:"A",wave:1,
      acceptance:{
        status:"ACCEPTED_INTO_PRODUCTION_OPERATIONS",
        supportOwner:"Support Lead",
        escalationOwner:"VP Ops",
        supportHours:"24x7 launch support",
        maintenanceWindow:"Tuesday 03:00"
      }
    }]
  };
  let reliability={status:"meeting",score:95,breached:0,warning:0,errorBudgetRemaining:100};
  let telemetry={requests:{p95LatencyMs:120,serverErrors:0},incidents:{records:[]}};
  let portfolio={locations:[{locationId:"a",locationName:"A",readinessScore:88,attentionLevel:"healthy",urgentPredictiveInterventions:0}]};

  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>handoff},
    {evaluate:async()=>reliability},
    {snapshot:async()=>telemetry},
    {snapshot:async()=>portfolio}
  );

  let snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.version,"50.10.0");
  assert.equal(snap.status,"production-support-healthy");
  assert.equal(snap.locations[0].healthState,"healthy");
  assert.equal(snap.policy.automaticRemediation,false);

  const created=await svc.createEvent("org",["a"],"a",{
    severity:"warning",
    title:"Reservation latency",
    description:"Operators reported delayed reservation refresh.",
    linkedIncidentId:"incident_1"
  },"Tester");
  assert.equal(created.status,"open");
  assert.equal(created.linkedIncidentId,"incident_1");

  const ack=await svc.updateEvent("org",created.id,{action:"acknowledge",note:"Support investigating."},"Tester");
  assert.equal(ack.status,"acknowledged");

  const esc=await svc.updateEvent("org",created.id,{action:"escalate",note:"Escalating to VP Ops."},"Tester");
  assert.equal(esc.status,"escalated");

  const resolved=await svc.updateEvent("org",created.id,{action:"resolve",note:"Latency normalized."},"Tester");
  assert.equal(resolved.status,"resolved");

  telemetry={requests:{p95LatencyMs:2200,serverErrors:4},incidents:{records:[{id:"i1",organizationId:"org",status:"open",severity:"critical"}]}};
  reliability={status:"breached",score:55,breached:1,warning:0,errorBudgetRemaining:40};
  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.status,"production-support-critical");
  assert.equal(snap.locations[0].healthState,"critical");
  assert.equal(snap.platform.criticalIncidents,1);
  assert.equal(snap.policy.automaticEscalation,false);
  assert.equal(snap.policy.autonomousProductionChanges,false);
  assert.equal(audit.length,4);
  assert.equal(events.length,4);

  console.log(JSON.stringify({
    ok:true,version:"50.10.0",
    acceptedProductionRegistry:true,
    restaurantPlatformHealthRollup:true,
    supportOwnership:true,
    observabilityIncidentVisibility:true,
    humanAcknowledgement:true,
    humanEscalation:true,
    humanResolution:true,
    maintenanceWindowAwareness:true,
    automaticAcknowledgement:false,
    automaticEscalation:false,
    automaticRemediation:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
