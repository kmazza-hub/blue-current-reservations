(function(){"use strict";
class BlueCurrentIncidentRootCauseEngine{
 constructor(){this.key="bluecurrent:v3921:root-causes";this.exceptionKey="bluecurrent:v3918:exceptions";}
 read(key=this.key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 exceptions(){const saved=this.read(this.exceptionKey,{});return Object.entries(saved).filter(([,v])=>v&&v.status==="resolved").map(([id,v])=>({id,resolvedAt:v.updatedAt||null}));}
 list(){return this.read().slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
 add({exceptionId,category,cause,contributor,owner}){if(!exceptionId||!cause.trim())throw new Error("Choose an exception and enter a root cause.");const rows=this.list();const item={id:`RCA-${Date.now()}`,exceptionId,category:category||"process",cause:cause.trim(),contributor:(contributor||"").trim(),owner:(owner||"Manager").trim(),createdAt:new Date().toISOString(),status:"confirmed"};rows.unshift(item);this.write(rows.slice(0,100));return item;}
 snapshot(){const rows=this.list(),categories={};rows.forEach(r=>categories[r.category]=(categories[r.category]||0)+1);const top=Object.entries(categories).sort((a,b)=>b[1]-a[1])[0];return{rows,total:rows.length,exceptions:this.exceptions(),topCategory:top?.[0]||"—",repeatSignals:Object.values(categories).filter(v=>v>1).length,status:rows.length?"learning":"awaiting evidence"};}
}
window.BlueCurrentIncidentRootCauseEngine=BlueCurrentIncidentRootCauseEngine;})();