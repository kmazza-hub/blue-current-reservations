(function(){"use strict";
class BlueCurrentAIPMemoryVaultEngine{
 constructor(eventBus){this.eventBus=eventBus;this.sourceKey="bluecurrent:v401:aip-memory";this.vaultKey="bluecurrent:v407:aip-memory-vault";}
 source(){try{return JSON.parse(localStorage.getItem(this.sourceKey)||"[]");}catch{return[];}}
 vault(){try{return JSON.parse(localStorage.getItem(this.vaultKey)||"[]");}catch{return[];}}
 save(rows){localStorage.setItem(this.vaultKey,JSON.stringify(rows.slice(0,100)));this.eventBus?.emit?.("aip:memory-vault-updated",{count:rows.length});return rows;}
 sync(){const rows=this.vault();const known=new Set(rows.map(x=>x.sourceId));for(const item of this.source()){if(known.has(item.id))continue;rows.push({id:`MEM-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,sourceId:item.id,agent:item.agent||"operations",title:item.prompt||"Agent memory",summary:item.answer||"",createdAt:item.createdAt||new Date().toISOString(),retention:"30_days",pinned:false,status:"active"});known.add(item.id);}return this.save(rows);}
 pin(id,value){const rows=this.vault();const item=rows.find(x=>x.id===id);if(item){item.pinned=Boolean(value);item.updatedAt=new Date().toISOString();this.save(rows);}return item;}
 forget(id){const rows=this.vault().filter(x=>x.id!==id);this.save(rows);return rows;}
 clearExpired(){const cutoff=Date.now()-30*86400000;const rows=this.vault().filter(x=>x.pinned||new Date(x.createdAt).getTime()>=cutoff);this.save(rows);return rows;}
 summary(){const rows=this.sync();return{total:rows.length,pinned:rows.filter(x=>x.pinned).length,agents:new Set(rows.map(x=>x.agent)).size,rows:rows.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||new Date(b.createdAt)-new Date(a.createdAt))};}
}
window.BlueCurrentAIPMemoryVaultEngine=BlueCurrentAIPMemoryVaultEngine;})();