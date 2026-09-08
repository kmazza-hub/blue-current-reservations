(function(){"use strict";
class BlueCurrentAIPPolicyComposerEngine{
 constructor(eventBus){this.eventBus=eventBus;this.key="bluecurrent:v4036:policies";this.policies=this.read();}
 read(){try{const value=JSON.parse(localStorage.getItem(this.key)||"[]");return Array.isArray(value)?value:[];}catch{return[];}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.policies));}
 compile(text,owner="AIP Governance"){
  const instruction=String(text||"").trim();if(!instruction)throw new Error("Describe the policy in natural language.");
  const lower=instruction.toLowerCase();
  const risk=/critical|financial|payroll|refund|close|delete/.test(lower)?"high":/change|update|send|notify|assign|schedule|execute/.test(lower)?"medium":"low";
  const approvalRequired=risk!=="low"||/approval|approve|manager|human/.test(lower);
  const agents=["Operations","Executive","Kitchen","Concierge","Labor","Inventory"].filter(name=>lower.includes(name.toLowerCase()));
  const policy={id:`AIP-POL-${Date.now()}`,instruction,owner:String(owner||"AIP Governance").trim(),risk,approvalRequired,agents:agents.length?agents:["All governed agents"],status:"draft",createdAt:new Date().toISOString()};
  this.policies.unshift(policy);this.policies=this.policies.slice(0,100);this.save();this.eventBus?.emit?.("aip:policy-drafted",policy);return policy;
 }
 setStatus(id,status){const item=this.policies.find(p=>p.id===id);if(!item)return null;item.status=status;item.updatedAt=new Date().toISOString();this.save();this.eventBus?.emit?.("aip:policy-status-changed",{...item});return item;}
}
window.BlueCurrentAIPPolicyComposerEngine=BlueCurrentAIPPolicyComposerEngine;})();