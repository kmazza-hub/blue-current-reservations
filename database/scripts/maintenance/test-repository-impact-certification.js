"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),os=require("os");
global.structuredClone=global.structuredClone||((x)=>JSON.parse(JSON.stringify(x)));
const RepositoryImpactService=require("../../server/services/repositoryImpactService");
const Engine=require("../../client/js/modules/repositoryImpactCertificationEngine");

(async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"bc-impact-"));
  fs.mkdirSync(path.join(tmp,"client/js/modules"),{recursive:true});
  fs.mkdirSync(path.join(tmp,"scripts/maintenance"),{recursive:true});
  fs.writeFileSync(path.join(tmp,"client/index.html"),`<section id="sampleCenter"></section><script data-center="sampleCenter" data-src="js/modules/sampleCenter.js"></script>`);
  fs.writeFileSync(path.join(tmp,"client/js/app-v15.1.3.js"),`startupRegistry.register("sampleCenter", createSampleCenter(), []);`);
  fs.writeFileSync(path.join(tmp,"client/js/modules/sampleCenter.js"),`window.createSampleCenter=()=>document.getElementById("sampleCenter");`);
  fs.writeFileSync(path.join(tmp,"scripts/maintenance/test-sample.js"),`if("sampleCenter") console.log("test");`);
  const svc=new RepositoryImpactService(tmp),impact=svc.analyze("sampleCenter");
  assert.equal(impact.deletionExecuted,false);
  assert.equal(impact.deleteEndpointPresent,false);
  assert.ok(impact.graph.ownedFiles.includes("client/index.html"));
  assert.ok(impact.graph.ownedFiles.includes("client/js/modules/sampleCenter.js"));
  assert.ok(impact.graph.startupDependencies.length>=1);
  assert.ok(impact.graph.testCoverage.length>=1);
  assert.ok(impact.rollback.digest);
  assert.ok(impact.blockers.includes("Startup registry references remain."));

  const state={operatorRetirementCertifications:[{id:"RC1",surfaceId:"sampleCenter",status:"retirement-candidate-certified"}],operatorDeletionPlans:[]};
  const appState={getState:()=>state,update:o=>Object.assign(state,o)},eventBus={emit:()=>{}};
  const engine=new Engine({eventBus,appState});
  const blocked=engine.buildPlan(impact);
  let authBlocked=false;
  try{engine.authorize(blocked.id,"GM","review");}catch(e){authBlocked=/blockers/.test(e.message);}
  assert.equal(authBlocked,true);

  const cleanImpact={...impact,status:"impact-clear-for-deletion-plan",blockers:[],graph:{...impact.graph,inboundReferences:[],startupDependencies:[],apiUsage:[],testCoverage:[{file:"scripts/maintenance/test-sample.js",count:1}]}};
  const plan=engine.buildPlan(cleanImpact);
  const authorized=engine.authorize(plan.id,"GM Tester","Deletion plan reviewed");
  assert.equal(authorized.status,"human-authorized-plan");
  assert.equal(authorized.humanDeletionAuthorization.scope,"deletion-plan-only");
  assert.equal(authorized.codeDeletionAllowed,false);
  assert.equal(authorized.deletionExecuted,false);
  const ready=engine.readiness(authorized);
  assert.equal(ready.score,100);
  assert.equal(ready.status,"deletion-plan-certified");
  assert.equal(ready.codeDeletionAllowed,false);

  console.log(JSON.stringify({ok:true,version:"46.35.0",ownedFiles:impact.graph.ownedFiles.length,startupDependencies:impact.graph.startupDependencies.length,testReferences:impact.graph.testCoverage.length,rollbackDigest:impact.rollback.digest.slice(0,12),blockedAuthorization:authBlocked,authorizedStatus:authorized.status,readiness:ready.score,codeDeletionAllowed:false,deletionExecuted:false,deleteEndpointPresent:false},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
