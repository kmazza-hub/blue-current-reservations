"use strict";

class PilotDataAuthorityCutoverService{
  constructor(database,continuityService){
    this.database=database;
    this.continuity=continuityService;
  }
  now(){return new Date().toISOString();}
  key(org,location){return `${org}:${location}`;}

  async status(organizationId,allowedLocationIds=[],locationId){
    const db=await this.database.read();
    const allowed=id=>allowedLocationIds.includes("*")||allowedLocationIds.includes(id);
    const location=(db.locations||[]).find(x=>x.organizationId===organizationId&&x.id===locationId&&allowed(x.id));
    if(!location){const e=new Error("Pilot cutover location is not authorized.");e.statusCode=403;throw e;}
    const continuity=await this.continuity.evaluate(organizationId,allowedLocationIds,locationId);
    const state=(db.pilotDataAuthorityCutovers||{})[this.key(organizationId,locationId)]||null;
    const provider=state?.provider||continuity.trustedContinuousProviders?.[0]||null;
    const providerState=continuity.providers.find(x=>x.provider===provider)||null;
    const eligible=Boolean(providerState&&providerState.continuity==="STABLE"&&providerState.fallback==="TRUSTED_LIVE"&&providerState.recoveryReady);

    return {
      version:"80.0.0",generatedAt:this.now(),organizationId,
      location:{id:location.id,name:location.name},
      mode:state?.mode||"LOCAL_AUTHORITY",
      provider,
      eligibleForProviderAuthority:eligible,
      activatedAt:state?.activatedAt||null,
      activatedBy:state?.activatedBy||null,
      rollbackAt:state?.rollbackAt||null,
      rollbackBy:state?.rollbackBy||null,
      rollbackReason:state?.rollbackReason||null,
      continuityDecision:continuity.decision,
      providerContinuity:providerState?.continuity||null,
      authority:{
        reservations:state?.mode==="PROVIDER_AUTHORITY"?provider:"blue-current",
        service:"blue-current",
        kitchen:"blue-current",
        labor:"blue-current",
        inventory:"blue-current",
        sales:state?.mode==="PROVIDER_AUTHORITY"?provider:"blue-current",
        guests:"blue-current"
      },
      policy:{
        humanCutoverRequired:true,
        humanRollbackRequired:true,
        stableTrustedContinuityRequired:true,
        providerAuthorityLimitedToCertifiedDomains:true,
        blueCurrentRetainsOperationalAuthority:true,
        noAutomaticCutover:true,
        noAutomaticRecutoverAfterRollback:true,
        localFallbackAlwaysAvailable:true
      }
    };
  }

  async activate(organizationId,allowedLocationIds=[],locationId,provider,actor){
    const current=await this.status(organizationId,allowedLocationIds,locationId);
    if(!provider) {const e=new Error("Provider is required for cutover.");e.statusCode=400;throw e;}
    const continuity=await this.continuity.evaluate(organizationId,allowedLocationIds,locationId);
    const candidate=continuity.providers.find(x=>x.provider===provider);
    if(!candidate||candidate.continuity!=="STABLE"||candidate.fallback!=="TRUSTED_LIVE"||!candidate.recoveryReady){
      const e=new Error("Provider cannot receive authority until continuity is stable, trusted, and recovery-ready.");e.statusCode=409;throw e;
    }
    const record={organizationId,locationId,provider,mode:"PROVIDER_AUTHORITY",activatedAt:this.now(),activatedBy:actor||"unknown",rollbackAt:null,rollbackBy:null,rollbackReason:null};
    await this.database.mutate(db=>{db.pilotDataAuthorityCutovers=db.pilotDataAuthorityCutovers||{};db.pilotDataAuthorityCutovers[this.key(organizationId,locationId)]=record;return true;});
    return this.status(organizationId,allowedLocationIds,locationId);
  }

  async rollback(organizationId,allowedLocationIds=[],locationId,reason,actor){
    await this.status(organizationId,allowedLocationIds,locationId);
    const now=this.now();
    await this.database.mutate(db=>{
      db.pilotDataAuthorityCutovers=db.pilotDataAuthorityCutovers||{};
      const prior=db.pilotDataAuthorityCutovers[this.key(organizationId,locationId)]||{organizationId,locationId};
      db.pilotDataAuthorityCutovers[this.key(organizationId,locationId)]={...prior,mode:"LOCAL_AUTHORITY",rollbackAt:now,rollbackBy:actor||"unknown",rollbackReason:reason||"operator rollback"};
      return true;
    });
    return this.status(organizationId,allowedLocationIds,locationId);
  }
}
module.exports=PilotDataAuthorityCutoverService;
