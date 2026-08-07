(function(){"use strict";
class BlueCurrentAdaptivePackEngine{
  constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.refresh("initial");this.timer=setInterval(()=>this.refresh("sample"),8000);}
  evaluate(){const state=this.appState.getState?.()||{};const role=state.roleExperience?.role||state.activeRole||"manager";const quality=state.signalQuality?.score??100;const runtime=state.runtimeRecovery?.score??100;const kitchen=Number(state.kitchenLoad??state.operationalContext?.kitchenLoad??0);const wait=Number(state.guestWaitMinutes??state.operationalContext?.guestWaitMinutes??0);const packs=[];if(role==="executive")packs.push("enterprise","intelligence");else if(role==="technical")packs.push("integrations","intelligence");else packs.push("operations");if(kitchen>=75||wait>=15)packs.unshift("operations");if(quality<80||runtime<80)packs.unshift("integrations");return [...new Set(packs)].slice(0,2);}
  snapshot(reason="manual"){const recommended=this.evaluate();const params=new URLSearchParams(location.search);const active=(params.get("pack")||"").split(",").filter(Boolean);const score=Math.max(0,100-(recommended.some(x=>!active.includes(x))?12:0));return{capturedAt:new Date().toISOString(),reason,recommended,active,score,status:score>=90?"aligned":"opportunity"};}
  refresh(reason="manual"){const v=this.snapshot(reason);this.appState.update({adaptivePack:v});this.eventBus.emit("adaptive-pack:updated",structuredClone(v));return v;}
  activate(packs){const next=new URL(location.href);next.search="";next.searchParams.set("pack",packs.join(","));location.assign(next.toString());}
  destroy(){clearInterval(this.timer);}
}
window.BlueCurrentAdaptivePackEngine=BlueCurrentAdaptivePackEngine;})();