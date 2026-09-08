(function(){"use strict";
const DEFAULTS=[
{id:"reservations",label:"Reservations",required:true,authMode:"api-key",environment:"sandbox",baseUrl:"",enabled:false},
{id:"pos",label:"POS / revenue",required:true,authMode:"oauth2",environment:"sandbox",baseUrl:"",enabled:false},
{id:"labor",label:"Labor / time clock",required:true,authMode:"api-key",environment:"sandbox",baseUrl:"",enabled:false},
{id:"inventory",label:"Inventory / purchasing",required:false,authMode:"api-key",environment:"sandbox",baseUrl:"",enabled:false}
];
class BlueCurrentConnectorConfigurationEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;if(!appState.get("connectorConfigurations"))appState.update({connectorConfigurations:DEFAULTS});}
 snapshot(){const connectors=(this.appState.get("connectorConfigurations")||DEFAULTS).map(x=>({...x,configured:Boolean(x.enabled&&x.baseUrl),status:x.enabled?(x.baseUrl?"configured":"needs-url"):"disabled"}));const configured=connectors.filter(x=>x.configured).length,blockers=connectors.filter(x=>x.required&&!x.configured),score=Math.round(connectors.reduce((n,x)=>n+(x.configured?1:x.required?0:.5),0)/connectors.length*100);return{capturedAt:new Date().toISOString(),connectors,configured,blockers:blockers.length,score,status:blockers.length?"forming":score>=90?"ready":"watch",nextAction:blockers.length?`Configure ${blockers[0].label} before live pilot use.`:"Connector metadata is ready for controlled testing."};}
 update(id,patch){const next=(this.appState.get("connectorConfigurations")||DEFAULTS).map(x=>x.id===id?{...x,...patch}:x);this.appState.update({connectorConfigurations:next});const value=this.publish("update");return value;}
 publish(reason="manual"){const value={...this.snapshot(),reason};this.appState.update({connectorConfiguration:value});this.eventBus.emit("connector-configuration:updated",structuredClone(value));return value;}
}
window.BlueCurrentConnectorConfigurationEngine=BlueCurrentConnectorConfigurationEngine;})();