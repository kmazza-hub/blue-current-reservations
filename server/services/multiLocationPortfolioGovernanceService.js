"use strict";

class MultiLocationPortfolioGovernanceService{
  constructor(database,stabilizationService,continuityService){
    this.database=database;
    this.stabilization=stabilizationService;
    this.continuity=continuityService;
  }
  now(){return new Date().toISOString();}
  allowed(locationId,allowed=[]){return allowed.includes("*")||allowed.includes(locationId);}

  async evaluateLocation(o,allowed,location){
    const id=location.id;
    const db=await this.database.read();
    const activation=(db.expansionProductionActivations||{})[`${o}:${id}`]||null;
    const graduation=(db.expansionStabilizationGraduations||{})[`${o}:${id}`]||null;
    const incidents=(db.expansionStabilizationIncidents||[]).filter(x=>x.organizationId===o&&x.locationId===id&&x.status!=="RESOLVED");
    let stabilization=null,continuity=null;
    try{stabilization=await this.stabilization.status(o,allowed,id);}catch{}
    try{continuity=await this.continuity.evaluate(o,allowed,id);}catch{}

    const providerStates=(continuity?.providers||[]);
    const degradedProviders=providerStates.filter(x=>x.continuity!=="STABLE"||x.fallback!=="TRUSTED_LIVE");
    const criticalIncidents=incidents.filter(x=>x.severity==="CRITICAL");
    const rolloutState=graduation?.status==="GRADUATED"?"NORMAL_OPERATIONS":
      activation?.status==="ACTIVE"?(stabilization?.state||"STABILIZING"):
      activation?.status==="ROLLED_BACK"?"ROLLED_BACK":"NOT_ACTIVE";

    const attention=[];
    if(criticalIncidents.length)attention.push("CRITICAL_INCIDENT");
    if(degradedProviders.length)attention.push("PROVIDER_CONTINUITY");
    if(stabilization?.state==="UNSTABLE")attention.push("STABILIZATION_UNSTABLE");
    if(activation?.status==="ROLLED_BACK")attention.push("ROLLED_BACK");
    if(incidents.length>=3)attention.push("SUPPORT_BURDEN");

    const health=attention.includes("CRITICAL_INCIDENT")||attention.includes("STABILIZATION_UNSTABLE")?"CRITICAL":
      attention.length?"WATCH":"HEALTHY";

    return {
      locationId:id,name:location.name||id,rolloutState,health,
      attention,
      openIncidents:incidents.length,
      criticalIncidents:criticalIncidents.length,
      degradedProviders:degradedProviders.length,
      stabilizationState:stabilization?.state||null,
      graduated:Boolean(graduation?.status==="GRADUATED"),
      productionActive:Boolean(activation?.status==="ACTIVE"),
      providerContinuity:providerStates.map(x=>({provider:x.provider,continuity:x.continuity,fallback:x.fallback,recoveryReady:x.recoveryReady}))
    };
  }

  async portfolio(o,allowed=[]){
    const db=await this.database.read();
    const locations=(db.locations||[]).filter(x=>x.organizationId===o&&this.allowed(x.id,allowed));
    const evaluated=[];
    for(const location of locations)evaluated.push(await this.evaluateLocation(o,allowed,location));

    const counts={
      total:evaluated.length,
      healthy:evaluated.filter(x=>x.health==="HEALTHY").length,
      watch:evaluated.filter(x=>x.health==="WATCH").length,
      critical:evaluated.filter(x=>x.health==="CRITICAL").length,
      productionActive:evaluated.filter(x=>x.productionActive).length,
      normalOperations:evaluated.filter(x=>x.rolloutState==="NORMAL_OPERATIONS").length,
      stabilizing:evaluated.filter(x=>["STABILIZING","READY_TO_GRADUATE","UNSTABLE"].includes(x.rolloutState)).length,
      rolledBack:evaluated.filter(x=>x.rolloutState==="ROLLED_BACK").length
    };
    const openIncidents=evaluated.reduce((n,x)=>n+x.openIncidents,0);
    const criticalIncidents=evaluated.reduce((n,x)=>n+x.criticalIncidents,0);
    const supportBurden=evaluated.filter(x=>x.openIncidents>0).length;
    const consistency=counts.total?Math.round((counts.healthy/counts.total)*100):100;

    return {
      version:"83.0.0",generatedAt:this.now(),organizationId:o,
      portfolioHealth:counts.critical?"CRITICAL":counts.watch?"WATCH":"HEALTHY",
      counts,
      openIncidents,criticalIncidents,
      locationsWithSupportBurden:supportBurden,
      operatingConsistencyPercent:consistency,
      executiveAttention:evaluated.filter(x=>x.attention.length).sort((a,b)=>{
        const rank={CRITICAL:0,WATCH:1,HEALTHY:2};return rank[a.health]-rank[b.health]||b.criticalIncidents-a.criticalIncidents||b.openIncidents-a.openIncidents;
      }),
      locations:evaluated,
      policy:{
        portfolioVisibilityOnly:true,
        locationAuthorityRemainsIndependent:true,
        executiveAttentionIsAdvisory:true,
        noAutomaticCrossLocationAction:true,
        noAutomaticRolloutExpansion:true,
        noAutomaticProviderAuthorityExpansion:true,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=MultiLocationPortfolioGovernanceService;
