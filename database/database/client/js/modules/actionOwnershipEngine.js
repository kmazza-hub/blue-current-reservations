(function(){"use strict";
class BlueCurrentActionOwnershipEngine{
 constructor({eventBus}){this.eventBus=eventBus;this.key="bluecurrent:operations-action-ownership";this.off=[eventBus.on("action-ownership:command",c=>this.command(c))];}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"{}");}catch{return {};}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v));this.eventBus.emit("action-ownership:updated",this.snapshot());}
 command({id,action,owner}){if(!id)return;const all=this.read(),current=all[id]||{};if(action==="assign")current.assignedOwner=owner||window.prompt("Assign this priority to:",current.assignedOwner||"Manager")||current.assignedOwner||"Manager";if(action==="progress"){current.status="in-progress";current.startedAt=new Date().toISOString();}if(action==="done"){current.status="done";current.completedAt=new Date().toISOString();}current.updatedAt=new Date().toISOString();all[id]=current;this.write(all);}
 clearCompleted(){const all=this.read();Object.keys(all).forEach(id=>{if(all[id]?.status==="done")delete all[id];});this.write(all);}
 snapshot(){const entries=Object.entries(this.read()).map(([id,v])=>({id,...v}));return{entries,owned:entries.filter(x=>x.assignedOwner).length,inProgress:entries.filter(x=>x.status==="in-progress").length,done:entries.filter(x=>x.status==="done").length};}
 destroy(){this.off.forEach(fn=>fn?.());}
}
window.BlueCurrentActionOwnershipEngine=BlueCurrentActionOwnershipEngine;})();
