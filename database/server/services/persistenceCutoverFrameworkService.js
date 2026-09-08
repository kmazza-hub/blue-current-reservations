"use strict";

const PHASES=Object.freeze([
  "planning",
  "schema-mapped",
  "backfill-verified",
  "shadow-read",
  "dual-write",
  "cutover-ready",
  "cutover-approved",
  "managed-primary",
  "rollback-window",
  "complete"
]);

class PersistenceCutoverFrameworkService {
  constructor(persistence){ this.persistence=persistence; }

  async status(){
    const state=await this.persistence.read();
    return state.persistenceMigrationControl || {
      version:"71.50.0",
      phase:"planning",
      targetDriver:null,
      targetConnectionName:null,
      schemaMappingHash:null,
      sourceManifestHash:null,
      backfillVerified:false,
      shadowReadVerified:false,
      dualWriteVerified:false,
      humanApproval:null,
      rollbackAvailable:true,
      automaticCutover:false,
      updatedAt:null
    };
  }

  async update({phase,targetDriver,targetConnectionName,schemaMappingHash,sourceManifestHash,
                backfillVerified,shadowReadVerified,dualWriteVerified,humanApproval,actor}){
    if(phase && !PHASES.includes(phase)){
      const error=new Error(`Unknown migration phase: ${phase}`);
      error.code="INVALID_MIGRATION_PHASE";
      throw error;
    }

    return this.persistence.mutate(state=>{
      const current=state.persistenceMigrationControl || {
        version:"71.50.0",phase:"planning",backfillVerified:false,shadowReadVerified:false,
        dualWriteVerified:false,humanApproval:null,rollbackAvailable:true,automaticCutover:false
      };

      const next={
        ...current,
        ...(phase!==undefined?{phase}:{}),
        ...(targetDriver!==undefined?{targetDriver}:{}),
        ...(targetConnectionName!==undefined?{targetConnectionName}:{}),
        ...(schemaMappingHash!==undefined?{schemaMappingHash}:{}),
        ...(sourceManifestHash!==undefined?{sourceManifestHash}:{}),
        ...(backfillVerified!==undefined?{backfillVerified:Boolean(backfillVerified)}:{}),
        ...(shadowReadVerified!==undefined?{shadowReadVerified:Boolean(shadowReadVerified)}:{}),
        ...(dualWriteVerified!==undefined?{dualWriteVerified:Boolean(dualWriteVerified)}:{}),
        ...(humanApproval!==undefined?{humanApproval}:{}),
        actor:actor||current.actor||null,
        automaticCutover:false,
        rollbackAvailable:true,
        updatedAt:new Date().toISOString()
      };

      if(["cutover-approved","managed-primary","rollback-window","complete"].includes(next.phase)){
        if(!next.backfillVerified || !next.shadowReadVerified || !next.dualWriteVerified){
          const error=new Error("Cutover cannot advance without verified backfill, shadow reads, and dual writes.");
          error.code="CUTOVER_EVIDENCE_INCOMPLETE";
          throw error;
        }
        if(!next.humanApproval?.approvedBy || !next.humanApproval?.approvedAt){
          const error=new Error("Cutover requires explicit human approval.");
          error.code="CUTOVER_HUMAN_APPROVAL_REQUIRED";
          throw error;
        }
      }

      state.persistenceMigrationControl=next;
      return {...next};
    });
  }

  phases(){ return [...PHASES]; }
}
module.exports=PersistenceCutoverFrameworkService;
