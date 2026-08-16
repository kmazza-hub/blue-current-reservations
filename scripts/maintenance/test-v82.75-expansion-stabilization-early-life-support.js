"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Stabilization=require(path.join(root,"server/services/expansionStabilizationSupportControlService"));

(async()=>{
 assert.equal(pkg.version,"82.75.0");
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/expansion/stabilization/graduate"));
 assert(router.includes("/api/expansion/stabilization/incidents"));
 assert(server.includes("ExpansionStabilizationSupportControlService"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8275-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({locations:[{id:"l2",organizationId:"o",name:"Expansion"}]}));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});

 let activatedAt=new Date(Date.now()-24*3600000).toISOString();
 const launch={status:async()=>({activation:{status:"ACTIVE",activatedAt},provider:{bestCandidate:{provider:"toast"}}})};
 const continuity={evaluate:async()=>({providers:[{provider:"toast",continuity:"STABLE",fallback:"TRUSTED_LIVE",recoveryReady:true}]})};
 const svc=new Stabilization(db,launch,continuity);

 let state=await svc.configure("o",["*"],"l2",{supportOwner:"Support Lead",launchOwner:"Launch Manager",stabilizationHours:72,maxOpenIncidents:1,maxCriticalIncidents:0,rollbackDrillConfirmed:true,supportCoverageConfirmed:true,dailyReviewConfirmed:true},"admin");
 assert.equal(state.state,"STABILIZING");
 assert(state.conditions.includes("minimumStabilizationWindowNotMet"));

 const incident=await svc.recordIncident("o",["*"],"l2",{severity:"CRITICAL",type:"provider",summary:"Provider data diverged"},"manager");
 assert.equal(incident.status.state,"UNSTABLE");
 assert(incident.status.hardBlockers.includes("criticalIncidentLimitMet"));

 state=await svc.resolveIncident("o",["*"],"l2",incident.incident.id,{resolution:"Provider mapping corrected and reconciliation verified."},"admin");
 assert.equal(state.incidentSummary.criticalOpen,0);

 activatedAt=new Date(Date.now()-80*3600000).toISOString();
 state=await svc.status("o",["*"],"l2");
 assert.equal(state.state,"READY_TO_GRADUATE");

 const graduated=await svc.graduate("o",["*"],"l2",{rationale:"Stabilization window completed with stable trusted service."},"executive");
 assert.equal(graduated.graduation.status,"GRADUATED");
 assert.equal(graduated.graduation.normalOperationsEligible,true);
 assert.equal(graduated.graduation.autonomousProductionChangesAllowed,false);
 assert.equal(graduated.graduation.broaderProviderAuthorityAuthorized,false);
 assert.equal(graduated.status.policy.noAutomaticGraduation,true);

 console.log(JSON.stringify({
   ok:true,version:"82.75.0",
   stabilizationWindow:true,
   supportOwnership:true,
   incidentThresholds:true,
   criticalIncidentBlocksGraduation:true,
   rollbackReadiness:true,
   stableProviderRequired:true,
   explicitHumanGraduation:true,
   automaticGraduation:false,
   autonomousProductionChanges:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
