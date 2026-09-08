(function(){"use strict";
class BlueCurrentPilotSignalBridgeEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.off=eventBus.on("data-intake:validated",v=>{if(v?.valid)this.stage(v);});}
 stage(validation){const state=this.appState.getState(),current={...(state.pilotSignalBridge?.staged||{})};current[validation.source]={source:validation.source,records:validation.records,receivedAt:validation.capturedAt,sampleId:validation.id,payload:validation.payload};const value=this.evaluate(current,"stage");this.appState.update({pilotSignalBridge:value});this.eventBus.emit("pilot-signal-bridge:updated",structuredClone(value));return value;}
 evaluate(staged,reason="manual"){const entries=Object.values(staged||{}),records=entries.reduce((n,x)=>n+Number(x.records||0),0),confidence=Math.min(95,entries.length?60+entries.length*8:0);return{capturedAt:new Date().toISOString(),reason,status:entries.length?"staged":"idle",sources:entries.length,records,confidence,staged:staged||{},nextAction:entries.length?"Validated samples are isolated in the pilot bridge and have not replaced source-of-truth data.":"Validate a sandbox payload to stage pilot evidence."};}
 snapshot(){return this.appState.get("pilotSignalBridge")||this.evaluate({},"initial");}
 refresh(){const value=this.evaluate(this.snapshot().staged,"manual");this.appState.update({pilotSignalBridge:value});return value;}
 clear(){const value=this.evaluate({},"clear");this.appState.update({pilotSignalBridge:value});this.eventBus.emit("pilot-signal-bridge:updated",structuredClone(value));return value;}
 export(){const safe={...this.snapshot(),staged:Object.fromEntries(Object.entries(this.snapshot().staged||{}).map(([k,v])=>[k,{source:v.source,records:v.records,receivedAt:v.receivedAt,sampleId:v.sampleId}]))};const blob=new Blob([JSON.stringify(safe,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`blue-current-pilot-signal-bridge-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
 destroy(){this.off?.();}
}
window.BlueCurrentPilotSignalBridgeEngine=BlueCurrentPilotSignalBridgeEngine;})();