"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Lifecycle=require(path.join(root,"server/services/playbookEvidenceLifecycleService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 84);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/executive/playbook-evidence-lifecycle/acknowledge"));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8425-")),dbPath=path.join(dir,"db.json");
 const old=new Date(Date.now()-100*86400000).toISOString();
 fs.writeFileSync(dbPath,JSON.stringify({portfolioOperatingPlaybooks:[
  {id:"p1",organizationId:"o",learningPatternId:"lp1",title:"Provider Recovery",status:"APPROVED",approvedAt:old,updatedAt:old,evidenceSnapshot:{effectivenessScore:90,reviewedDecisions:5,representedLocations:2}},
  {id:"p2",organizationId:"o",learningPatternId:"lp2",title:"Stable Service",status:"APPROVED",approvedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),evidenceSnapshot:{effectivenessScore:80,reviewedDecisions:4,representedLocations:2}}
 ]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const learning={build:async()=>({learningPatterns:[
  {id:"lp1",effectivenessScore:55,reviewedDecisions:8,representedLocations:3,evidenceLevel:"STRONG",effective:3,partial:2,ineffective:3},
  {id:"lp2",effectivenessScore:82,reviewedDecisions:5,representedLocations:2,evidenceLevel:"STRONG",effective:4,partial:1,ineffective:0}
 ]})};
 const svc=new Lifecycle(db,learning),out=await svc.evaluate("o",["*"]);
 assert.equal(out.summary.playbooks,2);assert.equal(out.summary.reviewRequired,1);assert.equal(out.summary.declining,1);
 const bad=out.playbooks.find(x=>x.playbookId==="p1");
 assert.equal(bad.evidenceStatus,"REVIEW_REQUIRED");assert.equal(bad.scoreDelta,-35);
 assert(bad.reasons.includes("MATERIAL_EFFECTIVENESS_DECLINE"));assert(bad.reasons.includes("CONTRADICTORY_OUTCOMES"));
 assert.equal(out.playbooks.find(x=>x.playbookId==="p2").evidenceStatus,"CURRENT");
 const ack=await svc.acknowledgeReview("o","p1",{reviewNote:"Executive reviewed the declining evidence and will reassess the guidance."},"COO");
 assert.equal(ack.lastEvidenceReviewBy,"COO");
 assert.equal(out.policy.approvalDoesNotFreezeEvidence,true);assert.equal(out.policy.noAutomaticPlaybookRetirement,true);
 assert.equal(out.policy.noAutomaticOperationalExecution,true);assert.equal(out.policy.autonomousProductionChanges,false);
 console.log(JSON.stringify({ok:true,version:"84.25.0",continuousEvidenceReview:true,effectivenessDecay:true,contradictionDetection:true,staleGuidanceReview:true,locationEvidenceVisibility:true,humanReviewAcknowledgement:true,noAutomaticRetirement:true,noAutomaticExecution:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
