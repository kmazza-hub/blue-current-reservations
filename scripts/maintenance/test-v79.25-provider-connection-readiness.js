"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const Readiness=require(path.join(root,"server/services/providerConnectionReadinessService"));

(async()=>{
  assert.equal(pkg.version,"79.25.0");

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const truth=fs.readFileSync(path.join(root,"server/services/commandDataSourceTruthService.js"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");

  assert(router.includes("/api/integrations/provider-readiness"));
  assert(server.includes("ProviderConnectionReadinessService"));
  assert(truth.includes("providerReadiness"));
  assert(shell.includes("Pilot-ready source"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7925-"));
  const dbPath=path.join(dir,"db.json");
  const now=new Date().toISOString();

  const events=["reservations","service","kitchen","sales"].map((domain,index)=>({
    id:`e${index}`,
    organizationId:"o",
    locationId:"l1",
    provider:"toast",
    domain,
    receivedAt:now
  }));

  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"o"}],
    locations:[{id:"l1",organizationId:"o",name:"Pilot"}],
    integrationCanonicalEvents:events,
    integrationIdentityMappings:[
      {organizationId:"o",provider:"toast",externalLocationId:"toast-l1",locationId:"l1"}
    ],
    integrationProviderHealth:{
      "o:toast":{organizationId:"o",provider:"toast",status:"healthy",lastEventAt:now}
    },
    integrationQuarantine:[]
  },null,2));

  const db=createPersistence({
    driver:"json",
    databasePath:dbPath,
    options:{logger:{warn(){},error(){}}}
  });

  let certified=false;
  const integrations={
    health:async()=>({
      providers:[
        {
          id:"toast",
          health:{status:"healthy",lastEventAt:now},
          mappedLocations:1,
          canonicalEvents:4,
          openQuarantine:0,
          liveCertified:certified
        },
        {
          id:"square",
          health:null,
          mappedLocations:0,
          canonicalEvents:0,
          openQuarantine:0,
          liveCertified:false
        }
      ]
    })
  };

  const svc=new Readiness(db,integrations);

  const hold=await svc.evaluate("o",["*"],"l1");
  const toastHold=hold.providers.find(x=>x.provider==="toast");
  assert.equal(hold.decision,"HOLD");
  assert.equal(toastHold.score,83);
  assert.equal(toastHold.checks.locationMapped,true);
  assert.equal(toastHold.checks.eventsFlowing,true);
  assert.equal(toastHold.checks.freshWithin30Minutes,true);
  assert.equal(toastHold.checks.noOpenQuarantine,true);
  assert.equal(toastHold.checks.requiredDomainCoverage,true);
  assert.equal(toastHold.checks.liveCertified,false);
  assert(toastHold.blockers.includes("Live provider certification not complete"));

  certified=true;
  const ready=await svc.evaluate("o",["*"],"l1");
  const toastReady=ready.providers.find(x=>x.provider==="toast");
  assert.equal(ready.decision,"READY");
  assert.equal(toastReady.decision,"READY");
  assert.equal(toastReady.score,100);
  assert.equal(ready.readyProviders[0],"toast");

  assert.equal(ready.policy.locationMappingRequired,true);
  assert.equal(ready.policy.canonicalEventFlowRequired,true);
  assert.equal(ready.policy.freshnessWindowMinutes,30);
  assert.equal(ready.policy.zeroOpenQuarantineRequired,true);
  assert.equal(ready.policy.requiredDomainCoverageRequired,true);
  assert.equal(ready.policy.explicitLiveCertificationRequired,true);
  assert.equal(ready.policy.adapterPresenceAloneIsNotReadiness,true);
  assert.equal(ready.policy.noAutomaticProviderAuthority,true);

  console.log(JSON.stringify({
    ok:true,
    version:"79.25.0",
    locationMappingGate:true,
    canonicalFlowGate:true,
    freshnessGate:true,
    quarantineGate:true,
    requiredDomainCoverage:true,
    explicitCertificationGate:true,
    adapterPresenceInsufficient:true,
    holdBeforeCertification:true,
    readyAfterCertification:true,
    automaticProviderAuthority:false
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
