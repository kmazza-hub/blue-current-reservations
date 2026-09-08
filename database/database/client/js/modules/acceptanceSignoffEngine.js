(function(){"use strict";
class BlueCurrentAcceptanceSignoffEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.ensure();}
 ensure(){if(!this.appState.get("acceptanceSignoffs"))this.appState.update({acceptanceSignoffs:{manager:{approved:false,name:""},executive:{approved:false,name:""},technical:{approved:false,name:""}}});this.refresh();}
 set(role,approved,name=""){const next={...(this.appState.get("acceptanceSignoffs")||{})};next[role]={approved:Boolean(approved),name:String(name||"").trim(),updatedAt:new Date().toISOString()};this.appState.update({acceptanceSignoffs:next});return this.refresh();}
 refresh(){const signoffs=this.appState.get("acceptanceSignoffs")||{},roles=["manager","executive","technical"],approved=roles.filter(r=>signoffs[r]?.approved&&signoffs[r]?.name).length,score=Math.round(approved/roles.length*100),result={capturedAt:new Date().toISOString(),score,status:score===100?"passed":score>=67?"watch":"pending",approved,total:roles.length,signoffs,nextAction:score===100?"All required acceptance signoffs are complete.":"Collect named manager, executive, and technical approval."};this.appState.update({acceptanceSignoff:result});this.eventBus.emit("acceptance-signoff:updated",structuredClone(result));return result;}
}
window.BlueCurrentAcceptanceSignoffEngine=BlueCurrentAcceptanceSignoffEngine;})();
