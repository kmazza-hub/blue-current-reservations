(function(){
"use strict";
const VERSION="100.3.10.1";
const q=s=>document.querySelector(s);
let detailDialog=null;
let floorObserver=null;
let floorObserverRoot=null;

function inFocusedFloor(){return document.documentElement.classList.contains("bc-ipad-floor-focus");}
function floorPanel(){return q("#bcFloorFocusStage .host-floor-panel")||q("#host-stand .host-floor-panel");}
function seatingMode(){return floorPanel()?.dataset.bcFocusReason==="seating";}
function tableNumber(el){return el?.dataset?.table||el?.querySelector("span")?.textContent?.trim()||"—";}
function rawStatus(el){
  const text=(el?.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
  if(el?.classList.contains("reserved")||/\b\d{1,2}:\d{2}\b/.test(text))return "reserved";
  if(el?.classList.contains("cleaning")||text.includes("cleaning"))return "cleaning";
  if(el?.classList.contains("check")||text.includes("check"))return "check";
  if(el?.classList.contains("seated")||text.includes("seated"))return "seated";
  if(el?.classList.contains("available")||text.includes("open"))return "available";
  return "table";
}
function statusCopy(status){
  if(status==="available")return {eyebrow:"AVAILABLE TABLE",title:"Ready to seat",copy:"This table is open. Select a guest from the waitlist or arrivals before assigning the table."};
  if(status==="seated")return {eyebrow:"SEATED TABLE",title:"Guest is seated",copy:"This table is occupied. Use Service when you need to progress the live table lifecycle."};
  if(status==="check")return {eyebrow:"CHECK TABLE",title:"Guest is on check",copy:"The party is finishing service. Use Service for the next live table action."};
  if(status==="cleaning")return {eyebrow:"CLEANING TABLE",title:"Table is being reset",copy:"This table is not ready to seat yet. Its live lifecycle remains controlled by Service."};
  return {eyebrow:"TABLE STATUS",title:"Table details",copy:"This table is part of the live dining-room floor."};
}
function ensureDialog(){
  if(detailDialog?.isConnected)return detailDialog;
  detailDialog=document.createElement("dialog");
  detailDialog.id="bcFloorTableStatusDialogV100310";
  detailDialog.className="bc-floor-table-status-dialog-v100-3-10";
  detailDialog.innerHTML=`<form method="dialog" class="bc-floor-table-status-card-v100-3-10">
    <header><div><small id="bcFloorStatusEyebrowV100310">TABLE STATUS</small><strong id="bcFloorStatusTableV100310">Table</strong></div><button value="cancel" class="bc-floor-status-close-v100-3-10" aria-label="Close">×</button></header>
    <section><strong id="bcFloorStatusTitleV100310">Table details</strong><p id="bcFloorStatusCopyV100310"></p></section>
    <footer><button value="cancel" class="bc-floor-status-done-v100-3-10">Done</button></footer>
  </form>`;
  document.body.appendChild(detailDialog);
  return detailDialog;
}
function openStatusDialog(table){
  const d=ensureDialog(),status=rawStatus(table),copy=statusCopy(status),num=tableNumber(table);
  d.dataset.status=status;
  d.querySelector("#bcFloorStatusEyebrowV100310").textContent=copy.eyebrow;
  d.querySelector("#bcFloorStatusTableV100310").textContent=`Table ${num}`;
  d.querySelector("#bcFloorStatusTitleV100310").textContent=copy.title;
  d.querySelector("#bcFloorStatusCopyV100310").textContent=copy.copy;
  if(!d.open)d.showModal();
}
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
    if(el.classList.contains("host-table"))return;
    if(el.classList.contains("bc-reserved-table-tool-v100-2-26"))return;
    if(!el.classList.contains("bc-floor-map-nonessential-v100-3-10")){
      el.classList.add("bc-floor-map-nonessential-v100-3-10");
    }
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
  document.addEventListener("click",e=>{
    if(!inFocusedFloor())return;
    const table=e.target.closest("#bcFloorFocusStage #hostFloorMap .host-table");
    if(!table)return;
    if(seatingMode())return;
    const status=rawStatus(table);
    if(status==="reserved"){
      // preserve existing reservation controls; only promote their presentation layer.
      setTimeout(focusReservedTool,0);setTimeout(focusReservedTool,40);return;
    }
    e.preventDefault();e.stopImmediatePropagation();openStatusDialog(table);
  },true);

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
  window.BlueCurrentFloorClarityV100310={version:VERSION,refresh:refreshFloorPresentation};
  document.documentElement.dataset.bcFloorClarityVersion=VERSION;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
