"use strict";

function clone(value){
  if(value===undefined) return undefined;
  if(typeof structuredClone==="function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

class MigrationShadowStore{
  constructor(){
    this.driver="migration-shadow";
    this.authoritative=false;
    this.state={};
    this.importedBatches=new Set();
    this.stats={batches:0,records:0,writes:0,lastImportAt:null};
  }

  async reset(){
    this.state={};
    this.importedBatches.clear();
    this.stats={batches:0,records:0,writes:0,lastImportAt:null};
  }

  async importBatch(batch){
    if(!batch?.id || !batch.store || !Array.isArray(batch.records)){
      const error=new Error("Invalid migration batch.");
      error.code="INVALID_MIGRATION_BATCH";
      throw error;
    }
    if(this.importedBatches.has(batch.id)){
      return {ok:true,replayed:true,batchId:batch.id};
    }
    this.state[batch.store] ||= [];
    this.state[batch.store].push(...clone(batch.records));
    this.importedBatches.add(batch.id);
    this.stats.batches+=1;
    this.stats.records+=batch.records.length;
    this.stats.lastImportAt=new Date().toISOString();
    return {ok:true,replayed:false,batchId:batch.id,records:batch.records.length};
  }

  async setDocument(store,value){
    this.state[store]=clone(value);
    this.stats.writes+=1;
    return clone(value);
  }

  async read(){ return clone(this.state); }
  async list(store,predicate=()=>true){ return clone((this.state[store]||[]).filter(predicate)); }
  async get(store,id){ return clone((this.state[store]||[]).find(item=>item?.id===id)||null); }

  async upsert(store,entity){
    this.state[store] ||= [];
    const items=this.state[store];
    const index=items.findIndex(item=>item?.id===entity?.id);
    if(index===-1) items.push(clone(entity));
    else items[index]=clone(entity);
    this.stats.writes+=1;
    return clone(entity);
  }

  diagnostics(){
    return {
      driver:this.driver,
      authoritative:this.authoritative,
      stores:Object.keys(this.state).length,
      importedBatches:this.importedBatches.size,
      ...this.stats
    };
  }
}

module.exports=MigrationShadowStore;
