"use strict";

class IntegrationCertificationService{
  constructor(database,readinessService,syncService,reconciliationService,healthService){
    this.database=database;
    this.readiness=readinessService;
    this.sync=syncService;
    this.reconciliation=reconciliationService;
    this.health=healthService;
  }
  now(){return new Date().toISOString();}

  requiredEvidence(){
    return [
      "REAL_PROVIDER_CREDENTIALS_VALIDATED",
      "REAL_PROVIDER_DATA_OBSERVED",
      "SCHEMA_CONTRACT_VERIFIED",
      "INCREMENTAL_SYNC_PROVEN",
      "CHECKPOINT_RECOVERY_PROVEN",
      "DUPLICATE_SUPPRESSION_PROVEN",
      "FRESHNESS_WITHIN_THRESHOLD",
      "RECONCILIATION_WITHIN_TOLERANCE",
      "FAILURE_ISOLATION_PROVEN",
      "SOURCE_AUTHORITY_VERIFIED",
      "AUDIT_TRAIL_VERIFIED"
    ];
  }

  async evidence(organizationId,connectorId){
    const db=await this.database.read();
    return (db.integrationCertificationEvidence||[])
      .filter(x=>x.organizationId===organizationId&&x.connectorId===connectorId)
      .sort((a,b)=>new Date(a.recordedAt)-new Date(b.recordedAt));
  }

  async recordEvidence(organizationId,input={},actor){
    const connectorId=String(input.connectorId||"").trim();
    const evidenceType=String(input.evidenceType||"").toUpperCase().trim();
    const note=String(input.note||"").trim().slice(0,2500);
    if(!connectorId||!this.requiredEvidence().includes(evidenceType)){
      const e=new Error("connectorId and a valid evidenceType are required.");e.statusCode=400;throw e;
    }
    if(note.length<10){const e=new Error("Certification evidence requires a meaningful note.");e.statusCode=400;throw e;}
    const row={
      id:`ice-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      organizationId,connectorId,evidenceType,note,
      reference:String(input.reference||"").trim().slice(0,500)||null,
      recordedAt:this.now(),recordedBy:actor||"admin",
      verified:Boolean(input.verified)
    };
    await this.database.mutate(db=>{
      db.integrationCertificationEvidence=db.integrationCertificationEvidence||[];
      db.integrationCertificationEvidence.push(row);
      return true;
    });
    return row;
  }

  async evaluateConnector(organizationId,connectorId){
    const [readiness,sync,recon,health,evidence]=await Promise.all([
      this.readiness.report(organizationId),
      this.sync.report(organizationId),
      this.reconciliation.report(organizationId),
      this.health.build(organizationId),
      this.evidence(organizationId,connectorId)
    ]);

    const connector=(readiness.connectors||[]).find(x=>x.connectorId===connectorId)||null;
    if(!connector){const e=new Error("Connector not found in integration readiness.");e.statusCode=404;throw e;}

    const connectorHealth=(health.connectors||[]).find(x=>x.connectorId===connectorId)||null;
    const verifiedTypes=new Set(evidence.filter(x=>x.verified).map(x=>x.evidenceType));
    const missingEvidence=this.requiredEvidence().filter(x=>!verifiedTypes.has(x));

    const checkpointProven=(sync.checkpoints||[]).some(x=>x.connectorId===connectorId);
    const openFailures=(sync.failures||[]).filter(x=>x.connectorId===connectorId&&x.status==="OPEN").length;
    const unresolvedConflicts=(recon.conflicts||[]).filter(x=>{
      if(x.resolution) return false;
      return (x.observations||[]).some(o=>o.source===connector.provider||o.source===connectorId);
    }).length;

    const technicalReady=Boolean(connector.healthy)&&checkpointProven&&openFailures===0&&unresolvedConflicts===0;
    const providerEvidenceReady=missingEvidence.length===0;
    const productionCertified=technicalReady&&providerEvidenceReady&&connectorHealth?.trust==="TRUSTED";

    let status="NOT_READY";
    if(technicalReady&&!providerEvidenceReady) status="TECHNICALLY_READY_PROVIDER_EVIDENCE_REQUIRED";
    if(productionCertified) status="PRODUCTION_CERTIFIED";

    return {
      version:"87.0.0",
      generatedAt:this.now(),
      organizationId,connectorId,
      provider:connector.provider,
      domain:connector.domain,
      status,
      technicalReady,
      providerEvidenceReady,
      productionCertified,
      trust:connectorHealth?.trust||"UNKNOWN",
      evidence:{
        required:this.requiredEvidence(),
        verified:[...verifiedTypes],
        missing:missingEvidence,
        records:evidence
      },
      gates:{
        connectorHealthy:Boolean(connector.healthy),
        checkpointRecoveryProven:checkpointProven,
        noOpenSyncFailures:openFailures===0,
        noUnresolvedReconciliationConflicts:unresolvedConflicts===0,
        dataTrusted:connectorHealth?.trust==="TRUSTED",
        realProviderCredentialsValidated:verifiedTypes.has("REAL_PROVIDER_CREDENTIALS_VALIDATED"),
        realProviderDataObserved:verifiedTypes.has("REAL_PROVIDER_DATA_OBSERVED")
      },
      policy:{
        architectureCompatibilityIsNotCertification:true,
        contractReadinessIsNotCertification:true,
        realProviderEvidenceRequired:true,
        certificationIsConnectorSpecific:true,
        certificationIsOrganizationSpecific:true,
        writeBackCertificationSeparate:true,
        noCertificationBySimulationAlone:true,
        autonomousProductionChanges:false
      }
    };
  }

  async phaseB(organizationId){
    const readiness=await this.readiness.report(organizationId);
    const connectors=[];
    for(const c of readiness.connectors||[]){
      connectors.push(await this.evaluateConnector(organizationId,c.connectorId));
    }

    const blocking=connectors.filter(x=>!x.technicalReady);
    const awaitingProviderEvidence=connectors.filter(x=>x.technicalReady&&!x.providerEvidenceReady);
    const certified=connectors.filter(x=>x.productionCertified);

    return {
      version:"87.0.0",
      generatedAt:this.now(),
      organizationId,
      phase:"B",
      phaseName:"INTEGRATION_READINESS",
      status:blocking.length===0?"BLUE_CURRENT_INTEGRATION_PLATFORM_READY":"BLOCKED",
      pilotPlatformReady:blocking.length===0,
      providerProductionCertificationComplete:connectors.length>0&&certified.length===connectors.length,
      summary:{
        connectors:connectors.length,
        technicallyReady:connectors.filter(x=>x.technicalReady).length,
        awaitingProviderEvidence:awaitingProviderEvidence.length,
        productionCertified:certified.length,
        blocking:blocking.length
      },
      connectors,
      exitGate:{
        blueCurrentPhaseBExit: blocking.length===0,
        meaning:"Blue Current integration infrastructure is ready for real provider onboarding. Individual providers remain uncertified until real-provider evidence gates pass.",
        nextPhase:"C — RESTAURANT CONFIGURATION AND PILOT SETUP"
      },
      policy:{
        phaseBExitDoesNotClaimProviderCertification:true,
        realProviderCredentialsRemainExternalDependency:true,
        realProviderReconciliationRequired:true,
        noAutomaticWriteBack:true,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=IntegrationCertificationService;
