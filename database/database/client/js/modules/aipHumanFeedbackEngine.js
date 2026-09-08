(function(){"use strict";
class BlueCurrentAIPHumanFeedbackEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4028:human-feedback";this.items=this.read();}
 read(){try{const v=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.items.slice(-250)));}
 add({reviewer="Manager",agent="operations",rating=3,decision="useful",comment=""}={}){const item={id:`AIP-FB-${Date.now()}`,reviewer,agent,rating:Number(rating)||3,decision,comment,createdAt:new Date().toISOString()};this.items.push(item);this.save();this.eventBus?.emit?.("aip:human-feedback",item);return item;}
 stats(){const total=this.items.length,avg=total?this.items.reduce((a,b)=>a+b.rating,0)/total:0;return{total,average:Math.round(avg*10)/10,useful:this.items.filter(x=>x.decision==="useful").length,rework:this.items.filter(x=>x.decision==="rework").length,items:[...this.items].reverse()};}
}
window.BlueCurrentAIPHumanFeedbackEngine=BlueCurrentAIPHumanFeedbackEngine;})();