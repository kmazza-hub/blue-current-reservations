(function(){"use strict";
class BlueCurrentBootRecoveryEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;["bluecurrent:boot-timeout","bluecurrent:boot-failed"].forEach(name=>window.addEventListener(name,e=>this.refresh(name,e.detail)));this.refresh("initial");}
 snapshot(reason="manual",detail=null){const guard=window.BlueCurrentBootGuard||{},history=this.appState.get("bootRecoveryHistory")||[];return{capturedAt:new Date().toISOString(),reason,status:guard.status||"complete",failures:Number(guard.failures||sessionStorage.getItem("bluecurrent:startup-failures")||0),lastGood:guard.lastGood||localStorage.getItem("bluecurrent:last-good-startup")||"focused",mode:guard.mode||window.BlueCurrentAssetMode||"focused",detail,history:history.slice(-5)};}
 refresh(reason="manual",detail=null){const value=this.snapshot(reason,detail),entry={capturedAt:value.capturedAt,reason,status:value.status,mode:value.mode};this.appState.update({bootRecoveryGuard:value,bootRecoveryHistory:[...(this.appState.get("bootRecoveryHistory")||[]),entry].slice(-20)});this.eventBus.emit("boot-recovery:updated",structuredClone(value));return value;}
 retry(){location.reload();}
 focused(){const next=new URL(location.href);next.search="";location.assign(next.toString());}
}
window.BlueCurrentBootRecoveryEngine=BlueCurrentBootRecoveryEngine;})();