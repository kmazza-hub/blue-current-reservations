(function(){"use strict";
class BlueCurrentIngestionQueueEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.off=eventBus.on("canonical-mapping:completed",b=>{if(b?.accepted)this.enqueue(b);});}
 queue(){return this.appState.get("ingestionQueue")||[];}
 save(queue,reason){const summary=this.evaluate(queue,reason);this.appState.update({ingestionQueue:queue,ingestionQueueSummary:summary,ingestionQueueHistory:[...(this.appState.get("ingestionQueueHistory")||[]),{...summary}].slice(-50)});this.eventBus.emit("ingestion-queue:updated",structuredClone(summary));return summary;}
 enqueue(batch){const item={id:`ing_${Date.now()}`,mappingId:batch.id,source:batch.source,createdAt:new Date().toISOString(),records:batch.records||[],recordCount:batch.accepted||0,quarantined:batch.quarantined||0,status:batch.quarantined?"review":"ready",attempts:0,error:null};const q=[item,...this.queue()].slice(0,50);return this.save(q,"enqueue");}
 evaluate(queue=this.queue(),reason="manual"){const counts=queue.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});return{capturedAt:new Date().toISOString(),reason,total:queue.length,ready:counts.ready||0,review:counts.review||0,processed:counts.processed||0,rejected:counts.rejected||0,failed:counts.failed||0,status:(counts.failed||counts.review)?"watch":queue.length?"ready":"idle",items:queue};}
 snapshot(){return this.appState.get("ingestionQueueSummary")||this.evaluate();}
 process(id){const q=this.queue().map(x=>x.id===id?{...x,status:x.quarantined?"review":"processed",processedAt:new Date().toISOString(),attempts:(x.attempts||0)+1}:x);const item=q.find(x=>x.id===id);const out=this.save(q,"process");if(item?.status==="processed")this.eventBus.emit("ingestion-queue:processed",structuredClone(item));return out;}
 reject(id){return this.save(this.queue().map(x=>x.id===id?{...x,status:"rejected",rejectedAt:new Date().toISOString()}:x),"reject");}
 retry(id){return this.save(this.queue().map(x=>x.id===id?{...x,status:x.quarantined?"review":"ready",error:null}:x),"retry");}
 destroy(){this.off?.();}
}
window.BlueCurrentIngestionQueueEngine=BlueCurrentIngestionQueueEngine;})();