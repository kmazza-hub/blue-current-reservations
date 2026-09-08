"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const { createPersistence }=require(path.join(root,"server/persistence/persistenceFactory"));
const PersistenceMigrationReadinessService=require(path.join(root,"server/services/persistenceMigrationReadinessService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 71, `Expected V71 or later, found ${pkg.version}`);

  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const plan=JSON.parse(fs.readFileSync(path.join(root,"config/persistence/V71.0-managed-transactional-migration.json"),"utf8"));

  assert(server.includes('createPersistence({'));
  assert(!server.includes('new DatabaseService(DB_PATH)'));
  assert(server.includes("PersistenceMigrationReadinessService"));
  assert(server.includes("Persistence: ${database.driver} (${database.topology})"));
  assert(router.includes("/api/system/persistence-readiness"));
  assert(/V\d+(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));
  assert.equal(plan.principles.noAutomaticCutover,true);
  assert.equal(plan.principles.noBusinessServiceRewriteRequired,true);

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v71-"));
  const dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({
    accounts:[{id:"a1",balance:10}],
    ledger:[],
    settings:{mode:"test"}
  },null,2));

  const persistence=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  assert.equal(persistence.driver,"json");
  assert.equal(persistence.topology,"single-node-durable-json");
  assert.equal(persistence.capabilities.transactions,true);
  assert.equal(persistence.capabilities.atomicMultiCollectionMutation,true);
  assert.equal(persistence.capabilities.concurrentMultiNodeWriters,false);

  // Existing CRUD contract remains available to all current services.
  assert.equal((await persistence.get("accounts","a1")).balance,10);
  await persistence.create("ledger",{id:"l0",amount:1});
  assert.equal((await persistence.list("ledger")).length,1);

  // Atomic multi-collection commit through the new unit-of-work API.
  const committed=await persistence.transaction(async tx=>{
    const account=tx.get("accounts","a1");
    tx.update("accounts","a1",{balance:account.balance-4});
    tx.create("ledger",{id:"l1",accountId:"a1",amount:-4});
    return {ok:true,transactionId:tx.id};
  },{purpose:"atomic-test"});
  assert.equal(committed.ok,true);

  let state=await persistence.read();
  assert.equal(state.accounts[0].balance,6);
  assert.equal(state.ledger.some(item=>item.id==="l1"),true);

  // A thrown transaction must persist nothing from that unit of work.
  await assert.rejects(
    ()=>persistence.transaction(async tx=>{
      tx.update("accounts","a1",{balance:999});
      tx.create("ledger",{id:"should-not-exist",amount:999});
      throw new Error("simulated rollback");
    }),
    /simulated rollback/
  );

  state=await persistence.read();
  assert.equal(state.accounts[0].balance,6);
  assert.equal(state.ledger.some(item=>item.id==="should-not-exist"),false);

  const diagnostics=persistence.diagnostics();
  assert.equal(diagnostics.gateway.transactions.started,2);
  assert.equal(diagnostics.gateway.transactions.committed,1);
  assert.equal(diagnostics.gateway.transactions.rolledBack,1);

  // Runtime schema catalog and migration strategy.
  const readinessService=new PersistenceMigrationReadinessService(persistence);
  const readiness=await readinessService.snapshot();
  assert.equal(readiness.activeDriver,"json");
  assert.equal(readiness.adapterContract.transaction,true);
  assert.equal(readiness.migrationReady,true);
  assert.equal(readiness.migrationTarget.requiresBusinessServiceRewrite,false);
  assert.equal(readiness.migrationTarget.requiresDualWriteCutover,true);
  assert(readiness.collections.catalog.some(item=>item.name==="accounts"));
  assert(readiness.collections.catalog.every(item=>item.shapeFingerprint));

  // Unknown drivers fail clearly rather than silently falling back to JSON.
  assert.throws(
    ()=>createPersistence({driver:"postgres",databasePath:dbPath}),
    error=>error.code==="PERSISTENCE_DRIVER_NOT_INSTALLED" && error.driver==="postgres"
  );

  console.log(JSON.stringify({
    ok:true,
    version:"71.0.0",
    productionServerUsesPersistenceGateway:true,
    adapterContract:true,
    jsonAdapter:true,
    existingCrudCompatibility:true,
    atomicMultiCollectionTransaction:true,
    rollbackOnTransactionFailure:true,
    transactionDiagnostics:true,
    runtimeSchemaCatalog:true,
    schemaFingerprints:true,
    managedDatabaseMigrationPlan:true,
    unknownDriverFailsClosed:true,
    noBusinessServiceRewriteForAdapterSwap:true,
    noAutomaticCutover:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
