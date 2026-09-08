"use strict";

class CommandDataSourceTruthService{
  constructor(database,universalIntegrationService,providerConnectionReadinessService=null,providerDataReconciliationService=null,providerIntegrationContinuityService=null){
    this.database=database;
    this.integrations=universalIntegrationService;
    this.providerReadiness=providerConnectionReadinessService;
    this.providerReconciliation=providerDataReconciliationService;
    this.providerContinuity=providerIntegrationContinuityService;
  }
  now(){return new Date().toISOString();}
  ageMinutes(timestamp){
    if(!timestamp)return null;
    const value=new Date(timestamp).getTime();
    if(!Number.isFinite(value))return null;
    return Math.max(0,Math.round((Date.now()-value)/60000));
  }
  freshness(age){
    if(age===null)return "unknown";
    if(age<=5)return "live";
    if(age<=30)return "fresh";
    if(age<=120)return "stale";
    return "historical";
  }
  async snapshot(organizationId,allowedLocationIds=[],locationId){
    const db=await this.database.read();
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId&&allowed(x.id));
    if(!location){
      const error=new Error("Source truth location is not authorized.");
      error.statusCode=403;
      throw error;
    }

    const events=(db.integrationCanonicalEvents||[]).filter(x=>
      x.organizationId===organizationId && (!x.locationId||x.locationId===locationId)
    );
    const integrationHealth=await this.integrations.health(organizationId);
    const domains=["reservations","service","kitchen","labor","inventory","sales","guests"];
    const sourceDomains={};

    for(const domain of domains){
      const matching=events
        .filter(x=>String(x.domain||"").toLowerCase()===domain)
        .sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt));
      const latest=matching[0]||null;
      const age=this.ageMinutes(latest?.receivedAt);
      const providers=[...new Set(matching.map(x=>x.provider).filter(Boolean))];

      sourceDomains[domain]={
        domain,
        providerBacked:providers.length>0,
        providers,
        lastReceivedAt:latest?.receivedAt||null,
        ageMinutes:age,
        freshness:this.freshness(age),
        canonicalEvents:matching.length,
        authoritative:false,
        safeForLiveDecision:age!==null&&age<=30
      };
    }

    const providers=(integrationHealth.providers||[]).map(p=>({
      id:p.id,
      status:p.health?.status||"not-connected",
      mappedLocations:p.mappedLocations||0,
      canonicalEvents:p.canonicalEvents||0,
      lastEventAt:p.health?.lastEventAt||null,
      lastEventAgeMinutes:this.ageMinutes(p.health?.lastEventAt),
      openQuarantine:p.openQuarantine||0,
      liveCertified:Boolean(p.liveCertified)
    }));

    const connected=providers.filter(x=>x.mappedLocations>0||x.canonicalEvents>0);
    const liveDecisionDomains=Object.values(sourceDomains).filter(x=>x.safeForLiveDecision).length;
    const status=liveDecisionDomains>=4
      ? "LIVE_READY"
      : connected.length
        ? "PARTIALLY_CONNECTED"
        : "LOCAL_ONLY";

    const providerReadiness=this.providerReadiness
      ? await this.providerReadiness.evaluate(organizationId,allowedLocationIds,locationId)
      : null;

    const providerReconciliation=this.providerReconciliation?await this.providerReconciliation.evaluate(organizationId,allowedLocationIds,locationId):null;

    const providerContinuity=this.providerContinuity
      ? await this.providerContinuity.evaluate(organizationId,allowedLocationIds,locationId)
      : null;

    return {
      version:"79.75.0",
      generatedAt:this.now(),
      organizationId,
      location:{id:location.id,name:location.name},
      status,
      domains:sourceDomains,
      providers,
      providerReadiness,
      providerReconciliation,
      providerContinuity,
      summary:{
        connectedProviders:connected.length,
        liveDecisionDomains,
        totalDomains:domains.length,
        quarantineItems:providers.reduce((sum,x)=>sum+x.openQuarantine,0)
      },
      policy:{
        freshnessRequiredForLiveClaims:true,
        providerDataNotAutomaticallyAuthoritative:true,
        liveCertificationRequired:true,
        staleDataCannotBePresentedAsLive:true,
        localSeedDataMustBeDisclosed:true,
        noClaimOfLiveToastConnectionWithoutEvidence:true,
        adapterPresenceAloneIsNotReadiness:true,
        providerReadinessMustBeExplicit:true,
        reconciliationRequiredForTrustedLive:true,
        providerReadinessDoesNotEqualTrustedLive:true,
        continuityRequiredToRemainTrusted:true,
        providerFailureMustDegradeToLocalFallback:true
      }
    };
  }
}

module.exports=CommandDataSourceTruthService;
