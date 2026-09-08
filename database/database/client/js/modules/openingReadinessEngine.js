(function(){"use strict";
class BlueCurrentOpeningReadinessEngine{
 constructor({appState}){this.appState=appState;this.planKey="bluecurrent:opening-readiness";}
 read(){try{return JSON.parse(localStorage.getItem(this.planKey)||"{}");}catch{return {};}}
 write(v){localStorage.setItem(this.planKey,JSON.stringify(v));return v;}
 snapshot(){const s=this.appState?.getState?.()||{},saved=this.read();const checks=[
 {id:"staff",label:"Staffing confirmed",detail:"Core service positions are assigned",auto:Number(s.staffScheduled||s.staffCount||0)>0},
 {id:"floor",label:"Floor ready",detail:"Sections, tables, and host stand are prepared",auto:Number(s.occupancyPercent||0)<95},
 {id:"kitchen",label:"Kitchen ready",detail:"Prep and station readiness are confirmed",auto:Number(s.kitchenLoad||s.kitchenPressure||0)<75},
 {id:"reservations",label:"Reservation pacing reviewed",detail:"Arrival waves and special occasions are understood",auto:Array.isArray(s.reservations)&&s.reservations.length>0},
 {id:"handoff",label:"Previous handoff reviewed",detail:"Open actions and shift notes are acknowledged",auto:true}
 ].map(c=>({...c,done:saved[c.id]===true||c.auto}));const done=checks.filter(c=>c.done).length;return{checks,done,total:checks.length,score:Math.round(done/checks.length*100),status:done===checks.length?"ready":done>=3?"watch":"not-ready",updatedAt:new Date().toISOString()};}
 toggle(id,done){const v=this.read();v[id]=done;this.write(v);return this.snapshot();}
 reset(){localStorage.removeItem(this.planKey);return this.snapshot();}
}
window.BlueCurrentOpeningReadinessEngine=BlueCurrentOpeningReadinessEngine;})();