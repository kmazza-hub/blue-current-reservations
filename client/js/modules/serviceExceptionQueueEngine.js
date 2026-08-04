(function(){"use strict";
class BlueCurrentServiceExceptionQueueEngine{
 constructor({appState}){this.appState=appState;this.key="bluecurrent:v3918:exceptions";}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"{}");}catch{return {};}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 snapshot(){const s=this.appState?.getState?.()||{},saved=this.read(),rows=[];const add=(id,title,detail,severity,owner)=>rows.push({id,title,detail,severity,owner,status:saved[id]?.status||"open",updatedAt:saved[id]?.updatedAt||null});
 const kitchen=Number(s.kitchenLoad??s.kitchenPressure??0),wait=Number(s.guestWait??s.averageWaitMinutes??0),labor=Number(s.projectedLaborPercent??s.laborPercent??0),quality=Number(s.serviceQualityScore??100);
 if(kitchen>=72)add("kitchen-pressure","Kitchen pressure elevated",`Kitchen load is ${Math.round(kitchen)}%.`,kitchen>=88?"critical":"watch","Kitchen lead");
 if(wait>=12)add("guest-wait","Guest wait requires attention",`Average guest wait is ${Math.round(wait)} minutes.`,wait>=22?"critical":"watch","Floor manager");
 if(labor>=29)add("labor-variance","Labor is above target",`Projected labor is ${labor.toFixed(1)}%.`,labor>=33?"critical":"watch","General manager");
 if(quality<82)add("quality-guardrail","Service quality guardrail",`Service quality score is ${Math.round(quality)}.`,quality<70?"critical":"watch","Service manager");
 const open=rows.filter(x=>x.status!=="resolved").length,critical=rows.filter(x=>x.status!=="resolved"&&x.severity==="critical").length;
 return{rows,open,critical,resolved:rows.length-open,status:critical?"critical":open?"watch":"clear",updatedAt:new Date().toISOString()};}
 setStatus(id,status){const v=this.read();v[id]={...(v[id]||{}),status,updatedAt:new Date().toISOString()};this.write(v);return this.snapshot();}
}
window.BlueCurrentServiceExceptionQueueEngine=BlueCurrentServiceExceptionQueueEngine;})();