(function(){
"use strict";
const VERSION="100.3.5";
const q=(id)=>document.getElementById(id);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const isIPad=()=>/iPad/.test(navigator.userAgent)||((navigator.platform==="MacIntel")&&navigator.maxTouchPoints>1);
let activeLock=null,lockToken=0,restoreY=0;
function cssPx(name,fallback=0){const raw=getComputedStyle(document.documentElement).getPropertyValue(name);const n=parseFloat(raw);return Number.isFinite(n)?n:fallback;}
function topInset(){
  const vv=window.visualViewport;
  const visualOffset=vv?Math.max(0,vv.offsetTop||0):0;
  return Math.max(12,cssPx("--bc-ipad-safe-top",12),visualOffset+12);
}
function elementY(el,extra=0){
  const r=el.getBoundingClientRect();
  return Math.max(0,Math.round(window.scrollY+r.top-topInset()-extra));
}
function exactScroll(el,{extra=0,focus=false}={}){
  if(!el)return false;
  window.scrollTo({top:elementY(el,extra),left:0,behavior:"auto"});
  if(focus)el.focus?.({preventScroll:true});
  return true;
}
function stopViewportLock(){
  if(activeLock){activeLock.disconnect?.();activeLock=null;}
  lockToken++;
}
function lockViewportTo(resolveTarget,{duration=1800,extra=0,focus=false}={}){
  stopViewportLock();
  const token=lockToken;
  const started=performance.now();
  let lastTarget=null;
  const run=()=>{
    if(token!==lockToken)return;
    const target=typeof resolveTarget==="function"?resolveTarget():resolveTarget;
    if(target&&target.getClientRects?.().length){lastTarget=target;exactScroll(target,{extra,focus});}
    if(performance.now()-started<duration)requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
  const root=document.body;
  if(root&&window.MutationObserver){
    const mo=new MutationObserver(()=>{const t=typeof resolveTarget==="function"?resolveTarget():resolveTarget;if(t&&t!==lastTarget)requestAnimationFrame(()=>exactScroll(t,{extra,focus}));});
    mo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["hidden","class","style"]});
    activeLock=mo;setTimeout(()=>{if(activeLock===mo){mo.disconnect();activeLock=null;}},duration+120);
  }
  const vv=window.visualViewport;
  if(vv){const onVV=()=>{const t=typeof resolveTarget==="function"?resolveTarget():resolveTarget;requestAnimationFrame(()=>exactScroll(t,{extra,focus}));};vv.addEventListener("resize",onVV,{passive:true});vv.addEventListener("scroll",onVV,{passive:true});setTimeout(()=>{vv.removeEventListener("resize",onVV);vv.removeEventListener("scroll",onVV);},duration+160);}
  return true;
}
function visible(el){if(!el||el.hidden||el.getAttribute("aria-hidden")==="true")return false;const s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"&&el.getClientRects().length>0;}
function destinationForJob(key){
  if(key==="guests") return q("bcHostGuestsPanel")||q("bcGuestSearchInput")||q("host-stand");
  if(key==="service") return document.querySelector("#digital-twin .twin-app")||q("digital-twin")||q("serviceCoordination")||q("service-coordination");
  if(key==="kitchen") return q("kitchenThroughputCenter")?.querySelector("header")||q("kitchenThroughputCenter");
  if(key==="staff") return document.querySelector("#workforce-intelligence .bc-staff-truth-v264")||q("workforce-intelligence");
  if(key==="reservations"||key==="addReservation") return q("bcHostReservationsPanel")||q("host-stand");
  if(key==="walkin") return q("bcHostWaitlistPanel")||q("host-stand");
  if(key==="floor") return q("hostFloorMap")||q("host-stand")?.querySelector(".host-floor-panel");
  return null;
}
function settleJob(key){
  const resolve=()=>{
    const preferred=destinationForJob(key);
    if(visible(preferred))return preferred;
    if(key==="staff")return document.querySelector("#workforce-intelligence .bc-staff-truth-v264")||q("workforce-intelligence");
    return preferred;
  };
  lockViewportTo(resolve,{duration:2100,focus:key==="guests"});
  if(key==="guests")setTimeout(()=>q("bcGuestSearchInput")?.focus({preventScroll:true}),420);
}
function floorPanel(){return q("host-stand")?.querySelector(".host-floor-panel");}
function floorMap(){return q("hostFloorMap");}
function addFloorControls(){
  const panel=floorPanel(),toolbar=panel?.querySelector(".host-floor-toolbar");if(!panel||!toolbar)return;
  let btn=q("bcFloorFullscreenButton");
  if(!btn){btn=document.createElement("button");btn.type="button";btn.id="bcFloorFullscreenButton";btn.className="bc-floor-fullscreen-button";btn.innerHTML='<span aria-hidden="true">⛶</span> Full screen floor';btn.setAttribute("aria-pressed","false");btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();focusFloor("button");});toolbar.appendChild(btn);}
}
function focusFloor(reason="manual"){
  const panel=floorPanel(),map=floorMap();if(!panel||!map)return false;
  stopViewportLock();restoreY=window.scrollY;
  document.documentElement.classList.add("bc-ipad-floor-focus");
  panel.classList.add("bc-ipad-floor-focus-panel");panel.dataset.bcFocusReason=reason;
  let header=q("bcIpadFloorFocusHeader");
  if(!header){
    header=document.createElement("div");header.id="bcIpadFloorFocusHeader";header.className="bc-ipad-floor-focus-header";
    header.innerHTML='<button type="button" id="bcIpadFloorFocusClose" class="bc-ipad-floor-focus-close">← Back</button><div><small>LIVE DINING ROOM</small><strong>Floor</strong><span>Tap a table to work the room. Section controls stay at the top.</span></div><button type="button" id="bcIpadFloorFocusExit" class="bc-ipad-floor-focus-exit">Exit full screen</button>';
    panel.prepend(header);
    q("bcIpadFloorFocusClose")?.addEventListener("click",exitFloor);
    q("bcIpadFloorFocusExit")?.addEventListener("click",exitFloor);
  }
  q("bcFloorFullscreenButton")?.setAttribute("aria-pressed","true");
  document.body.dataset.bcFloorFocus="true";
  requestAnimationFrame(()=>{panel.scrollTop=0;map.scrollIntoView({block:"nearest",behavior:"auto"});});
  return true;
}
function exitFloor(){
  const panel=floorPanel();
  document.documentElement.classList.remove("bc-ipad-floor-focus");
  panel?.classList.remove("bc-ipad-floor-focus-panel");if(panel)delete panel.dataset.bcFocusReason;
  delete document.body.dataset.bcFloorFocus;q("bcFloorFullscreenButton")?.setAttribute("aria-pressed","false");
  requestAnimationFrame(()=>window.scrollTo({top:restoreY,left:0,behavior:"auto"}));
}
function enhanceWorkflow(){
  const api=window.BlueCurrentWorkflows;if(!api?.open||api.__ipadFocusWrappedV10035)return;
  const original=api.open.bind(api);
  api.open=function(key,options){
    if(key!=="floor"&&document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor();
    const ok=original(key,options);
    if(key==="floor")setTimeout(()=>focusFloor("floor-job"),80);else [80,280,620].forEach(ms=>setTimeout(()=>settleJob(key),ms));
    return ok;
  };
  api.__ipadFocusWrappedV10035=true;
}
function bindFloorInteractions(){
  addFloorControls();
  floorMap()?.addEventListener("dblclick",e=>{if(!e.target.closest("button,.host-table,[data-table],a,input,select,textarea"))focusFloor("map-double-tap");});
  document.addEventListener("click",e=>{
    const seat=e.target.closest("button");if(!seat)return;
    const text=(seat.textContent||"").replace(/\s+/g," ").trim().toLowerCase();
    if(text==="seat")setTimeout(()=>focusFloor("seating"),60);
  },true);
  window.addEventListener("bc:host-guest-seated",()=>setTimeout(exitFloor,120));
  window.addEventListener("popstate",exitFloor);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor();});
}
function bind(){
  enhanceWorkflow();bindFloorInteractions();
  // Direct bottom-dock clicks are captured too, in case another script bypasses BlueCurrentWorkflows.open.
  document.addEventListener("click",e=>{
    const job=e.target.closest("[data-bc-job]")?.dataset.bcJob;if(!job)return;
    if(job==="floor")setTimeout(()=>focusFloor("dock"),100);else [180,520,980].forEach(ms=>setTimeout(()=>settleJob(job),ms));
  },true);
  window.BlueCurrentIpadOperatorFocus={version:VERSION,focusFloor,exitFloor,lockViewportTo,settleJob,destinationForJob};
  document.documentElement.dataset.bcIpadOperatorFocusVersion=VERSION;
  document.documentElement.dataset.bcViewportLock="deterministic";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
