(function(){"use strict";
class BlueCurrentDecisionLeverageEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4116:decision-leverage";}
 read(k,f=[]){try{return JSON.parse(localStorage.getItem(k)||"null")??f;}catch{return f;}}
 rank(){const deps=this.read("bluecurrent:v415:decision-dependencies",[]),decisions=this.read("bluecurrent:v411:decision-objects",[]),reason=this.read("bluecurrent:v416:operational-reasoning",[])[0];const base=decisions.length?decisions:[{id:"current-recommendation",description:reason?.recommendation||reason?.response||"Stabilize the highest-risk operating constraint",owner:"Manager",approvalRequired:true}];const ranked=base.map(d=>{const links=deps.filter(x=>x.upstreamId===d.id||x.sourceId===d.id||x.upstreamDecision===d.id);const leverage=Math.min(100,45+links.length*12+(d.approvalRequired?5:0));return{...d,links:links.length,leverage,band:leverage>=80?"high":leverage>=60?"medium":"focused"};}).sort((a,b)=>b.leverage-a.leverage);const out={id:`LEV-${Date.now()}`,ranked,top:ranked[0]||null,createdAt:new Date().toISOString()};const h=this.read(this.key,[]);h.unshift(out);localStorage.setItem(this.key,JSON.stringify(h.slice(0,20)));this.eventBus?.emit?.("aip:decision-leverage-ranked",out);return out;}
 history(){return this.read(this.key,[]);}
}
window.BlueCurrentDecisionLeverageEngine=BlueCurrentDecisionLeverageEngine;})();