(function(){"use strict";
class BlueCurrentStandardWorkLinkageEngine{
 constructor(){this.key="bluecurrent:v3924:standard-work-links";this.rootKey="bluecurrent:v3921:root-causes";this.actionKey="bluecurrent:v3921:corrective-actions";}
 read(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));return v;}
 roots(){return this.read(this.rootKey,[]);}
 actions(){return this.read(this.actionKey,[]);}
 list(){return this.read(this.key,[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
 add({rootCauseId,correctiveActionId,title,reference,owner}){if(!rootCauseId||!title.trim())throw new Error("Select a root cause and name the standard work.");const rows=this.list();const item={id:`SWL-${Date.now()}`,rootCauseId,correctiveActionId:correctiveActionId||null,title:title.trim(),reference:(reference||"").trim(),owner:(owner||"Manager").trim(),status:"linked",createdAt:new Date().toISOString()};rows.unshift(item);this.write(rows.slice(0,150));return item;}
 snapshot(){const rows=this.list(),roots=this.roots(),actions=this.actions();const covered=new Set(rows.map(x=>x.rootCauseId));return{rows,roots,actions,total:rows.length,coveredRoots:covered.size,unlinkedRoots:roots.filter(x=>!covered.has(x.id)).length,status:roots.length?(covered.size===roots.length?"covered":"gaps remain"):"awaiting evidence"};}
}
window.BlueCurrentStandardWorkLinkageEngine=BlueCurrentStandardWorkLinkageEngine;})();