(function(){"use strict";
class BlueCurrentFeaturePackLoaderEngine{
 constructor({eventBus,appState}){this.eventBus=eventBus;this.appState=appState;this.manifest=window.BlueCurrentFeaturePacks||{};this.active=new Set(window.BlueCurrentRequestedPacks||[]);this.refresh("initial");}
 snapshot(reason="manual"){const packs=Object.values(this.manifest).filter(x=>x.pack!=="platform").map(group=>({name:group.pack,label:group.pack.charAt(0).toUpperCase()+group.pack.slice(1),scripts:group.scripts.length,centers:group.centers.length,active:this.active.has(group.pack)}));const totalDeferred=Object.values(this.manifest).reduce((sum,g)=>sum+g.scripts.length,0);return{capturedAt:new Date().toISOString(),reason,mode:window.BlueCurrentAssetMode||"focused",profile:this.active.size?[...this.active].join(", "):"focused",activePacks:[...this.active],totalDeferred,packs};}
 refresh(reason="manual"){const value=this.snapshot(reason);this.appState.update({featurePackLoader:value,featurePackLoaderHistory:[...(this.appState.get("featurePackLoaderHistory")||[]),value].slice(-20)});this.eventBus.emit("feature-pack-loader:updated",structuredClone(value));return value;}
 activate(pack){const next=new URL(location.href);next.search="";next.searchParams.set("pack",pack);location.assign(next.toString());}
 focused(){const next=new URL(location.href);next.search="";location.assign(next.toString());}
 full(){const next=new URL(location.href);next.search="";next.searchParams.set("full","1");location.assign(next.toString());}
}
window.BlueCurrentFeaturePackLoaderEngine=BlueCurrentFeaturePackLoaderEngine;})();