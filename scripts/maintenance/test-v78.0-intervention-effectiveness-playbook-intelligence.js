"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Playbooks=require(path.join(root,"server/services/commandPlaybookIntelligenceService"));

(async()=>{
  assert.equal(pkg.version,"78.0.0");

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

  assert(router.includes("/api/command/playbooks"));
  assert(server.includes("CommandPlaybookIntelligenceService"));
  assert(html.includes('id="bcPlaybookSummary"'));
  assert(shell.includes("loadPlaybooks"));
  assert(shell.includes("/api/command/playbooks"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v78-"));
  const dbPath=path.join(dir,"db.json");

  const records=[];
  for(let i=0;i<8;i++){
    records.push({
      id:`learn_${i}`,organizationId:"o",locationId:i%2?"l1":"l2",actionId:`a${i}`,
      domain:"kitchen",title:"Kitchen throughput needs attention",
      recommendation:"Confirm expo ownership of ready food and review constrained tickets.",
      resolutionOutcome:"Manager reviewed expo and constrained tickets.",
      verificationStatus:i<6?"IMPROVED":i===6?"UNCHANGED":"WORSENED",
      metricName:"kitchen_pressure_index",
      baselineValue:120+i,
      currentValue:i<6?45+i:i===6?126:145,
      delta:i<6?-70: i===6?0:18,
      createdAt:new Date(Date.now()-i*60000).toISOString()
    });
  }
  records.push({
    id:"guest1",organizationId:"o",locationId:"l1",actionId:"g1",
    domain:"guests",title:"Wait is above target",
    recommendation:"Review host quoting before changing the wait.",
    verificationStatus:"IMPROVED",metricName:"guest_wait_minutes",
    baselineValue:32,currentValue:18,delta:-14,createdAt:new Date().toISOString()
  });

  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"o"}],
    locations:[{id:"l1",organizationId:"o"},{id:"l2",organizationId:"o"}],
    commandOutcomeLearning:records
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const svc=new Playbooks(db);
  const result=await svc.build("o",["*"]);

  assert.equal(result.counts.learningRecords,9);
  assert(result.playbooks.length>=2);

  const kitchen=result.playbooks.find(x=>x.domain==="kitchen");
  assert(kitchen);
  assert.equal(kitchen.sampleSize,8);
  assert.equal(kitchen.verifiedSamples,8);
  assert.equal(kitchen.improved,6);
  assert.equal(kitchen.improvedRate,75);
  assert.equal(kitchen.situation.band,"high");
  assert.equal(kitchen.guidanceStatus,"EVIDENCE_BACKED");
  assert.equal(kitchen.confidence.label,"STRONG");
  assert.equal(kitchen.causalClaim,false);
  assert.equal(kitchen.approvedForAutonomousExecution,false);
  assert.equal(kitchen.locationCount,2);

  const guest=result.playbooks.find(x=>x.domain==="guests");
  assert(guest);
  assert.equal(guest.guidanceStatus,"INSUFFICIENT_EVIDENCE");
  assert.equal(guest.situation.band,"high");

  const match=svc.matchPriority({domain:"kitchen"},result.playbooks);
  assert.equal(match.domain,"kitchen");
  assert.equal(match.guidanceStatus,"EVIDENCE_BACKED");

  assert.equal(result.policy.observationalAssociationOnly,true);
  assert.equal(result.policy.noCausalClaim,true);
  assert.equal(result.policy.noAutonomousExecution,true);
  assert.equal(result.policy.managerReviewRequired,true);

  console.log(JSON.stringify({
    ok:true,
    version:"78.0.0",
    repeatedOutcomeAggregation:true,
    similarConditionBanding:true,
    interventionEffectiveness:true,
    multiLocationEvidence:true,
    evidenceThresholds:true,
    evidenceBackedGuidance:true,
    insufficientEvidenceGuard:true,
    priorityMatching:true,
    causalClaim:false,
    autonomousExecution:false,
    managerReviewRequired:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
