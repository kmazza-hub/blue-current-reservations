"use strict";
class ProviderDataReconciliationService{
 constructor(database,readiness){this.database=database;this.readiness=readiness;}
 now(){return new Date().toISOString();}
 key(e){return e.sourceEventId?`source:${e.sourceEventId}`:e.fingerprint?`fingerprint:${e.fingerprint}`:null;}
 async evaluate(org,allowedIds=[],locationId){
  const db=await this.database.read(),allowed=id=>allowedIds.includes("*")||allowedIds.includes(id);
  const location=(db.locations||[]).find(x=>x.organizationId===org&&x.id===locationId&&allowed(x.id));
  if(!location){const e=new Error("Reconciliation location is not authorized.");e.statusCode=403;throw e;}
  const readiness=await this.readiness.evaluate(org,allowedIds,locationId);
  const all=(db.integrationCanonicalEvents||[]).filter(x=>x.organizationId===org&&x.locationId===locationId);
  const providers=readiness.providers.map(p=>{
   const events=all.filter(x=>x.provider===p.provider),seen=new Set();let duplicates=0,invalid=0,future=0,missingIdentity=0;const domainCounts={};
   for(const e of events){
    const k=this.key(e);if(!k)missingIdentity++;else if(seen.has(k))duplicates++;else seen.add(k);
    if(e.validation?.status!=="accepted")invalid++;
    const ts=new Date(e.occurredAt||e.receivedAt).getTime();if(Number.isFinite(ts)&&ts>Date.now()+300000)future++;
    const d=String(e.domain||"unknown").toLowerCase();domainCounts[d]=(domainCounts[d]||0)+1;
   }
   const anomalies={duplicateKeys:duplicates,invalidAccepted:invalid,futureEvents:future,missingSourceIdentity:missingIdentity,openQuarantine:p.openQuarantine,missingRequiredDomains:p.requiredMissing.length};
   const anomalyCount=Object.values(anomalies).reduce((s,n)=>s+(Number(n)||0),0),rate=events.length?Math.min(1,anomalyCount/events.length):1;
   let confidence=(p.checks.locationMapped?15:0)+(p.checks.eventsFlowing?15:0)+(p.checks.freshWithin30Minutes?20:0)+(p.checks.requiredDomainCoverage?20:0)+(p.checks.noOpenQuarantine?10:0)+(p.checks.liveCertified?10:0)+Math.round(10*(1-rate));
   confidence=Math.max(0,Math.min(100,confidence));
   const blockers=[...p.blockers];if(duplicates)blockers.push(`${duplicates} duplicate canonical event key${duplicates===1?"":"s"}`);if(invalid)blockers.push(`${invalid} non-accepted canonical event${invalid===1?"":"s"}`);if(future)blockers.push(`${future} implausible future event${future===1?"":"s"}`);if(missingIdentity)blockers.push(`${missingIdentity} event${missingIdentity===1?"":"s"} missing source identity`);
   const reconciled=p.decision==="READY"&&anomalyCount===0&&confidence>=90;
   return {provider:p.provider,providerReadiness:p.decision,confidence,confidenceBand:confidence>=90?"HIGH":confidence>=70?"MEDIUM":"LOW",reconciled,canonicalEvents:events.length,domainCounts,anomalies,anomalyCount,blockers:[...new Set(blockers)]};
  });
  const connected=providers.filter(x=>x.providerReadiness!=="NOT_CONNECTED"),trusted=providers.filter(x=>x.reconciled),best=connected.slice().sort((a,b)=>b.confidence-a.confidence)[0]||null;
  return {version:"79.50.0",generatedAt:this.now(),organizationId:org,location:{id:location.id,name:location.name},decision:trusted.length?"TRUSTED_LIVE":connected.length?"RECONCILE":"LOCAL_ONLY",trustedProviders:trusted.map(x=>x.provider),bestCandidate:best?{provider:best.provider,confidence:best.confidence,confidenceBand:best.confidenceBand,reconciled:best.reconciled,blockers:best.blockers}:null,providers,policy:{readinessDoesNotEqualTrust:true,reconciliationRequiredForTrustedLive:true,minimumTrustedConfidence:90,zeroReconciliationAnomaliesRequired:true,duplicatesReduceConfidence:true,quarantineReducesConfidence:true,staleDataCannotBeTrustedLive:true,providerAuthorityRemainsGoverned:true}};
 }
}
module.exports=ProviderDataReconciliationService;
