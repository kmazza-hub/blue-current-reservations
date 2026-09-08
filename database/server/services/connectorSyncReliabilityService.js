"use strict";

class ConnectorSyncReliabilityService{
  constructor(database){this.database=database;}
  now(){return new Date().toISOString();}
  key(org,connector,stream){return `${org}:${connector}:${stream}`;}

  async checkpoint(organizationId,input={},actor){
    const connectorId=String(input.connectorId||"").trim();
    const stream=String(input.stream||"default").trim();
    const cursor=String(input.cursor||"").trim();
    if(!connectorId||!cursor){const e=new Error("connectorId and cursor are required.");e.statusCode=400;throw e;}
    const record={
      organizationId,connectorId,stream,cursor,
      sequence:Number.isFinite(Number(input.sequence))?Number(input.sequence):null,
      sourceUpdatedAt:input.sourceUpdatedAt||null,
      checkpointedAt:this.now(),checkpointedBy:actor||"connector"
    };
    await this.database.mutate(db=>{
      db.connectorSyncCheckpoints=db.connectorSyncCheckpoints||[];
      const k=this.key(organizationId,connectorId,stream);
      const i=db.connectorSyncCheckpoints.findIndex(x=>this.key(x.organizationId,x.connectorId,x.stream)===k);
      if(i>=0){
        const prev=db.connectorSyncCheckpoints[i];
        if(prev.sequence!==null&&record.sequence!==null&&record.sequence<prev.sequence){
          const e=new Error("Checkpoint sequence cannot move backward.");e.statusCode=409;throw e;
        }
        db.connectorSyncCheckpoints[i]={...prev,...record};
      } else db.connectorSyncCheckpoints.push(record);
      return true;
    });
    return record;
  }

  async acceptEvent(organizationId,input={}){
    const connectorId=String(input.connectorId||"").trim();
    const stream=String(input.stream||"default").trim();
    const eventId=String(input.eventId||"").trim();
    if(!connectorId||!eventId){const e=new Error("connectorId and eventId are required.");e.statusCode=400;throw e;}
    let result=null;
    await this.database.mutate(db=>{
      db.connectorProcessedEvents=db.connectorProcessedEvents||[];
      const duplicate=db.connectorProcessedEvents.find(x=>x.organizationId===organizationId&&x.connectorId===connectorId&&x.stream===stream&&x.eventId===eventId);
      if(duplicate){result={accepted:false,duplicate:true,eventId,connectorId,stream,firstAcceptedAt:duplicate.acceptedAt};return false;}
      const row={organizationId,connectorId,stream,eventId,acceptedAt:this.now(),sourceUpdatedAt:input.sourceUpdatedAt||null};
      db.connectorProcessedEvents.push(row);result={accepted:true,duplicate:false,...row};return true;
    });
    return result;
  }

  async recordFailure(organizationId,input={},actor){
    const connectorId=String(input.connectorId||"").trim();
    const stream=String(input.stream||"default").trim();
    const reason=String(input.reason||"").trim().slice(0,2000);
    if(!connectorId||reason.length<3){const e=new Error("connectorId and failure reason are required.");e.statusCode=400;throw e;}
    const failure={id:`sync-failure-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,organizationId,connectorId,stream,reason,failedAt:this.now(),recordedBy:actor||"connector",status:"OPEN"};
    await this.database.mutate(db=>{db.connectorSyncFailures=db.connectorSyncFailures||[];db.connectorSyncFailures.push(failure);return true;});
    return failure;
  }

  async recover(organizationId,input={},actor){
    const connectorId=String(input.connectorId||"").trim(),stream=String(input.stream||"default").trim();
    if(!connectorId){const e=new Error("connectorId is required.");e.statusCode=400;throw e;}
    let result=null;
    await this.database.mutate(db=>{
      db.connectorSyncCheckpoints=db.connectorSyncCheckpoints||[];
      db.connectorSyncFailures=db.connectorSyncFailures||[];
      const cp=db.connectorSyncCheckpoints.find(x=>x.organizationId===organizationId&&x.connectorId===connectorId&&x.stream===stream)||null;
      const open=db.connectorSyncFailures.filter(x=>x.organizationId===organizationId&&x.connectorId===connectorId&&x.stream===stream&&x.status==="OPEN");
      const at=this.now();
      for(const f of open){f.status="RECOVERY_ACKNOWLEDGED";f.recoveryAcknowledgedAt=at;f.recoveryAcknowledgedBy=actor||"admin";}
      result={
        connectorId,stream,recoveryFromCursor:cp?.cursor||null,recoveryFromSequence:cp?.sequence??null,
        acknowledgedFailures:open.length,recoveryMode:"REPLAY_FROM_LAST_COMMITTED_CHECKPOINT",
        requiresSourceReplay:true,writeAuthorityGranted:false,at
      };
      return true;
    });
    return result;
  }

  async report(organizationId){
    const db=await this.database.read();
    const checkpoints=(db.connectorSyncCheckpoints||[]).filter(x=>x.organizationId===organizationId);
    const failures=(db.connectorSyncFailures||[]).filter(x=>x.organizationId===organizationId);
    const events=(db.connectorProcessedEvents||[]).filter(x=>x.organizationId===organizationId);
    return {
      version:"86.25.0",generatedAt:this.now(),organizationId,
      summary:{
        checkpoints:checkpoints.length,
        processedEvents:events.length,
        openFailures:failures.filter(x=>x.status==="OPEN").length,
        recoveryAcknowledged:failures.filter(x=>x.status==="RECOVERY_ACKNOWLEDGED").length
      },
      checkpoints,failures,
      policy:{
        idempotentEventAcceptance:true,
        monotonicCheckpointSequence:true,
        replayFromLastCommittedCheckpoint:true,
        partialFailureIsolatedByConnectorStream:true,
        restartRecoverySupported:true,
        sourceReplayRequired:true,
        writeAuthorityNotGrantedByRecovery:true,
        autonomousProductionChanges:false
      }
    };
  }
}
module.exports=ConnectorSyncReliabilityService;
