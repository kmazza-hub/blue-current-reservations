"use strict";
const assert=require("assert");
const Service=require("../../server/services/pilotOperationalReadinessService");

(async()=>{
  const db={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1"}],
    sections:[{id:"s1",organizationId:"org",locationId:"loc1"}],
    reservations:[{id:"r1",organizationId:"org",locationId:"loc1"}],
    staff:[{id:"st1",organizationId:"org",locationId:"loc1",status:"active"}],
    employees:[],
    kitchenStations:[{id:"k1",organizationId:"org",locationId:"loc1"}],
    memberships:[{id:"m1",organizationId:"org",locationIds:["loc1"]}],
    liveConnectors:[{id:"c1",organizationId:"org",locationId:"loc1",type:"reservations",status:"connected"}]
  };
  const svc=new Service(
    {read:async()=>db},
    {snapshot:async()=>({status:"V49-ARCHITECTURE-CERTIFIED",architecturePassed:5,architectureTotal:5})},
    {snapshot:async()=>({status:"V50-ARCHITECTURE-CERTIFIED",architecturePassed:5,architectureTotal:5})},
    {snapshot:async()=>({status:"technical-readiness-complete",locations:[{locationId:"loc1",technicallyReady:true,requiredPassed:8,requiredTotal:8}]})},
    {snapshot:async()=>({status:"proof-program-active",program:{id:"p1"},successCriteria:{minimumOverallScore:65}})}
  );
  const snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.05.0");
  assert.equal(snap.status,"PILOT-BASELINE-GO");
  assert.equal(snap.goNoGo.decision,"GO");
  assert.equal(snap.locations.length,1);
  assert.equal(snap.locations[0].pilotReady,true);
  assert.equal(snap.blockerCount,0);
  assert.equal(snap.requiredPassed,snap.requiredTotal);
  assert.equal(snap.policy.assessmentReadOnly,true);
  assert.equal(snap.policy.noSyntheticReadiness,true);
  assert.equal(snap.policy.humanGoNoGoRequired,true);
  assert.equal(snap.policy.automaticConfiguration,false);
  assert.equal(snap.policy.automaticDeployment,false);
  assert.equal(snap.policy.automaticGoLive,false);
  assert.equal(snap.policy.autonomousProductionChanges,false);

  db.kitchenStations=[];
  db.liveConnectors=[];
  const blocked=await svc.snapshot("org",["loc1"]);
  assert.equal(blocked.goNoGo.decision,"CONDITIONAL");
  assert.equal(blocked.locations[0].pilotReady,false);
  assert(blocked.locations[0].blockers.some(x=>x.id==="kitchen-model"));

  console.log(JSON.stringify({
    ok:true,version:"51.05.0",
    pilotReadinessBaseline:true,
    restaurantDependencyInventory:true,
    measurableGoNoGoGates:true,
    missingEvidenceRemainsBlocker:true,
    humanGoNoGoRequired:true,
    automaticConfiguration:false,
    automaticDeployment:false,
    automaticGoLive:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
