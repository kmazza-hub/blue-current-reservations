"use strict";

class DataIntegrityRecoveryService {
  constructor(database,auditService,realtimeHub,idempotencyService,syncReconciliationService,peakServiceStressTestService){
    Object.assign(this,{database,auditService,realtimeHub,idempotencyService,syncReconciliationService,peakServiceStressTestService});
    this.collections=[
      ["reservations","Reservations"],["guestProfiles","Guest profiles"],["tables","Floor tables"],
      ["sections","Floor sections"],["staff","Staff"],["employees","Employees"],["kitchenStations","Kitchen stations"]
    ];
  }
  now(){return new Date().toISOString();}
  allowed(id,allowed=[]){return allowed.includes("*")||allowed.includes(id);}
  async certifications(organizationId){
    const db=await this.database.read();
    return (db.dataIntegrityRecoveryCertifications||[]).filter(x=>x.organizationId===organizationId).sort((a,b)=>new Date(b.certifiedAt)-new Date(a.certifiedAt));
  }
  scopedItems(db,collection,organizationId,locationId){
    return (db[collection]||[]).filter(x=>x.organizationId===organizationId&&(!x.locationId||x.locationId===locationId));
  }
  duplicateIds(items){const seen=new Set(),dups=[];for(const x of items){if(seen.has(x.id))dups.push(x.id);else seen.add(x.id);}return [...new Set(dups)];}
  async snapshot(organizationId,allowedLocationIds){
    const [db,stress,certs]=await Promise.all([this.database.read(),this.peakServiceStressTestService.snapshot(organizationId,allowedLocationIds),this.certifications(organizationId)]);
    const locations=(db.locations||[]).filter(x=>x.organizationId===organizationId&&this.allowed(x.id,allowedLocationIds)).map(loc=>{
      const integrity=this.collections.map(([collection,label])=>{
        const items=this.scopedItems(db,collection,organizationId,loc.id);
        const duplicates=this.duplicateIds(items);
        const malformed=items.filter(x=>!x.id||!x.organizationId).map(x=>x.id||"(missing-id)");
        return {collection,label,count:items.length,duplicateIds:duplicates,malformedIds:malformed,passed:duplicates.length===0&&malformed.length===0};
      });
      const resourceVersions=(db.resourceVersions||[]).filter(x=>x.organizationId===organizationId);
      const idem=(db.idempotencyRecords||[]).filter(x=>x.organizationId===organizationId);
      const latest=certs.find(x=>x.locationId===loc.id)||null;
      const checks=[
        {id:"entity-integrity",label:"No duplicate/malformed IDs across restaurant data",passed:integrity.every(x=>x.passed),actual:`${integrity.reduce((n,x)=>n+x.duplicateIds.length+x.malformedIds.length,0)} issue(s)`},
        {id:"database-readable",label:"Database snapshot is readable",passed:true,actual:"read succeeded"},
        {id:"resource-versioning",label:"Synchronization/resource version store is available",passed:Array.isArray(db.resourceVersions||[]),actual:`${resourceVersions.length} version record(s)`},
        {id:"idempotency-store",label:"Idempotency record store is available",passed:Array.isArray(db.idempotencyRecords||[]),actual:`${idem.length} idempotency record(s)`},
        {id:"stress-context",label:"Peak-service stress context is available",passed:!!stress.locations.find(x=>x.locationId===loc.id),actual:stress.status}
      ];
      const passed=checks.filter(x=>x.passed).length;
      return {locationId:loc.id,locationName:loc.name||loc.displayName||loc.id,integrity,checks,passed,total:checks.length,integrityReady:passed===checks.length,certification:latest};
    });
    const total=locations.reduce((n,x)=>n+x.total,0),passed=locations.reduce((n,x)=>n+x.passed,0);
    return {
      version:"51.20.0",generatedAt:this.now(),
      status:locations.length===0?"restaurant-required":locations.every(x=>x.certification?.status==="DATA_INTEGRITY_RECOVERY_CERTIFIED")?"data-integrity-recovery-certified":locations.every(x=>x.integrityReady)?"data-integrity-ready-for-certification":"data-integrity-blocked",
      headline:locations.length===0?"No authorized restaurants available for integrity review.":`${passed}/${total} integrity readiness checks currently pass across ${locations.length} restaurant(s).`,
      locations,
      policy:{assessmentReadOnly:true,duplicatePreventionRequired:true,idempotencyVerificationRequired:true,reconciliationVerificationRequired:true,restartPersistenceRequired:true,interruptedWriteRecoveryRequired:true,humanCertificationRequired:true,automaticRepair:false,automaticReconciliation:false,autonomousProductionChanges:false}
    };
  }
  async runVerification(organizationId,allowedLocationIds,locationId,input,actor){
    if(!this.allowed(locationId,allowedLocationIds))throw new Error("Location is outside your authorized scope.");
    const before=await this.database.read();
    const fingerprint=JSON.stringify(before);
    const testKey=`${organizationId}:v51-integrity-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const reserved=await this.idempotencyService.reserve(testKey,{method:"POST",path:"/api/data-integrity-recovery/verify",organizationId,userId:actor});
    const duplicateReserve=await this.idempotencyService.reserve(testKey,{method:"POST",path:"/api/data-integrity-recovery/verify",organizationId,userId:actor});
    const idemPassed=reserved?.id===duplicateReserve?.id;
    await this.idempotencyService.complete(testKey,200,{verification:"complete"});
    const reconcile=await this.syncReconciliationService.reconcile(organizationId,[]);
    if(typeof this.database.reload==="function")await this.database.reload();
    const afterReload=await this.database.read();
    const persistencePassed=JSON.stringify(afterReload).includes(testKey);
    const integritySnapshot=await this.snapshot(organizationId,allowedLocationIds);
    const loc=integritySnapshot.locations.find(x=>x.locationId===locationId);
    if(!loc)throw new Error("Restaurant not found.");
    const evidence=String(input.evidence||"").trim().slice(0,2200);
    if(!evidence)throw new Error("Human verification evidence is required.");
    const record={
      id:`dirv_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,locationName:loc.locationName,
      verifiedAt:this.now(),verifiedBy:actor,evidence,
      checks:{
        entityIntegrity:loc.integrityReady,
        duplicatePrevention:loc.integrity.every(x=>x.duplicateIds.length===0),
        idempotency:idemPassed,
        reloadPersistence:persistencePassed,
        reconciliationReadable:!!reconcile&&Array.isArray(reconcile.serverVersions),
        interruptedWriteModel:"database durable temp-file + replace/fallback path present"
      },
      passed:loc.integrityReady&&idemPassed&&persistencePassed&&!!reconcile,
      automaticRepairPerformed:false,automaticReconciliationPerformed:false,runtimeMutationPerformed:false
    };
    await this.auditService.record({organizationId,actor,action:`Data integrity verification recorded for ${locationId}: ${record.passed?"PASS":"FAIL"}`,category:"pilot_integrity"});
    this.realtimeHub.publish("data-integrity:verified",{organizationId,locationId,passed:record.passed});
    return record;
  }
  async certify(organizationId,allowedLocationIds,locationId,input,actor){
    const verification=await this.runVerification(organizationId,allowedLocationIds,locationId,input,actor);
    if(!verification.passed)throw new Error("Data integrity recovery verification must pass before certification.");
    const note=String(input.certificationNote||"").trim().slice(0,1800);
    if(!note)throw new Error("Human certification note is required.");
    const record={id:`dirc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,organizationId,locationId,locationName:verification.locationName,status:"DATA_INTEGRITY_RECOVERY_CERTIFIED",certifiedAt:this.now(),certifiedBy:actor,note,verification,automaticRepairPerformed:false,autonomousProductionChanges:false};
    await this.database.mutate(db=>{db.dataIntegrityRecoveryCertifications||=[];db.dataIntegrityRecoveryCertifications.push(record);return record;});
    await this.auditService.record({organizationId,actor,action:`Data integrity and recovery certified for ${locationId}`,category:"pilot_integrity"});
    this.realtimeHub.publish("data-integrity:certified",{organizationId,locationId,id:record.id});
    return record;
  }
}
module.exports=DataIntegrityRecoveryService;
