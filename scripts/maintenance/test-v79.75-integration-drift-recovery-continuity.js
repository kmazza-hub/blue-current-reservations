"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../.."),pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Continuity=require(path.join(root,"server/services/providerIntegrationContinuityService"));

(async()=>{
  assert.equal(pkg.version,"79.75.0");
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const truth=fs.readFileSync(path.join(root,"server/services/commandDataSourceTruthService.js"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
  assert(router.includes("/api/integrations/continuity"));
  assert(server.includes("ProviderIntegrationContinuityService"));
  assert(truth.includes("providerContinuity"));
  assert(shell.includes("Provider degraded"));
  assert(shell.includes("Local fallback"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc7975-")),dbPath=path.join(dir,"db.json"),now=new Date().toISOString();
  const base={
    locations:[{id:"l1",organizationId:"o",name:"Pilot"}],
    integrationCanonicalEvents:[{id:"e1",organizationId:"o",locationId:"l1",provider:"toast",domain:"sales",sourceEventId:"s1",fingerprint:"f1",receivedAt:now,occurredAt:now,validation:{status:"accepted"}}],
    integrationIdentityMappings:[{organizationId:"o",provider:"toast",locationId:"l1",externalLocationId:"t1"}],
    integrationProviderHealth:{"o:toast":{organizationId:"o",provider:"toast",status:"healthy",accepted:100,rejected:0,duplicates:0,lastEventAt:now}}
  };
  fs.writeFileSync(dbPath,JSON.stringify(base));
  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  let reconciled=true;
  const readiness={evaluate:async()=>({providers:[{provider:"toast",decision:"READY",checks:{eventsFlowing:true}}]})};
  const reconciliation={evaluate:async()=>({providers:[{provider:"toast",providerReadiness:"READY",confidence:100,reconciled,blockers:[]}]})};
  const svc=new Continuity(db,readiness,reconciliation);

  const stable=await svc.evaluate("o",["*"],"l1");
  assert.equal(stable.decision,"CONTINUOUS");
  assert.equal(stable.providers[0].continuity,"STABLE");
  assert.equal(stable.providers[0].fallback,"TRUSTED_LIVE");

  await db.mutate(s=>{s.integrationCanonicalEvents[0].receivedAt=new Date(Date.now()-45*60000).toISOString();s.integrationProviderHealth["o:toast"].lastEventAt=s.integrationCanonicalEvents[0].receivedAt;return true;});
  const delayed=await svc.evaluate("o",["*"],"l1");
  assert.equal(delayed.decision,"DEGRADED");
  assert.equal(delayed.providers[0].drift.feedDelayed,true);
  assert.equal(delayed.providers[0].fallback,"DEGRADED_LOCAL_FALLBACK");

  await db.mutate(s=>{s.integrationCanonicalEvents[0].receivedAt=new Date(Date.now()-180*60000).toISOString();s.integrationProviderHealth["o:toast"].lastEventAt=s.integrationCanonicalEvents[0].receivedAt;return true;});
  const offline=await svc.evaluate("o",["*"],"l1");
  assert.equal(offline.decision,"LOCAL_FALLBACK");
  assert.equal(offline.providers[0].drift.feedOffline,true);
  assert.equal(offline.providers[0].automaticRecoveryAllowed,false);

  await db.mutate(s=>{s.integrationCanonicalEvents[0].receivedAt=now;s.integrationProviderHealth["o:toast"].lastEventAt=now;s.integrationProviderHealth["o:toast"].rejected=10;return true;});
  const quality=await svc.evaluate("o",["*"],"l1");
  assert.equal(quality.providers[0].drift.rejectionSpike,true);

  assert.equal(stable.policy.continuityMustBeContinuouslyProven,true);
  assert.equal(stable.policy.providerFailureCannotBlockLocalOperations,true);
  assert.equal(stable.policy.noAutomaticRecoveryToTrustedLive,true);
  assert.equal(stable.policy.explicitRevalidationAfterDrift,true);

  console.log(JSON.stringify({
    ok:true,version:"79.75.0",
    continuousTrustGate:true,
    delayedFeedDetection:true,
    offlineFeedDetection:true,
    rejectionDriftDetection:true,
    localFallback:true,
    explicitRevalidation:true,
    automaticRecoveryToTrustedLive:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
