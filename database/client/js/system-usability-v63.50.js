(function(){
"use strict";
const PRIMARY_IDS=[
 "command-center","blue-current-live","host-stand","journey","workforce-intelligence",
 "kitchenThroughputCenter","service-coordination","restaurantAiBrainV341","executive-command-center"
];
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function humanize(v){
 return String(v||"").replace(/^v\d+(?:\d+)?/i,"").replace(/([a-z0-9])([A-Z])/g,"$1 $2")
  .replace(/[-_]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,c=>c.toUpperCase());
}
function revealTarget(target){
 if(!target)return false;
 let node=target;
 while(node&&node!==document.body){
   if(node.classList?.contains("bc-deep-tool")){
     document.documentElement.classList.add("bc-tools-open");
     node.classList.add("bc-nav-open");
     node.setAttribute("aria-hidden","false");
   }
   if(node.classList?.contains("bc-advanced-surface")){
     document.documentElement.classList.add("bc-advanced-open");
     node.setAttribute("aria-hidden","false");
   }
   if(node.classList?.contains("bc-ai-advanced-surface")){
     document.getElementById("restaurantAiBrainV341")?.classList.add("bc-ai-advanced-open");
     node.classList.add("bc-ai-nav-open");
     node.setAttribute("aria-hidden","false");
   }
   if(node.dataset?.bcPriority==="support"){
     document.documentElement.classList.add("bc-insights-open");
     node.setAttribute("aria-hidden","false");
   }
   node=node.parentElement;
 }
 return true;
}
function accessibleName(control){
 return control.getAttribute("aria-label")||
        control.getAttribute("title")||
        control.getAttribute("placeholder")||
        control.textContent?.replace(/\s+/g," ").trim()||
        "";
}
ready(()=>{
 const main=document.getElementById("main");
 if(!main)return;

 let live=document.getElementById("bcSystemLiveRegion");
 if(!live){
   live=document.createElement("div");
   live.id="bcSystemLiveRegion";
   live.className="bc-sr-only";
   live.setAttribute("role","status");
   live.setAttribute("aria-live","polite");
   document.body.appendChild(live);
 }
 const announce=message=>{live.textContent="";requestAnimationFrame(()=>live.textContent=message);};

 PRIMARY_IDS.forEach(id=>{
   const root=document.getElementById(id);if(!root)return;
   root.querySelectorAll(".eyebrow, header small, .section-heading small").forEach(el=>{
     const raw=el.textContent.trim();
     const clean=raw.replace(/^V\d+(?:\.\d+){0,3}\s*[·—:-]\s*/i,"");
     if(clean&&clean!==raw){
       el.dataset.bcEngineeringLabel=raw;
       el.textContent=clean;
     }
   });
 });

 document.querySelectorAll("button,input,select,textarea").forEach(control=>{
   if((control.getAttribute("type")||"").toLowerCase()==="hidden")return;
   if(!accessibleName(control)){
     const name=humanize(control.id||control.getAttribute("name")||control.dataset.action||control.dataset.command||"Control");
     control.setAttribute("aria-label",name||"Control");
   }
   if(control.tagName==="BUTTON"&&!control.getAttribute("title")){
     const name=accessibleName(control);
     if(name&&name.length<=36)control.setAttribute("title",name);
   }
   if(control.disabled&&!control.getAttribute("aria-disabled"))control.setAttribute("aria-disabled","true");
 });

 PRIMARY_IDS.forEach(id=>{
   const root=document.getElementById(id);if(!root)return;
   root.querySelectorAll("strong, b").forEach(el=>{
     const value=el.textContent.trim();
     if(["—","0/0"].includes(value)){
       el.classList.add("bc-data-pending");
       if(!el.getAttribute("aria-label"))el.setAttribute("aria-label","Data not available yet");
       if(!el.getAttribute("title"))el.setAttribute("title","Waiting for live data");
     }
   });
 });

 function openHash({scroll=true}={}){
   const id=decodeURIComponent(location.hash.replace(/^#/,""));
   if(!id)return;
   const target=document.getElementById(id);
   if(!target)return;
   revealTarget(target);
   if(scroll)setTimeout(()=>target.scrollIntoView({behavior:"smooth",block:"start"}),0);
 }
 window.addEventListener("hashchange",()=>openHash({scroll:true}));
 openHash({scroll:false});

 document.addEventListener("click",event=>{
   const link=event.target.closest('a[href^="#"]');
   if(!link)return;
   const id=decodeURIComponent(link.getAttribute("href").slice(1));
   if(!id)return;
   const target=document.getElementById(id);
   if(!target)return;
   revealTarget(target);
 });

 let dialogReturnFocus=null;
 document.addEventListener("click",event=>{
   const opener=event.target.closest("button,a");
   if(opener)dialogReturnFocus=opener;
 });
 document.querySelectorAll("dialog").forEach(dialog=>{
   dialog.addEventListener("close",()=>{dialogReturnFocus?.focus?.();});
   dialog.addEventListener("cancel",()=>announce("Dialog closed."));
   const observer=new MutationObserver(()=>{
     if(dialog.open){
       const first=dialog.querySelector("input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])");
       setTimeout(()=>first?.focus?.(),0);
     }
   });
   observer.observe(dialog,{attributes:true,attributeFilter:["open"]});
 });

 const desktopLinks=Array.from(document.querySelectorAll('.desktop-nav a[href^="#"]'));
 const targets=desktopLinks.map(a=>document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
 if("IntersectionObserver" in window){
   const observer=new IntersectionObserver(entries=>{
     const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
     if(!best)return;
     desktopLinks.forEach(a=>a.removeAttribute("aria-current"));
     const link=desktopLinks.find(a=>a.getAttribute("href")===`#${best.target.id}`);
     link?.setAttribute("aria-current","page");
   },{rootMargin:"-20% 0px -65% 0px",threshold:[0,.05,.15,.3]});
   targets.forEach(t=>observer.observe(t));
 }

 document.querySelectorAll("button:disabled").forEach(button=>{
   if(!button.getAttribute("title"))button.setAttribute("title","This action becomes available when its required information is ready.");
 });

 document.documentElement.dataset.bcUsabilityVersion="63.50.0";
 document.documentElement.dataset.bcPrimaryWorkspaces=String(PRIMARY_IDS.filter(id=>document.getElementById(id)).length);
 window.BlueCurrentUsability={
   version:"63.50.0",
   primaryIds:PRIMARY_IDS.slice(),
   revealTargetById(id){
     const target=document.getElementById(id);
     const ok=revealTarget(target);
     if(ok)announce(`${humanize(id)} opened.`);
     return ok;
   }
 };
});
})();