(function(){
"use strict";
const PRIMARY=[
 "command-center","blue-current-live","host-stand","journey","workforce-intelligence",
 "kitchenThroughputCenter","service-coordination","restaurantAiBrainV341","executive-command-center"
];
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function normalizeStatus(text){
 const t=String(text||"").trim().toLowerCase();
 if(/critical|failed|error|offline|blocked|overdue/.test(t))return"critical";
 if(/risk|warning|watch|attention|hold|late/.test(t))return"warning";
 if(/healthy|ready|stable|accepted|approved|complete|completed|online|clear|pass|seated/.test(t))return"positive";
 return"neutral";
}
ready(()=>{
 const roots=PRIMARY.map(id=>document.getElementById(id)).filter(Boolean);
 roots.forEach(root=>{
   root.classList.add("bc-ui-system");

   // Normalize common cards/panels without replacing existing component classes.
   root.querySelectorAll("article,.card,.panel,.host-card,.wf-panel,.exec-card,.svc-alert-card,.svc-flow-card,.svc-expo-card,.svc-load-card").forEach(card=>{
     card.classList.add("bc-ui-card");
   });

   // Normalize headings and muted supporting text.
   root.querySelectorAll("h1,h2,h3,h4").forEach(h=>h.classList.add("bc-ui-heading"));
   root.querySelectorAll("p,small,label").forEach(el=>el.classList.add("bc-ui-support"));

   // Normalize buttons by intent already inferred by earlier waves.
   root.querySelectorAll("button,.button").forEach(button=>{
     button.classList.add("bc-ui-button");
     if(button.classList.contains("primary")||button.classList.contains("button-primary")||button.classList.contains("bc-action-primary"))button.dataset.bcButtonTone="primary";
     else if(button.classList.contains("bc-action-caution"))button.dataset.bcButtonTone="caution";
     else button.dataset.bcButtonTone=button.dataset.bcButtonTone||"secondary";
   });

   // Normalize badges/status pills by visible meaning.
   root.querySelectorAll("b,.status-chip,.live-chip,.badge,.pill,.exec-status,.host-badge").forEach(node=>{
     const text=node.textContent.replace(/\s+/g," ").trim();
     if(!text||text.length>40)return;
     node.classList.add("bc-ui-status");
     node.dataset.bcStatusTone=normalizeStatus(text);
   });

   // Standard form shape.
   root.querySelectorAll("input,select,textarea").forEach(control=>control.classList.add("bc-ui-field"));
  });

  // Standardize primary section spacing and scroll rhythm.
  roots.forEach((root,index)=>{
    root.dataset.bcSectionOrder=String(index+1);
    root.classList.add("bc-ui-section");
  });

  // Add nonvisual UI system metadata for QA.
  document.documentElement.dataset.bcUiSystemVersion="66.0.0";
  window.BlueCurrentUISystem={
    version:"66.0.0",
    primarySections:PRIMARY.slice(),
    statusTone:normalizeStatus
  };
});
})();