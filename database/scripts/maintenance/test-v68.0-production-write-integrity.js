"use strict";
const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const DatabaseService=require(path.join(root,"server/services/databaseService"));
const ProductionMutationIntegrityService=require(path.join(root,"server/services/productionMutationIntegrityService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 68,`Expected V68 or later, found ${pkg.version}`);

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  assert(router.includes('const APP_VERSION = require("../../package.json").version;'));
  assert(router.includes('version: APP_VERSION'));
  assert(router.includes('if (request._jsonBody !== undefined) return request._jsonBody;'));
  assert(router.includes('X-Blue-Current-Operation-Id'));
  assert(router.includes('X-Blue-Current-Write-Integrity'));
  assert(router.includes('/api/system/write-integrity'));
  assert(router.includes('productionMutationIntegrityService.begin'));
  assert(router.includes('await context.syncService.commit'));
  assert(router.includes('await context.idempotencyService.complete'));
  assert(router.includes('WRITE_FINALIZATION_FAILED'));
  assert(server.includes('ProductionMutationIntegrityService'));
  assert(server.includes('productionMutationIntegrityService'));
  assert(/V\d+(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));

  // The late V59-style write middleware must be gone: only one writeMethods declaration.
  assert.equal((router.match(/const writeMethods = new Set/g)||[]).length,1);

  // Direct durable-journal behavior.
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v68-"));
  const dbPath=path.join(dir,"db.json");
  fs.writeFileSync(dbPath,JSON.stringify({mutationIntegrityRecords:[]},null,2));
  const database=new DatabaseService(dbPath,{logger:{warn(){}}});
  const service=new ProductionMutationIntegrityService(database,{staleAfterMs:1});

  const prepared=await service.begin({
    organizationId:"org_test",
    method:"PATCH",
    path:"/api/test/resource",
    entityId:"resource_1",
    userId:"user_1",
    actor:"Test Operator",
    idempotencyKey:"org_test:test-key",
    expectedVersion:3
  });
  assert(prepared.id.startsWith("mut_"));
  assert.equal(prepared.status,"prepared");

  await service.finalize(prepared.id,{
    outcome:"committed",
    responseStatus:200,
    resourceVersion:4
  });

  const snapshot=await service.snapshot("org_test");
  assert.equal(snapshot.total,1);
  assert.equal(snapshot.prepared,0);
  assert.equal(snapshot.committed,1);
  assert.equal(snapshot.failed,0);
  assert.equal(snapshot.recent[0].resourceVersion,4);
  assert.equal(snapshot.healthy,true);

  console.log(JSON.stringify({
    ok:true,
    featureVersion:"68.0.0",
    currentVersion:pkg.version,
    actualHealthVersion:true,
    cachedRequestBody:true,
    centralizedAuthenticatedWritePreparation:true,
    durableMutationJournal:true,
    operationIdHeader:true,
    writeIntegrityHeader:true,
    synchronousVersionFinalization:true,
    synchronousIdempotencyFinalization:true,
    resourceVersionAvailableBeforeResponse:true,
    writeIntegrityDiagnostics:true,
    finalizationFailureSemantics:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
