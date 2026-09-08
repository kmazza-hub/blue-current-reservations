(function(){"use strict";
class BlueCurrentAIPPolicyEnforcementEngine{
 constructor(eventBus){this.eventBus=eventBus;this.policyKey="bluecurrent:v4036:policies";this.decisionKey="bluecurrent:v4039:policy-decisions";this.decisions=this.read(this.decisionKey);}
 read(key){try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[];}catch{return[];}}
 save(){localStorage.setItem(this.decisionKey,JSON.stringify(this.decisions.slice(0,200)));}
 activePolicies(){return this.read(this.policyKey).filter(p=>p&&p.status==="active");}
 evaluate(input={}){
  const action=String(input.action||"").trim();if(!action)throw new Error("Describe the proposed AI action.");
  const agent=String(input.agent||"Operations").trim();const lower=action.toLowerCase();
  const writeCapable=/change|update|send|notify|assign|schedule|execute|cancel|close|delete|refund|move|open|hold|fire/.test(lower);
  const critical=/delete|refund|payroll|financial|close location|terminate|critical/.test(lower);
  const policies=this.activePolicies();
  const applicable=policies.filter(p=>p.agents?.includes?.("All governed agents")||p.agents?.some?.(name=>String(name).toLowerCase()===agent.toLowerCase())||lower.includes(String(p.instruction||"").split(" ")[0]?.toLowerCase()));
  const blocking=applicable.filter(p=>p.risk==="high"&&/must not|prohibit|never|blocked|forbid/.test(String(p.instruction||"").toLowerCase()));
  const approvalRequired=writeCapable||critical||applicable.some(p=>p.approvalRequired);
  const status=blocking.length?"blocked":approvalRequired?"review-required":"allowed";
  const decision={id:`AIP-ENF-${Date.now()}`,action,agent,status,writeCapable,critical,approvalRequired,policyIds:applicable.map(p=>p.id),reasons:blocking.length?["An active high-risk policy blocks this action."]:approvalRequired?["The action can alter operations and requires human approval."]:["No active policy requires review for this advisory action."],createdAt:new Date().toISOString()};
  this.decisions.unshift(decision);this.save();this.eventBus?.emit?.("aip:policy-enforced",decision);return decision;
 }
}
window.BlueCurrentAIPPolicyEnforcementEngine=BlueCurrentAIPPolicyEnforcementEngine;})();
