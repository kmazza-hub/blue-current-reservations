"use strict";

class PersistenceReplicationCoordinatorService{
  constructor({shadowExecutionService}={}){
    this.shadow=shadowExecutionService;
    this.events=[];
    this.maxEvents=250;
  }

  async mirrorCommittedEntity({store,entity,operationId=null}){
    const result=await this.shadow.mirrorEntity(store,entity);
    const event={
      version:"72.0.0",
      at:new Date().toISOString(),
      operationId,
      store,
      entityId:entity?.id||null,
      authoritativeCommitted:true,
      shadowCommitted:Boolean(result.mirrored),
      requiresReconciliation:!result.mirrored && this.shadow.mode==="dual-write",
      mode:this.shadow.mode,
      error:result.error||null
    };
    this.events.unshift(event);
    this.events=this.events.slice(0,this.maxEvents);
    return event;
  }

  snapshot(){
    return {
      version:"72.0.0",
      mode:this.shadow.mode,
      semantics:"authoritative-first-mirror-second",
      distributedTransaction:false,
      automaticFailover:false,
      events:this.events.slice(0,50),
      reconciliationRequired:this.events.filter(event=>event.requiresReconciliation).length
    };
  }
}

module.exports=PersistenceReplicationCoordinatorService;
