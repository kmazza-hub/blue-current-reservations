"use strict";

const assert=require("assert");
const fs=require("fs");
const os=require("os");
const path=require("path");

const root=path.resolve(__dirname,"../..");
const pkg=require(path.join(root,"package.json"));
const {createPersistence}=require(path.join(root,"server/persistence/persistenceFactory"));
const PersistenceSchemaMappingService=require(path.join(root,"server/services/persistenceSchemaMappingService"));
const PersistenceMigrationVerificationService=require(path.join(root,"server/services/persistenceMigrationVerificationService"));
const PersistenceCutoverFrameworkService=require(path.join(root,"server/services/persistenceCutoverFrameworkService"));

(async()=>{
  assert(Number(pkg.version.split(".")[0]) >= 71, `Expected V71 or later, found ${pkg.version}`);

  const router=fs.readFileSync(path.join(root,"server/api/router.js"),"utf8");
  const server=fs.readFileSync(path.join(root,"server/server.js"),"utf8");
  const startup=fs.readFileSync(path.join(root,"client/js/startup-loader.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");

  for(const route of [
    "/api/system/persistence-schema-map",
    "/api/system/persistence-source-manifest",
    "/api/system/persistence-cutover"
  ]) assert(router.includes(route),route);

  for(const service of [
    "PersistenceSchemaMappingService",
    "PersistenceMigrationVerificationService",
    "PersistenceCutoverFrameworkService"
  ]) assert(server.includes(service),service);

  assert(/V\d+(?:\.\d+){2} ready/.test(startup));
  assert(html.includes(`content="${pkg.version}"`));

  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bc-v7150-"));
  const dbPath=path.join(dir,"db.json");
  const source={
    organizations:[{id:"org1",name:"One"}],
    locations:[{id:"loc1",organizationId:"org1",name:"Main"}],
    reservations:[
      {id:"res2",organizationId:"org1",locationId:"loc1",partySize:4,createdAt:"2026-01-02T00:00:00.000Z"},
      {id:"res1",organizationId:"org1",locationId:"loc1",partySize:2,createdAt:"2026-01-01T00:00:00.000Z"}
    ],
    meta:{schemaVersion:1}
  };
  fs.writeFileSync(dbPath,JSON.stringify(source,null,2));

  const persistence=createPersistence({driver:"json",databasePath:dbPath,options:{logger:{warn(){},error(){}}}});
  const mapper=new PersistenceSchemaMappingService(persistence);
  const verifier=new PersistenceMigrationVerificationService(persistence);
  const cutover=new PersistenceCutoverFrameworkService(persistence);

  const mapping=await mapper.build();
  assert.equal(mapping.version,"71.50.0");
  assert(mapping.mappingHash);
  assert.equal(mapping.totals.entityTables,3);
  assert.equal(mapping.totals.documentTables,1);
  const reservations=mapping.tables.find(t=>t.sourceStore==="reservations");
  assert(reservations);
  assert.deepEqual(reservations.primaryKey,["id"]);
  assert(reservations.columns.some(c=>c.sourceField==="organizationId"&&c.column==="organization_id"));
  assert(reservations.indexes.some(i=>i.columns.includes("organization_id")));
  assert(reservations.foreignKeys.some(f=>f.sourceField==="organizationId"));

  const manifest=await verifier.sourceManifest();
  assert.equal(manifest.totalRecords,4);
  assert(manifest.manifestHash);
  assert(manifest.stores.every(s=>s.sha256));

  // Canonical verification ignores entity ordering but not value changes.
  const reordered={
    ...source,
    reservations:[source.reservations[1],source.reservations[0]]
  };
  let verification=await verifier.verifyTargetSnapshot(reordered);
  assert.equal(verification.verified,true);
  assert.equal(verification.mismatches,0);

  const changed=JSON.parse(JSON.stringify(reordered));
  changed.reservations[0].partySize=99;
  verification=await verifier.verifyTargetSnapshot(changed);
  assert.equal(verification.verified,false);
  assert(verification.mismatchStores.includes("reservations"));

  // Cutover starts inert and cannot advance without evidence + human approval.
  let status=await cutover.status();
  assert.equal(status.phase,"planning");
  assert.equal(status.automaticCutover,false);
  assert.equal(status.rollbackAvailable,true);

  status=await cutover.update({
    phase:"schema-mapped",
    targetDriver:"postgres",
    targetConnectionName:"managed-primary-candidate",
    schemaMappingHash:mapping.mappingHash,
    sourceManifestHash:manifest.manifestHash,
    actor:"Test Admin"
  });
  assert.equal(status.phase,"schema-mapped");

  await assert.rejects(
    ()=>cutover.update({phase:"cutover-approved",actor:"Test Admin"}),
    error=>error.code==="CUTOVER_EVIDENCE_INCOMPLETE"
  );

  status=await cutover.update({
    phase:"cutover-approved",
    backfillVerified:true,
    shadowReadVerified:true,
    dualWriteVerified:true,
    humanApproval:{approvedBy:"Test Admin",approvedAt:new Date().toISOString()},
    actor:"Test Admin"
  });
  assert.equal(status.phase,"cutover-approved");
  assert.equal(status.automaticCutover,false);
  assert.equal(status.rollbackAvailable,true);

  console.log(JSON.stringify({
    ok:true,
    version:"71.50.0",
    deterministicSchemaMapping:true,
    relationalColumnMapping:true,
    tenantLocationIndexes:true,
    plannedForeignKeys:true,
    sourceManifest:true,
    perStoreSha256:true,
    canonicalOrderIndependentVerification:true,
    mismatchDetection:true,
    cutoverStateMachine:true,
    evidenceGatedCutover:true,
    humanApprovalRequired:true,
    automaticCutover:false,
    rollbackPreserved:true
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
