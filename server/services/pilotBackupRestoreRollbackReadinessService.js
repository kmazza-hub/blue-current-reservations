"use strict";

class PilotBackupRestoreRollbackReadinessService {
  constructor(database) { this.database = database; }

  async current() {
    const verification = await this.database.verifyBackups();
    const diagnostics = this.database.diagnostics();
    const backups = verification.backups || [];
    const verified = backups.filter(item => item.ok);
    return {
      version:"93.25.0",
      gate:"PILOT_BACKUP_RESTORE_AND_ROLLBACK_READINESS",
      generatedAt:new Date().toISOString(),
      ready:verification.ok===true && verified.length>0,
      backupVerification:{ok:verification.ok===true,verifiedCopies:verified.length,backups},
      recoveryDiagnostics:diagnostics,
      recoveryContract:{
        checksumVerificationRequired:true,
        corruptPrimaryPreservedForForensics:true,
        newestVerifiedBackupPreferred:true,
        previousVerifiedBackupFallback:true,
        ambiguousMutationRequiresReconciliation:true,
        silentMutationRetry:false
      },
      rollbackBoundary:{
        humanApprovalRequired:true,
        preRollbackCheckpointRequired:true,
        postRestoreVerificationRequired:true,
        automaticRollback:false,
        automaticPilotLaunch:false
      }
    };
  }

  async checkpoint(reason="pilot-pre-change") {
    return this.database.checkpointBackup(reason);
  }
}
module.exports=PilotBackupRestoreRollbackReadinessService;
