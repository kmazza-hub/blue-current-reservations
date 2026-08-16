"use strict";

const crypto=require("crypto");

class PersistenceMigrationVerificationService {
  constructor(persistence){ this.persistence=persistence; }

  _canonical(value){
    if(Array.isArray(value)){
      const copy=value.map(v=>this._canonical(v));
      if(copy.every(v=>v && typeof v==="object" && !Array.isArray(v) && "id" in v)){
        return copy.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
      }
      return copy;
    }
    if(value && typeof value==="object"){
      return Object.fromEntries(Object.keys(value).sort().map(k=>[k,this._canonical(value[k])]));
    }
    return value;
  }

  _hash(value){
    return crypto.createHash("sha256").update(JSON.stringify(this._canonical(value))).digest("hex");
  }

  async sourceManifest(){
    const state=await this.persistence.read();
    const stores=Object.keys(state).sort().map(name=>{
      const value=state[name];
      return {
        store:name,
        kind:Array.isArray(value)?"collection":typeof value==="object"&&value!==null?"document":"scalar",
        count:Array.isArray(value)?value.length:null,
        sha256:this._hash(value)
      };
    });
    return {
      version:"71.50.0",
      generatedAt:new Date().toISOString(),
      driver:this.persistence.driver,
      stores,
      totalRecords:stores.reduce((sum,s)=>sum+(s.count||0),0),
      manifestHash:this._hash(stores)
    };
  }

  async verifyTargetSnapshot(targetSnapshot){
    const source=await this.persistence.read();
    const target=targetSnapshot || {};
    const names=[...new Set([...Object.keys(source),...Object.keys(target)])].sort();
    const stores=names.map(name=>{
      const sourceValue=source[name];
      const targetValue=target[name];
      const sourceCount=Array.isArray(sourceValue)?sourceValue.length:null;
      const targetCount=Array.isArray(targetValue)?targetValue.length:null;
      const sourceHash=this._hash(sourceValue);
      const targetHash=this._hash(targetValue);
      return {
        store:name,
        sourcePresent:Object.prototype.hasOwnProperty.call(source,name),
        targetPresent:Object.prototype.hasOwnProperty.call(target,name),
        sourceCount,targetCount,
        countMatch:sourceCount===targetCount,
        sourceHash,targetHash,
        hashMatch:sourceHash===targetHash,
        verified:sourceHash===targetHash && sourceCount===targetCount
      };
    });
    const mismatches=stores.filter(s=>!s.verified);
    return {
      version:"71.50.0",
      verifiedAt:new Date().toISOString(),
      verified:mismatches.length===0,
      stores,
      mismatches:mismatches.length,
      mismatchStores:mismatches.map(s=>s.store)
    };
  }
}
module.exports=PersistenceMigrationVerificationService;
