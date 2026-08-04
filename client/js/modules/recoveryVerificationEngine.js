(function(){"use strict";
class BlueCurrentRecoveryVerificationEngine{
 constructor(){this.key="bluecurrent:v3918:recoveries";this.exceptionKey="bluecurrent:v3918:exceptions";}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return [];}}
 write(v){localStorage.setItem(this.key,JSON.stringify(v.slice(0,100)));return v;}
 resolvedExceptions(){try{const v=JSON.parse(localStorage.getItem(this.exceptionKey)||"{}");return Object.entries(v).filter(([,x])=>x.status==="resolved").map(([id,x])=>({id,...x}));}catch{return [];}}
 snapshot(){const rows=this.read(),eligible=this.resolvedExceptions();const verified=rows.filter(x=>x.status==="verified").length,failed=rows.filter(x=>x.status==="failed").length;return{rows,eligible,verified,failed,pending:Math.max(0,eligible.length-rows.length),score:rows.length?Math.round(verified/rows.length*100):0,status:failed?"watch":verified?"verified":"pending"};}
 verify({exceptionId,owner,note,status}){const rows=this.read().filter(x=>x.exceptionId!==exceptionId);rows.unshift({id:`REC-${Date.now().toString(36).toUpperCase()}`,exceptionId,owner:owner||"Manager",note:note||"Recovery checked",status:status||"verified",verifiedAt:new Date().toISOString()});this.write(rows);return this.snapshot();}
}
window.BlueCurrentRecoveryVerificationEngine=BlueCurrentRecoveryVerificationEngine;})();