"use strict";
const assert=require("assert");
const Service=require("../../server/services/productionIncidentCommandService");

(async()=>{
  const state={productionIncidentCommands:[]},audit=[],events=[];
  const support={
    locations:[{locationId:"a",locationName:"A",healthState:"critical"}],
    eventHistory:[
      {id:"s1",locationId:"a",locationName:"A",severity:"critical",title:"Reservation outage",status:"open",supportOwner:"Support",linkedIncidentId:"obs1"}
    ]
  };
  let reliability={status:"breached",score:58,breached:1,warning:0,errorBudgetRemaining:45};
  let telemetry={incidents:{records:[{id:"obs1",organizationId:"org",status:"open",severity:"critical",title:"API failure",owner:"Platform"}]}};

  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async()=>support},
    {evaluate:async()=>reliability},
    {snapshot:async()=>telemetry}
  );

  let snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.version,"50.15.0");
  assert.equal(snap.status,"incident-command-signals-open");
  assert.equal(snap.sourceSignals.length,2);
  assert.equal(snap.policy.automaticContainment,false);

  const incident=await svc.create("org",["a"],{
    title:"Dinner service reservation outage",
    severity:"critical",
    commander:"Incident Lead",
    affectedLocationIds:["a"],
    affectedDomains:["reservations","api"],
    businessImpact:"Reservations unavailable during dinner.",
    serviceImpact:"Host stand operating manually.",
    linkedSupportEventIds:["s1"],
    linkedObservabilityIncidentIds:["obs1"],
    runbook:"Fail over reservation intake and verify data integrity.",
    note:"Opened from combined support/observability signals."
  },"Tester");

  assert.equal(incident.status,"open");
  assert.equal(incident.automatedContainmentPerformed,false);
  assert.equal(incident.automatedRemediationPerformed,false);

  let updated=await svc.update("org",incident.id,{action:"acknowledge",note:"Incident team assembled."},"Tester");
  assert.equal(updated.status,"acknowledged");

  updated=await svc.update("org",incident.id,{action:"contain",note:"Manual fallback intake enabled."},"Tester");
  assert.equal(updated.status,"contained");
  assert.equal(updated.containmentStatus,"HUMAN_RECORDED_CONTAINMENT");

  updated=await svc.update("org",incident.id,{action:"communicate",note:"Operators notified of fallback procedure."},"Tester");
  assert.equal(updated.communicationStatus,"CHECKPOINT_RECORDED");
  assert.equal(updated.communications.length,1);

  updated=await svc.update("org",incident.id,{action:"recover",note:"API recovered and reservation sync verified."},"Tester");
  assert.equal(updated.status,"recovering");
  assert.equal(updated.recoveryEvidence.length,1);

  updated=await svc.update("org",incident.id,{action:"resolve",note:"Normal reservation flow restored and validated."},"Tester");
  assert.equal(updated.status,"resolved");
  assert.equal(updated.resolution,"Normal reservation flow restored and validated.");

  snap=await svc.snapshot("org",["a"]);
  assert.equal(snap.activeCommands.length,0);
  assert.equal(snap.policy.automaticRemediation,false);
  assert.equal(snap.policy.automaticResolution,false);
  assert.equal(snap.policy.autonomousProductionChanges,false);
  assert.equal(audit.length,6);
  assert.equal(events.length,6);

  console.log(JSON.stringify({
    ok:true,version:"50.15.0",
    supportAndObservabilitySignals:true,
    incidentCommander:true,
    affectedScope:true,
    humanContainment:true,
    communicationCheckpoints:true,
    recoveryEvidence:true,
    humanResolution:true,
    automaticContainment:false,
    automaticRemediation:false,
    automaticResolution:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
