"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Universal=require(path.join(root,"server/services/universalHospitalityIntegrationService"));
const {validateCanonicalEvent}=require(path.join(root,"server/integrations/hospitalityIntegrationContract"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 75);

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  for(const route of [
    "/api/system/integration-contract",
    "/api/system/integration-health",
    "/api/system/integration-mappings",
    "/api/system/integration-preview",
    "/api/system/integration-ingest"
  ]) assert(router.includes(route),route);

  assert(server.includes("UniversalHospitalityIntegrationService"));
  assert(/V\d+(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v75-"));
  const dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"org1",name:"Pilot Group"}],
    locations:[{id:"loc1",organizationId:"org1",name:"Pilot Restaurant"}],
    auditLogs:[]
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const audits=[];
  const audit={record:async event=>{audits.push(event);return event;}};
  const realtime={events:[],publish(type,payload){this.events.push({type,payload});}};
  const integrations=new Universal(db,audit,realtime);

  const providers=integrations.providers();
  assert.deepEqual(providers.map(x=>x.id).sort(),["clover","square","toast"]);
  assert(providers.every(x=>x.status==="contract-ready"));
  assert(providers.every(x=>x.capabilities.length>0));

  // Contract validation.
  validateCanonicalEvent({type:"order.closed",payload:{locationId:"loc1",orderId:"o1",total:25}});
  assert.throws(
    ()=>validateCanonicalEvent({type:"order.closed",payload:{locationId:"loc1",orderId:"o1"}}),
    /Missing required fields/
  );

  // Provider normalization is separate from live connectivity.
  const toastPreview=await integrations.preview("toast",{
    eventType:"check.closed",
    id:"evt1",
    timestamp:"2026-08-16T12:00:00.000Z",
    payload:{restaurantGuid:"toast-location-1",guid:"order-1",total:42.50,guestCount:3}
  });
  assert.equal(toastPreview.canonical.type,"order.closed");
  assert.equal(toastPreview.canonical.payload.locationId,"toast-location-1");
  assert.equal(toastPreview.liveConnectionPerformed,false);

  // Identity mapping prevents provider IDs from being mistaken for Blue Current location IDs.
  const mapping=await integrations.saveMapping("org1","Admin",{
    provider:"toast",externalLocationId:"toast-location-1",locationId:"loc1"
  });
  assert.equal(mapping.locationId,"loc1");

  // Canonical ingestion maps location identity and records source provenance.
  const ingested=await integrations.ingest("org1","Admin","toast",{
    eventType:"check.closed",
    id:"evt1",
    timestamp:"2026-08-16T12:00:00.000Z",
    payload:{restaurantGuid:"toast-location-1",guid:"order-1",total:42.50,guestCount:3}
  });
  assert.equal(ingested.type,"order.closed");
  assert.equal(ingested.locationId,"loc1");
  assert.equal(ingested.payload.providerLocationId,"toast-location-1");
  assert.equal(ingested.payload.locationId,"loc1");
  assert.equal(ingested.authoritativeSource,"toast");
  assert.equal(ingested.blueCurrentAuthoritative,false);

  // Same provider event is replay-safe.
  const duplicate=await integrations.ingest("org1","Admin","toast",{
    eventType:"check.closed",
    id:"evt1",
    timestamp:"2026-08-16T12:00:00.000Z",
    payload:{restaurantGuid:"toast-location-1",guid:"order-1",total:42.50,guestCount:3}
  });
  assert.equal(duplicate.duplicate,true);
  assert.equal((await db.read()).integrationCanonicalEvents.length,1);

  // Unmapped location is quarantined rather than contaminating operational state.
  await assert.rejects(
    ()=>integrations.ingest("org1","Admin","toast",{
      eventType:"check.closed",id:"evt2",
      payload:{restaurantGuid:"unknown-location",guid:"order-2",total:10}
    }),
    /No Blue Current location mapping/
  );
  const state=await db.read();
  assert.equal(state.integrationQuarantine.length,1);

  const health=await integrations.health("org1");
  const toastHealth=health.providers.find(x=>x.id==="toast");
  assert.equal(health.identityMappings,1);
  assert.equal(health.canonicalEventCount,1);
  assert.equal(health.openQuarantine,1);
  assert.equal(toastHealth.health.accepted,1);
  assert.equal(toastHealth.health.duplicates,1);
  assert.equal(toastHealth.health.rejected,1);
  assert.equal(toastHealth.liveCertified,false);
  assert.equal(health.policy.noClaimOfLiveToastConnection,true);

  // Square and Clover normalize without changing the canonical contract.
  const square=await integrations.preview("square",{
    type:"payment.updated",id:"sq_evt",
    payload:{location_id:"sq1",id:"pay1",amount:12}
  });
  assert.equal(square.canonical.type,"payment.recorded");

  const clover=await integrations.preview("clover",{
    type:"order.closed",id:"cl_evt",
    payload:{merchantId:"cl1",id:"ord1",total:19}
  });
  assert.equal(clover.canonical.type,"order.closed");

  console.log(JSON.stringify({
    ok:true,
    version:"75.0.0",
    universalCanonicalContract:true,
    toastAdapterContract:true,
    squareAdapterContract:true,
    cloverAdapterContract:true,
    providerCapabilities:true,
    locationIdentityMapping:true,
    canonicalNormalization:true,
    providerProvenance:true,
    duplicateSuppression:true,
    invalidEventQuarantine:true,
    providerHealth:true,
    liveToastConnectionClaimed:false,
    providerDataAutomaticallyAuthoritative:false
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
