(function(){"use strict";
class BlueCurrentAIPKnowledgeSourceEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4015:knowledge-sources";this.sources=this.read();if(!this.sources.length)this.sources=this.seed();this.persist();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 seed(){return[
  {id:"KS-OPS",name:"Live operating context",type:"operational",owner:"Operations",trust:"trusted",status:"active",description:"Current shift metrics, priorities, and exceptions exposed through governed Blue Current tools.",createdAt:new Date().toISOString()},
  {id:"KS-SOP",name:"Standard work library",type:"knowledge",owner:"Training",trust:"reviewed",status:"active",description:"Approved operating procedures and prevention standards.",createdAt:new Date().toISOString()},
  {id:"KS-PILOT",name:"Trusted pilot dataset",type:"dataset",owner:"Data Steward",trust:"controlled",status:"pilot",description:"Human-promoted pilot records with lineage and freshness evidence.",createdAt:new Date().toISOString()}
 ];}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.sources.slice(0,100)));}
 list(){return [...this.sources];}
 add(input){const name=String(input.name||"").trim();if(!name)throw new Error("Enter a source name.");const row={id:`KS-${Date.now()}`,name,type:input.type||"knowledge",owner:String(input.owner||"Operations").trim()||"Operations",trust:input.trust||"reviewed",status:"draft",description:String(input.description||"").trim(),createdAt:new Date().toISOString()};this.sources.unshift(row);this.persist();this.eventBus?.emit?.("aip:knowledge-source-changed",row);return row;}
 setStatus(id,status){const row=this.sources.find(x=>x.id===id);if(!row)return null;row.status=status;row.updatedAt=new Date().toISOString();this.persist();this.eventBus?.emit?.("aip:knowledge-source-changed",row);return row;}
 snapshot(){const active=this.sources.filter(x=>x.status==="active").length,trusted=this.sources.filter(x=>["trusted","controlled"].includes(x.trust)).length;return{total:this.sources.length,active,trusted,coverage:this.sources.length?Math.round((active/this.sources.length)*100):0,sources:this.list()};}
}
window.BlueCurrentAIPKnowledgeSourceEngine=BlueCurrentAIPKnowledgeSourceEngine;})();