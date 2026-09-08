(function(){"use strict";
class BlueCurrentV37CertificationEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;setTimeout(()=>this.run("initial"),1500);}
 run(reason="manual"){
  const sources=[
   ["Production runtime",this.appState.get("productionRuntime")],
   ["Production smoke test",this.appState.get("productionSmokeTest")],
   ["Deployment rehearsal",this.appState.get("deploymentRehearsal")],
   ["Environment gate",this.appState.get("environmentGate")],
   ["Acceptance signoff",this.appState.get("acceptanceSignoff")]
  ];
  const checks=sources.map(([label,v])=>({label,pass:Number(v?.score||0)>=80,detail:`${Number(v?.score||0)}% · ${v?.status||"missing"}`}));
  const passed=checks.filter(x=>x.pass).length,score=Math.round(passed/checks.length*100),certified=score===100;
  const result={capturedAt:new Date().toISOString(),reason,score,status:certified?"certified":score>=80?"controlled":"blocked",passed,total:checks.length,checks,certificateId:certified?`BC-V37-${Date.now().toString(36).toUpperCase()}`:null,nextAction:certified?"V37 is complete and certified for controlled production use.":"Resolve remaining V37 certification controls."};
  this.appState.update({v37Certification:result,v37CertificationHistory:[...(this.appState.get("v37CertificationHistory")||[]),result].slice(-20)});this.eventBus.emit("v37-certification:updated",structuredClone(result));return result;
 }
 export(){const v=this.appState.get("v37Certification")||{},blob=new Blob([JSON.stringify(v,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`blue-current-v37-certificate-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);return v;}
}
window.BlueCurrentV37CertificationEngine=BlueCurrentV37CertificationEngine;})();
