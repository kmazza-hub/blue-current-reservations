"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Learning=require(path.join(root,"server/services/portfolioLearningPlaybookIntelligenceService"));
(async()=>{
 assert.equal(pkg.version,"84.0.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/executive/portfolio-learning"));
 assert(router.includes("/api/executive/portfolio-playbooks/approve"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc840-")),dbPath=path.join(dir,"db.json");
 const rows=[1,2,3,4,5].map((n)=>({id:`d${n}`,organizationId:"o",locationId:n<4?"l1":"l2",reason:"SERVICE_RISK",decisionType:"CORRECTIVE_ACTION",accountableOwner:"Ops",status:"REVIEWED",outcomeRating:n===5?"PARTIAL":"EFFECTIVE"}));
 fs.writeFileSync(dbPath,JSON.stringify({portfolioDecisionLedger:rows,portfolioOperatingPlaybooks:[]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const outcomes={build:async()=>({systemicPatterns:[]})};
 const svc=new Learning(db,outcomes);

 let out=await svc.build("o",["*"]);
 assert.equal(out.summary.playbookCandidates,1);
 const pattern=out.learningPatterns[0];
 assert.equal(pattern.evidenceLevel,"STRONG");
 assert.equal(pattern.recommendation,"PLAYBOOK_CANDIDATE");

 const draft=await svc.createDraft("o",["*"],{learningPatternId:pattern.id,title:"Service Risk Recovery",guidance:"Review the local operating context and use this sequence as human-approved guidance only."},"COO");
 assert.equal(draft.status,"DRAFT");
 assert.equal(draft.operationalExecutionAuthorized,false);

 const approved=await svc.approve("o",draft.id,{approvalNote:"Approved as reference guidance after executive evidence review."},"COO");
 assert.equal(approved.status,"APPROVED");
 assert.equal(approved.automaticRolloutAuthorized,false);

 out=await svc.build("o",["*"]);
 assert.equal(out.summary.approvedPlaybooks,1);
 assert.equal(out.policy.observedHistoryIsNotInstruction,true);
 assert.equal(out.policy.humanApprovalRequiredToActivatePlaybook,true);
 assert.equal(out.policy.noAutomaticOperationalExecution,true);
 assert.equal(out.policy.noAutomaticCrossLocationRollout,true);
 assert.equal(out.policy.localContextReviewRequired,true);
 assert.equal(out.policy.autonomousProductionChanges,false);

 console.log(JSON.stringify({ok:true,version:"84.0.0",portfolioLearning:true,verifiedOutcomePatterns:true,playbookCandidates:true,humanDrafting:true,humanApproval:true,localContextReview:true,noAutomaticExecution:true,noAutomaticRollout:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
