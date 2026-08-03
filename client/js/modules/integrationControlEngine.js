(function(){"use strict";
class BlueCurrentIntegrationControlEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.value=null;['state:changed','runtime-recovery:updated','release-certification:updated'].forEach(n=>eventBus.on(n,()=>this.refresh(n)));}
 refresh(reason='manual'){const s=this.appState.getState();const sources=[
 {id:'reservations',label:'Reservations',required:true,connected:!!(s.reservations||s.reservationOperations),freshness:this.freshness(s.lastReservationSync||s.lastUpdated)},
 {id:'pos',label:'POS / revenue',required:true,connected:!!(s.posConnected||s.revenueMetrics||s.restaurantPerformance),freshness:this.freshness(s.lastPosSync||s.lastUpdated)},
 {id:'labor',label:'Labor / time clock',required:true,connected:!!(s.staff||s.timeClock||s.laborMetrics),freshness:this.freshness(s.lastLaborSync||s.lastUpdated)},
 {id:'inventory',label:'Inventory / purchasing',required:false,connected:!!(s.inventoryWaste||s.vendorPurchase),freshness:this.freshness(s.lastInventorySync||s.lastUpdated)},
 {id:'guest',label:'Guest communications',required:false,connected:!!(s.aiConcierge||s.guestRecovery),freshness:this.freshness(s.lastGuestSync||s.lastUpdated)}
 ];const weighted=sources.reduce((n,x)=>n+(x.connected?1:0)+(x.freshness==='fresh'?1:0),0),score=Math.round(weighted/(sources.length*2)*100),blockers=sources.filter(x=>x.required&&!x.connected).map(x=>x.label),status=blockers.length?'blocked':score>=80?'ready':score>=55?'watch':'forming';const value={capturedAt:new Date().toISOString(),reason,version:'V37.0.0',score,status,sources,blockers,nextAction:blockers.length?`Connect ${blockers[0]} before pilot traffic.`:score<80?'Refresh stale sources and verify field mappings.':'Integration control is ready for controlled pilot data.'};this.value=value;this.appState.update({integrationControl:value,integrationControlHistory:[...(s.integrationControlHistory||[]),value].slice(-50)});this.eventBus.emit('integration-control:updated',structuredClone(value));return structuredClone(value)}
 freshness(ts){if(!ts)return'unknown';const age=Date.now()-new Date(ts).getTime();return age<15*60e3?'fresh':age<60*60e3?'aging':'stale'} snapshot(){return structuredClone(this.value||this.refresh('initial'))}
}
window.BlueCurrentIntegrationControlEngine=BlueCurrentIntegrationControlEngine;})();