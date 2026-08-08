"use strict";
const assert=require("assert");
const Service=require("../../server/services/multiLocationPerformanceService");

(async()=>{
  const state={
    locations:[
      {id:"loc_a",name:"A",organizationId:"org"},
      {id:"loc_b",name:"B",organizationId:"org"},
      {id:"loc_c",name:"C",organizationId:"other"}
    ],
    multiLocationLeadershipActions:[]
  };
  const rhythm={
    loc_a:{
      summary:{readinessScore:72,rhythmScore:60,activeActions:3,completedActions:1,modeledControllableContributionDollars:8000,modeledControllableMarginPercent:42,realizedImpactDollars:200,realizationRatePercent:40},
      profitability:{summary:{modeledLeakageDollars:3500},topConstraint:{label:"Food-cost variance",modeledLeakageDollars:1800,category:"food-cost"}},
      predictiveInterventions:[{type:"kitchen-throughput",etaMinutes:15,pressure:85,severity:"high"}],
      activeActions:[{status:"blocked"},{status:"in_progress"},{status:"accepted"}],
      latestHandoff:null,latestCloseout:null
    },
    loc_b:{
      summary:{readinessScore:94,rhythmScore:100,activeActions:0,completedActions:3,modeledControllableContributionDollars:12000,modeledControllableMarginPercent:58,realizedImpactDollars:900,realizationRatePercent:90},
      profitability:{summary:{modeledLeakageDollars:300},topConstraint:{label:"Minor waste",modeledLeakageDollars:200,category:"food-cost"}},
      predictiveInterventions:[],
      activeActions:[],
      latestHandoff:{shift:"closing",authorName:"GM",createdAt:new Date().toISOString()},
      latestCloseout:{resultStatus:"closed-clean",createdAt:new Date().toISOString()}
    }
  };
  const audit=[],events=[];
  const svc=new Service(
    {read:async()=>state,mutate:async fn=>fn(state)},
    {record:async x=>audit.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    {snapshot:async(_org,loc)=>rhythm[loc]}
  );
  const snap=await svc.snapshot("org",["*"]);
  assert.equal(snap.version,"47.35.0");
  assert.equal(snap.portfolio.locations,2);
  assert.equal(snap.locations[0].locationId,"loc_a");
  assert.ok(snap.locations[0].attentionScore>snap.locations[1].attentionScore);
  assert.equal(snap.exceptionQueue[0].locationId,"loc_a");
  assert.equal(snap.policy.automaticCrossLocationExecution,false);

  const scoped=await svc.snapshot("org",["loc_b"]);
  assert.equal(scoped.portfolio.locations,1);
  assert.equal(scoped.locations[0].locationId,"loc_b");

  const ack=await svc.acknowledge("org","loc_a",{owner:"Area Director",note:"Calling GM now"},"Tester");
  assert.equal(ack.status,"acknowledged");
  assert.equal(state.multiLocationLeadershipActions.length,1);
  assert.equal(audit.length,1);
  assert.equal(events[0][0],"multi-location-performance:acknowledged");

  console.log(JSON.stringify({
    ok:true,version:"47.35.0",
    rankedLocations:snap.locations.map(x=>({id:x.locationId,score:x.attentionScore,level:x.attentionLevel})),
    firstLeadershipException:snap.exceptionQueue[0].locationId,
    authorizationScopeRespected:scoped.portfolio.locations===1,
    acknowledgementPersisted:true,
    humanLeadershipRequired:snap.policy.humanLeadershipRequired,
    automaticCrossLocationExecution:snap.policy.automaticCrossLocationExecution
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
