"use strict";

class IntegrationHealthCommandService{
  constructor(readinessService,syncReliabilityService,reconciliationService){
    this.readiness=readinessService;
    this.sync=syncReliabilityService;
    this.reconciliation=reconciliationService;
  }
  now(){return new Date().toISOString();}

  async build(organizationId){
    const [readiness,sync,reconciliation]=await Promise.all([
      this.readiness.report(organizationId),
      this.sync.report(organizationId),
      this.reconciliation.report(organizationId)
    ]);

    const connectorMap=new Map();
    for(const c of readiness.connectors||[]){
      connectorMap.set(c.connectorId,{
        connectorId:c.connectorId,
        provider:c.provider,
        domain:c.domain,
        status:c.status,
        healthy:c.healthy,
        stale:c.stale,
        reconciled:c.reconciled,
        missingCapabilities:c.missingCapabilities||[],
        freshnessMinutes:c.freshnessMinutes,
        maxFreshnessMinutes:c.maxFreshnessMinutes,
        readinessBlockers:[]
      });
    }

    for(const b of readiness.blockers||[]){
      const c=connectorMap.get(b.connectorId)||{connectorId:b.connectorId,provider:"UNKNOWN",domain:"UNKNOWN",readinessBlockers:[]};
      c.readinessBlockers=c.readinessBlockers||[];
      c.readinessBlockers.push({type:b.type,detail:b.detail});
      connectorMap.set(b.connectorId,c);
    }

    for(const cp of sync.checkpoints||[]){
      const c=connectorMap.get(cp.connectorId)||{connectorId:cp.connectorId,provider:"UNKNOWN",domain:"UNKNOWN",readinessBlockers:[]};
      c.checkpoints=c.checkpoints||[];
      c.checkpoints.push({stream:cp.stream,cursor:cp.cursor,sequence:cp.sequence,checkpointedAt:cp.checkpointedAt});
      connectorMap.set(cp.connectorId,c);
    }

    for(const f of sync.failures||[]){
      const c=connectorMap.get(f.connectorId)||{connectorId:f.connectorId,provider:"UNKNOWN",domain:"UNKNOWN",readinessBlockers:[]};
      c.failures=c.failures||[];
      c.failures.push({stream:f.stream,status:f.status,reason:f.reason,failedAt:f.failedAt});
      connectorMap.set(f.connectorId,c);
    }

    const unresolvedConflicts=(reconciliation.conflicts||[]).filter(x=>!x.resolution);
    for(const conflict of unresolvedConflicts){
      const involved=[...new Set((conflict.observations||[]).map(x=>x.source))];
      for(const source of involved){
        const match=[...connectorMap.values()].find(c=>c.provider===source||c.connectorId===source);
        if(match){
          match.reconciliationConflicts=match.reconciliationConflicts||[];
          match.reconciliationConflicts.push({
            conflictId:conflict.id,
            entityType:conflict.entityType,
            entityId:conflict.entityId,
            field:conflict.field,
            status:conflict.status,
            authoritativeSource:conflict.authoritativeSource
          });
        }
      }
    }

    const connectors=[...connectorMap.values()].map(c=>{
      const openFailures=(c.failures||[]).filter(x=>x.status==="OPEN").length;
      const conflictCount=(c.reconciliationConflicts||[]).length;
      const blockerCount=(c.readinessBlockers||[]).length;
      let health="HEALTHY";
      if(c.status==="FAILED"||openFailures>0||c.stale||blockerCount>0) health="DEGRADED";
      if(c.status==="FAILED"||openFailures>=2||conflictCount>=2) health="CRITICAL";

      const trust=health==="HEALTHY"&&c.reconciled!==false?"TRUSTED":
        health==="CRITICAL"?"DO_NOT_TRUST":"USE_WITH_CAUTION";

      const actions=[];
      if(c.stale) actions.push("REFRESH_SOURCE");
      if(openFailures) actions.push("REPLAY_FROM_CHECKPOINT");
      if(blockerCount) actions.push("RESOLVE_READINESS_BLOCKERS");
      if(conflictCount) actions.push("REVIEW_RECONCILIATION_CONFLICTS");

      return {...c,openFailures,conflictCount,blockerCount,health,trust,recommendedActions:actions};
    }).sort((a,b)=>{
      const rank={CRITICAL:0,DEGRADED:1,HEALTHY:2};
      return rank[a.health]-rank[b.health];
    });

    const critical=connectors.filter(x=>x.health==="CRITICAL").length;
    const degraded=connectors.filter(x=>x.health==="DEGRADED").length;
    const healthy=connectors.filter(x=>x.health==="HEALTHY").length;

    let overallHealth="HEALTHY",dataTrust="TRUSTED";
    if(critical){overallHealth="CRITICAL";dataTrust="DO_NOT_TRUST";}
    else if(degraded){overallHealth="DEGRADED";dataTrust="USE_WITH_CAUTION";}

    const operatorMessage=
      overallHealth==="HEALTHY"
        ?"Connected restaurant data is healthy and currently trusted."
        : overallHealth==="DEGRADED"
          ?"Some connected data is degraded. Blue Current is isolating affected feeds; review the listed actions before relying on impacted metrics."
          :"Critical integration issues are active. Do not rely on affected connected data until the listed failures and conflicts are resolved.";

    return {
      version:"86.75.0",
      generatedAt:this.now(),
      organizationId,
      overallHealth,
      dataTrust,
      operatorMessage,
      summary:{
        connectors:connectors.length,
        healthy,
        degraded,
        critical,
        stale:connectors.filter(x=>x.stale).length,
        openSyncFailures:sync.summary?.openFailures||0,
        unresolvedReconciliationConflicts:reconciliation.summary?.unresolved||0,
        readinessBlockers:readiness.summary?.blockers||0,
        pilotIntegrationReady:Boolean(readiness.summary?.pilotIntegrationReady)&&critical===0&&degraded===0
      },
      connectors,
      sourceAuthority:reconciliation.authority||{},
      policy:{
        healthCommandIsReadOnly:true,
        degradedSourcesRemainVisible:true,
        trustStateMustBeExplicit:true,
        sourceSpecificFailuresRemainIsolated:true,
        reconciliationConflictsRemainAuditable:true,
        noAutomaticWriteBack:true,
        noAutomaticOperationalAction:true,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=IntegrationHealthCommandService;
