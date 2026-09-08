"use strict";

class ProviderConnectionReadinessService{
  constructor(database,universalIntegrationService){
    this.database=database;
    this.integrations=universalIntegrationService;
  }

  now(){return new Date().toISOString();}
  ageMinutes(timestamp){
    if(!timestamp)return null;
    const value=new Date(timestamp).getTime();
    if(!Number.isFinite(value))return null;
    return Math.max(0,Math.round((Date.now()-value)/60000));
  }

  async evaluate(organizationId,allowedLocationIds=[],locationId){
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const db=await this.database.read();
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId&&allowed(x.id));
    if(!location){
      const error=new Error("Provider readiness location is not authorized.");
      error.statusCode=403;
      throw error;
    }

    const health=await this.integrations.health(organizationId);
    const mappings=(db.integrationIdentityMappings||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const events=(db.integrationCanonicalEvents||[]).filter(x=>x.organizationId===organizationId&&x.locationId===locationId);
    const quarantine=(db.integrationQuarantine||[]).filter(x=>x.organizationId===organizationId&&x.status==="open");

    const requiredDomains=["reservations","service","kitchen","sales"];
    const optionalDomains=["labor","inventory","guests"];

    const providers=(health.providers||[]).map(provider=>{
      const mapCount=mappings.filter(x=>x.provider===provider.id).length;
      const providerEvents=events.filter(x=>x.provider===provider.id);
      const latest=providerEvents
        .slice()
        .sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt))[0]||null;
      const age=this.ageMinutes(latest?.receivedAt);
      const domains=[...new Set(providerEvents.map(x=>String(x.domain||"").toLowerCase()).filter(Boolean))];
      const requiredCovered=requiredDomains.filter(domain=>domains.includes(domain));
      const requiredMissing=requiredDomains.filter(domain=>!domains.includes(domain));
      const openQuarantine=quarantine.filter(x=>x.provider===provider.id).length;

      const checks={
        locationMapped:mapCount>0,
        eventsFlowing:providerEvents.length>0,
        freshWithin30Minutes:age!==null&&age<=30,
        noOpenQuarantine:openQuarantine===0,
        requiredDomainCoverage:requiredMissing.length===0,
        liveCertified:Boolean(provider.liveCertified)
      };

      const passed=Object.values(checks).filter(Boolean).length;
      const blockers=[];
      if(!checks.locationMapped)blockers.push("Location mapping missing");
      if(!checks.eventsFlowing)blockers.push("No canonical events received");
      if(!checks.freshWithin30Minutes)blockers.push("Provider event stream is not fresh");
      if(!checks.noOpenQuarantine)blockers.push(`${openQuarantine} quarantined integration item${openQuarantine===1?"":"s"}`);
      if(!checks.requiredDomainCoverage)blockers.push(`Missing required domains: ${requiredMissing.join(", ")}`);
      if(!checks.liveCertified)blockers.push("Live provider certification not complete");

      const decision=checks.locationMapped &&
        checks.eventsFlowing &&
        checks.freshWithin30Minutes &&
        checks.noOpenQuarantine &&
        checks.requiredDomainCoverage &&
        checks.liveCertified
          ? "READY"
          : providerEvents.length||mapCount
            ? "HOLD"
            : "NOT_CONNECTED";

      return {
        provider:provider.id,
        decision,
        checks,
        score:Math.round(passed/Object.keys(checks).length*100),
        mappedLocations:mapCount,
        canonicalEvents:providerEvents.length,
        lastEventAt:latest?.receivedAt||null,
        lastEventAgeMinutes:age,
        domains,
        requiredDomains,
        requiredCovered,
        requiredMissing,
        optionalDomainsPresent:optionalDomains.filter(domain=>domains.includes(domain)),
        openQuarantine,
        liveCertified:Boolean(provider.liveCertified),
        blockers
      };
    });

    const connected=providers.filter(x=>x.decision!=="NOT_CONNECTED");
    const ready=providers.filter(x=>x.decision==="READY");
    const best=connected.slice().sort((a,b)=>b.score-a.score)[0]||null;

    return {
      version:"79.25.0",
      generatedAt:this.now(),
      organizationId,
      location:{id:location.id,name:location.name},
      decision:ready.length?"READY":connected.length?"HOLD":"NOT_CONNECTED",
      readyProviders:ready.map(x=>x.provider),
      bestCandidate:best?{
        provider:best.provider,
        decision:best.decision,
        score:best.score,
        blockers:best.blockers
      }:null,
      providers,
      policy:{
        locationMappingRequired:true,
        canonicalEventFlowRequired:true,
        freshnessWindowMinutes:30,
        zeroOpenQuarantineRequired:true,
        requiredDomainCoverageRequired:true,
        explicitLiveCertificationRequired:true,
        adapterPresenceAloneIsNotReadiness:true,
        noAutomaticProviderAuthority:true
      }
    };
  }
}

module.exports=ProviderConnectionReadinessService;
