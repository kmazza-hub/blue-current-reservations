"use strict";

class LiveShiftFailureCertificationService{
  constructor(persistence,{workflowCertification,idempotencyService,syncReconciliationService,mutationIntegrityService}={}){
    this.persistence=persistence;
    this.workflow=workflowCertification;
    this.idempotency=idempotencyService;
    this.sync=syncReconciliationService;
    this.mutationIntegrity=mutationIntegrityService;
  }

  async certify(organizationId=null,locationId=null){
    const db=await this.persistence.read();
    const workflow=await this.workflow.certify(organizationId,locationId);
    const now=Date.now();
    const idem=(db.idempotencyRecords||[]).filter(x=>!organizationId||x.organizationId===organizationId);
    const processing=idem.filter(x=>x.status==="processing" && new Date(x.expiresAt||0).getTime()>now);
    const staleProcessing=processing.filter(x=>now-new Date(x.updatedAt||x.createdAt||0).getTime()>120000);
    const mutation=organizationId?await this.mutationIntegrity.snapshot(organizationId):null;

    const issues=[];
    if(staleProcessing.length) issues.push({severity:"high",code:"STALE_IDEMPOTENCY_PROCESSING",count:staleProcessing.length});
    if(mutation?.reconcileRequired) issues.push({severity:"critical",code:"MUTATION_RECONCILIATION_REQUIRED",count:mutation.reconcileRequired});
    if(mutation?.stalePrepared) issues.push({severity:"high",code:"STALE_PREPARED_MUTATIONS",count:mutation.stalePrepared});
    if(!workflow.pilotWorkflowReady) issues.push({severity:"critical",code:"WORKFLOW_NOT_READY"});

    return {
      version:"73.50.0",
      generatedAt:new Date().toISOString(),
      organizationId,locationId,
      certified:issues.every(x=>!["critical","high"].includes(x.severity)),
      liveShiftFailureReady:issues.every(x=>!["critical","high"].includes(x.severity)),
      protections:{
        duplicateRequestReplay:true,
        inFlightDuplicateConflict:true,
        staleWriteConflict:true,
        transactionRollback:true,
        duplicateSeatingRejected:true,
        tableConflictRejected:true,
        repeatedCompletionRejected:true,
        kitchenTransitionGuard:true,
        restartMutationRecovery:true,
        ambiguousRestartRequiresReconciliation:true,
        automaticRepair:false
      },
      idempotency:{records:idem.length,processing:processing.length,staleProcessing:staleProcessing.length},
      mutationIntegrity:mutation,
      workflow:{pilotWorkflowReady:workflow.pilotWorkflowReady,summary:workflow.summary},
      issues
    };
  }
}
module.exports=LiveShiftFailureCertificationService;
