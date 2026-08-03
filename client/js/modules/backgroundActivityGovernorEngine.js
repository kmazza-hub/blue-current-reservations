(function(){"use strict";
if(!window.BlueCurrentActivityGovernor){
 const nativeSetInterval=window.setInterval.bind(window),nativeClearInterval=window.clearInterval.bind(window);
 const registry=new Map();let seq=0,paused=document.hidden,executed=0,skipped=0;
 window.setInterval=function(callback,delay,...args){const id=++seq;const wrapped=()=>{if(document.hidden){skipped++;return;}executed++;try{return typeof callback==="function"?callback(...args):Function(callback)();}catch(error){console.error("Managed interval failed",error);}};const nativeId=nativeSetInterval(wrapped,delay);registry.set(nativeId,{id,delay:Number(delay)||0,createdAt:Date.now()});return nativeId;};
 window.clearInterval=function(id){registry.delete(id);return nativeClearInterval(id);};
 document.addEventListener("visibilitychange",()=>{paused=document.hidden;window.dispatchEvent(new CustomEvent("bluecurrent:activity-governor",{detail:snapshot()}));});
 function snapshot(){return{capturedAt:new Date().toISOString(),hidden:document.hidden,paused,managedIntervals:registry.size,executedCallbacks:executed,skippedCallbacks:skipped,estimatedCallbacksPerMinute:[...registry.values()].reduce((s,x)=>s+(x.delay?60000/x.delay:0),0)}}
 window.BlueCurrentActivityGovernor={snapshot,registry};
}
class BlueCurrentBackgroundActivityGovernorEngine{constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.refresh("initial");this.onVisibility=()=>this.refresh("visibility");window.addEventListener("bluecurrent:activity-governor",this.onVisibility);}snapshot(reason="manual"){return{...window.BlueCurrentActivityGovernor.snapshot(),reason,status:document.hidden?"paused":"active"};}refresh(reason="manual"){const value=this.snapshot(reason);this.appState.update({backgroundActivityGovernor:value,backgroundActivityGovernorHistory:[...(this.appState.get("backgroundActivityGovernorHistory")||[]),value].slice(-30)});this.eventBus.emit("background-activity-governor:updated",structuredClone(value));return value;}destroy(){window.removeEventListener("bluecurrent:activity-governor",this.onVisibility);}}
window.BlueCurrentBackgroundActivityGovernorEngine=BlueCurrentBackgroundActivityGovernorEngine;})();