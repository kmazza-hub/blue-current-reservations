(function(){"use strict";
class BlueCurrentIdlePackWarmupEngine{
  constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.jobs=new Map();this.refresh("initial");}
  packs(){return window.BlueCurrentFeaturePacks||{};}
  snapshot(reason="manual"){
    const warmed=[...this.jobs.entries()].filter(([,v])=>v.status==="complete").map(([pack])=>pack);
    const active=[...this.jobs.entries()].filter(([,v])=>v.status==="warming").map(([pack])=>pack);
    const available=Object.keys(this.packs()).filter(x=>x!=="platform");
    return{capturedAt:new Date().toISOString(),reason,available,warmed,active,status:active.length?"warming":warmed.length?"ready":"idle",prefetchedAssets:[...this.jobs.values()].reduce((n,x)=>n+(x.completed||0),0)};
  }
  refresh(reason="manual"){const value=this.snapshot(reason);this.appState.update({idlePackWarmup:value,idlePackWarmupHistory:[...(this.appState.get("idlePackWarmupHistory")||[]),value].slice(-25)});this.eventBus.emit("idle-pack-warmup:updated",structuredClone(value));return value;}
  warm(pack){const group=this.packs()[pack];if(!group)throw new Error(`Unknown feature pack: ${pack}`);if(this.jobs.get(pack)?.status==="complete")return this.refresh("already-warm");
    const sources=[...new Set(group.scripts||[])].slice(0,36);const job={status:"warming",total:sources.length,completed:0,startedAt:Date.now()};this.jobs.set(pack,job);this.refresh("warm-started");
    const schedule=window.requestIdleCallback||((cb)=>setTimeout(()=>cb({timeRemaining:()=>8}),50));let index=0;
    const next=()=>schedule(()=>{let budget=4;while(index<sources.length&&budget--){const href=sources[index++];if(!document.querySelector(`link[data-bc-prefetch="${CSS.escape(href)}"]`)){const link=document.createElement("link");link.rel="prefetch";link.as="script";link.href=href;link.dataset.bcPrefetch=href;document.head.appendChild(link);}job.completed=index;}
      if(index<sources.length){this.refresh("warm-progress");next();}else{job.status="complete";job.completed=sources.length;job.completedAt=Date.now();this.refresh("warm-complete");}}, {timeout:1000});
    next();return this.snapshot("warm-requested");
  }
  clear(){document.querySelectorAll('link[data-bc-prefetch]').forEach(x=>x.remove());this.jobs.clear();return this.refresh("cleared");}
}
window.BlueCurrentIdlePackWarmupEngine=BlueCurrentIdlePackWarmupEngine;})();