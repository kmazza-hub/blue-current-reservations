"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Playbooks=require(path.join(root,"server/services/commandPlaybookIntelligenceService"));
const ShiftMemory=require(path.join(root,"server/services/commandShiftMemoryService"));

(async()=>{
  assert(/^78\.50\.[01]$/.test(pkg.version));

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

  assert(router.includes("/api/command/contextual-playbook"));
  assert(server.includes("CommandShiftMemoryService"));
  assert(html.includes('id="bcShiftMemory"'));
  assert(html.includes('id="bcShiftMemoryTitle"'));
  assert(shell.includes("loadShiftMemory"));
  assert(shell.includes("/api/command/contextual-playbook"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7850-"));
  const dbPath=path.join(dir,"db.json");

  const recommendation="Confirm expo ownership of ready food and review constrained tickets.";
  const records=[];
  for(let i=0;i<8;i++){
    records.push({
      id:`learn_${i}`,
      organizationId:"o",
      locationId:i%2?"l1":"l2",
      actionId:`a${i}`,
      domain:"kitchen",
      title:"Kitchen throughput needs attention",
      recommendation,
      verificationStatus:i<6?"IMPROVED":i===6?"UNCHANGED":"WORSENED",
      metricName:"kitchen_pressure_index",
      baselineValue:112+i,
      currentValue:i<6?42+i:i===6?118:139,
      delta:i<6?-68: i===6?0:21,
      baselineSnapshot:{
        dataMode:"live-current",
        priorityScore:88,
        metric:{name:"kitchen_pressure_index",value:112+i,context:{activeKitchenTickets:5,foodReadyItems:3,kitchenTargetMinutes:18}},
        service:{
          occupancyPercent:80+i,
          averageQuotedWaitMinutes:14+i%3,
          activeKitchenTickets:5,
          foodReadyItems:3,
          activeCovers:38+i,
          activeStaff:8
        },
        inventory:{lowStockItems:1,items:8}
      },
      createdAt:new Date(Date.now()-i*60000).toISOString()
    });
  }

  // Other-domain history should not outrank the active kitchen priority.
  records.push({
    id:"guest",organizationId:"o",locationId:"l1",actionId:"g1",domain:"guests",
    recommendation:"Review host quoting.",verificationStatus:"IMPROVED",
    metricName:"guest_wait_minutes",baselineValue:31,currentValue:18,delta:-13,
    baselineSnapshot:{service:{occupancyPercent:60,averageQuotedWaitMinutes:31,activeKitchenTickets:1,foodReadyItems:0,activeCovers:20},inventory:{}},
    createdAt:new Date().toISOString()
  });

  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"o"}],
    locations:[{id:"l1",organizationId:"o"},{id:"l2",organizationId:"o"}],
    commandOutcomeLearning:records
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const playbooks=new Playbooks(db);
  const memory=new ShiftMemory(db,playbooks);

  const picture={
    dataMode:"live-current",
    location:{id:"l1",name:"Pilot"},
    service:{
      occupancyPercent:84,
      averageQuotedWaitMinutes:15,
      activeKitchenTickets:5,
      foodReadyItems:3,
      activeCovers:41,
      activeStaff:8
    },
    next30Minutes:{covers:24},
    inventory:{lowStockItems:1},
    prioritization:{
      state:"ACT_NOW",
      topPriorities:[{
        id:"priority_1",rank:1,score:90,domain:"kitchen",
        title:"Kitchen throughput needs attention",
        recommendation
      }]
    }
  };

  const result=await memory.match("o",["*"],"l1",picture);
  assert.equal(result.version,"78.50.0");
  assert.equal(result.currentContext.servicePhase,"peak-pressure");
  assert.equal(result.currentPriority.domain,"kitchen");
  assert(result.playbook);
  assert.equal(result.playbook.domain,"kitchen");
  assert.equal(result.playbook.guidanceStatus,"EVIDENCE_BACKED");
  assert(result.match);
  assert(result.match.similarityScore>=80);
  assert.equal(result.match.similarityConfidence,"HIGH");
  assert(result.contextualEvidence.comparableOutcomes>=4);
  assert(result.contextualEvidence.improvedRate>=60);
  assert.equal(result.guidance,"HIGHLY_RELEVANT_HISTORY");

  assert.equal(result.policy.shiftMemoryReadOnly,true);
  assert.equal(result.policy.contextualSimilarityIsHeuristic,true);
  assert.equal(result.policy.observationalAssociationOnly,true);
  assert.equal(result.policy.noCausalClaim,true);
  assert.equal(result.policy.noAutonomousActionSelection,true);
  assert.equal(result.policy.noAutomaticOperationalDecision,true);
  assert.equal(result.policy.managerReviewRequired,true);

  // No current priority -> no invented contextual recommendation.
  const none=await memory.match("o",["*"],"l1",{...picture,prioritization:{topPriorities:[]}});
  assert.equal(none.guidance,"NO_ACTIVE_PRIORITY");
  assert.equal(none.currentPriority,null);

  console.log(JSON.stringify({
    ok:true,
    version:"78.50.0",
    currentShiftFingerprint:true,
    historicalContextMemory:true,
    sameDomainMatching:true,
    contextualSimilarity:true,
    evidenceBackedPlaybookMatch:true,
    multiLocationHistory:true,
    noPriorityNoGuidance:true,
    heuristicDisclosure:true,
    causalClaim:false,
    autonomousActionSelection:false,
    managerReviewRequired:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
