(function(){
"use strict";
const PRIMARY_SELECTOR=[
 "#command-center","#blue-current-live","#host-stand","#journey","#workforce-intelligence",
 "#kitchenThroughputCenter","#service-coordination","#restaurantAiBrainV341","#executive-command-center"
].join(",");
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function labelOf(el){
 return el?.getAttribute?.("aria-label")||el?.getAttribute?.("title")||
        el?.textContent?.replace(/\s+/g," ").trim()||"Action";
}
function isPrimary(el){return !!el?.closest?.(PRIMARY_SELECTOR);}
ready(()=>{
 // ----- Toast / status system -----
 let stack=document.getElementById("bcToastStack");
 if(!stack){
   stack=document.createElement("div");
   stack.id="bcToastStack";
   stack.className="bc-toast-stack";
   stack.setAttribute("aria-live","polite");
   stack.setAttribute("aria-atomic","false");
   document.body.appendChild(stack);
 }
 function toast(message,tone="info",timeout=3200){
   const item=document.createElement("div");
   item.className=`bc-toast bc-toast-${tone}`;
   item.setAttribute("role",tone==="error"?"alert":"status");
   item.innerHTML=`<span class="bc-toast-dot" aria-hidden="true"></span><strong>${String(message)}</strong><button type="button" aria-label="Dismiss notification">×</button>`;
   const close=()=>{item.classList.add("leaving");setTimeout(()=>item.remove(),180);};
   item.querySelector("button").addEventListener("click",close);
   stack.appendChild(item);
   requestAnimationFrame(()=>item.classList.add("visible"));
   if(timeout)setTimeout(close,timeout);
   return item;
 }
 window.BlueCurrentFeedback={toast};

 // ----- Network write feedback -----
 // Preserve fetch semantics. Only mutating requests generate automatic success/error feedback.
 const nativeFetch=window.fetch?.bind(window);
 if(nativeFetch){
   window.fetch=async function(input,init={}){
     const method=String(init?.method||"GET").toUpperCase();
     const mutating=!["GET","HEAD","OPTIONS"].includes(method);
     try{
       const response=await nativeFetch(input,init);
       if(mutating){
         if(response.ok)toast("Saved successfully.","success",2200);
         else toast(`Action failed (${response.status}). Nothing was changed.`,"error",5200);
       }
       return response;
     }catch(error){
       if(mutating)toast(navigator.onLine?"Could not complete the action. Try again.":"You’re offline. The action was not sent.","error",6000);
       throw error;
     }
   };
 }

 // ----- Verified connectivity clarity -----
 // Browser "online" only means a network interface is available. V100.2.85
 // emits verified server-reachability state before operator-facing recovery copy.
 window.addEventListener("bluecurrent:connectivity-state",event=>{
   const state=event.detail?.state;
   if(state==="offline")toast("Connection lost. Live updates are paused until you’re back online.","warning",0);
   else if(state==="checking")toast("Network available. Verifying Blue Current…","info",1800);
   else if(state==="connected")toast("Connection verified. Live updates can resume.","success",3000);
   else if(state==="unreachable")toast("Network is available, but Blue Current is not reachable yet.","warning",0);
 });

 // ----- Prevent accidental duplicate form submissions -----
 document.addEventListener("submit",event=>{
   const form=event.target.closest("form");
   if(!form||form.dataset.bcSubmitting==="true")return;
   const submitter=event.submitter||form.querySelector('button[type="submit"],input[type="submit"]');
   if(!submitter)return;
   form.dataset.bcSubmitting="true";
   const original=submitter.dataset.bcOriginalText||submitter.textContent;
   submitter.dataset.bcOriginalText=original;
   submitter.setAttribute("aria-busy","true");
   submitter.classList.add("bc-action-working");

   // Do not disable: some existing handlers read/click the submitter. A short lock prevents double-clicks.
   submitter.style.pointerEvents="none";
   const restore=()=>{
     form.dataset.bcSubmitting="false";
     submitter.removeAttribute("aria-busy");
     submitter.classList.remove("bc-action-working");
     submitter.style.pointerEvents="";
   };
   setTimeout(restore,1400);
 },true);

 // ----- Button press state and clear destructive intent -----
 document.addEventListener("click",event=>{
   const button=event.target.closest("button");
   if(!button||button.disabled)return;
   button.classList.add("bc-pressed");
   setTimeout(()=>button.classList.remove("bc-pressed"),180);

   const name=labelOf(button).toLowerCase();
   if(/\b(delete|remove|retire|rollback|reject|hold)\b/.test(name) && !button.dataset.bcRiskLabel){
     button.dataset.bcRiskLabel="true";
     button.setAttribute("aria-description","High-impact action. Review the surrounding context before confirming.");
   }
 },true);

 // ----- Host floor zone controls now behave like actual view controls -----
 const host=document.getElementById("host-stand");
 if(host){
   const zones=Array.from(host.querySelectorAll("[data-host-zone]"));
   const rec=document.getElementById("hostRecommendation");
   const map=document.getElementById("hostFloorMap");
   const copy={
     main:"Main floor view · all active tables remain visible",
     waterfront:"Waterfront focus · review waterfront preferences before assigning",
     private:"Private dining focus · review large-party and private-event needs"
   };
   zones.forEach(button=>{
     button.addEventListener("click",()=>{
       zones.forEach(x=>{
         const active=x===button;
         x.classList.toggle("active",active);
         x.setAttribute("aria-pressed",String(active));
       });
       if(map)map.dataset.hostZone=button.dataset.hostZone;
       if(rec)rec.textContent=copy[button.dataset.hostZone]||"Floor view updated";
       toast(`${button.textContent.trim()} selected.`,"info",1800);
     });
   });

   // Explicit success feedback for the local-only V62 host actions that do not make API requests.
   document.getElementById("bcHostDialogForm")?.addEventListener("submit",()=>{
     const title=document.getElementById("bcHostDialogTitle")?.textContent||"Host action";
     toast(`${title} saved.`,"success",2200);
   });
   host.addEventListener("click",event=>{
     const seat=event.target.closest("#waitlistQueue .queue-item button");
     if(seat&&!seat.disabled){
       const guest=seat.closest(".queue-item")?.querySelector("strong")?.textContent||"Guest";
       setTimeout(()=>toast(`${guest} marked seated.`,"success",2200),0);
     }
   });
 }

 // ----- Primary actions get a consistent visible success hook without faking completion -----
 // Existing modules can dispatch this event after their own business logic completes.
 window.addEventListener("bluecurrent:action-result",event=>{
   const detail=event.detail||{};
   const message=detail.message||"Action completed.";
   toast(message,detail.ok===false?"error":"success",detail.ok===false?5200:2600);
 });

 // ----- Global runtime error visibility, limited to actionable wording -----
 window.addEventListener("unhandledrejection",event=>{
   const message=event.reason?.message||"A background action failed.";
   toast(`Something did not complete: ${message}`,"error",6000);
 });
});
})();