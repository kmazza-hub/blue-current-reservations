(function(){"use strict";
class BlueCurrentHospitalityOntologyEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v410:ontology";this.entities=this.read();}
 defaults(){return[
  {id:"guest",name:"Guest",type:"person",description:"A diner, caller, or prospective guest.",owner:"Guest Experience",status:"active"},
  {id:"reservation",name:"Reservation",type:"business-object",description:"A governed commitment for party, time, and seating demand.",owner:"Reservations",status:"active"},
  {id:"table",name:"Table",type:"physical-resource",description:"A seating resource with lifecycle, capacity, and service state.",owner:"Floor Operations",status:"active"},
  {id:"ticket",name:"Kitchen Ticket",type:"workflow-object",description:"A timed kitchen production request linked to a guest experience.",owner:"Kitchen",status:"active"},
  {id:"employee",name:"Employee",type:"person",description:"A team member with role, assignment, permissions, and labor state.",owner:"Workforce",status:"active"},
  {id:"decision",name:"Operating Decision",type:"decision-object",description:"A recommendation or action with evidence, owner, approval, and outcome.",owner:"Management",status:"active"},
  {id:"location",name:"Restaurant Location",type:"organization",description:"A governed operating unit within a hospitality group.",owner:"Executive",status:"active"}
 ];}
 read(){try{const v=JSON.parse(localStorage.getItem(this.key)||"null");return Array.isArray(v)&&v.length?v:this.defaults();}catch{return this.defaults();}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.entities.slice(0,250)));}
 add(input={}){const name=String(input.name||"").trim();if(!name)throw new Error("Name the ontology entity.");const entity={id:`ONT-${Date.now()}`,name,type:String(input.type||"business-object"),description:String(input.description||"").trim(),owner:String(input.owner||"Operations").trim(),status:"draft",createdAt:new Date().toISOString()};this.entities.unshift(entity);this.save();this.eventBus?.emit?.("aip:ontology-updated",entity);return entity;}
 setStatus(id,status){const e=this.entities.find(x=>x.id===id);if(!e)return null;e.status=status;this.save();this.eventBus?.emit?.("aip:ontology-updated",e);return e;}
 summary(){return{total:this.entities.length,active:this.entities.filter(x=>x.status==="active").length,draft:this.entities.filter(x=>x.status==="draft").length,types:new Set(this.entities.map(x=>x.type)).size};}
}
window.BlueCurrentHospitalityOntologyEngine=BlueCurrentHospitalityOntologyEngine;})();