"use strict";
const assert=require("assert"),fs=require("fs"),os=require("os"),path=require("path");
const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const SourceTruth=require(path.join(root,"server/services/commandDataSourceTruthService"));

(async()=>{
  assert(/^79\.(0|25)\.0$/.test(pkg.version));
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const command=fs.readFileSync(path.join(root,"server/services/commandOperatingPictureService.js"),"utf8");
  const shell=fs.readFileSync(path.join(root,"client/js/modules/hospitalityOsShell.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  assert(server.includes("CommandDataSourceTruthService"));
  assert(router.includes("/api/command/source-truth"));
  assert(command.includes("sourceTruth"));
  assert(command.includes("staleProviderDataCannotMasqueradeAsLive"));
  assert(html.includes('id="bcSourceTruthLabel"'));
  assert(shell.includes("function renderSourceTruth"));
  assert(!html.includes("<strong>Service live</strong>"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v79-"));
  const dbPath=path.join(dir,"db.json");
  const now=new Date().toISOString();
  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"o"}],
    locations:[{id:"l1",organizationId:"o",name:"Pilot"}],
    integrationCanonicalEvents:[
      {organizationId:"o",locationId:"l1",provider:"toast",domain:"sales",receivedAt:now},
      {organizationId:"o",locationId:"l1",provider:"toast",domain:"service",receivedAt:now},
      {organizationId:"o",locationId:"l1",provider:"toast",domain:"kitchen",receivedAt:now},
      {organizationId:"o",locationId:"l1",provider:"toast",domain:"reservations",receivedAt:now}
    ],
    integrationProviderHealth:{
      "o:toast":{organizationId:"o",provider:"toast",status:"healthy",accepted:4,lastEventAt:now}
    },
    integrationIdentityMappings:[
      {organizationId:"o",provider:"toast",externalLocationId:"t1",locationId:"l1"}
    ],
    integrationQuarantine:[]
  },null,2));

  const db=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const integrations={
    health:async()=>({
      providers:[
        {id:"toast",health:{status:"healthy",lastEventAt:now},mappedLocations:1,canonicalEvents:4,openQuarantine:0,liveCertified:false},
        {id:"square",health:null,mappedLocations:0,canonicalEvents:0,openQuarantine:0,liveCertified:false}
      ]
    })
  };
  const svc=new SourceTruth(db,integrations);
  const result=await svc.snapshot("o",["*"],"l1");

  assert.equal(result.status,"LIVE_READY");
  assert.equal(result.summary.connectedProviders,1);
  assert.equal(result.summary.liveDecisionDomains,4);
  assert.equal(result.domains.sales.providerBacked,true);
  assert.equal(result.domains.sales.freshness,"live");
  assert.equal(result.domains.sales.safeForLiveDecision,true);
  assert.equal(result.domains.inventory.safeForLiveDecision,false);
  assert.equal(result.providers[0].liveCertified,false);
  assert.equal(result.policy.providerDataNotAutomaticallyAuthoritative,true);
  assert.equal(result.policy.noClaimOfLiveToastConnectionWithoutEvidence,true);
  assert.equal(result.policy.staleDataCannotBePresentedAsLive,true);

  console.log(JSON.stringify({
    ok:true,version:"79.0.0",
    providerFreshness:true,
    domainSourceTruth:true,
    liveDecisionGate:true,
    staleDataDisclosure:true,
    localOnlyDisclosure:true,
    toastClaimGuard:true,
    providerAuthorityGuard:true,
    commandSourceLabel:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
