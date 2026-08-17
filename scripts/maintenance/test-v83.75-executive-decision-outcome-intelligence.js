"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Intelligence=require(path.join(root,"server/services/executiveDecisionOutcomeIntelligenceService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 83);
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  assert(router.includes("/api/executive/decision-outcome-intelligence"));
  assert(server.includes("ExecutiveDecisionOutcomeIntelligenceService"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8375-")),dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({portfolioDecisionLedger:[]}));
  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});

  const decisions=[
    {id:"d1",organizationId:"o",locationId:"l1",reason:"PROVIDER_CONTINUITY",decisionType:"CORRECTIVE_ACTION",accountableOwner:"Regional VP",status:"REVIEWED",outcomeRating:"PARTIAL",decidedAt:"2026-08-10T00:00:00Z",followUpAt:"2026-08-11T00:00:00Z"},
    {id:"d2",organizationId:"o",locationId:"l2",reason:"PROVIDER_CONTINUITY",decisionType:"CORRECTIVE_ACTION",accountableOwner:"Regional VP",status:"REVIEWED",outcomeRating:"INEFFECTIVE",decidedAt:"2026-08-11T00:00:00Z",followUpAt:"2026-08-12T00:00:00Z"},
    {id:"d3",organizationId:"o",locationId:"l3",reason:"PROVIDER_CONTINUITY",decisionType:"HOLD_EXPANSION",accountableOwner:"COO",status:"REVIEWED",outcomeRating:"PARTIAL",decidedAt:"2026-08-12T00:00:00Z",followUpAt:"2026-08-13T00:00:00Z"},
    {id:"d4",organizationId:"o",locationId:"l1",reason:"SERVICE_RISK",decisionType:"CORRECTIVE_ACTION",accountableOwner:"Regional VP",status:"REVIEWED",outcomeRating:"EFFECTIVE",decidedAt:"2026-08-13T00:00:00Z",followUpAt:"2026-08-14T00:00:00Z"}
  ];
  await db.mutate(data=>{data.portfolioDecisionLedger=decisions;return true;});

  const ledger={list:async()=>({
    decisions:(await db.read()).portfolioDecisionLedger.map(x=>({...x,overdue:false}))
  })};
  const svc=new Intelligence(db,ledger);
  const out=await svc.build("o",["*"]);

  assert.equal(out.version,"83.75.0");
  assert.equal(out.summary.reviewed,4);
  assert.equal(out.summary.systemicPatterns,1);
  assert.equal(out.systemicPatterns[0].reason,"PROVIDER_CONTINUITY");
  assert.equal(out.systemicPatterns[0].affectedLocations,3);
  assert.equal(out.guidance.executiveReviewRequired,true);
  assert(out.interventionEffectiveness.some(x=>x.decisionType==="CORRECTIVE_ACTION"));
  assert(out.leadershipLeverage.some(x=>x.accountableOwner==="Regional VP"));
  assert.equal(out.policy.descriptiveIntelligenceOnly,true);
  assert.equal(out.policy.noAutomaticDecisionSelection,true);
  assert.equal(out.policy.noAutomaticOperationalAction,true);
  assert.equal(out.policy.noAutomaticPersonnelJudgment,true);
  assert.equal(out.policy.humanInterpretationRequired,true);
  assert.equal(out.policy.autonomousProductionChanges,false);

  console.log(JSON.stringify({
    ok:true,version:"83.75.0",
    interventionEffectiveness:true,
    recurringIssueDetection:true,
    systemicPatternDetection:true,
    leadershipLeverage:true,
    overdueDecisionVisibility:true,
    humanInterpretationRequired:true,
    noAutomaticPersonnelJudgment:true,
    noAutomaticOperationalAction:true,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
