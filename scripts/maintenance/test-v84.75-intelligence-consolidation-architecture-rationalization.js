"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const Consolidation=require(path.join(root,"server/services/intelligenceConsolidationService"));
(async()=>{
 assert.equal(pkg.version,"84.75.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes('"/api/executive/intelligence"'));
 assert(server.includes("IntelligenceConsolidationService"));

 const services={
  portfolioExceptionCommandService:{build:async()=>({summary:{open:1},exceptions:[{id:"e1",status:"OPEN",locationId:"l1",severity:"HIGH",reason:"SERVICE_RISK"}]})},
  portfolioDecisionAccountabilityService:{list:async()=>({summary:{decisions:2},decisions:[{id:"d1",status:"OPEN",overdue:true,locationId:"l1",decisionType:"CORRECTIVE_ACTION"},{id:"d2",status:"REVIEWED"}]})},
  executiveDecisionOutcomeIntelligenceService:{build:async()=>({summary:{reviewed:1},systemicPatterns:[{reason:"PROVIDER_CONTINUITY"}]})},
  portfolioLearningPlaybookIntelligenceService:{build:async()=>({summary:{learningPatterns:1},learningPatterns:[{id:"lp1"}],playbooks:[{id:"p1",status:"APPROVED"}]})},
  playbookEvidenceLifecycleService:{evaluate:async()=>({summary:{playbooks:1},playbooks:[{playbookId:"p1",reviewRequired:true,reviewRecommended:false,reasons:["MATERIAL_EFFECTIVENESS_DECLINE"]}]})},
  playbookGovernanceAuthorityService:{audit:async()=>({summary:{governanceEvents:4}})}
 };
 const svc=new Consolidation(services),out=await svc.build("o",["*"]);
 assert.equal(out.version,"84.75.0");
 assert.equal(out.architecture.status,"CONSOLIDATED");
 assert.equal(out.architecture.architectureFreezeCandidate,true);
 assert.equal(out.architecture.duplicateWriteAuthority,false);
 assert.equal(out.summary.openPortfolioExceptions,1);
 assert.equal(out.summary.overdueDecisions,1);
 assert.equal(out.summary.systemicPatterns,1);
 assert.equal(out.summary.approvedPlaybooks,1);
 assert.equal(out.summary.playbooksReviewRequired,1);
 assert(out.summary.attentionItems>=4);
 assert.equal(out.policy.oneAuthoritativeServicePerResponsibility,true);
 assert.equal(out.policy.consolidatedReadModelOnly,true);
 assert.equal(out.policy.noDuplicateWritePathIntroduced,true);
 assert.equal(out.policy.humanAuthorityPreserved,true);
 assert.equal(out.policy.autonomousProductionChanges,false);
 console.log(JSON.stringify({ok:true,version:"84.75.0",consolidatedExecutiveReadModel:true,authoritativeServiceMap:true,attentionAggregation:true,duplicateWriteAuthority:false,architectureFreezeCandidate:true,humanAuthorityPreserved:true,autonomousProductionChanges:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
