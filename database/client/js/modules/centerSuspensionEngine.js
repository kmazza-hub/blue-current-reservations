(function(){"use strict";
class BlueCurrentCenterSuspensionEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.suspended=new Set();this.refresh("initial");}
 candidates(){return [...document.querySelectorAll('[id$="Center"]')].filter(x=>!getComputedStyle(x).display||getComputedStyle(x).display==="none");}
 snapshot(reason="manual"){const hidden=this.candidates();return{capturedAt:new Date().toISOString(),reason,hiddenCenters:hidden.length,suspended:this.suspended.size,status:this.suspended.size>=Math.max(0,hidden.length-5)?"optimized":"available"};}
 suspend(){this.candidates().forEach(el=>{if(el.closest('#unifiedCommandCenter'))return;el.setAttribute('inert','');el.dataset.bcSuspended='true';this.suspended.add(el.id);});const v=this.refresh("suspend");this.eventBus.emit("centers:suspended",{count:this.suspended.size});return v;}
 resume(){this.suspended.forEach(id=>{const el=document.getElementById(id);el?.removeAttribute('inert');if(el)delete el.dataset.bcSuspended;});this.suspended.clear();const v=this.refresh("resume");this.eventBus.emit("centers:resumed",{});return v;}
 refresh(reason="manual"){const v=this.snapshot(reason);this.appState.update({centerSuspension:v});this.eventBus.emit("center-suspension:updated",structuredClone(v));return v;}
}
window.BlueCurrentCenterSuspensionEngine=BlueCurrentCenterSuspensionEngine;})();