(function(){
"use strict";
const PRIMARY=[
 "command-center","blue-current-live","host-stand","journey","workforce-intelligence",
 "kitchenThroughputCenter","service-coordination","restaurantAiBrainV341","executive-command-center"
];
const EXACT={
 "Details":"View details",
 "Ask":"Ask Blue Current",
 "Reset":"Reset view",
 "Open source":"View source",
 "Clear history":"Clear history",
 "Export":"Export",
 "Refresh":"Refresh",
 "Cancel":"Cancel"
};
const PURPOSE={
 "command-center":"Command",
 "blue-current-live":"Live",
 "host-stand":"Floor",
 "journey":"Reservations",
 "workforce-intelligence":"Staff",
 "kitchenThroughputCenter":"Kitchen",
 "service-coordination":"Service",
 "restaurantAiBrainV341":"AI",
 "executive-command-center":"Executive"
};
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function text(el){return el.textContent.replace(/\s+/g," ").trim();}
function purpose(el){
 for(const id of PRIMARY)if(el.closest(`#${id}`))return PURPOSE[id];
 return"Blue Current";
}
function actionDescription(label,area){
 const l=label.toLowerCase();
 if(l==="refresh")return `Refresh ${area} data`;
 if(l==="export")return `Export ${area} data`;
 if(l==="view details")return `View ${area} details`;
 if(l==="reset view")return `Reset the current ${area} view`;
 if(l==="cancel")return "Cancel this action and keep current data";
 if(l==="clear history")return "Clear the visible history from this view";
 if(l==="view source")return "Open the source information for this item";
 if(l==="ask blue current")return "Send this question to Blue Current";
 return"";
}
ready(()=>{
 const roots=PRIMARY.map(id=>document.getElementById(id)).filter(Boolean);
 roots.forEach(root=>{
   root.querySelectorAll("button").forEach(button=>{
     const original=text(button); if(!original)return;
     const area=purpose(button);
     const replacement=EXACT[original];
     if(replacement&&replacement!==original&&button.children.length===0){
       button.dataset.bcOriginalLabel=original;
       button.textContent=replacement;
     }
     const current=text(button);
     const description=actionDescription(current,area);
     if(description&&!button.getAttribute("aria-label"))button.setAttribute("aria-label",description);

     // Make destructive / high-impact verbs explicit without changing their business logic.
     if(/\b(clear|delete|remove|retire|rollback|reject)\b/i.test(current)){
       button.classList.add("bc-copy-high-impact");
       if(!button.getAttribute("title"))button.setAttribute("title","Review before continuing. This action may change or remove saved information.");
     }
   });

   // Inputs should never rely on placeholder-only meaning.
   root.querySelectorAll("input,textarea,select").forEach(control=>{
     if(control.getAttribute("aria-label")||control.getAttribute("aria-labelledby"))return;
     const id=control.id;
     const label=id?root.querySelector(`label[for="${CSS.escape(id)}"]`):null;
     if(label)return;
     const placeholder=control.getAttribute("placeholder");
     if(placeholder)control.setAttribute("aria-label",placeholder.replace(/[.…]+$/,""));
   });
 });

 // Contextual helper text for the three highest-frequency Host entry points.
 const host=document.getElementById("host-stand");
 if(host){
   const helpers=[
     ["bcWalkInQuickAdd","Add a guest who is here now"],
     ["bcReservationQuickAdd","Create a future or same-day booking"],
     ["bcGuestSearchInput","Search by guest name, phone, or note"]
   ];
   helpers.forEach(([id,copy])=>{
     const el=document.getElementById(id); if(!el)return;
     if(el.tagName==="BUTTON"){
       if(!el.getAttribute("title"))el.setAttribute("title",copy);
       if(!el.getAttribute("aria-label"))el.setAttribute("aria-label",copy);
     }else{
       if(!el.getAttribute("aria-label"))el.setAttribute("aria-label",copy);
     }
   });
 }

 // Standardized confirmation language modules can reuse.
 window.BlueCurrentCopy={
   version:"66.50.0",
   success:(action)=>`${action} completed.`,
   failure:(action)=>`${action} could not be completed. Nothing else was changed.`,
   retry:"Try again",
   cancel:"Cancel and keep current data",
   saved:"Saved",
   loading:"Loading current data…"
 };
 document.documentElement.dataset.bcCopyVersion="66.50.0";
});
})();