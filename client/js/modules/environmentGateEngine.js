(function(){"use strict";
class BlueCurrentEnvironmentGateEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;setTimeout(()=>this.run("initial"),1100);}
 async run(reason="manual"){
  const checks=[];const add=(label,pass,detail)=>checks.push({label,pass:Boolean(pass),detail});
  const meta=document.querySelector('meta[name="blue-current-build"]')?.content||"unknown";
  add("Build metadata current",meta.includes("37.30.0"),meta);
  add("Focused mode default",new URLSearchParams(location.search).get("full")!=="1",location.search||"focused");
  add("Supported protocol",["http:","https:"].includes(location.protocol),location.protocol);
  add("Secure public context",location.hostname==="localhost"||location.protocol==="https:",location.origin);
  add("No duplicate script URLs",(()=>{const a=[...document.scripts].map(s=>s.src).filter(Boolean);return new Set(a).size===a.length;})(),`${document.scripts.length} scripts`);
  try{const r=await fetch("/api/health",{cache:"no-store"});add("API health reachable",r.ok||r.status===404,`HTTP ${r.status}`);}catch(e){add("API health reachable",false,e.message);}
  const passed=checks.filter(x=>x.pass).length,score=Math.round(passed/checks.length*100),result={capturedAt:new Date().toISOString(),reason,score,status:score===100?"passed":score>=80?"watch":"failed",passed,total:checks.length,checks,nextAction:score===100?"Environment gate passed.":"Correct environment blockers before production signoff."};
  this.appState.update({environmentGate:result,environmentGateHistory:[...(this.appState.get("environmentGateHistory")||[]),result].slice(-30)});this.eventBus.emit("environment-gate:updated",structuredClone(result));return result;
 }
}
window.BlueCurrentEnvironmentGateEngine=BlueCurrentEnvironmentGateEngine;})();
