"use strict";

class ProviderIntegrationContinuityService{
  constructor(database,readinessService,reconciliationService){
    this.database=database;
    this.readiness=readinessService;
    this.reconciliation=reconciliationService;
  }

  now(){return new Date().toISOString();}
  ageMinutes(value){
    if(!value)return null;
    const t=new Date(value).getTime();
    if(!Number.isFinite(t))return null;
    return Math.max(0,Math.round((Date.now()-t)/60000));
  }

  async evaluate(organizationId,allowedLocationIds=[],locationId){
    const db=await this.database.read();
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId&&allowed(x.id));
    if(!location){
      const error=new Error("Integration continuity location is not authorized.");
      error.statusCode=403;
      throw error;
    }

    const readiness=await this.readiness.evaluate(organizationId,allowedLocationIds,locationId);
    const reconciliation=await this.reconciliation.evaluate(organizationId,allowedLocationIds,locationId);
    const events=(db.integrationCanonicalEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const mappings=(db.integrationIdentityMappings||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const providerHealth=Object.values(db.integrationProviderHealth||{}).filter(x=>x.organizationId===organizationId);

    const providers=reconciliation.providers.map(reconciled=>{
      const ready=readiness.providers.find(x=>x.provider===reconciled.provider);
      const pe=events.filter(x=>x.provider===reconciled.provider);
      const latest=pe.slice().sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt))[0]||null;
      const health=providerHealth.find(x=>x.provider===reconciled.provider)||null;
      const mappingCount=mappings.filter(x=>x.provider===reconciled.provider).length;
      const age=this.ageMinutes(latest?.receivedAt||health?.lastEventAt);
      const accepted=Number(health?.accepted||pe.length||0);
      const rejected=Number(health?.rejected||0);
      const duplicates=Number(health?.duplicates||0);
      const total=Math.max(1,accepted+rejected+duplicates);
      const rejectRate=rejected/total;
      const duplicateRate=duplicates/total;

      const drift={
        mappingLost:Boolean(ready?.checks?.eventsFlowing)&&mappingCount===0,
        feedDelayed:age!==null&&age>30,
        feedOffline:age===null||age>120,
        healthDegraded:Boolean(health&&health.status&&health.status!=="healthy"),
        rejectionSpike:rejectRate>=0.05,
        duplicateSpike:duplicateRate>=0.10,
        reconciliationLost:ready?.decision==="READY"&&!reconciled.reconciled
      };

      const active=Object.entries(drift).filter(([,v])=>v).map(([k])=>k);
      const severity=drift.feedOffline||drift.mappingLost?"CRITICAL":
        drift.feedDelayed||drift.healthDegraded||drift.reconciliationLost?"DEGRADED":
        active.length?"WATCH":"STABLE";

      const fallback=severity==="STABLE"&&reconciled.reconciled?"TRUSTED_LIVE":
        severity==="WATCH"?"LIVE_WITH_CAUTION":
        severity==="DEGRADED"?"DEGRADED_LOCAL_FALLBACK":
        "LOCAL_FALLBACK";

      const recoveryChecks={
        mappingPresent:mappingCount>0,
        freshWithin30Minutes:age!==null&&age<=30,
        providerHealthy:!health||!health.status||health.status==="healthy",
        rejectRateBelow5Percent:rejectRate<0.05,
        duplicateRateBelow10Percent:duplicateRate<0.10,
        reconciliationClean:reconciled.reconciled
      };
      const recoveryReady=Object.values(recoveryChecks).every(Boolean);

      return {
        provider:reconciled.provider,
        continuity:severity,
        fallback,
        lastEventAt:latest?.receivedAt||health?.lastEventAt||null,
        lastEventAgeMinutes:age,
        mappingCount,
        rates:{
          rejection:Number((rejectRate*100).toFixed(2)),
          duplicate:Number((duplicateRate*100).toFixed(2))
        },
        drift,
        activeDrift:active,
        recoveryChecks,
        recoveryReady,
        automaticRecoveryAllowed:false,
        requiresExplicitRevalidation:severity!=="STABLE",
        dataConfidence:reconciled.confidence
      };
    });

    const connected=providers.filter(x=>x.lastEventAt||x.mappingCount);
    const critical=providers.filter(x=>x.continuity==="CRITICAL");
    const degraded=providers.filter(x=>x.continuity==="DEGRADED");
    const stable=providers.filter(x=>x.continuity==="STABLE"&&x.fallback==="TRUSTED_LIVE");

    const decision=critical.length?"LOCAL_FALLBACK":
      degraded.length?"DEGRADED":
      stable.length?"CONTINUOUS":
      connected.length?"WATCH":"LOCAL_ONLY";

    return {
      version:"79.75.0",
      generatedAt:this.now(),
      organizationId,
      location:{id:location.id,name:location.name},
      decision,
      trustedContinuousProviders:stable.map(x=>x.provider),
      degradedProviders:degraded.map(x=>x.provider),
      criticalProviders:critical.map(x=>x.provider),
      providers,
      policy:{
        continuityMustBeContinuouslyProven:true,
        staleTrustedDataMustDegrade:true,
        providerFailureCannotBlockLocalOperations:true,
        localFallbackRequired:true,
        noAutomaticRecoveryToTrustedLive:true,
        explicitRevalidationAfterDrift:true,
        mappingDriftIsCritical:true,
        offlineAfterMinutes:120,
        delayedAfterMinutes:30,
        rejectionSpikePercent:5,
        duplicateSpikePercent:10
      }
    };
  }
}
module.exports=ProviderIntegrationContinuityService;
