(function(){
"use strict";
const VERSION="100.3.6";
const q=(id)=>document.getElementById(id);
const isIPad=()=>/iPad/.test(navigator.userAgent)||((navigator.platform==="MacIntel")&&navigator.maxTouchPoints>1);
const JOBS={
  guests:{title:"Find guest",subtitle:"Search tonight's guests and recent profiles."},
  service:{title:"Service",subtitle:"Run the live dining room without page drift."},
  kitchen:{title:"Kitchen pressure",subtitle:"Protect ticket flow before the line becomes the constraint."},
  staff:{title:"Staff coverage",subtitle:"See who is working and the next staffing decision."}
};
let currentJob=null,currentTarget=null,restoreY=0,focusToken=0;
function visible(el){if(!el||el.hidden||el.getAttribute("aria-hidden")==="true")return false;const s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"&&el.getClientRects().length>0;}
function targetFor(key){
  if(key==="guests")return q("bcHostGuestsPanel")||q("bcGuestSearchInput")?.closest(".bc-host-view-panel");
  if(key==="service")return document.querySelector("#digital-twin .twin-app")||q("service-coordination");
  if(key==="kitchen")return q("kitchenThroughputCenter");
  if(key==="staff")return document.querySelector("#workforce-intelligence .bc-staff-truth-v264")||q("workforce-intelligence");
  return null;
}
function ensureChrome(){
  let backdrop=q("bcOperatorFocusBackdrop");
  if(!backdrop){backdrop=document.createElement("div");backdrop.id="bcOperatorFocusBackdrop";backdrop.className="bc-operator-focus-backdrop";backdrop.hidden=true;document.body.appendChild(backdrop);}
  let header=q("bcOperatorFocusHeader");
  if(!header){
    header=document.createElement("header");header.id="bcOperatorFocusHeader";header.className="bc-operator-focus-header";header.hidden=true;
    header.innerHTML='<button type="button" id="bcOperatorFocusBack" class="bc-operator-focus-back">← Back</button><div><small>BLUE CURRENT · FOCUSED JOB</small><strong id="bcOperatorFocusTitle">Operator workspace</strong><span id="bcOperatorFocusSubtitle"></span></div><button type="button" id="bcOperatorFocusClose" class="bc-operator-focus-close">Exit</button>';
    document.body.appendChild(header);
    q("bcOperatorFocusBack")?.addEventListener("click",exitOperatorFocus);
    q("bcOperatorFocusClose")?.addEventListener("click",exitOperatorFocus);
  }
  return {backdrop,header};
}
function markDock(key){document.querySelectorAll("#bcRushDock [data-rush-job]").forEach(b=>b.classList.toggle("bc-focus-active",b.dataset.rushJob===key));}
function clearTarget(){
  if(currentTarget){currentTarget.classList.remove("bc-operator-focus-target","bc-focus-guests","bc-focus-service","bc-focus-kitchen","bc-focus-staff");currentTarget.removeAttribute("data-bc-focused-job");}
  currentTarget=null;
}
function exitOperatorFocus({restore=true}={}){
  focusToken++;
  clearTarget();
  currentJob=null;
  document.documentElement.classList.remove("bc-operator-focus-mode");
  delete document.body.dataset.bcOperatorFocus;
  const {backdrop,header}=ensureChrome();backdrop.hidden=true;header.hidden=true;markDock("");
  if(restore)requestAnimationFrame(()=>window.scrollTo({top:restoreY,left:0,behavior:"auto"}));
}
function mountFocusedTarget(key,target){
  if(!target||!JOBS[key])return false;
  clearTarget();
  const {backdrop,header}=ensureChrome();
  currentJob=key;currentTarget=target;
  document.documentElement.classList.add("bc-operator-focus-mode");document.body.dataset.bcOperatorFocus=key;
  backdrop.hidden=false;header.hidden=false;
  q("bcOperatorFocusTitle").textContent=JOBS[key].title;
  q("bcOperatorFocusSubtitle").textContent=JOBS[key].subtitle;
  target.hidden=false;target.removeAttribute("aria-hidden");
  target.classList.add("bc-operator-focus-target",`bc-focus-${key}`);target.dataset.bcFocusedJob=key;
  markDock(key);
  requestAnimationFrame(()=>{target.scrollTop=0;const scroller=target.querySelector?.(".bc-host-search,header,.twin-app-header,.bc-staff-head")||target;scroller.scrollIntoView?.({block:"nearest",behavior:"auto"});if(key==="guests")setTimeout(()=>q("bcGuestSearchInput")?.focus({preventScroll:true}),90);});
  return true;
}
function focusOperatorJob(key){
  if(!JOBS[key])return false;
  const token=++focusToken;
  if(!currentJob)restoreY=window.scrollY;
  if(currentJob&&currentJob!==key)exitOperatorFocus({restore:false});
  const tryMount=(attempt=0)=>{
    if(token!==focusToken)return;
    const t=targetFor(key);
    if(t&&visible(t)){mountFocusedTarget(key,t);return;}
    if(t){mountFocusedTarget(key,t);return;}
    if(attempt<24)setTimeout(()=>tryMount(attempt+1),50);
  };
  tryMount();return true;
}

// Full-screen Host Floor from V100.3.5, retained without scroll locking.
let floorRestoreY=0;
function floorPanel(){return q("host-stand")?.querySelector(".host-floor-panel");}
function floorMap(){return q("hostFloorMap");}
function addFloorControls(){
  const panel=floorPanel(),toolbar=panel?.querySelector(".host-floor-toolbar");if(!panel||!toolbar)return;
  let btn=q("bcFloorFullscreenButton");
  if(!btn){btn=document.createElement("button");btn.type="button";btn.id="bcFloorFullscreenButton";btn.className="bc-floor-fullscreen-button";btn.innerHTML='<span aria-hidden="true">⛶</span> Full screen floor';btn.setAttribute("aria-pressed","false");btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();focusFloor("button");});toolbar.appendChild(btn);}
}
function focusFloor(reason="manual"){
  if(currentJob)exitOperatorFocus({restore:false});
  const panel=floorPanel(),map=floorMap();if(!panel||!map)return false;
  floorRestoreY=window.scrollY;
  document.documentElement.classList.add("bc-ipad-floor-focus");panel.classList.add("bc-ipad-floor-focus-panel");panel.dataset.bcFocusReason=reason;
  let header=q("bcIpadFloorFocusHeader");
  if(!header){header=document.createElement("div");header.id="bcIpadFloorFocusHeader";header.className="bc-ipad-floor-focus-header";header.innerHTML='<button type="button" id="bcIpadFloorFocusClose" class="bc-ipad-floor-focus-close">← Back</button><div><small>LIVE DINING ROOM</small><strong>Floor</strong><span>One screen for the room. Tap a table to work it.</span></div><button type="button" id="bcIpadFloorFocusExit" class="bc-ipad-floor-focus-exit">Exit full screen</button>';panel.prepend(header);q("bcIpadFloorFocusClose")?.addEventListener("click",exitFloor);q("bcIpadFloorFocusExit")?.addEventListener("click",exitFloor);}
  q("bcFloorFullscreenButton")?.setAttribute("aria-pressed","true");document.body.dataset.bcFloorFocus="true";requestAnimationFrame(()=>{panel.scrollTop=0;});return true;
}
function exitFloor(){
  const panel=floorPanel();document.documentElement.classList.remove("bc-ipad-floor-focus");panel?.classList.remove("bc-ipad-floor-focus-panel");if(panel)delete panel.dataset.bcFocusReason;delete document.body.dataset.bcFloorFocus;q("bcFloorFullscreenButton")?.setAttribute("aria-pressed","false");requestAnimationFrame(()=>window.scrollTo({top:floorRestoreY,left:0,behavior:"auto"}));
}
function enhanceWorkflow(){
  const api=window.BlueCurrentWorkflows;if(!api?.open||api.__focusedWorkspacesV10036)return;
  const original=api.open.bind(api);
  api.open=function(key,options){
    const isFocused=!!JOBS[key];
    if(key!=="floor"&&document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor();
    if(currentJob&&!isFocused)exitOperatorFocus({restore:false});
    const ok=original(key,{...(options||{}),silent:isFocused?true:options?.silent});
    if(key==="floor")setTimeout(()=>focusFloor("floor-job"),70);
    else if(isFocused)setTimeout(()=>focusOperatorJob(key),30);
    return ok;
  };
  api.__focusedWorkspacesV10036=true;
}
function bind(){
  addFloorControls();enhanceWorkflow();
  // Workflow script can initialize after this file on cached iPad sessions.
  let attempts=0;const timer=setInterval(()=>{enhanceWorkflow();addFloorControls();if(window.BlueCurrentWorkflows?.__focusedWorkspacesV10036||++attempts>40)clearInterval(timer);},125);
  document.addEventListener("click",e=>{
    const rush=e.target.closest("[data-rush-job]")?.dataset.rushJob;
    if(rush&&JOBS[rush])setTimeout(()=>focusOperatorJob(rush),40);
    const seat=e.target.closest("button");if(seat){const text=(seat.textContent||"").replace(/\s+/g," ").trim().toLowerCase();if(text==="seat")setTimeout(()=>focusFloor("seating"),60);}
  },true);
  window.addEventListener("bc:host-guest-seated",()=>setTimeout(exitFloor,120));
  window.addEventListener("popstate",()=>{if(currentJob)exitOperatorFocus();if(document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor();});
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(currentJob)exitOperatorFocus();else if(document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor();});
  window.BlueCurrentFocusedWorkspaces={version:VERSION,focus:focusOperatorJob,exit:exitOperatorFocus,focusFloor,exitFloor,targetFor};
  document.documentElement.dataset.bcFocusedWorkspaceVersion=VERSION;
  document.documentElement.dataset.bcQuickJobNavigation="fixed-workspace";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
