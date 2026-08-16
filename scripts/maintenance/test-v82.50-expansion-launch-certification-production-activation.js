"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path"),root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory")),Launch=require(path.join(root,"server/services/expansionLaunchCertificationActivationService"));

(async()=>{
 assert(Number(pkg.version.split(".")[0]) >= 82);
 const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8"),server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
 assert(router.includes("/api/expansion/launch-certification/certify"));
 assert(router.includes("/api/expansion/production-activation/rollback"));
 assert(server.includes("ExpansionLaunchCertificationActivationService"));

 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc8250-")),dbPath=path.join(dir,"db.json");
 fs.writeFileSync(dbPath,JSON.stringify({
   locations:[{id:"l2",organizationId:"o",name:"Expansion Two"}],
   expansionRolloutPrepApprovals:{"o:l2":{status:"ROLLOUT_PREP_APPROVED"}}
 }));
 const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});

 let ready=false;
 const locationReadiness={evaluate:async()=>({
   decision:"READY_FOR_ROLLOUT_PREP",
   ownership:{launchOwner:"Launch Manager",trainingLead:"Trainer",supportOwner:"Support"},
   checks:{fallbackProcedureConfirmed:true,supportCoverageConfirmed:true,emergencyContactsConfirmed:true,providerLocationMapped:true}
 })};
 const provider={evaluate:async()=>({decision:ready?"READY":"HOLD",bestCandidate:{provider:"toast",score:ready?100:83},readyProviders:ready?["toast"]:[]})};
 const continuity={evaluate:async()=>({providers:[{provider:"toast",continuity:ready?"STABLE":"DEGRADED",fallback:ready?"TRUSTED_LIVE":"DEGRADED_LOCAL_FALLBACK",recoveryReady:ready}]})};

 const svc=new Launch(db,locationReadiness,provider,continuity);
 let s=await svc.status("o",["*"],"l2");
 assert.equal(s.state,"BLOCKED");
 assert(s.hardBlockers.includes("providerReady"));

 let blocked=false;
 try{await svc.certify("o",["*"],"l2",{rationale:"Attempt launch before provider readiness."},"executive");}
 catch(e){blocked=e.statusCode===409;}
 assert.equal(blocked,true);

 ready=true;
 s=await svc.status("o",["*"],"l2");
 assert.equal(s.state,"CERTIFIABLE");

 const cert=await svc.certify("o",["*"],"l2",{rationale:"All launch gates passed for controlled activation."},"executive");
 assert.equal(cert.certification.status,"CERTIFIED");
 assert.equal(cert.certification.productionActivationAuthorized,true);
 assert.equal(cert.certification.broaderProviderAuthorityAuthorized,false);
 assert.equal(cert.certification.multiLocationActivationAuthorized,false);

 s=await svc.activate("o",["*"],"l2",{launchWindow:"Monday dinner","notes":"Controlled launch"},"executive");
 assert.equal(s.state,"PRODUCTION_ACTIVE");
 assert.equal(s.activation.status,"ACTIVE");
 assert.equal(s.activation.autonomousProductionChangesAllowed,false);
 assert.equal(s.activation.providerAuthorityScope,"UNCHANGED");

 s=await svc.rollback("o",["*"],"l2",{reason:"Rollback drill completed after controlled activation."},"executive");
 assert.equal(s.activation.status,"ROLLED_BACK");
 assert.equal(s.policy.noAutomaticActivation,true);
 assert.equal(s.policy.noAutomaticMultiLocationActivation,true);
 assert.equal(s.policy.productionActivationDoesNotGrantBroaderProviderAuthority,true);

 console.log(JSON.stringify({
   ok:true,version:"82.50.0",
   launchCertification:true,
   providerReadinessGate:true,
   trustedContinuityGate:true,
   explicitHumanActivation:true,
   productionActivation:true,
   broaderProviderAuthority:false,
   autonomousProductionChanges:false,
   rollbackAvailable:true,
   automaticActivation:false,
   automaticMultiLocationActivation:false
 },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
