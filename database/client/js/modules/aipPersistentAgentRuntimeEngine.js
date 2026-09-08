(function(){"use strict";
function api(){const t=localStorage.getItem("blueCurrentV3230Token")||"";return async(p,o={})=>{const h={"Content-Type":"application/json"};if(t)h.Authorization=`Bearer ${t}`;const r=await fetch(p,{...o,headers:{...h,...(o.headers||{})}}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;};}
class BlueCurrentAipPersistentAgentRuntimeEngine{
 constructor(){this.r=api();}
 load(){return this.r('/api/aip/agent-runs');}
 create(agentType='operations-optimizer'){return this.r('/api/aip/agent-runs',{method:'POST',body:JSON.stringify({agentType})});}
 context(runId){return this.r(`/api/aip/execution-context${runId?`?runId=${encodeURIComponent(runId)}`:''}`);}
 control(runId,action){return this.r('/api/aip/runtime-control',{method:'POST',body:JSON.stringify({runId,action})});}
 lifecycle(runId){return this.r(`/api/aip/runtime-control${runId?`?runId=${encodeURIComponent(runId)}`:''}`);}
}
window.BlueCurrentAipPersistentAgentRuntimeEngine=BlueCurrentAipPersistentAgentRuntimeEngine;
})();
