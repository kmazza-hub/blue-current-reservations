"use strict";

const crypto=require("crypto");
const ProviderAdapterRegistry=require("../integrations/providerAdapterRegistry");
const {validateCanonicalEvent,contractFor,CANONICAL_EVENTS,CAPABILITIES}=require("../integrations/hospitalityIntegrationContract");
const toast=require("../integrations/providers/toastAdapter");
const square=require("../integrations/providers/squareAdapter");
const clover=require("../integrations/providers/cloverAdapter");

class UniversalHospitalityIntegrationService{
  constructor(database,auditService,realtimeHub){
    this.database=database;this.auditService=auditService;this.realtimeHub=realtimeHub;
    this.registry=new ProviderAdapterRegistry();
    [toast,square,clover].forEach(adapter=>this.registry.register(adapter));
  }
  now(){return new Date().toISOString();}
  fingerprint(provider,sourceEventId,type,payload){
    const basis=sourceEventId?`${provider}|${sourceEventId}`:`${provider}|${type}|${JSON.stringify(payload||{})}`;
    return crypto.createHash("sha256").update(basis).digest("hex");
  }
  providers(){return this.registry.list();}
  contracts(){return Object.entries(CANONICAL_EVENTS).map(([type,c])=>({type,...c}));}
  capabilities(){return [...CAPABILITIES];}

  async mappings(organizationId){
    const db=await this.database.read();
    return (db.integrationIdentityMappings||[]).filter(x=>x.organizationId===organizationId);
  }

