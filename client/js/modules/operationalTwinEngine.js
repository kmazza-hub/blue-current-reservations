(function(){"use strict";
class BlueCurrentOperationalTwinEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.relationshipKey="bluecurrent:v413:relationships";this.contextKey="bluecurrent:v414:last-context";this.twinKey="bluecurrent:v419:operational-twin";}
 read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback;}catch{return fallback;}}
 snapshot(){return this.appState?.getState?.()||this.appState?.state||{};}
 build(){const s=this.snapshot(),relationships=this.read(this.relationshipKey,[]),context=this.read(this.contextKey,null);
  const signals={occupancy:Number(s.occupancyPercent||s.occupancy||0),guestWait:Number(s.guestWaitMinutes||s.averageWaitMinutes||0),kitchen:Number(s.kitchenLoad||s.kitchenPressure||0),labor:Number(s.laborPercent||s.laborPercentage||0),quality:Number(s.serviceQualityScore||0),revenue:Number(s.revenuePace||s.revenueIndex||100)};
  const entities=[{id:"restaurant:active",type:"Restaurant",label:s.activeOrganizationName||"Active restaurant",status:"active"},{id:"floor:active",type:"Floor",label:`${signals.occupancy}% occupied`,status:signals.occupancy>=90?"watch":"healthy"},{id:"kitchen:active",type:"Kitchen",label:`${signals.kitchen}% pressure`,status:signals.kitchen>=85?"watch":"healthy"},{id:"guest-flow:active",type:"Guest Flow",label:`${signals.guestWait} min wait`,status:signals.guestWait>=20?"watch":"healthy"},{id:"labor:active",type:"Labor",label:`${signals.labor}% labor`,status:signals.labor>=38?"watch":"healthy"}];
  const watch=entities.filter(x=>x.status==="watch").length,health=Math.max(0,100-watch*14-Math.max(0,signals.guestWait-15)-Math.max(0,signals.kitchen-75));
  const twin={id:`TWIN-${Date.now()}`,signals,entities,relationships:relationships.slice(0,40),contextId:context?.id||null,health:Math.round(health),status:health>=85?"stable":health>=65?"watch":"strained",createdAt:new Date().toISOString()};
  localStorage.setItem(this.twinKey,JSON.stringify(twin));this.eventBus?.emit?.("aip:operational-twin-built",twin);return twin;}
 current(){return this.read(this.twinKey,null);}
}
window.BlueCurrentOperationalTwinEngine=BlueCurrentOperationalTwinEngine;})();