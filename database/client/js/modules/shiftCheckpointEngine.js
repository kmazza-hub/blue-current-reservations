(function(){"use strict";
class BlueCurrentShiftCheckpointEngine{
 constructor({appState}){this.appState=appState;this.key="bluecurrent:shift-checkpoints";}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return [];}}
 save(list){localStorage.setItem(this.key,JSON.stringify(list.slice(-40)));}
 current(){const s=this.appState?.getState?.()||{},score=Number(s.shiftIntelligence?.score||s.shiftScore||s.restaurantHealth||0),k=Number(s.kitchenLoad||s.kitchenPressure||0),w=Number(s.guestWait||s.waitMinutes||0),l=Number(s.laborPercent||s.projectedLabor||0);const risks=[];if(k>=75)risks.push("Kitchen pressure");if(w>=10)risks.push("Guest wait");if(l>29)risks.push("Labor variance");return{score,kitchen:k,wait:w,labor:l,risks,status:risks.length?"attention":"stable",capturedAt:new Date().toISOString()};}
 capture(owner,note){const rec={id:`checkpoint-${Date.now()}`,owner:owner||"Manager",note:note||"",...this.current()};const list=this.read();list.push(rec);this.save(list);return rec;}
 snapshot(){const list=this.read();return{current:this.current(),history:list.slice(-8).reverse(),count:list.length,last:list[list.length-1]||null};}
}
window.BlueCurrentShiftCheckpointEngine=BlueCurrentShiftCheckpointEngine;})();