(function(){
"use strict";
const VERSION="100.3.10";
const q=s=>document.querySelector(s);
let detailDialog=null;

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
  const map=q("#bcFloorFocusStage #hostFloorMap");
  if(!map)return;
  Array.from(map.children).forEach(el=>{
    if(el.classList.contains("host-table"))return;
    if(el.classList.contains("bc-reserved-table-tool-v100-2-26"))return;
    el.classList.add("bc-floor-map-nonessential-v100-3-10");
  });
}
function refreshFloorPresentation(){if(!inFocusedFloor())return;hideMapNoise();focusReservedTool();}
function bind(){
  document.addEventListener("click",e=>{
    if(!inFocusedFloor())return;
    const table=e.target.closest("#bcFloorFocusStage #hostFloorMap .host-table");
    if(!table)return;
    if(seatingMode())return; // preserve the real seat-assignment lifecycle unchanged
    const status=rawStatus(table);
    if(status==="reserved"){
      setTimeout(focusReservedTool,0);setTimeout(focusReservedTool,40);return; // preserve existing reservation controls
    }
    e.preventDefault();e.stopImmediatePropagation();openStatusDialog(table);
  },true);
  const observer=new MutationObserver(()=>refreshFloorPresentation());
  observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class"]});
  document.addEventListener("click",e=>{if(e.target.closest("[data-host-zone]"))setTimeout(refreshFloorPresentation,30);},true);
  refreshFloorPresentation();
  window.BlueCurrentFloorClarityV100310={version:VERSION,refresh:refreshFloorPresentation};
  document.documentElement.dataset.bcFloorClarityVersion=VERSION;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
