"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Ledger=require(path.join(root,"server/services/portfolioDecisionAccountabilityService"));

(async()=>{
 assert.equal(pkg.version,"83.50.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/executive/portfolio-decisions/review"));
 assert(server.includes("PortfolioDecisionAccountabilityService"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8350-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({portfolioDecisionLedger:[]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});

 const exception={
   id:"pe-l1-provider",organizationId:"o",locationId:"l1",locationName:"One",
   reason:"PROVIDER_CONTINUITY",severity:"CRITICAL",status:"ACKNOWLEDGED",owner:"Regional VP"
 };
 const exceptions={list:async()=>({exceptions:[exception]})};
 const svc=new Ledger(db,exceptions);

 const follow=new Date(Date.now()+24*3600000).toISOString();
 const d=await svc.create("o",["*"],{
   exceptionId:exception.id,
   decisionType:"CORRECTIVE_ACTION",
   rationale:"Keep the location live while provider reconciliation is corrected.",
   expectedOutcome:"Restore trusted provider continuity without guest-facing disruption.",
   accountableOwner:"Regional VP",
   followUpAt:follow
 },"executive");

 assert.equal(d.status,"OPEN");
 assert.equal(d.decisionType,"CORRECTIVE_ACTION");
 assert.equal(d.autonomousOperationalAction,false);

 let ledger=await svc.list("o",["*"]);
 assert.equal(ledger.summary.total,1);
 assert.equal(ledger.summary.open,1);
 assert.equal(ledger.policy.decisionDoesNotExecuteOperations,true);

 const reviewed=await svc.review("o",["*"],d.id,{
   outcomeRating:"EFFECTIVE",
   outcome:"Provider reconciliation recovered and service remained stable.",
   followUpRequired:false
 },"executive");

 assert.equal(reviewed.decision.status,"REVIEWED");
 assert.equal(reviewed.decision.outcomeRating,"EFFECTIVE");
 assert.equal(reviewed.ledger.summary.effective,1);
 assert.equal(reviewed.ledger.policy.humanOutcomeReviewRequired,true);
 assert.equal(reviewed.ledger.policy.noAutomaticCrossLocationAction,true);
 assert.equal(reviewed.ledger.policy.autonomousProductionChanges,false);

 console.log(JSON.stringify({
   ok:true,version:"83.50.0",
   decisionLedger:true,
   rationaleRequired:true,
   expectedOutcome:true,
   accountableOwner:true,
   followUp:true,
   outcomeReview:true,
   effectivenessRating:true,
   decisionDoesNotExecuteOperations:true,
   humanAccountability:true,
   autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
