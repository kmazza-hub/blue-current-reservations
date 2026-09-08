(function(){"use strict";
class BlueCurrentSubscriptionLifecycleEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.timer=setInterval(()=>this.publish("sample"),5000);setTimeout(()=>this.publish("initial"),0);}
 snapshot(reason="manual"){const channels=[];if(this.eventBus?.listeners instanceof Map){this.eventBus.listeners.forEach((set,name)=>channels.push({name,count:set?.size||0}));}
 channels.sort((a,b)=>b.count-a.count);const total=channels.reduce((sum,item)=>sum+item.count,0);const hot=channels.filter(item=>item.count>=8);const intervals=window.BlueCurrentActivityGovernor?.snapshot?.().managedIntervals||0;const score=Math.max(0,100-Math.min(40,Math.max(0,total-120)*0.4)-Math.min(35,hot.length*8)-Math.min(25,Math.max(0,intervals-30)*2));
 return{capturedAt:new Date().toISOString(),reason,score:Math.round(score),status:score>=85?"healthy":score>=60?"watch":"critical",channels:channels.length,totalListeners:total,hotChannels:hot.length,managedIntervals:intervals,busiest:channels.slice(0,8),nextAction:hot.length?"Review high-listener channels and destroy inactive modules before loading another pack.":intervals>30?"Reduce recurring activity before expanding the workspace.":"Subscriptions are inside the runtime lifecycle budget."};}
 publish(reason="manual"){const value=this.snapshot(reason);this.appState.update({subscriptionLifecycle:value});this.eventBus.emit("subscription-lifecycle:updated",structuredClone(value));return value;}
 destroy(){clearInterval(this.timer);}
}
window.BlueCurrentSubscriptionLifecycleEngine=BlueCurrentSubscriptionLifecycleEngine;})();