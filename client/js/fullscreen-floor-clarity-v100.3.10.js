(function(){
"use strict";
const VERSION="100.3.57";
const q=s=>document.querySelector(s);
let floorObserver=null;
let floorObserverRoot=null;
const OPERATIONAL_MAP_CHILDREN=new Set([
  "hostTableDetail",
  "bcTableLifecycleCardV100_2_22",
  "bcUnifiedSeatConfirmV100_2_18",
  "bcWaitlistSeatConfirmV100_2_15",
  "bcActivePartyConfirmV100_2_16"
]);

function inFocusedFloor(){return document.documentElement.classList.contains("bc-ipad-floor-focus");}
function focusReservedTool(){
  if(!inFocusedFloor())return;
  const tool=q(".bc-reserved-table-tool-v100-2-26:not([hidden])");
  if(!tool)return;
  tool.dataset.bcFullscreenFloorModal="true";
}
function hideMapNoise(){
  if(!inFocusedFloor())return;
  const map=q("#bcFloorFocusStage #hostFloorMap");
  if(!map)return;
  Array.from(map.children).forEach(el=>{
    const operational=el.classList.contains("host-table")||OPERATIONAL_MAP_CHILDREN.has(el.id);
    el.classList.toggle("bc-floor-map-nonessential-v100-3-10",!operational);
  });
}
function refreshFloorPresentation(){
  if(!inFocusedFloor())return;
  hideMapNoise();
  focusReservedTool();
}
function disconnectFloorObserver(){
  if(floorObserver){floorObserver.disconnect();floorObserver=null;}
  floorObserverRoot=null;
}
function connectFloorObserver(){
  if(!inFocusedFloor()){disconnectFloorObserver();return;}
  const root=q("#bcFloorFocusStage #hostFloorMap");
  if(!root){disconnectFloorObserver();return;}
  if(floorObserver&&floorObserverRoot===root)return;
  disconnectFloorObserver();
  floorObserverRoot=root;
  floorObserver=new MutationObserver(()=>{
    if(!inFocusedFloor())return;
    // Coalesce floor-only mutations; never observe the rest of the application.
    requestAnimationFrame(refreshFloorPresentation);
  });
  floorObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
}
function syncFloorLifecycle(){
  if(inFocusedFloor()){
    connectFloorObserver();
    requestAnimationFrame(refreshFloorPresentation);
  }else{
    disconnectFloorObserver();
  }
}
function bind(){
  // Critical freeze repair: observe only the single root class that enters/exits
  // Floor Focus. V100.3.10 observed every class/hidden mutation in document.body,
  // which caused mutation storms when Guest and other workspaces rendered.
  const rootObserver=new MutationObserver(syncFloorLifecycle);
  rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});

  document.addEventListener("click",e=>{
    if(!inFocusedFloor())return;
    if(e.target.closest("[data-host-zone]"))setTimeout(()=>{connectFloorObserver();refreshFloorPresentation();},30);
  },true);

  syncFloorLifecycle();
  window.BlueCurrentFloorClarityV100310={version:VERSION,refresh:refreshFloorPresentation,operationalParity:true};
  document.documentElement.dataset.bcFloorClarityVersion=VERSION;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
