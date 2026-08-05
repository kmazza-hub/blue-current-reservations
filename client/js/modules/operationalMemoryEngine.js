(function(){"use strict";
class BlueCurrentOperationalMemoryEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.key="bluecurrent:v4112:operational-memory";}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 metric(name,fallback=0){const value=this.appState?.get?.(name);return Number.isFinite(Number(value))?Number(value):fallback;}
 capture(label="Operating checkpoint",owner="Manager"){
  const snapshot={id:`MEM-${Date.now()}`,label,owner,createdAt:new Date().toISOString(),signals:{occupancy:this.metric("occupancyPercent"),guestWait:this.metric("guestWaitMinutes",this.metric("averageWaitMinutes")),kitchenPressure:this.metric("kitchenPressurePercent"),labor:this.metric("laborPercent"),serviceQuality:this.metric("serviceQualityScore",100),revenue:this.metric("estimatedRevenue")},twin:this.safe("bluecurrent:v419:operational-twin"),reasoning:this.safe("bluecurrent:v416:operational-reasoning",[])[0]||null};
  const history=this.read();history.unshift(snapshot);localStorage.setItem(this.key,JSON.stringify(history.slice(0,60)));this.eventBus?.emit?.("aip:operational-memory-captured",snapshot);return snapshot;
 }
 safe(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback;}catch{return fallback;}}
 trend(){const h=this.read();if(h.length<2)return{status:"insufficient",score:0,changes:[]};const a=h[0].signals,b=h[1].signals;const changes=Object.keys(a).map(k=>({metric:k,current:a[k],previous:b[k],delta:Number((a[k]-b[k]).toFixed(1))}));const adverse=changes.filter(x=>(["guestWait","kitchenPressure","labor"].includes(x.metric)&&x.delta>0)||(x.metric==="serviceQuality"&&x.delta<0)).length;return{status:adverse>=2?"deteriorating":adverse===1?"watch":"improving",score:Math.max(0,100-adverse*25),changes};}
}
window.BlueCurrentOperationalMemoryEngine=BlueCurrentOperationalMemoryEngine;})();