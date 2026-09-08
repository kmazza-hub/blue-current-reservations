(function(){"use strict";
class BlueCurrentEscalationControlEngine{
 constructor(){this.key="bluecurrent:v3918:escalations";this.exceptionKey="bluecurrent:v3918:exceptions";}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return [];}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v.slice(0,100)));return v;}
 exceptions(){try{return JSON.parse(localStorage.getItem(this.exceptionKey)||"{}");}catch{return {};}}
 snapshot(){const rows=this.read();return{rows,active:rows.filter(x=>x.status==="active").length,closed:rows.filter(x=>x.status==="closed").length,urgent:rows.filter(x=>x.status==="active"&&x.level==="urgent").length,status:rows.some(x=>x.status==="active")?"active":"clear"};}
 create({exceptionId,owner,level,note}){const rows=this.read();rows.unshift({id:`ESC-${Date.now().toString(36).toUpperCase()}`,exceptionId:exceptionId||"manual",owner:owner||"General manager",level:level||"standard",note:note||"Operating escalation",status:"active",createdAt:new Date().toISOString()});this.write(rows);return this.snapshot();}
 close(id){const rows=this.read().map(x=>x.id===id?{...x,status:"closed",closedAt:new Date().toISOString()}:x);this.write(rows);return this.snapshot();}
}
window.BlueCurrentEscalationControlEngine=BlueCurrentEscalationControlEngine;})();