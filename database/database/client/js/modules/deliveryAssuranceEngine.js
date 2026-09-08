(function(){"use strict";
function api(){const token=localStorage.getItem("blueCurrentV3230Token")||"";return async(path,options={})=>{const headers={"Content-Type":"application/json",...(options.headers||{})};if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch(path,{...options,headers});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data;};}
class BlueCurrentDeliveryAssuranceEngine{
constructor(eventBus){this.eventBus=eventBus;this.request=api();}
async metrics(){const r=await this.request("/api/live/delivery-metrics");this.eventBus?.emit?.("v42:delivery-metrics",r);return r;}
}
window.BlueCurrentDeliveryAssuranceEngine=BlueCurrentDeliveryAssuranceEngine;})();