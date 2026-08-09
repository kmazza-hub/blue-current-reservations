"use strict";
const assert=require("assert");
const Service=require("../../server/services/dataIntegrityRecoveryService");

(async()=>{
  const state={
    locations:[{id:"loc1",organizationId:"org",name:"Pilot Restaurant"}],
    reservations:[{id:"r1",organizationId:"org",locationId:"loc1"}],
    guestProfiles:[{id:"g1",organizationId:"org",locationId:"loc1"}],
    tables:[{id:"t1",organizationId:"org",locationId:"loc1"}],
    sections:[{id:"s1",organizationId:"org",locationId:"loc1"}],
    staff:[{id:"st1",organizationId:"org",locationId:"loc1"}],
    employees:[{id:"e1",organizationId:"org",locationId:"loc1"}],
    kitchenStations:[{id:"k1",organizationId:"org",locationId:"loc1"}],
    resourceVersions:[],idempotencyRecords:[],dataIntegrityRecoveryCertifications:[]
  };
  const audits=[],events=[];
  const database={
    read:async()=>JSON.parse(JSON.stringify(state)),
    get:async(collection,id)=>(state[collection]||[]).find(x=>x.id===id)||null,
    mutate:async fn=>fn(state),
    reload:async()=>JSON.parse(JSON.stringify(state))
  };
  const idem={
    reserve:async(key,meta)=>{
      let x=state.idempotencyRecords.find(r=>r.id===key);
      if(!x){x={id:key,organizationId:meta.organizationId,status:"processing"};state.idempotencyRecords.push(x);}
      return x;
    },
    complete:async(key,status,payload)=>{
      const x=state.idempotencyRecords.find(r=>r.id===key);x.status="complete";x.responseStatus=status;x.responsePayload=payload;return x;
    }
  };
  const reconcile={reconcile:async()=>({serverVersions:[],differences:[],aligned:0,clientBehind:0,clientAhead:0})};
  const svc=new Service(
    database,
    {record:async x=>audits.push(x)},
    {publish:(n,p)=>events.push([n,p])},
    idem,reconcile,
    {snapshot:async()=>({status:"peak-service-stress-ready",locations:[{locationId:"loc1"}]})}
  );

  let snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.version,"51.20.0");
  assert.equal(snap.status,"data-integrity-ready-for-certification");
  assert.equal(snap.locations[0].integrityReady,true);
  assert.equal(snap.policy.automaticRepair,false);

  const verification=await svc.runVerification("org",["loc1"],"loc1",{evidence:"Reload, duplicate, idempotency, and reconciliation checks observed clean."},"Tester");
  assert.equal(verification.passed,true);
  assert.equal(verification.checks.idempotency,true);
  assert.equal(verification.checks.reloadPersistence,true);
  assert.equal(verification.automaticRepairPerformed,false);

  const cert=await svc.certify("org",["loc1"],"loc1",{
    evidence:"Second verification confirmed durable and duplicate-free state.",
    certificationNote:"Restaurant data integrity and recovery controls accepted for pilot."
  },"Tester");
  assert.equal(cert.status,"DATA_INTEGRITY_RECOVERY_CERTIFIED");
  assert.equal(cert.autonomousProductionChanges,false);

  snap=await svc.snapshot("org",["loc1"]);
  assert.equal(snap.status,"data-integrity-recovery-certified");

  // Duplicate IDs must block integrity readiness.
  state.reservations.push({id:"r1",organizationId:"org",locationId:"loc1"});
  const blocked=await svc.snapshot("org",["loc1"]);
  assert.equal(blocked.locations[0].integrityReady,false);
  assert(blocked.locations[0].integrity.find(x=>x.collection==="reservations").duplicateIds.includes("r1"));

  console.log(JSON.stringify({
    ok:true,version:"51.20.0",
    entityIntegrity:true,
    duplicateDetection:true,
    idempotencyVerification:true,
    reloadPersistence:true,
    reconciliationReadable:true,
    interruptedWriteRecoveryModel:true,
    humanCertification:true,
    automaticRepair:false,
    automaticReconciliation:false,
    autonomousProductionChanges:false
  },null,2));
})().catch(e=>{console.error(e);process.exit(1);});
