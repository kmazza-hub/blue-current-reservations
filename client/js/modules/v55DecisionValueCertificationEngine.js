(function(global){"use strict";
class BlueCurrentV55DecisionValueCertificationEngine{
 constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;}
 token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
 headers(){return{Authorization:`Bearer ${this.token()}`};}
 async snapshot(){const r=await fetch("/api/v55-decision-value-certification",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V55 decision-value certification failed (${r.status})`);this.appState?.update?.({v55DecisionValueCertification:d});return d;}
 async review(payload){const r=await fetch("/api/v55-decision-value-certification/review",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V55 decision-value review failed (${r.status})`);return d;}
 async certify(payload){const r=await fetch("/api/v55-decision-value-certification/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`V55 decision-value certification failed (${r.status})`);return d;}
}
if(global)global.BlueCurrentV55DecisionValueCertificationEngine=BlueCurrentV55DecisionValueCertificationEngine;})(window);