(function(){"use strict";
function api(){const token=localStorage.getItem("blueCurrentV3230Token")||"";return async(path)=>{const h={"Content-Type":"application/json"};if(token)h.Authorization=`Bearer ${token}`;const r=await fetch(path,{headers:h});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;};}
class BlueCurrentSourceCheckpointEngine{constructor(eventBus){this.eventBus=eventBus;this.request=api();}async snapshot(){const out=await this.request("/api/live/checkpoints");this.eventBus?.emit?.("v42:source-checkpoints",out);return out;}}
window.BlueCurrentSourceCheckpointEngine=BlueCurrentSourceCheckpointEngine;})();
