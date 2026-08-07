(function(){"use strict";
function api(){const token=localStorage.getItem("blueCurrentV3230Token")||"";return async(path,options={})=>{const headers={"Content-Type":"application/json",...(options.headers||{})};if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch(path,{...options,headers});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data;};}
class BlueCurrentSourceAdapterRegistryEngine{
constructor(eventBus){this.eventBus=eventBus;this.request=api();}
async adapters(){const r=await this.request("/api/live/adapters");this.eventBus?.emit?.("v42:adapters-loaded",r);return r.adapters||[];}
async preview(id,payload){return this.request(`/api/live/adapters/${encodeURIComponent(id)}/preview`,{method:"POST",body:JSON.stringify(payload)});}
async ingest(id,connectorId,event){const r=await this.request(`/api/live/adapters/${encodeURIComponent(id)}/ingest`,{method:"POST",body:JSON.stringify({connectorId,event})});this.eventBus?.emit?.("v42:adapter-event-ingested",r);return r;}
}
window.BlueCurrentSourceAdapterRegistryEngine=BlueCurrentSourceAdapterRegistryEngine;})();