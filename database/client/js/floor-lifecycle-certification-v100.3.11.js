(function(){
"use strict";
const VERSION="100.3.11";

function tableId(table){return String(table?.dataset?.table||"").trim();}
function activeServiceRows(){return window.BlueCurrentServiceHandoff?.getActive?.()||[];}

function syncCheckState(){
  const map=document.getElementById("hostFloorMap");
  if(!map)return false;
  const checkTables=new Set(activeServiceRows()
    .filter(row=>String(row?.status||"").toLowerCase()==="check")
    .map(row=>String(row?.tableId||row?.table||"").trim())
    .filter(Boolean));

  map.querySelectorAll(".host-table").forEach(table=>{
    const onCheck=table.classList.contains("seated")&&checkTables.has(tableId(table));
    table.classList.toggle("check",onCheck);
    table.dataset.bcServiceStage=onCheck?"check":table.classList.contains("seated")?"seated":"";
    if(!table.dataset.bcServiceStage)delete table.dataset.bcServiceStage;
    const label=table.querySelector("small");
    if(onCheck&&label)label.textContent="CHECK";
    else if(table.classList.contains("seated")&&label&&label.textContent.trim().toUpperCase()==="CHECK")label.textContent="SEATED";
  });
  window.BlueCurrentFloorClarityV100310?.refresh?.();
  return true;
}

function bind(){
  ["bc:service-party-received","bc:service-party-updated","bc:service-party-completed","bc:host-guest-seated","bc:host-table-cleaning","bc:table-turn-completed"]
    .forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(syncCheckState)));
  requestAnimationFrame(syncCheckState);
  window.BlueCurrentFloorLifecycleCertification={version:VERSION,syncCheckState};
  document.documentElement.dataset.bcFloorLifecycleVersion=VERSION;
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
