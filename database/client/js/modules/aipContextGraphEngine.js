(function(){"use strict";
class BlueCurrentAIPContextGraphEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.memoryKey="bluecurrent:v401:aip-memory";}
 readMemory(){try{return JSON.parse(localStorage.getItem(this.memoryKey)||"[]");}catch{return[];}}
 build(){const state=this.appState?.get?.()||{};const priorities=state.priorityFocus?.priorities||state.shiftIntelligence?.recommendations||[];const exceptions=state.serviceExceptionQueue?.rows||state.serviceExceptions||[];const memory=this.readMemory().slice(0,12);const nodes=[];const edges=[];const add=(id,type,label,data={})=>{if(!nodes.some(n=>n.id===id))nodes.push({id,type,label,data});};
 add("restaurant:active","restaurant",state.activeLocationName||state.locationName||"Active restaurant",{organizationId:state.activeOrganizationId||null,locationIds:state.authorizedLocationIds||[]});
 const metrics=[["metric:occupancy","Occupancy",state.occupancyPercent],["metric:kitchen","Kitchen pressure",state.kitchenPressure],["metric:wait","Guest wait",state.guestWaitMinutes],["metric:labor","Labor",state.laborPercent],["metric:shift","Shift score",state.shiftIntelligence?.score]];
 metrics.forEach(([id,label,value])=>{if(value!==undefined&&value!==null){add(id,"metric",label,{value});edges.push({from:"restaurant:active",to:id,relation:"has_signal"});}});
 priorities.slice(0,8).forEach((p,i)=>{const id=`priority:${p.id||i}`;add(id,"priority",p.title||p.action||`Priority ${i+1}`,p);edges.push({from:"restaurant:active",to:id,relation:"requires_action"});if(p.owner){const owner=`owner:${String(p.owner).toLowerCase().replace(/\W+/g,"-")}`;add(owner,"owner",p.owner);edges.push({from:id,to:owner,relation:"owned_by"});}});
 exceptions.slice(0,8).forEach((x,i)=>{const id=`exception:${x.id||i}`;add(id,"exception",x.title||x.type||`Exception ${i+1}`,x);edges.push({from:"restaurant:active",to:id,relation:"has_exception"});});
 memory.forEach((m,i)=>{const id=`memory:${m.id||i}`;add(id,"memory",m.prompt||m.answer||`Memory ${i+1}`,m);edges.push({from:"restaurant:active",to:id,relation:"remembered_context"});});
 const graph={id:`CTX-${Date.now()}`,nodes,edges,counts:{nodes:nodes.length,edges:edges.length,priorities:priorities.length,exceptions:exceptions.length,memory:memory.length},builtAt:new Date().toISOString()};this.eventBus?.emit?.("aip:context-graph-built",graph);return graph;}
}
window.BlueCurrentAIPContextGraphEngine=BlueCurrentAIPContextGraphEngine;})();