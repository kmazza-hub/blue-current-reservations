(function(){"use strict";
class BlueCurrentPilotSyncRehearsalEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;}
 checks(){const config=this.appState.get("connectorConfiguration")||{},ds=this.appState.get("trustedDataset")||{},lineage=this.appState.get("dataLineage")||{};const configured=Object.values(config.connectors||{}).filter(c=>c.enabled).length;const requiredReady=Object.values(config.connectors||{}).filter(c=>c.required).every(c=>c.enabled&&c.endpoint);const hasData=Object.keys(ds.sources||{}).length>0;const lineageReady=(lineage.score||0)>=70;return[
 {id:"configuration",label:"Required connector configuration",pass:requiredReady,detail:`${configured} enabled connector(s)`},
 {id:"trusted-data",label:"Trusted pilot dataset",pass:hasData,detail:`${Object.keys(ds.sources||{}).length} promoted source(s)`},
 {id:"lineage",label:"Freshness and lineage",pass:lineageReady,detail:`${lineage.score||0}% lineage score`},
 {id:"approval",label:"Human promotion approval",pass:(this.appState.get("sourcePromotion")?.audit||[]).some(x=>x.action==="promote"),detail:"At least one explicit promotion approval required"}
 ];}
 run(owner="Pilot lead"){const checks=this.checks(),passed=checks.filter(c=>c.pass).length,score=Math.round(passed/checks.length*100),status=passed===checks.length?"ready":passed>=2?"watch":"blocked";const run={id:`rehearsal_${Date.now()}`,owner,at:new Date().toISOString(),checks,score,status,nextAction:status==="ready"?"Pilot synchronization rehearsal passed. Proceed to a controlled connector test window.":"Resolve failed rehearsal checks before live synchronization."};const history=[...(this.appState.get("pilotSyncRehearsalHistory")||[]),run].slice(-30);this.appState.update({pilotSyncRehearsal:run,pilotSyncRehearsalHistory:history});this.eventBus.emit("pilot-sync-rehearsal:completed",structuredClone(run));return run;}
 snapshot(){return this.appState.get("pilotSyncRehearsal")||{id:null,owner:"",at:null,checks:this.checks(),score:0,status:"not-run",nextAction:"Run a controlled synchronization rehearsal before connecting a live source."};}
 export(){const blob=new Blob([JSON.stringify(this.snapshot(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`blue-current-sync-rehearsal-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
}
window.BlueCurrentPilotSyncRehearsalEngine=BlueCurrentPilotSyncRehearsalEngine;})();