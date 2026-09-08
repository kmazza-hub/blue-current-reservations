(function(){"use strict";
class BlueCurrentDecisionExecutionLedgerEngine{
 constructor({eventBus}){this.eventBus=eventBus;this.key="bluecurrent:decision-execution-ledger";this.off=[eventBus.on("action-ownership:command",c=>this.recordCommand(c)),eventBus.on("action-ownership:updated",()=>this.eventBus.emit("decision-execution-ledger:updated",this.snapshot()))];}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return [];}}
 write(rows){localStorage.setItem(this.key,JSON.stringify(rows.slice(-200)));this.eventBus.emit("decision-execution-ledger:updated",this.snapshot());}
 recordCommand(command={}){if(!command.id||!command.action)return;const actionMap={assign:"assigned",progress:"started",done:"completed"};const rows=this.read();rows.push({id:`ledger-${Date.now()}-${Math.random().toString(16).slice(2)}`,priorityId:String(command.id),event:actionMap[command.action]||command.action,owner:command.owner||null,occurredAt:new Date().toISOString()});this.write(rows);}
 snapshot(){const rows=this.read().slice().reverse();return{rows,total:rows.length,completed:rows.filter(x=>x.event==="completed").length,started:rows.filter(x=>x.event==="started").length,assigned:rows.filter(x=>x.event==="assigned").length,last:rows[0]||null};}
 clear(){localStorage.removeItem(this.key);this.eventBus.emit("decision-execution-ledger:updated",this.snapshot());}
 destroy(){this.off.forEach(fn=>fn?.());}
}
window.BlueCurrentDecisionExecutionLedgerEngine=BlueCurrentDecisionExecutionLedgerEngine;})();
