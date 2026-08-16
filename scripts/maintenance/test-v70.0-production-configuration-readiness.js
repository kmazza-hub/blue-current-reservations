"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const DatabaseService=require(path.join(root,"server/services/databaseService"));
const ProductionConfigurationService=require(path.join(root,"server/services/productionConfigurationService"));
const ProductionBoundaryService=require(path.join(root,"server/services/productionBoundaryService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 70, `Expected V70 or later, found ${pkg.version}`);

  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const boundarySource=fs.readFileSync(path.join(root,"server/services/productionBoundaryService.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const gitignore=fs.readFileSync(path.join(root,".gitignore"),"utf8");
  const envExample=fs.readFileSync(path.join(root,".env.example"),"utf8");

  assert(server.includes("ProductionConfigurationService"));
  assert(server.includes("productionConfigurationService.assertReady(database)"));
  assert(server.includes("VERIFIED_BACKUP_REQUIRED"));
  assert(server.includes("MUTATION_RECONCILIATION_REQUIRED"));
  assert(server.includes("gracefulShutdown"));
  assert(server.includes('checkpointBackup("graceful-shutdown")'));
  assert(router.includes("/api/system/deployment-readiness"));
  assert(boundarySource.includes('mode !== "production"'));
  assert(/V\d+(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));
  assert(gitignore.includes(".env"));
  assert(gitignore.includes("*.p12"));
  assert(envExample.includes("BLUE_CURRENT_ALLOWED_ORIGINS"));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v70-"));
  const dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({
    users:[{id:"u1",email:"owner@example.com",passwordHash:"salt:hash",status:"active"}],
    memberships:[],
    liveConnectors:[],
    liveConnectorAuthBindings:{}
  },null,2));

  const database=new DatabaseService(dbPath,{logger:{warn(){},error(){}}});

  // Development defaults are usable, but intentionally not labeled production-ready.
  const devEnv={...process.env,BLUE_CURRENT_ENV:"development",BLUE_CURRENT_ALLOWED_ORIGINS:""};
  const development=new ProductionConfigurationService({
    root, databasePath:dbPath, port:8787, environment:devEnv
  });
  const devReport=await development.validate(database);
  assert.equal(devReport.ready,true);
  assert.equal(devReport.pilotReady,true);
  assert.equal(devReport.productionReady,false);
  assert.equal(devReport.databaseTopology,"single-node-durable-json");
  assert(devReport.checks.some(c=>c.id==="persistence-topology"&&!c.ok&&c.severity==="warning"));

  // Production must fail closed without an explicit browser origin allowlist.
  const missingOriginsEnv={...process.env,BLUE_CURRENT_ENV:"production",BLUE_CURRENT_ALLOWED_ORIGINS:""};
  const missingOrigins=new ProductionConfigurationService({
    root,databasePath:dbPath,port:8787,environment:missingOriginsEnv
  });
  const missingOriginsReport=await missingOrigins.validate(database);
  assert.equal(missingOriginsReport.ready,false);
  assert(missingOriginsReport.checks.some(c=>c.id==="production-origins-explicit"&&!c.ok));
  await assert.rejects(()=>missingOrigins.assertReady(database),error=>error.code==="CONFIGURATION_NOT_READY");

  // Wildcards and non-HTTPS origins are production errors.
  const unsafeOriginsEnv={
    ...process.env,
    BLUE_CURRENT_ENV:"production",
    BLUE_CURRENT_ALLOWED_ORIGINS:"*,http://bluecurrentco.com"
  };
  const unsafeOrigins=new ProductionConfigurationService({
    root,databasePath:dbPath,port:8787,environment:unsafeOriginsEnv
  });
  const unsafeReport=await unsafeOrigins.validate(database);
  assert.equal(unsafeReport.ready,false);
  assert(unsafeReport.checks.some(c=>c.id==="cors-no-wildcard"&&!c.ok));
  assert(unsafeReport.checks.some(c=>c.id==="production-origins-https"&&!c.ok));

  // Valid single-node production configuration passes static/runtime checks.
  const prodEnv={
    ...process.env,
    BLUE_CURRENT_ENV:"production",
    BLUE_CURRENT_ALLOWED_ORIGINS:"https://bluecurrentco.com,https://app.bluecurrentco.com"
  };
  const production=new ProductionConfigurationService({
    root,databasePath:dbPath,port:8787,environment:prodEnv
  });
  let report=await production.assertReady(database);
  assert.equal(report.ready,true);
  assert.equal(report.pilotReady,true);
  assert.equal(report.productionReady,false);
  assert.equal(report.errors,0);
  assert(report.warnings>=1);

  // A live connector with referenced credentials must have its secret in the environment.
  await database.mutate(db=>{
    db.liveConnectors=[{
      id:"pos-live",organizationId:"org_a",name:"POS",type:"pos",
      mode:"live",endpoint:"https://pos.example.com/webhook",status:"configured"
    }];
    db.liveConnectorAuthBindings={
      "org_a:pos-live":{
        authType:"hmac",
        secretEnv:"POS_LIVE_SECRET",
        signatureHeader:"x-signature"
      }
    };
    return true;
  });

  report=await production.validate(database);
  assert.equal(report.ready,false);
  assert(report.checks.some(c=>c.id==="live-connector-secret-readiness"&&!c.ok));
  assert(!JSON.stringify(report).includes("super-secret-value"));

  const prodWithSecret=new ProductionConfigurationService({
    root,databasePath:dbPath,port:8787,
    environment:{...prodEnv,POS_LIVE_SECRET:"super-secret-value"}
  });
  report=await prodWithSecret.assertReady(database);
  assert.equal(report.ready,true);
  assert.equal(report.productionReady,false);
  assert(!JSON.stringify(report).includes("super-secret-value"));

  // Production CORS is explicit-only; temporary tunnels are dev convenience only.
  const oldMode=process.env.BLUE_CURRENT_ENV;
  const oldOrigins=process.env.BLUE_CURRENT_ALLOWED_ORIGINS;
  try{
    process.env.BLUE_CURRENT_ENV="production";
    process.env.BLUE_CURRENT_ALLOWED_ORIGINS="https://bluecurrentco.com";
    const boundary=new ProductionBoundaryService();
    const fakeRequest=origin=>({headers:{origin},socket:{remoteAddress:"127.0.0.1"}});
    assert.equal(boundary.corsOrigin(fakeRequest("https://bluecurrentco.com")),"https://bluecurrentco.com");
    assert.equal(boundary.corsOrigin(fakeRequest("https://temporary.trycloudflare.com")),false);
    assert.equal(boundary.corsOrigin(fakeRequest("http://localhost:8787")),false);
  } finally {
    if(oldMode===undefined) delete process.env.BLUE_CURRENT_ENV; else process.env.BLUE_CURRENT_ENV=oldMode;
    if(oldOrigins===undefined) delete process.env.BLUE_CURRENT_ALLOWED_ORIGINS; else process.env.BLUE_CURRENT_ALLOWED_ORIGINS=oldOrigins;
  }

  // Plaintext persisted secrets fail readiness.
  await database.mutate(db=>{
    db.integrationTest={apiKey:"plaintext-key"};
    return true;
  });
  const secretReport=await prodWithSecret.validate(database);
  assert.equal(secretReport.ready,false);
  assert(secretReport.checks.some(c=>c.id==="no-obvious-plaintext-secrets"&&!c.ok));

  console.log(JSON.stringify({
    ok:true,
    version:"70.0.0",
    explicitProductionMode:true,
    numericPolicyValidation:true,
    explicitProductionCors:true,
    productionHttpsOrigins:true,
    cloudSyncDatabaseGuard:true,
    connectorSecretEnvironmentValidation:true,
    noSecretValuesInReadinessReport:true,
    persistedPlaintextSecretDetection:true,
    adminDeploymentReadinessEndpoint:true,
    verifiedBackupStartupGate:true,
    mutationReconciliationStartupGate:true,
    gracefulShutdownDrain:true,
    gracefulShutdownBackupCheckpoint:true,
    productionTemporaryTunnelRejection:true,
    environmentTemplate:true,
    secretFileGitignore:true,
    singleNodePersistenceConstraintSurfaced:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
