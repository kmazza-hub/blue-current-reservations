(function(){"use strict";
class BlueCurrentPortfolioReasoningEngine{
 constructor(eventBus,appState){this.eventBus=eventBus;this.appState=appState;this.key="bluecurrent:v4115:portfolio-reasoning";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 snapshot(){const s=this.appState?.getState?.()||{};const brief=this.read("bluecurrent:v4114:executive-reasoning-brief",[])[0]||null;const locations=Array.isArray(s.portfolioLocations)&&s.portfolioLocations.length?s.portfolioLocations:[{id:s.activeLocationId||"location-primary",name:s.activeLocationName||"Primary restaurant",occupancy:Number(s.occupancyPercent||72),guestWait:Number(s.guestWaitMinutes||s.currentWaitMinutes||14),kitchen:Number(s.kitchenPressure||s.kitchenLoadPercent||68),labor:Number(s.laborPercent||28),service:Number(s.serviceQualityScore||88)}];
 const scored=locations.map(x=>{const risk=Math.round(Math.max(0,Math.min(100,(Number(x.guestWait||0)*2)+(Number(x.kitchen||0)*.45)+(Math.max(0,Number(x.labor||0)-28)*2)+(100-Number(x.service||85))*.5)));return{...x,risk,status:risk>=70?"critical":risk>=45?"watch":"stable"};}).sort((a,b)=>b.risk-a.risk);
 const result={id:`PORT-${Date.now()}`,locations:scored,highestRisk:scored[0]||null,portfolioScore:Math.round(100-(scored.reduce((a,b)=>a+b.risk,0)/(scored.length||1))),briefId:brief?.id||null,createdAt:new Date().toISOString()};const h=this.read(this.key,[]);h.unshift(result);localStorage.setItem(this.key,JSON.stringify(h.slice(0,20)));this.eventBus?.emit?.("aip:portfolio-reasoned",result);return result;}
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentPortfolioReasoningEngine=BlueCurrentPortfolioReasoningEngine;})();