"use strict";

const crypto=require("crypto");

class PersistenceBackfillService{
  constructor(sourcePersistence){ this.source=sourcePersistence; }

  _canonical(value){
    if(Array.isArray(value)){
      const copy=value.map(v=>this._canonical(v));
      if(copy.every(v=>v&&typeof v==="object"&&!Array.isArray(v)&&"id" in v)){
        return copy.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
      }
      return copy;
    }
    if(value&&typeof value==="object"){
      return Object.fromEntries(Object.keys(value).sort().map(k=>[k,this._canonical(value[k])]));
    }
    return value;
  }

  _hash(value){
    return crypto.createHash("sha256").update(JSON.stringify(this._canonical(value))).digest("hex");
  }

  async plan({batchSize=100}={}){
    if(!Number.isInteger(batchSize)||batchSize<1||batchSize>5000){
      const error=new Error("batchSize must be an integer from 1 to 5000.");
      error.code="INVALID_BACKFILL_BATCH_SIZE";
      throw error;
    }
    const state=await this.source.read();
    const stores=[];
    let totalBatches=0,totalRecords=0;

    for(const name of Object.keys(state).sort()){
      const value=state[name];
      if(Array.isArray(value)){
        const ordered=this._canonical(value);
        const batches=[];
        if(ordered.length===0){
          const records=[];
          batches.push({
            id:`bf_${name}_1_${this._hash(records).slice(0,12)}`,
            store:name,
            kind:"collection",
            ordinal:1,
            offset:0,
            count:0,
            sha256:this._hash(records),
            records
          });
        }else{
          for(let offset=0;offset<ordered.length;offset+=batchSize){
            const records=ordered.slice(offset,offset+batchSize);
            const ordinal=Math.floor(offset/batchSize)+1;
            batches.push({
              id:`bf_${name}_${ordinal}_${this._hash(records).slice(0,12)}`,
              store:name,
              kind:"collection",
              ordinal,
              offset,
              count:records.length,
              sha256:this._hash(records),
              records
            });
          }
        }
        stores.push({store:name,kind:"collection",count:value.length,sha256:this._hash(value),batches});
        totalBatches+=batches.length;
        totalRecords+=value.length;
      }else{
        stores.push({
          store:name,
          kind:"document",
          count:null,
          sha256:this._hash(value),
          batches:[{
            id:`bf_${name}_document_${this._hash(value).slice(0,12)}`,
            store:name,kind:"document",ordinal:1,offset:0,count:null,sha256:this._hash(value),document:this._canonical(value)
          }]
        });
        totalBatches+=1;
      }
    }

    const summary=stores.map(s=>({
      store:s.store,kind:s.kind,count:s.count,sha256:s.sha256,
      batches:s.batches.map(b=>({id:b.id,ordinal:b.ordinal,offset:b.offset,count:b.count,sha256:b.sha256}))
    }));

    return {
      version:"72.0.0",
      generatedAt:new Date().toISOString(),
      sourceDriver:this.source.driver,
      batchSize,
      totals:{stores:stores.length,batches:totalBatches,records:totalRecords},
      stores,
      manifestHash:this._hash(summary)
    };
  }

  async execute(target,{batchSize=100,onProgress=null}={}){
    if(!target || typeof target.importBatch!=="function" || typeof target.setDocument!=="function"){
      const error=new Error("Backfill target does not implement migration import methods.");
      error.code="INVALID_BACKFILL_TARGET";
      throw error;
    }

    const plan=await this.plan({batchSize});
    let importedBatches=0,importedRecords=0,replayedBatches=0;

    for(const store of plan.stores){
      for(const batch of store.batches){
        let result;
        if(batch.kind==="collection"){
          result=await target.importBatch(batch);
          importedRecords+=result.replayed?0:batch.records.length;
        }else{
          await target.setDocument(batch.store,batch.document);
          result={replayed:false};
        }
        if(result.replayed) replayedBatches+=1;
        else importedBatches+=1;
        if(onProgress) await onProgress({
          store:batch.store,batchId:batch.id,ordinal:batch.ordinal,
          importedBatches,replayedBatches,importedRecords
        });
      }
    }
    return {
      version:"72.0.0",
      completedAt:new Date().toISOString(),
      manifestHash:plan.manifestHash,
      plannedBatches:plan.totals.batches,
      importedBatches,replayedBatches,importedRecords
    };
  }
}

module.exports=PersistenceBackfillService;
