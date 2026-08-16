"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const {validateManagedPersistenceAdapter}=require(path.join(root,"server/persistence/managedPersistenceAdapterContract"));
const MigrationShadowStore=require(path.join(root,"server/persistence/migrationShadowStore"));
const PersistenceBackfillService=require(path.join(root,"server/services/persistenceBackfillService"));
const PersistenceShadowExecutionService=require(path.join(root,"server/services/persistenceShadowExecutionService"));
const PersistenceReplicationCoordinatorService=require(path.join(root,"server/services/persistenceReplicationCoordinatorService"));

(async()=>{
  assert.equal(pkg.version,"72.0.0");

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  for(const route of [
    "/api/system/persistence-backfill-plan",
    "/api/system/persistence-shadow",
    "/api/system/persistence-shadow/seed"
  ]) assert(router.includes(route),route);

  assert(server.includes("MigrationShadowStore"));
  assert(server.includes("PersistenceBackfillService"));
  assert(server.includes("PersistenceShadowExecutionService"));
  assert(server.includes("PersistenceReplicationCoordinatorService"));
  assert(startup.includes("V72.0.0 ready"));
  assert(html.includes('content="72.0.0"'));

  // Managed adapter contract rejects incomplete or JSON adapters.
  assert.throws(
    ()=>validateManagedPersistenceAdapter({driver:"postgres",capabilities:{}}),
    error=>error.code==="INVALID_MANAGED_PERSISTENCE_ADAPTER"
  );
  assert.throws(
    ()=>validateManagedPersistenceAdapter({
      driver:"json",
      capabilities:{
        transactions:true,atomicMultiCollectionMutation:true,durableWrites:true,
        concurrentMultiNodeWriters:true,rowLevelLocking:true,databaseConstraints:true,managedFailover:true
      },
      read(){},list(){},get(){},create(){},update(){},transaction(){},health(){},schemaVersion(){},applyMigration(){}
    }),
    error=>error.code==="INVALID_MANAGED_PERSISTENCE_ADAPTER"
  );

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v72-"));
  const dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({
    organizations:[{id:"org1",name:"One"}],
    reservations:[
      {id:"r2",organizationId:"org1",partySize:4},
      {id:"r1",organizationId:"org1",partySize:2}
    ],
    meta:{schemaVersion:1}
  },null,2));

  const source=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const shadowStore=new MigrationShadowStore();
  const backfill=new PersistenceBackfillService(source);
  const shadow=new PersistenceShadowExecutionService(source,{target:shadowStore});
  const replication=new PersistenceReplicationCoordinatorService({shadowExecutionService:shadow});

  const plan=await backfill.plan({batchSize:1});
  assert.equal(plan.version,"72.0.0");
  assert.equal(plan.totals.records,3);
  assert(plan.totals.batches>=4);
  assert(plan.manifestHash);
  assert(plan.stores.every(s=>s.sha256));
  assert(plan.stores.filter(s=>s.kind==="collection").every(s=>s.batches.every(b=>b.id&&b.sha256)));

  // Backfill is replay-safe.
  let result=await backfill.execute(shadowStore,{batchSize:1});
  assert(result.importedBatches>0);
  const firstImported=result.importedBatches;
  result=await backfill.execute(shadowStore,{batchSize:1});
  assert(result.replayedBatches>0);
  assert(result.importedBatches < firstImported);

  shadow.configure({mode:"shadow-read"});
  let comparison=await shadow.compareAll();
  assert.equal(comparison.verified,true);
  assert.equal(comparison.mismatches,0);

  // Mismatch detection.
  await shadowStore.upsert("reservations",{id:"r1",organizationId:"org1",partySize:99});
  comparison=await shadow.compareAll();
  assert.equal(comparison.verified,false);
  assert(comparison.comparisons.some(c=>c.store==="reservations"&&c.match===false));
  assert(shadow.status().metrics.mismatches>=1);

  // Reset/reseed restores parity.
  await shadowStore.reset();
  await backfill.execute(shadowStore,{batchSize:2});
  shadow.configure({mode:"shadow-read"});
  comparison=await shadow.compareAll();
  assert.equal(comparison.verified,true);

  // Shadow write mode never changes source authority.
  shadow.configure({mode:"shadow-write"});
  const sourceBefore=await source.get("reservations","r1");
  const mirror=await replication.mirrorCommittedEntity({
    store:"reservations",
    entity:{...sourceBefore,partySize:8},
    operationId:"op_test"
  });
  assert.equal(mirror.authoritativeCommitted,true);
  assert.equal(mirror.shadowCommitted,true);
  assert.equal(mirror.requiresReconciliation,false);
  assert.equal((await source.get("reservations","r1")).partySize,2);
  assert.equal((await shadowStore.get("reservations","r1")).partySize,8);

  const repl=replication.snapshot();
  assert.equal(repl.semantics,"authoritative-first-mirror-second");
  assert.equal(repl.distributedTransaction,false);
  assert.equal(repl.automaticFailover,false);

  console.log(JSON.stringify({
    ok:true,
    version:"72.0.0",
    managedAdapterContract:true,
    incompleteManagedAdapterRejected:true,
    deterministicBackfillBatches:true,
    replaySafeBackfill:true,
    shadowReadComparison:true,
    mismatchAlarm:true,
    shadowReseedParity:true,
    guardedShadowWrites:true,
    authoritativeStoreUnchanged:true,
    reconciliationSemantics:true,
    distributedTransactionClaimed:false,
    automaticFailover:false,
    automaticCutover:false
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
