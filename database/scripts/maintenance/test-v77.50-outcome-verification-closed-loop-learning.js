"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Outcome=require(path.join(root,"server/services/commandOutcomeVerificationService"));
const Actions=require(path.join(root,"server/services/commandManagerActionService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 77);

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

  assert(router.includes("/api/command/outcomes"));
  assert(server.includes("CommandOutcomeVerificationService"));
  assert(html.includes('id="bcOutcomeSummary"'));
  assert(shell.includes("loadOutcomeLearning"));
  assert(shell.includes("/api/command/outcomes"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7750-"));
  const dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"o",name:"Group"}],
    locations:[{id:"l",organizationId:"o",name:"Pilot"}],
    commandManagerActions:[]
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const auditEvents=[];
  const audit={record:async event=>{auditEvents.push(event);return event;}};
  const realtime={events:[],publish(type,payload){this.events.push({type,payload});}};
  const outcome=new Outcome(db);

  let picture={
    dataMode:"live-current",
    service:{activeKitchenTickets:5,foodReadyItems:4,kitchenTargetMinutes:18,activeCovers:30,averageQuotedWaitMinutes:10,occupancyPercent:65},
    inventory:{lowStockItems:2,items:8},
    prioritization:{topPriorities:[{
      id:"priority_1",rank:1,score:89,domain:"kitchen",workspace:"kitchen",severity:"high",
      title:"Kitchen throughput needs attention",detail:"Pressure is elevated.",
      recommendation:"Review Kitchen.",owner:"Manager + Expo",confidence:{label:"HIGH"}
    }]}
  };
  const command={snapshot:async()=>picture};
  const actions=new Actions(db,audit,realtime,command,outcome);

  const created=await actions.createFromPriority("o",["l"],{locationId:"l",priorityId:"priority_1"},"Manager");
  assert(created.baseline);
  assert.equal(created.baseline.metric.name,"kitchen_pressure_index");
  assert.equal(created.baseline.metric.value,122); // 5*18 + 4*8

  // Simulate measurable improvement before resolution.
  picture={
    ...picture,
    service:{...picture.service,activeKitchenTickets:2,foodReadyItems:0},
    prioritization:{topPriorities:[]}
  };

  const resolved=await actions.update("o",["l"],created.id,{action:"resolve",outcome:"Expo cleared ready food and kitchen pressure dropped."},"Manager");
  assert.equal(resolved.status,"resolved");
  assert(resolved.verification);
  assert.equal(resolved.verification.status,"IMPROVED");
  assert.equal(resolved.verification.currentValue,36);
  assert.equal(resolved.verification.automaticSuccessClaim,false);

  const summary=await outcome.summary("o",["l"],"l");
  assert.equal(summary.counts.total,1);
  assert.equal(summary.counts.improved,1);
  assert.equal(summary.recent[0].actionId,created.id);
  assert.equal(summary.policy.observationalLearningOnly,true);
  assert.equal(summary.policy.noCausalClaim,true);
  assert.equal(summary.policy.eligibleForAutomation,false);

  // Verify unchanged/worsened/unverified comparison semantics independently.
  assert.equal(outcome.compare({metric:{value:10,lowerIsBetter:true}},{value:10}).status,"UNCHANGED");
  assert.equal(outcome.compare({metric:{value:10,lowerIsBetter:true}},{value:14}).status,"WORSENED");
  assert.equal(outcome.compare(null,{value:14}).status,"UNVERIFIED");

  assert(auditEvents.some(x=>x.category==="command_outcome"));
  assert(realtime.events.some(x=>x.type==="command:outcome-verified"));

  console.log(JSON.stringify({
    ok:true,
    version:"77.50.0",
    baselineCaptured:true,
    beforeAfterVerification:true,
    improvedOutcome:true,
    learningRecord:true,
    unchangedClassification:true,
    worsenedClassification:true,
    unverifiedClassification:true,
    auditTrail:true,
    realtimeOutcomeEvent:true,
    causalClaim:false,
    automaticSuccessClaim:false,
    eligibleForAutomation:false
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
