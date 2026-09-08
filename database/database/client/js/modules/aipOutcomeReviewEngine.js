(function(){"use strict";
class BlueCurrentAIPOutcomeReviewEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4035:outcome-reviews";this.items=this.read();}
 read(){try{const v=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(v)?v:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.items));}
 capture({planId,reviewer,result,note}){const item={id:`AIP-OUT-${Date.now()}`,planId:planId||"unlinked",reviewer:String(reviewer||"Manager").trim()||"Manager",result:result||"effective",note:String(note||"").trim(),createdAt:new Date().toISOString()};this.items.unshift(item);this.items=this.items.slice(0,100);this.save();this.eventBus?.emit?.("aip:outcome-reviewed",item);return item;}
 summary(){const total=this.items.length,effective=this.items.filter(i=>i.result==="effective").length;return{total,effective,needsWork:total-effective,rate:total?Math.round(effective/total*100):0};}
}
window.BlueCurrentAIPOutcomeReviewEngine=BlueCurrentAIPOutcomeReviewEngine;})();
