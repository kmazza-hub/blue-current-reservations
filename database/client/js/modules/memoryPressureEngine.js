(function(){"use strict";
class BlueCurrentMemoryPressureEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.timer=setInterval(()=>this.refresh("sample"),5000);this.refresh("initial");}
 snapshot(reason="manual"){const mem=performance.memory||{};const used=Number(mem.usedJSHeapSize||0),limit=Number(mem.jsHeapSizeLimit||0),ratio=limit?used/limit:0;const scripts=document.scripts.length,nodes=document.getElementsByTagName("*").length;const score=Math.max(0,100-Math.round(ratio*55)-(scripts>90?15:0)-(nodes>9000?15:0));return{capturedAt:new Date().toISOString(),reason,supported:Boolean(limit),usedBytes:used,limitBytes:limit,ratio:Number(ratio.toFixed(3)),scripts,nodes,score,status:score>=85?"healthy":score>=65?"watch":"critical"};}
 refresh(reason="manual"){const v=this.snapshot(reason);this.appState.update({memoryPressure:v});this.eventBus.emit("memory-pressure:updated",structuredClone(v));if(v.status==="critical")document.documentElement.dataset.memoryPressure="critical";else delete document.documentElement.dataset.memoryPressure;return v;}
 release(){window.dispatchEvent(new CustomEvent("bluecurrent:release-idle-resources"));if(window.gc)try{window.gc()}catch{}return this.refresh("release");}
 destroy(){clearInterval(this.timer);}
}
window.BlueCurrentMemoryPressureEngine=BlueCurrentMemoryPressureEngine;})();