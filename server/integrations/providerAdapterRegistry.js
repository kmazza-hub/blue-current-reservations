"use strict";

const {CAPABILITIES}=require("./hospitalityIntegrationContract");

class ProviderAdapterRegistry{
  constructor(){this.adapters=new Map();}
  register(adapter){
    if(!adapter?.id||typeof adapter.normalize!=="function")throw new Error("Provider adapter requires id and normalize().");
    const caps=[...new Set(adapter.capabilities||[])];
    const invalid=caps.filter(cap=>!CAPABILITIES.includes(cap));
    if(invalid.length)throw new Error(`Unknown provider capabilities: ${invalid.join(", ")}`);
    const normalized=Object.freeze({
      id:String(adapter.id).toLowerCase(),
      name:adapter.name||adapter.id,
      provider:adapter.provider||adapter.id,
      sourceType:adapter.sourceType||"other",
      capabilities:Object.freeze(caps),
      status:adapter.status||"contract-ready",
      authentication:adapter.authentication||"provider-specific",
      normalize:adapter.normalize
    });
    this.adapters.set(normalized.id,normalized);
    return normalized;
  }
  get(id){return this.adapters.get(String(id||"").toLowerCase())||null;}
  list(){return [...this.adapters.values()].map(a=>({
    id:a.id,name:a.name,provider:a.provider,sourceType:a.sourceType,
    capabilities:[...a.capabilities],status:a.status,authentication:a.authentication
  }));}
}
module.exports=ProviderAdapterRegistry;
