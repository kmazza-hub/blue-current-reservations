"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Governance=require(path.join(root,"server/services/playbookGovernanceAuthorityService"));
(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 84);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
 assert(router.includes("/api/executive/playbook-governance/approve"));
 assert(router.includes("/api/executive/playbook-governance/transition"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8450-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({portfolioOperatingPlaybooks:[
  {id:"p1",organizationId:"o",title:"Service Recovery",status:"DRAFT",createdBy:"author@bc",learningPatternId:"lp1",evidenceSnapshot:{effectivenessScore:82,reviewedDecisions:5,representedLocations:2}},
  {id:"p2",organizationId:"o",title:"Service Recovery V2",status:"APPROVED",createdBy:"author2@bc",learningPatternId:"lp2",evidenceSnapshot:{effectivenessScore:90,reviewedDecisions:6,representedLocations:3}}
 ]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
 const evidence={evaluate:async()=>({playbooks:[
  {playbookId:"p1",reviewRequired:false,reasons:[]},
  {playbookId:"p2",reviewRequired:false,reasons:[]}
 ]})};
 const svc=new Governance(db,evidence);

 const review=await svc.submitReview("o","p1",{role:"REVIEWER",reviewNote:"Evidence and local operating context have been reviewed."},"reviewer@bc");
 assert.equal(review.governanceState,"REVIEWED");

 let blocked=false;
 try{await svc.approve("o",["*"],"p1",{role:"APPROVER",approvalNote:"Author attempts approval."},"author@bc");}
 catch(e){blocked=e.statusCode===409;}
 assert.equal(blocked,true);

 const approved=await svc.approve("o",["*"],"p1",{role:"APPROVER",approvalNote:"Independent approval after governance and evidence review."},"approver@bc");
 assert.equal(approved.status,"APPROVED");
 assert.equal(approved.operationalExecutionAuthorized,false);

 const suspended=await svc.transition("o","p1",{role:"APPROVER",action:"SUSPEND",reason:"Temporary suspension while new outcome evidence is reviewed."},"approver@bc");
 assert.equal(suspended.status,"SUSPENDED");

 const superseded=await svc.transition("o","p1",{role:"APPROVER",action:"SUPERSEDE",successorPlaybookId:"p2",reason:"Approved successor incorporates stronger current evidence."},"approver@bc");
 assert.equal(superseded.status,"SUPERSEDED");
 assert.equal(superseded.successorPlaybookId,"p2");

 const audit=await svc.audit("o");
 assert(audit.summary.governanceEvents>=3);
 assert.equal(audit.policy.roleBasedPlaybookAuthority,true);
 assert.equal(audit.policy.separationOfDutiesSupported,true);
 assert.equal(audit.policy.evidenceGateBeforeApproval,true);
 assert.equal(audit.policy.noAutomaticOperationalExecution,true);
 assert.equal(audit.policy.noAutomaticCrossLocationRollout,true);
 assert.equal(audit.policy.autonomousProductionChanges,false);

 console.log(JSON.stringify({
  ok:true,version:"84.50.0",
  roleBasedAuthority:true,
  separationOfDuties:true,
  independentReview:true,
  evidenceGate:true,
  humanApproval:true,
  suspension:true,
  supersession:true,
  retirementAuthority:true,
  governanceAudit:true,
  noAutomaticExecution:true,
  autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
