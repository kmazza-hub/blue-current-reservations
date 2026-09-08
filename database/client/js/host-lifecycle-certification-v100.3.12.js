(function(){
"use strict";
const VERSION="100.3.12";
const normalize=value=>String(value||"").replace(/\s+/g," ").trim().toLowerCase();
const rowName=row=>normalize(row?.querySelector?.("strong")?.textContent);

function removeMatching(containerSelector,name,keep=null){
  const key=normalize(name);if(!key)return 0;
  let removed=0;
  document.querySelectorAll(`${containerSelector} article, ${containerSelector} .queue-item`).forEach(row=>{
    if(row===keep||rowName(row)!==key)return;
    row.remove();removed++;
  });
  return removed;
}

function syncCounts(){
  window.__bcArrivalPriorityQueueV100_2_17?.syncCounts?.();
  window.__bcHostWaitQuoteV100_2_26?.refresh?.();
}

function reservationEnteredWaitlist(name,readyRow=null){
  const removed=removeMatching("#bcReservationList",name);
  removeMatching("#arrivalQueue",name);
  syncCounts();
  return {removed,readyRowPresent:Boolean(readyRow?.isConnected)};
}

function guestSeated(detail={}){
  const name=detail.guest||detail.name;
  if(!normalize(name))return false;
  removeMatching("#waitlistQueue",name);
  removeMatching("#arrivalQueue",name);
  removeMatching("#bcReservationList",name);
  syncCounts();
  return true;
}

function bind(){
  window.addEventListener("bc:host-reservation-entered-waitlist",event=>reservationEnteredWaitlist(event.detail?.guest,event.detail?.readyRow));
  window.addEventListener("bc:host-guest-seated",event=>guestSeated(event.detail||{}));
  window.BlueCurrentHostLifecycleCertification={version:VERSION,reservationEnteredWaitlist,guestSeated};
  document.documentElement.dataset.bcHostLifecycleVersion=VERSION;
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
