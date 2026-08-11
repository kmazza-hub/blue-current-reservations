(function(){
"use strict";
const PRIMARY=[
 "command-center","blue-current-live","host-stand","workforce-intelligence",
 "kitchenThroughputCenter","service-coordination","restaurantAiBrainV341","executive-command-center"
];
const EMPTY_RULES=[
 {test:/^loading\b|loading .+…$/i,title:"Loading live data",body:"Blue Current is building this view from the latest restaurant signals.",action:"Wait a moment or refresh if this persists."},
 {test:/^no live events yet/i,title:"Nothing needs attention yet",body:"New guest, table, call, and service events will appear here automatically.",action:"No action is required."},
 {test:/^no active operational alerts/i,title:"Service is clear",body:"There are no active service alerts requiring intervention.",action:"Continue monitoring service."},
 {test:/^no immediate risk/i,title:"No immediate risk",body:"Blue Current is not detecting an urgent operating risk right now.",action:"Continue with the current plan."},
 {test:/^no elevated portfolio risk/i,title:"Portfolio is stable",body:"No location currently exceeds the leadership-risk threshold.",action:"No intervention is required."},
 {test:/^no executive actions are open/i,title:"No executive actions open",body:"There are no unresolved leadership actions in the current view.",action:"Continue normal operations."},
 {test:/^no priority detected/i,title:"No priority detected",body:"The AI Brain does not have enough evidence for a high-confidence priority, or no urgent priority exists.",action:"Ask Blue Current a question or refresh the evidence."},
 {test:/^no comparison available/i,title:"Comparison not ready",body:"A comparison needs another valid period or baseline before it can be calculated.",action:"Choose another range or wait for more operating data."}
];
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function normalized(el){return el.textContent.replace(/\s+/g," ").trim();}
function decorate(el,rule){
 if(el.dataset.bcEmptyDecorated)return;
 el.dataset.bcEmptyDecorated="true";
 el.classList.add("bc-empty-message");
 el.setAttribute("role","status");
 el.setAttribute("title",`${rule.body} ${rule.action}`);
 el.setAttribute("aria-label",`${rule.title}. ${rule.body} ${rule.action}`);
}
function scan(root=document){
 PRIMARY.forEach(id=>{
   const area=root===document?document.getElementById(id):root.closest?.(`#${id}`)||root.querySelector?.(`#${id}`);
   if(!area)return;
   area.querySelectorAll("p,span,small,strong,li").forEach(el=>{
     const text=normalized(el); if(!text||text.length>180)return;
     const rule=EMPTY_RULES.find(x=>x.test.test(text));
     if(rule)decorate(el,rule);
   });
 });
}
ready(()=>{
 scan();

 // Keep dynamic empty/loading messages understandable after modules re-render.
 const main=document.getElementById("main");
 if(main)new MutationObserver(records=>{
   const roots=new Set();
   records.forEach(r=>{if(r.target?.nodeType===1)roots.add(r.target);});
   roots.forEach(scan);
 }).observe(main,{subtree:true,childList:true,characterData:true});

 // Connection recovery banner only appears when it matters.
 let banner=null;
 function ensureBanner(){
   if(banner)return banner;
   banner=document.createElement("aside");
   banner.id="bcRecoveryBanner";
   banner.className="bc-recovery-banner";
   banner.hidden=true;
   banner.setAttribute("role","alert");
   banner.innerHTML=`<div><strong>Live connection interrupted</strong><span>Blue Current will keep the current screen visible while the connection recovers.</span></div><button type="button" id="bcRecoveryRetry">Retry now</button>`;
   document.body.appendChild(banner);
   banner.querySelector("button").addEventListener("click",()=>{
     window.BlueCurrentFeedback?.toast?.("Checking connections…","info",1800);
     document.getElementById("liveConnectionsButton")?.click();
     setTimeout(()=>{if(navigator.onLine)banner.hidden=true;},800);
   });
   return banner;
 }
 window.addEventListener("offline",()=>{ensureBanner().hidden=false;});
 window.addEventListener("online",()=>{
   if(banner)banner.hidden=true;
   window.BlueCurrentFeedback?.toast?.("Live connection restored.","success",2200);
 });

 // First-use orientation: one concise explanation, never a tour that blocks service.
 const KEY="bcFirstUseV65";
 if(!localStorage.getItem(KEY)){
   const utility=document.getElementById("bcOperatorUtilityBar");
   if(utility&&!document.getElementById("bcFirstUseHint")){
     const hint=document.createElement("div");
     hint.id="bcFirstUseHint";
     hint.className="bc-first-use-hint";
     hint.innerHTML=`<div><small>NEW HERE?</small><strong>Start with Live. Use Quick Jobs when you know what you need to do.</strong><span>Blue Current keeps deeper tools out of the way until you need them.</span></div><button type="button">Got it</button>`;
     utility.insertAdjacentElement("afterend",hint);
     hint.querySelector("button").addEventListener("click",()=>{localStorage.setItem(KEY,"seen");hint.remove();});
   }
 }

 // Standard recovery hook for modules: one event, consistent operator language.
 window.addEventListener("bluecurrent:recovery-needed",event=>{
   const d=event.detail||{};
   const message=d.message||"This information could not be loaded.";
   const next=d.next||"Refresh the view and try again.";
   window.BlueCurrentFeedback?.toast?.(`${message} ${next}`,"error",6000);
 });
 window.BlueCurrentRecovery={version:"65.0.0",scan,emptyRules:EMPTY_RULES.length};
 document.documentElement.dataset.bcRecoveryVersion="65.0.0";
});
})();