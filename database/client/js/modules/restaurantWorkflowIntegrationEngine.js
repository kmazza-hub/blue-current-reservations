(function(global){"use strict";
class BlueCurrentRestaurantWorkflowIntegrationEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";} headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/restaurant-workflow-integration",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Restaurant workflow integration failed (${r.status})`);this.appState?.update?.({restaurantWorkflowIntegration:d});return d;}
 async observe(id,payload){const r=await fetch(`/api/restaurant-workflow-integration/locations/${encodeURIComponent(id)}/observe`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Workflow observation failed (${r.status})`);this.eventBus?.emit?.("restaurant-workflow-integration:observed",d);return d;}
 async certify(id,payload){const r=await fetch(`/api/restaurant-workflow-integration/locations/${encodeURIComponent(id)}/certify`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Workflow certification failed (${r.status})`);this.eventBus?.emit?.("restaurant-workflow-integration:certified",d);return d;}
}
if(global)global.BlueCurrentRestaurantWorkflowIntegrationEngine=BlueCurrentRestaurantWorkflowIntegrationEngine;})(window);