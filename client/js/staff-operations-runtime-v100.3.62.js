(() => {
"use strict";
const VERSION="100.3.62",TOKEN_KEY="blueCurrentV3230Token";
let api=null,workforce=null,scheduling=null;
const listeners=new Map();
const eventBus={
 on(type,handler){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(handler);return()=>listeners.get(type)?.delete(handler)},
 emit(type,payload){listeners.get(type)?.forEach(handler=>{try{handler(payload)}catch(error){console.error(`[Blue Current ${VERSION}] staff event failed`,error)}})}
};
const appState={update(){}};
function syncToken(){
 api ||= new window.BlueCurrentCloudApi("");
 const token=localStorage.getItem(TOKEN_KEY)||"";
 if(api.token!==token)api.setToken(token);
 return api;
}
function initialize(){
 if(window.BlueCurrentAssetMode==="full")return;
 const client=syncToken();
 if(!workforce&&window.createBlueCurrentWorkforceFoundationModule)workforce=window.createBlueCurrentWorkforceFoundationModule(eventBus,appState,{api:client});
 if(!scheduling&&window.createBlueCurrentSchedulingModule)scheduling=window.createBlueCurrentSchedulingModule(eventBus,appState,{api:client});
 window.BlueCurrentFocusedStaffOperations={version:VERSION,refresh(){syncToken();workforce?.reload?.();scheduling?.reload?.();window.BlueCurrentStaffTruthV100_2_64?.refresh?.();window.BlueCurrentStaffCoverageV100_2_65?.refresh?.();window.BlueCurrentStaffAttendanceV100_2_66?.refresh?.();},get modules(){return{workforce:Boolean(workforce),scheduling:Boolean(scheduling)}}};
 document.documentElement.dataset.bcStaffOperationsRuntime=VERSION;
}
window.addEventListener("bluecurrent:auth-session-state",event=>{
 if(!event.detail?.snapshot?.authenticated)return;
 syncToken();eventBus.emit("auth:signed-in",event.detail.snapshot.session);window.BlueCurrentFocusedStaffOperations?.refresh?.();
});
window.addEventListener("bc:operator-workspace-opened",event=>{if(event.detail?.job==="staff")setTimeout(()=>window.BlueCurrentFocusedStaffOperations?.refresh?.(),0)});
initialize();
})();
