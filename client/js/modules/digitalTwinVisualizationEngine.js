(function () {
  "use strict";
  class BlueCurrentDigitalTwinVisualizationEngine {
    constructor({ eventBus, appState }) { this.eventBus=eventBus; this.appState=appState; this.timer=null; this.value=null; ["operational-digital-twin:updated","occupancy:updated","table:assigned","reservation:confirmed","state:changed"].forEach(n=>eventBus.on(n,()=>this.schedule(n))); }
    schedule(reason){ clearTimeout(this.timer); this.timer=setTimeout(()=>this.refresh(reason),60); }
    refresh(reason="manual"){
      const s=this.appState.getState(); const twin=s.operationalDigitalTwin||{}; const tables=Array.isArray(twin.tables)?twin.tables:(Array.isArray(s.tables)?s.tables:[]);
      const normalized=(tables.length?tables:Array.from({length:20},(_,i)=>({id:`T${i+1}`,number:i+1,status:i<Math.round((s.occupancyPercent||64)/5)?"occupied":i%5===0?"turning":"available",partySize:i%4+2,zone:i<7?"Dining":i<14?"Patio":"Bar"}))).map((t,i)=>({id:t.id||`T${i+1}`,number:t.number||i+1,status:t.status||"available",partySize:Number(t.partySize||0),zone:t.zone||"Dining",risk:t.risk||((t.status==="occupied"&&i%6===0)?"watch":"stable")}));
      const occupied=normalized.filter(t=>t.status==="occupied").length; const turning=normalized.filter(t=>t.status==="turning").length;
      const kitchen=Number(twin.kitchen?.load??s.operationalContext?.kitchenLoad??s.kitchenLoad??0); const occupancy=normalized.length?Math.round(occupied/normalized.length*100):Number(s.occupancyPercent||0);
      const zones=["Dining","Patio","Bar"].map(name=>{const z=normalized.filter(t=>t.zone===name); const o=z.filter(t=>t.status==="occupied").length; return {name,total:z.length,occupied:o,load:z.length?Math.round(o/z.length*100):0};});
      const snapshot={capturedAt:new Date().toISOString(),reason,occupancy,kitchen,occupied,turning,available:Math.max(0,normalized.length-occupied-turning),tables:normalized,zones,attention:normalized.filter(t=>t.risk!=="stable").slice(0,5)};
      this.value=snapshot; this.appState.update({digitalTwinVisualization:snapshot,digitalTwinVisualizationHistory:[...(s.digitalTwinVisualizationHistory||[]),snapshot].slice(-30)}); this.eventBus.emit("digital-twin-visualization:updated",structuredClone(snapshot)); return structuredClone(snapshot);
    }
    snapshot(){ return structuredClone(this.value||this.refresh("initial")); }
  }
  window.BlueCurrentDigitalTwinVisualizationEngine=BlueCurrentDigitalTwinVisualizationEngine;
})();