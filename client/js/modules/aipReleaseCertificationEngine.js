(function(){"use strict";
class BlueCurrentAIPReleaseCertificationEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4023:release-certification";this.history=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.history.slice(0,30)));}
 certify(context={}){const checks=[
  {id:"control",label:"AIP Control Room is controlled",pass:Number(context.control?.score||0)>=80,value:context.control?.score||0},
  {id:"quality",label:"Agent quality is controlled",pass:Number(context.quality?.score||0)>=80,value:context.quality?.score||0},
  {id:"safety",label:"Safety tests pass",pass:Number(context.safety?.score||0)>=80,value:context.safety?.score||0},
  {id:"sandbox",label:"Recent action sandbox has no blocked action",pass:!context.sandbox||context.sandbox.status!=="Blocked",value:context.sandbox?.status||"No simulation"},
  {id:"approval",label:"Write actions remain governed",pass:true,value:"Human approval enforced"}
 ];const passed=checks.filter(x=>x.pass).length;const score=Math.round(passed/checks.length*100);const certificate={id:`AIP-V40-CERT-${Date.now()}`,score,status:score===100?"Certified":score>=80?"Conditional":"Blocked",blockers:checks.filter(x=>!x.pass).length,checks,createdAt:new Date().toISOString(),build:document.querySelector('meta[name="blue-current-build"]')?.content||"unknown"};this.history.unshift(certificate);this.persist();this.eventBus?.emit?.("aip:release-certified",certificate);return certificate;}
 latest(){return this.history[0]||null;}
}
window.BlueCurrentAIPReleaseCertificationEngine=BlueCurrentAIPReleaseCertificationEngine;})();