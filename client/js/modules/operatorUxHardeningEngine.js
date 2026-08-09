(function(global){"use strict";
class BlueCurrentOperatorUxHardeningEngine{
  constructor({eventBus,appState}={}){this.eventBus=eventBus;this.appState=appState;this._keyHandler=null;}
  token(){return localStorage.getItem("blueCurrentV3230Token")||"";}
  headers(){return {Authorization:`Bearer ${this.token()}`};}
  async snapshot(){const r=await fetch("/api/operator-ux-hardening",{headers:this.headers()}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Operator UX hardening failed (${r.status})`);this.appState?.update?.({operatorUxHardening:d});return d;}
  async createFinding(payload={}){const r=await fetch("/api/operator-ux-hardening/findings",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`UX finding creation failed (${r.status})`);this.eventBus?.emit?.("operator-ux:finding-created",structuredClone(d));return d;}
  async resolveFinding(id,payload={}){const r=await fetch(`/api/operator-ux-hardening/findings/${encodeURIComponent(id)}/resolve`,{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`UX finding resolution failed (${r.status})`);this.eventBus?.emit?.("operator-ux:finding-resolved",structuredClone(d));return d;}
  async certify(payload={}){const r=await fetch("/api/operator-ux-hardening/certify",{method:"POST",headers:{...this.headers(),"Content-Type":"application/json"},body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`UX certification failed (${r.status})`);this.eventBus?.emit?.("operator-ux:certified",structuredClone(d));return d;}
  jumpTo(surfaceId){const node=document.getElementById(surfaceId);if(!node)return false;node.hidden=false;document.body.classList.remove("blue-current-command-mode");document.body.classList.add("blue-current-full-platform-mode");node.scrollIntoView({behavior:"smooth",block:"start"});node.querySelector("button,input,select,textarea,[tabindex]")?.focus?.({preventScroll:true});return true;}
  installShortcuts(workflows=[]){
    if(this._keyHandler)window.removeEventListener("keydown",this._keyHandler);
    const map=new Map(workflows.map((x,i)=>[String(i+1),x.surfaceId]));
    this._keyHandler=ev=>{
      if(!ev.altKey||ev.ctrlKey||ev.metaKey)return;
      const tag=String(ev.target?.tagName||"").toLowerCase();
      if(["input","textarea","select"].includes(tag))return;
      const surface=map.get(ev.key);if(!surface)return;
      ev.preventDefault();this.jumpTo(surface);
    };
    window.addEventListener("keydown",this._keyHandler);
  }
}
if(typeof module!=="undefined"&&module.exports)module.exports=BlueCurrentOperatorUxHardeningEngine;
if(global)global.BlueCurrentOperatorUxHardeningEngine=BlueCurrentOperatorUxHardeningEngine;
})(typeof window!=="undefined"?window:globalThis);