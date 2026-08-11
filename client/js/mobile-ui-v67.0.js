(function(){
"use strict";
const PRIMARY=[
 "command-center","blue-current-live","host-stand","journey","workforce-intelligence",
 "kitchenThroughputCenter","service-coordination","restaurantAiBrainV341","executive-command-center"
];
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
 const mq=window.matchMedia("(max-width: 760px)");
 function apply(){
   document.documentElement.classList.toggle("bc-mobile-ui",mq.matches);
   document.documentElement.dataset.bcMobileUiVersion="67.0.0";
 }
 apply();
 mq.addEventListener?.("change",apply);

 PRIMARY.forEach(id=>{
   const root=document.getElementById(id);if(!root)return;
   root.classList.add("bc-mobile-ready");

   // Allow wide operational rows/tables to scroll instead of squeezing unreadably.
   root.querySelectorAll("table,.table-wrap,.svc-table-wrap,.host-floor-map,.exec-chart,.chart").forEach(node=>{
     const wrapper=node.parentElement;
     if(wrapper&&wrapper.classList.contains("bc-mobile-scroll"))return;
     if(node.tagName==="TABLE" && wrapper){
       wrapper.classList.add("bc-mobile-scroll");
       wrapper.setAttribute("tabindex","0");
       if(!wrapper.getAttribute("aria-label"))wrapper.setAttribute("aria-label","Scrollable data table");
     }else{
       node.classList.add("bc-mobile-scroll");
     }
   });

   // Button groups should wrap rather than overflow.
   root.querySelectorAll(".actions,.button-row,.host-top-actions,.exec-actions,.copilot-prompts,.bc-svc-filters,.queue-tabs").forEach(group=>{
     group.classList.add("bc-mobile-action-row");
   });
 });

 // Mobile utility controls stay compact and reachable.
 document.getElementById("bcOperatorUtilityBar")?.classList.add("bc-mobile-utility");
 document.getElementById("bcRushDock")?.classList.add("bc-mobile-rush-dock");

 window.BlueCurrentMobileUI={
   version:"67.0.0",
   breakpoint:760,
   active:()=>mq.matches
 };
});
})();