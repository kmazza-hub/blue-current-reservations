"use strict";

const crypto=require("crypto");

class PersistenceShadowExecutionService{
  constructor(sourcePersistence,{target=null}={}){
    this.source=sourcePersistence;
    this.target=target;
    this.mode="disabled";
    this.metrics={
      comparisons:0,matches:0,mismatches:0,shadowWrites:0,shadowWriteFailures:0,
      lastComparedAt:null,lastMismatch:null,lastWriteFailure:null
    };
  }

  configure({target=this.target,mode=this.mode}={}){
    const allowed=new Set(["disabled","shadow-read","shadow-write","dual-write"]);
    if(!allowed.has(mode)){
      const error=new Error(`Unsupported shadow mode: ${mode}`);
      error.code="INVALID_SHADOW_MODE";
      throw error;
    }
    this.target=target;
    this.mode=mode;
    return this.status();
  }

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
    const canonical=this._canonical(value);
    const serialized=canonical===undefined ? "__BLUE_CURRENT_UNDEFINED__" : JSON.stringify(canonical);
    return crypto.createHash("sha256").update(serialized).digest("hex");
  }

  async compareStore(store){
    if(!this.target || this.mode==="disabled"){
      return {version:"72.0.0",enabled:false,store,match:null};
    }
    const sourceState=await this.source.read();
    const targetState=await this.target.read();
    const sourceValue=sourceState[store];
    const targetValue=targetState[store];
    const sourceHash=this._hash(sourceValue);
    const targetHash=this._hash(targetValue);
    const match=sourceHash===targetHash;

    this.metrics.comparisons+=1;
    this.metrics.lastComparedAt=new Date().toISOString();
    if(match) this.metrics.matches+=1;
    else{
      this.metrics.mismatches+=1;
      this.metrics.lastMismatch={
        at:this.metrics.lastComparedAt,store,sourceHash,targetHash,
        sourceCount:Array.isArray(sourceValue)?sourceValue.length:null,
        targetCount:Array.isArray(targetValue)?targetValue.length:null
      };
    }

    return {
      version:"72.0.0",enabled:true,mode:this.mode,store,match,
      sourceHash,targetHash,
      sourceCount:Array.isArray(sourceValue)?sourceValue.length:null,
      targetCount:Array.isArray(targetValue)?targetValue.length:null
    };
  }

  async compareAll(){
    if(!this.target || this.mode==="disabled"){
      return {version:"72.0.0",enabled:false,mode:this.mode,comparisons:[],mismatches:0};
    }
    const source=await this.source.read();
    const target=await this.target.read();
    const names=[...new Set([...Object.keys(source),...Object.keys(target)])].sort();
    const comparisons=[];
    for(const name of names) comparisons.push(await this.compareStore(name));
    return {
      version:"72.0.0",enabled:true,mode:this.mode,
      comparisons,mismatches:comparisons.filter(item=>item.match===false).length,
      verified:comparisons.every(item=>item.match===true)
    };
  }

  async mirrorEntity(store,entity){
    if(!this.target || !["shadow-write","dual-write"].includes(this.mode)){
      return {mirrored:false,reason:"shadow-write-disabled"};
    }
    try{
      await this.target.upsert(store,entity);
      this.metrics.shadowWrites+=1;
      return {mirrored:true};
    }catch(error){
      this.metrics.shadowWriteFailures+=1;
      this.metrics.lastWriteFailure={at:new Date().toISOString(),store,error:String(error.message||error)};
      if(this.mode==="dual-write"){
        error.code ||= "SHADOW_DUAL_WRITE_FAILED";
        throw error;
      }
      return {mirrored:false,error:String(error.message||error)};
    }
  }

  status(){
    return {
      version:"72.0.0",
      mode:this.mode,
      targetConfigured:Boolean(this.target),
      authoritativeDriver:this.source.driver,
      targetDriver:this.target?.driver||null,
      authoritativeStoreUnchanged:true,
      automaticCutover:false,
      metrics:{...this.metrics}
    };
  }
}

module.exports=PersistenceShadowExecutionService;
