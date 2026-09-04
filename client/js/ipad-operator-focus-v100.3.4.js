(function(){
"use strict";
const VERSION="100.3.4";
const q=(id)=>document.getElementById(id);
const isIPad=()=>/iPad/.test(navigator.userAgent)||((navigator.platform==="MacIntel")&&navigator.maxTouchPoints>1);
function safeTop(){return Math.max(12,Number(getComputedStyle(document.documentElement).getPropertyValue("--bc-ipad-safe-top").replace("px",''))||12);}
function settleScroll(target,{block="start",focus=false}={}){
  if(!target)return;
  const run=()=>{
    target.scrollIntoView({behavior:"auto",block});
    // iPad Safari can restore the previous visual viewport after workspace activation.
    if(isIPad()) window.scrollBy({top:-safeTop(),left:0,behavior:"auto"});
    if(focus) target.focus?.({preventScroll:true});
  };
  run(); [120,320,650].forEach(ms=>setTimeout(run,ms));
}
function focusFloor(reason="manual"){
  const host=q("host-stand"), panel=host?.querySelector(".host-floor-panel"), map=q("hostFloorMap");
  if(!panel||!map)return false;
  document.documentElement.classList.add("bc-ipad-floor-focus");
  panel.classList.add("bc-ipad-floor-focus-panel");
  panel.dataset.bcFocusReason=reason;
  let close=q("bcIpadFloorFocusClose");
  if(!close){
    close=document.createElement("button"); close.type="button"; close.id="bcIpadFloorFocusClose";
    close.className="bc-ipad-floor-focus-close"; close.textContent="← Back";
    close.addEventListener("click",exitFloor);
    panel.prepend(close);
  }
  settleScroll(panel,{block:"start"});
  return true;
}
function exitFloor(){
  document.documentElement.classList.remove("bc-ipad-floor-focus");
  const panel=q("host-stand")?.querySelector(".host-floor-panel");
  panel?.classList.remove("bc-ipad-floor-focus-panel");
  if(panel) delete panel.dataset.bcFocusReason;
}
function targetForJob(key){
  if(key==="service") return q("serviceCoordination")||q("service-coordination");
  if(key==="kitchen") return q("kitchenThroughputCenter");
  if(key==="staff") return q("workforce-intelligence");
  if(key==="floor") return q("hostFloorMap");
  if(key==="walkin"||key==="addReservation"||key==="guests") return q("host-stand");
  return null;
}
function enhanceWorkflow(){
  const api=window.BlueCurrentWorkflows;if(!api?.open||api.__ipadFocusWrapped)return;
  const original=api.open.bind(api);
  api.open=function(key,options){
    const ok=original(key,options);
    if(key==="floor") setTimeout(()=>focusFloor("floor-job"),80);
    const target=targetForJob(key);
    if(target && key!=="floor") [360,700,1050].forEach(ms=>setTimeout(()=>settleScroll(target),ms));
    return ok;
  };
  api.__ipadFocusWrapped=true;
}
function bind(){
  enhanceWorkflow();
  // The floor overview itself is a focus affordance, but do not steal table/action taps.
  q("hostFloorMap")?.addEventListener("click",e=>{
    if(e.target.closest("button,.host-table,[data-table],a,input,select,textarea"))return;
    focusFloor("map-tap");
  });
  // Seating is a single-purpose floor job: enter focus mode as soon as Seat is chosen.
  document.addEventListener("click",e=>{
    const seat=e.target.closest("button"); if(!seat)return;
    const text=(seat.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
    if(text==="seat" || /^seat .* at table/.test(text)) setTimeout(()=>focusFloor("seating"),40);
  },true);
  window.addEventListener("bc:host-guest-seated",()=>setTimeout(exitFloor,120));
  window.addEventListener("popstate",exitFloor);
  window.addEventListener("hashchange",()=>{if(location.hash!=="#host-stand")exitFloor();});
  window.BlueCurrentIpadOperatorFocus={version:VERSION,focusFloor,exitFloor,settleScroll};
  document.documentElement.dataset.bcIpadOperatorFocusVersion=VERSION;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