  async saveMapping(organizationId,actor,input={}){
    const provider=String(input.provider||"").toLowerCase();
    const externalLocationId=String(input.externalLocationId||"").trim();
    const locationId=String(input.locationId||"").trim();
    if(!this.registry.get(provider))throw new Error(`Unknown provider: ${provider}`);
    if(!externalLocationId||!locationId)throw new Error("externalLocationId and locationId are required.");
    const location=await this.database.get("locations",locationId);
    if(!location||location.organizationId!==organizationId)throw new Error("Blue Current location is outside this organization.");

    const mapping=await this.database.mutate(db=>{
      db.integrationIdentityMappings||=[];
      const index=db.integrationIdentityMappings.findIndex(x=>x.organizationId===organizationId&&x.provider===provider&&x.externalLocationId===externalLocationId);
      const record={
        ...(index>=0?db.integrationIdentityMappings[index]:{}),
        id:index>=0?db.integrationIdentityMappings[index].id:`imap_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        organizationId,provider,externalLocationId,locationId,
        updatedAt:this.now(),createdAt:index>=0?db.integrationIdentityMappings[index].createdAt:this.now()
      };
      if(index>=0)db.integrationIdentityMappings[index]=record;else db.integrationIdentityMappings.push(record);
      return record;
    });
    await this.auditService.record({organizationId,actor,action:`Integration location mapping saved: ${provider}:${externalLocationId} -> ${locationId}`,category:"integration"});
    return mapping;
  }

  async resolveLocation(organizationId,provider,externalLocationId){
    if(!externalLocationId)return null;
    const maps=await this.mappings(organizationId);
    return maps.find(x=>x.provider===provider&&x.externalLocationId===String(externalLocationId))||null;
  }

  async preview(providerId,raw={}){
    const adapter=this.registry.get(providerId);
    if(!adapter)throw new Error(`Unknown provider adapter: ${providerId}`);
    const normalized=adapter.normalize(raw);
    validateCanonicalEvent(normalized);
    return {
      provider:adapter.id,adapterStatus:adapter.status,
      canonical:{...normalized,contract:contractFor(normalized.type)},
      liveConnectionPerformed:false
    };
  }

  async quarantine(organizationId,provider,raw,error){
    const record={
      id:`inq_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      organizationId,provider,raw,reason:String(error.message||error),
      status:"open",createdAt:this.now(),updatedAt:this.now()
    };
    await this.database.mutate(db=>{
      db.integrationQuarantine||=[];db.integrationQuarantine.unshift(record);
      db.integrationQuarantine=db.integrationQuarantine.slice(0,2000);return record;
    });
    this.realtimeHub.publish("integration:quarantined",{organizationId,provider,id:record.id,reason:record.reason});
    return record;
  }

  async ingest(organizationId,actor,providerId,raw={}){
    const provider=String(providerId||"").toLowerCase();
    try{
      const adapter=this.registry.get(provider);
      if(!adapter)throw new Error(`Unknown provider adapter: ${provider}`);
      const normalized=adapter.normalize(raw);
      validateCanonicalEvent(normalized);

      const externalLocationId=normalized.payload.locationId||null;
      let mappedLocationId=null;
      if(externalLocationId){
        const mapping=await this.resolveLocation(organizationId,provider,externalLocationId);
        if(!mapping)throw new Error(`No Blue Current location mapping for ${provider}:${externalLocationId}`);
        mappedLocationId=mapping.locationId;
        normalized.payload.providerLocationId=externalLocationId;
        normalized.payload.locationId=mappedLocationId;
      }

      const fp=this.fingerprint(provider,normalized.sourceEventId,normalized.type,normalized.payload);
      const db=await this.database.read();
      const existing=(db.integrationCanonicalEvents||[]).find(x=>x.organizationId===organizationId&&x.fingerprint===fp);
      if(existing){
        await this.database.mutate(state=>{
          state.integrationProviderHealth||={};
          const key=`${organizationId}:${provider}`;
          const health=state.integrationProviderHealth[key]||{organizationId,provider,accepted:0,duplicates:0,rejected:0};
          health.duplicates+=1;health.updatedAt=this.now();state.integrationProviderHealth[key]=health;return health;
        });
        return {...existing,duplicate:true};
      }

      const event={
        id:`ice_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        organizationId,provider,sourceType:adapter.sourceType,
        type:normalized.type,domain:contractFor(normalized.type).domain,
        sourceEventId:normalized.sourceEventId||null,
        occurredAt:normalized.occurredAt||this.now(),
        receivedAt:this.now(),fingerprint:fp,
        locationId:mappedLocationId,
        payload:normalized.payload,
        validation:{status:"accepted",contractVersion:"75.0.0"},
        authoritativeSource:provider,
        blueCurrentAuthoritative:false
      };
      await this.database.mutate(state=>{
        state.integrationCanonicalEvents||=[];state.integrationCanonicalEvents.unshift(event);
        state.integrationCanonicalEvents=state.integrationCanonicalEvents.slice(0,10000);
        state.integrationProviderHealth||={};
        const key=`${organizationId}:${provider}`;
        const health=state.integrationProviderHealth[key]||{organizationId,provider,accepted:0,duplicates:0,rejected:0,lastEventAt:null,lastError:null};
        health.accepted+=1;health.lastEventAt=event.receivedAt;health.lastError=null;health.status="healthy";health.updatedAt=event.receivedAt;
        state.integrationProviderHealth[key]=health;
        return event;
      });
      this.realtimeHub.publish("integration:canonical-event",event);
      return event;
    }catch(error){
      await this.database.mutate(state=>{
        state.integrationProviderHealth||={};
        const key=`${organizationId}:${provider}`;
        const health=state.integrationProviderHealth[key]||{organizationId,provider,accepted:0,duplicates:0,rejected:0};
        health.rejected+=1;health.lastError=String(error.message||error);health.status="degraded";health.updatedAt=this.now();
        state.integrationProviderHealth[key]=health;return health;
      });
      const q=await this.quarantine(organizationId,provider,raw,error);
      error.quarantineId=q.id;
      throw error;
    }
  }

  async health(organizationId){
    const db=await this.database.read();
    const mappings=(db.integrationIdentityMappings||[]).filter(x=>x.organizationId===organizationId);
    const events=(db.integrationCanonicalEvents||[]).filter(x=>x.organizationId===organizationId);
    const quarantine=(db.integrationQuarantine||[]).filter(x=>x.organizationId===organizationId&&x.status==="open");
    const stored=Object.values(db.integrationProviderHealth||{}).filter(x=>x.organizationId===organizationId);
    const providers=this.providers().map(p=>{
      const health=stored.find(x=>x.provider===p.id)||null;
      return {...p,health,mappedLocations:mappings.filter(x=>x.provider===p.id).length,
        canonicalEvents:events.filter(x=>x.provider===p.id).length,
        openQuarantine:quarantine.filter(x=>x.provider===p.id).length,
        liveCertified:false};
    });
    return {
      version:"75.0.0",generatedAt:this.now(),organizationId,
      providers,canonicalEventCount:events.length,openQuarantine:quarantine.length,
      identityMappings:mappings.length,
      policy:{
        providerAgnostic:true,
        providerLocationMappingRequired:true,
        duplicateEventsSuppressed:true,
        invalidEventsQuarantined:true,
        providerDataNotAutomaticallyAuthoritative:true,
        liveProviderCredentialsRequiredForProduction:true,
        liveProviderCertificationRequired:true,
        noClaimOfLiveToastConnection:true
      }
    };
  }
}
module.exports=UniversalHospitalityIntegrationService;
