(function(){
"use strict";
const VERSION="100.3.9";
const q=id=>document.getElementById(id);
const JOBS={
  guests:{title:"Find guest",subtitle:"Search tonight's guests and recent profiles."},
  service:{title:"Service",subtitle:"Run the live dining room without page drift."},
  kitchen:{title:"Kitchen pressure",subtitle:"Protect ticket flow before the line becomes the constraint."},
  staff:{title:"Staff coverage",subtitle:"See who is working and the next staffing decision."}
};
let currentJob=null,currentTarget=null,currentPlacement=null,focusToken=0,suppressWorkflowFocus=false,targetGuard=null;
let floorTarget=null,floorPlaceholder=null,floorParent=null,floorNextSibling=null;

function targetFor(key){
  if(key==="guests")return q("bcHostGuestsPanel")||q("bcGuestSearchInput")?.closest(".bc-host-view-panel");
  if(key==="service")return document.querySelector("#bcOperatorFocusStage .twin-app")||document.querySelector("#digital-twin .twin-app")||q("service-coordination");
  if(key==="kitchen")return document.querySelector("#bcOperatorFocusStage #kitchenThroughputCenter")||q("kitchenThroughputCenter");
  if(key==="staff")return document.querySelector("#bcOperatorFocusStage .bc-staff-truth-v264")||document.querySelector("#workforce-intelligence .bc-staff-truth-v264")||q("workforce-intelligence");
  return null;
}
function ensureChrome(){
  let backdrop=q("bcOperatorFocusBackdrop");
  if(!backdrop){backdrop=document.createElement("div");backdrop.id="bcOperatorFocusBackdrop";backdrop.className="bc-operator-focus-backdrop";backdrop.hidden=true;document.body.appendChild(backdrop);}
  let stage=q("bcOperatorFocusStage");
  if(!stage){stage=document.createElement("main");stage.id="bcOperatorFocusStage";stage.className="bc-operator-focus-stage";stage.hidden=true;document.body.appendChild(stage);}
  let header=q("bcOperatorFocusHeader");
  if(!header){
    header=document.createElement("header");header.id="bcOperatorFocusHeader";header.className="bc-operator-focus-header";header.hidden=true;
    header.innerHTML='<button type="button" id="bcOperatorFocusBack" class="bc-operator-focus-back">← Back</button><div><small>BLUE CURRENT · FOCUSED JOB</small><strong id="bcOperatorFocusTitle">Operator workspace</strong><span id="bcOperatorFocusSubtitle"></span></div><button type="button" id="bcOperatorFocusClose" class="bc-operator-focus-close">Exit</button>';
    document.body.appendChild(header);
    q("bcOperatorFocusBack")?.addEventListener("click",()=>exitOperatorFocus({returnHome:true}));
    q("bcOperatorFocusClose")?.addEventListener("click",()=>exitOperatorFocus({returnHome:true}));
  }
  return {backdrop,stage,header};
}
function markDock(key){document.querySelectorAll("#bcRushDock [data-rush-job]").forEach(b=>b.classList.toggle("bc-focus-active",b.dataset.rushJob===key));}
function rememberPlacement(target){
  if(currentPlacement?.target===target)return currentPlacement;
  const parent=target.parentNode;if(!parent)return null;
  const placeholder=document.createComment(`bc-operator-focus-placeholder:${target.id||target.className||"target"}`);
  parent.insertBefore(placeholder,target);
  currentPlacement={target,parent,placeholder,nextSibling:target.nextSibling};
  return currentPlacement;
}
function restorePlacement(){
  const p=currentPlacement,t=currentTarget;
  if(!t||!p){currentPlacement=null;return;}
  if(p.placeholder?.parentNode){p.placeholder.parentNode.insertBefore(t,p.placeholder);p.placeholder.remove();}
  else if(p.parent?.isConnected){
    if(p.nextSibling?.parentNode===p.parent)p.parent.insertBefore(t,p.nextSibling);else p.parent.appendChild(t);
  }
  currentPlacement=null;
}
function stopTargetGuard(){targetGuard?.disconnect?.();targetGuard=null;}
function keepTargetUsable(target,key){
  const enforce=()=>{
    if(currentTarget!==target||currentJob!==key)return;
    target.hidden=false;target.removeAttribute("aria-hidden");target.removeAttribute("inert");
    target.style.setProperty("display","block","important");target.style.setProperty("visibility","visible","important");target.style.setProperty("opacity","1","important");
  };
  enforce();stopTargetGuard();
  targetGuard=new MutationObserver(enforce);targetGuard.observe(target,{attributes:true,attributeFilter:["hidden","aria-hidden","inert","style","class"]});
  [40,120,260,520].forEach(ms=>setTimeout(enforce,ms));
  if(key==="kitchen")setTimeout(()=>target.querySelector("#ktRefresh")?.click(),90);
}
function clearTarget(){
  stopTargetGuard();
  if(currentTarget){
    currentTarget.classList.remove("bc-operator-focus-target","bc-focus-guests","bc-focus-service","bc-focus-kitchen","bc-focus-staff");
    currentTarget.removeAttribute("data-bc-focused-job");
    currentTarget.style.removeProperty("display");currentTarget.style.removeProperty("visibility");currentTarget.style.removeProperty("opacity");
  }
  restorePlacement();currentTarget=null;
}
function hostTop(){
  const host=q("host-stand");if(!host)return 0;
  return Math.max(0,Math.round(host.getBoundingClientRect().top+window.scrollY-6));
}
function returnToHostHome(){
  try{window.BlueCurrentHospitalityShell?.activate?.("guests",{scroll:false});}catch{}
  const host=q("host-stand");if(!host)return;
  host.hidden=false;host.removeAttribute("aria-hidden");
  const floorButton=host.querySelector('[data-host-view="floor"]');
  if(floorButton&&!floorButton.classList.contains("is-active"))floorButton.click();
  try{history.replaceState(null,"","#host-stand");}catch{}
  const settle=()=>window.scrollTo({top:hostTop(),left:0,behavior:"auto"});
  requestAnimationFrame(()=>{settle();requestAnimationFrame(settle);});
  [80,180,360].forEach(ms=>setTimeout(settle,ms));
}
function exitOperatorFocus({returnHome=false}={}){
  focusToken++;clearTarget();currentJob=null;
  document.documentElement.classList.remove("bc-operator-focus-mode");delete document.body.dataset.bcOperatorFocus;
  const {backdrop,stage,header}=ensureChrome();backdrop.hidden=true;stage.hidden=true;header.hidden=true;stage.replaceChildren();markDock("");
  if(returnHome)returnToHostHome();
}
function mountFocusedTarget(key,target){
  if(!target||!JOBS[key])return false;
  const {backdrop,stage,header}=ensureChrome();
  // Re-entry must be idempotent. A second focus request for the same live node
  // must never create a second placeholder or overwrite its original home.
  if(currentJob===key&&currentTarget===target&&stage.contains(target)){
    document.documentElement.classList.add("bc-operator-focus-mode");document.body.dataset.bcOperatorFocus=key;
    backdrop.hidden=false;stage.hidden=false;header.hidden=false;markDock(key);keepTargetUsable(target,key);stage.scrollTop=0;return true;
  }
  if(currentTarget)exitOperatorFocus({returnHome:false});
  currentJob=key;currentTarget=target;rememberPlacement(target);
  document.documentElement.classList.add("bc-operator-focus-mode");document.body.dataset.bcOperatorFocus=key;
  backdrop.hidden=false;stage.hidden=false;header.hidden=false;
  q("bcOperatorFocusTitle").textContent=JOBS[key].title;q("bcOperatorFocusSubtitle").textContent=JOBS[key].subtitle;
  target.classList.add("bc-operator-focus-target",`bc-focus-${key}`);target.dataset.bcFocusedJob=key;
  stage.replaceChildren(target);markDock(key);keepTargetUsable(target,key);
  requestAnimationFrame(()=>{stage.scrollTop=0;target.scrollTop=0;if(key==="guests")setTimeout(()=>q("bcGuestSearchInput")?.focus({preventScroll:true}),80);});
  return true;
}
function focusOperatorJob(key){
  if(!JOBS[key])return false;
  const token=++focusToken;
  const tryMount=(attempt=0)=>{if(token!==focusToken)return;const t=targetFor(key);if(t){mountFocusedTarget(key,t);return;}if(attempt<40)setTimeout(()=>tryMount(attempt+1),50);};
  tryMount();return true;
}
function floorPanel(){return q("host-stand")?.querySelector(".host-floor-panel")||document.querySelector("#bcFloorFocusStage .host-floor-panel");}
function addFloorControls(){const panel=floorPanel(),toolbar=panel?.querySelector(".host-floor-toolbar");if(!panel||!toolbar)return;let btn=q("bcFloorFullscreenButton");if(!btn){btn=document.createElement("button");btn.type="button";btn.id="bcFloorFullscreenButton";btn.className="bc-floor-fullscreen-button";btn.innerHTML='<span aria-hidden="true">⛶</span> Full screen floor';btn.setAttribute("aria-pressed","false");btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();focusFloor("button");});toolbar.appendChild(btn);}}
function ensureFloorStage(){let s=q("bcFloorFocusStage");if(!s){s=document.createElement("main");s.id="bcFloorFocusStage";s.className="bc-floor-focus-stage";s.hidden=true;document.body.appendChild(s);}return s;}
function focusFloor(reason="manual"){
  if(currentJob)exitOperatorFocus({returnHome:false});
  if(document.documentElement.classList.contains("bc-ipad-floor-focus"))return true;
  const panel=floorPanel();if(!panel)return false;
  const stage=ensureFloorStage();floorTarget=panel;floorParent=panel.parentNode;floorNextSibling=panel.nextSibling;floorPlaceholder=document.createComment("bc-floor-focus-placeholder");floorParent?.insertBefore(floorPlaceholder,panel);
  document.documentElement.classList.add("bc-ipad-floor-focus");panel.classList.add("bc-ipad-floor-focus-panel");panel.dataset.bcFocusReason=reason;
  stage.hidden=false;stage.replaceChildren();
  const fh=document.createElement("div");fh.id="bcIpadFloorFocusHeader";fh.className="bc-ipad-floor-focus-header";fh.innerHTML='<button type="button" class="bc-ipad-floor-focus-close">← Back</button><div><small>LIVE DINING ROOM</small><strong>Floor</strong><span>One screen for the room. Tap a table to work it.</span></div><button type="button" class="bc-ipad-floor-focus-exit">Exit full screen</button>';fh.querySelector(".bc-ipad-floor-focus-close").addEventListener("click",()=>exitFloor({returnHome:true}));fh.querySelector(".bc-ipad-floor-focus-exit").addEventListener("click",()=>exitFloor({returnHome:true}));
  stage.append(fh,panel);q("bcFloorFullscreenButton")?.setAttribute("aria-pressed","true");document.body.dataset.bcFloorFocus="true";requestAnimationFrame(()=>stage.scrollTop=0);return true;
}
function exitFloor({returnHome=false}={}){
  const stage=ensureFloorStage(),panel=floorTarget||floorPanel();
  if(panel&&floorPlaceholder?.parentNode)floorPlaceholder.parentNode.insertBefore(panel,floorPlaceholder);else if(panel&&floorParent){if(floorNextSibling&&floorNextSibling.parentNode===floorParent)floorParent.insertBefore(panel,floorNextSibling);else floorParent.appendChild(panel);}
  floorPlaceholder?.remove?.();floorPlaceholder=null;floorParent=null;floorNextSibling=null;floorTarget=null;
  document.documentElement.classList.remove("bc-ipad-floor-focus");panel?.classList.remove("bc-ipad-floor-focus-panel");if(panel)delete panel.dataset.bcFocusReason;delete document.body.dataset.bcFloorFocus;q("bcFloorFullscreenButton")?.setAttribute("aria-pressed","false");stage.hidden=true;stage.replaceChildren();if(returnHome)returnToHostHome();
}
function enhanceWorkflow(){
  const api=window.BlueCurrentWorkflows;if(!api?.open||api.__focusedWorkspacesV10039)return;
  const priorOriginal=api.__focusedOriginalOpenV10037||api.open.bind(api);
  api.__focusedOriginalOpenV10039=priorOriginal;
  api.open=function(key,options){
    if(suppressWorkflowFocus)return priorOriginal(key,options);
    const isFocused=!!JOBS[key];
    if(key!=="floor"&&document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor({returnHome:false});
    if(currentJob&&!isFocused)exitOperatorFocus({returnHome:false});
    const ok=priorOriginal(key,{...(options||{}),silent:isFocused?true:options?.silent});
    if(key==="floor")setTimeout(()=>focusFloor("floor-job"),60);else if(isFocused)setTimeout(()=>focusOperatorJob(key),40);
    return ok;
  };
  api.__focusedWorkspacesV10039=true;
}
function bind(){
  addFloorControls();enhanceWorkflow();let attempts=0;
  const timer=setInterval(()=>{enhanceWorkflow();addFloorControls();if(window.BlueCurrentWorkflows?.__focusedWorkspacesV10039||++attempts>50)clearInterval(timer);},125);
  // Only provide a direct-click fallback when the workflow wrapper is not yet installed.
  document.addEventListener("click",e=>{
    const rush=e.target.closest("[data-rush-job]")?.dataset.rushJob;
    if(rush&&JOBS[rush]&&!window.BlueCurrentWorkflows?.__focusedWorkspacesV10039)setTimeout(()=>focusOperatorJob(rush),40);
    const seat=e.target.closest("button");if(seat){const text=(seat.textContent||"").replace(/\s+/g," ").trim().toLowerCase();if(text==="seat")setTimeout(()=>focusFloor("seating"),60);}
  },true);
  window.addEventListener("bc:host-guest-seated",()=>setTimeout(()=>exitFloor({returnHome:true}),120));
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(currentJob)exitOperatorFocus({returnHome:true});else if(document.documentElement.classList.contains("bc-ipad-floor-focus"))exitFloor({returnHome:true});});
  window.BlueCurrentFocusedWorkspaces={version:VERSION,focus:focusOperatorJob,exit:exitOperatorFocus,focusFloor,exitFloor,targetFor};
  document.documentElement.dataset.bcFocusedWorkspaceVersion=VERSION;document.documentElement.dataset.bcQuickJobNavigation="stable-body-portal-workspace";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0),{once:true});else setTimeout(bind,0);
})();
