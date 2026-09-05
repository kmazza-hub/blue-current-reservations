(function(){
"use strict";
const VERSION="100.3.10.3";
const VALID_ZONES=new Set(["main","waterfront","private"]);

function inFocusedFloor(){
  return document.documentElement.classList.contains("bc-ipad-floor-focus");
}

function focusedZoneButton(target){
  if(!inFocusedFloor())return null;
  return target.closest("#bcFloorFocusStage .host-floor-toolbar [data-host-zone]");
}

function showZone(zone){
  if(!VALID_ZONES.has(zone))return false;
  const map=document.querySelector("#bcFloorFocusStage #hostFloorMap");
  if(!map)return false;

  // The restoration controller owns the final production floor layout. The
  // older host-zone controller is retained as a compatibility fallback.
  const controller=window.__bcHostFloorRestorationV100_2_47;
  if(typeof controller?.show==="function")controller.show(zone);
  else window.__bcHostZonesV100_2_34?.show?.(zone);

  // Keep the control state deterministic even if an older listener renders
  // asynchronously after the panel has been portaled under <body>.
  map.dataset.bcActiveZone=zone;
  document.querySelectorAll("[data-host-zone]").forEach(button=>{
    const active=button.dataset.hostZone===zone;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",active?"true":"false");
  });
  window.BlueCurrentFloorClarityV100310?.refresh?.();
  window.dispatchEvent(new CustomEvent("bc:fullscreen-floor-zone-changed",{detail:{zone,version:VERSION}}));
  return true;
}

function bind(){
  // Delegation is scoped to the full-screen stage. Regular Floor keeps its
  // existing, proven handlers and seating eligibility remains untouched.
  document.addEventListener("click",event=>{
    const button=focusedZoneButton(event.target);
    if(!button)return;
    const zone=button.dataset.hostZone;
    requestAnimationFrame(()=>showZone(zone));
  },true);

  window.BlueCurrentFullscreenFloorZones={version:VERSION,show:showZone};
  document.documentElement.dataset.bcFullscreenFloorZoneVersion=VERSION;
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
