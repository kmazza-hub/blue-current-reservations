(function(){"use strict";
class BlueCurrentRelationshipGraphEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v413:relationship-graph";this.edges=this.read();if(!this.edges.length)this.seed();}
 read(){try{const v=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.edges.slice(0,500)));}
 seed(){const now=new Date().toISOString();this.edges=[
  {id:"REL-guest-reservation",source:"guest",target:"reservation",type:"creates",confidence:98,evidence:"Hospitality ontology",createdAt:now},
  {id:"REL-reservation-table",source:"reservation",target:"table",type:"assigns",confidence:96,evidence:"Floor operating model",createdAt:now},
  {id:"REL-table-employee",source:"table",target:"employee",type:"served-by",confidence:92,evidence:"Service assignment",createdAt:now},
  {id:"REL-ticket-table",source:"ticket",target:"table",type:"fulfills",confidence:94,evidence:"Kitchen production flow",createdAt:now},
  {id:"REL-decision-location",source:"decision",target:"location",type:"governs",confidence:90,evidence:"Decision registry",createdAt:now}
 ];this.save();}
 add(input={}){const source=String(input.source||"").trim(),target=String(input.target||"").trim(),type=String(input.type||"").trim();if(!source||!target||!type)throw new Error("Source, relationship, and target are required.");const edge={id:`REL-${Date.now()}`,source,target,type,confidence:Math.max(0,Math.min(100,Number(input.confidence)||75)),evidence:String(input.evidence||"Manager-defined relationship").trim(),createdAt:new Date().toISOString()};this.edges.unshift(edge);this.save();this.eventBus?.emit?.("aip:relationship-created",edge);return edge;}
 remove(id){this.edges=this.edges.filter(x=>x.id!==id);this.save();this.eventBus?.emit?.("aip:relationship-removed",{id});}
 summary(){return{total:this.edges.length,entities:new Set(this.edges.flatMap(x=>[x.source,x.target])).size,highConfidence:this.edges.filter(x=>x.confidence>=85).length,types:new Set(this.edges.map(x=>x.type)).size};}
 neighbors(entity){return this.edges.filter(x=>x.source===entity||x.target===entity);}
}
window.BlueCurrentRelationshipGraphEngine=BlueCurrentRelationshipGraphEngine;})();
