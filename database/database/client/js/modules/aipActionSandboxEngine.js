(function(){"use strict";
class BlueCurrentAIPActionSandboxEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4021:action-sandbox";this.items=this.read();}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||"[]");}catch{return[];}}
 persist(){localStorage.setItem(this.key,JSON.stringify(this.items.slice(0,100)));}
 simulate(input={}){const action=String(input.action||"").trim();if(!action)throw new Error("Describe an action to simulate.");const risk=String(input.risk||"medium");const writeCapable=Boolean(input.writeCapable);const approvalRequired=writeCapable||["high","critical"].includes(risk);const checks=[
  {label:"Action is described",pass:action.length>=8},
  {label:"Named owner is present",pass:Boolean(String(input.owner||"").trim())},
  {label:"Write action requires approval",pass:!writeCapable||approvalRequired},
  {label:"Critical action cannot auto-execute",pass:risk!=="critical"||approvalRequired}
 ];const passed=checks.filter(x=>x.pass).length;const record={id:`AIP-SBX-${Date.now()}`,action,owner:String(input.owner||"Manager").trim()||"Manager",risk,writeCapable,approvalRequired,score:Math.round(passed/checks.length*100),status:checks.every(x=>x.pass)?(approvalRequired?"Approval required":"Safe to review"):"Blocked",checks,createdAt:new Date().toISOString()};this.items.unshift(record);this.persist();this.eventBus?.emit?.("aip:action-simulated",record);return record;}
 list(){return [...this.items];}
 submit(id){const item=this.items.find(x=>x.id===id);if(!item)return null;item.submittedAt=new Date().toISOString();item.status="Pending approval";this.persist();this.eventBus?.emit?.("aip:approval-requested",{source:"action-sandbox",...item});return item;}
}
window.BlueCurrentAIPActionSandboxEngine=BlueCurrentAIPActionSandboxEngine;})();