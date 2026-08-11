(function(){
"use strict";
const PREF_COMMAND="bcCommandDetails";
const PREF_LIVE="bcLiveDetails";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
function makeToggle(id,label,openLabel){
 const b=document.createElement("button");b.type="button";b.id=id;b.className="button button-light button-small bc-detail-toggle";
 b.dataset.closedLabel=label;b.dataset.openLabel=openLabel;return b;
}
ready(()=>{
 // ---------- Command Center ----------
 const command=document.getElementById("command-center");
 const commandContainer=command?.querySelector(":scope > .container");
 if(commandContainer){
   const keepPrimary=new Set(["restaurantPulse","managerShiftBrief","managerActionList"]);
   const keepSecondary=new Set(["predictiveOperationsPanel","operationsTimelinePanel","shiftRiskHeatmapPanel"]);
   const children=Array.from(commandContainer.children);
   const detailNodes=[];
   children.forEach(node=>{
     const id=node.id||"";
     const cls=node.classList;
     if(node.classList.contains("command-center-topbar")){node.classList.add("bc-command-primary");return;}
     if(keepPrimary.has(id)){node.classList.add("bc-command-primary");return;}
     if(keepSecondary.has(id)){node.classList.add("bc-command-secondary");return;}
     // Readiness / executive / portfolio surfaces stay available but leave the shift's first view.
     node.classList.add("bc-command-detail");detailNodes.push(node);
   });

   const intro=document.createElement("div");
   intro.className="bc-command-clarity";
   intro.innerHTML=`<div><small>COMMAND · SHIFT OVERVIEW</small><strong>Start with the restaurant. Escalate only when something needs attention.</strong><span>Live pulse, near-term risk, and manager actions stay up front. Portfolio, readiness, and leadership analysis stay below the shift.</span></div>`;
   const top=commandContainer.querySelector(".command-center-topbar");
   top?.insertAdjacentElement("afterend",intro);

   if(detailNodes.length){
     const dock=document.createElement("div");dock.className="bc-command-details-dock";
     const toggle=makeToggle("bcCommandDetailsToggle","Show leadership & analysis","Hide leadership & analysis");
     dock.innerHTML=`<div><small>LEADERSHIP & ANALYSIS</small><span>${detailNodes.length} deeper command surfaces are available when the shift needs them.</span></div>`;
     dock.appendChild(toggle);
     const firstDetail=detailNodes[0];
     firstDetail?.insertAdjacentElement("beforebegin",dock);
     let open=localStorage.getItem(PREF_COMMAND)==="open";
     const apply=()=>{
       command.classList.toggle("bc-command-details-open",open);
       toggle.textContent=open?toggle.dataset.openLabel:toggle.dataset.closedLabel;
       toggle.setAttribute("aria-expanded",String(open));
       detailNodes.forEach(x=>x.setAttribute("aria-hidden",open?"false":"true"));
     };
     toggle.addEventListener("click",()=>{open=!open;localStorage.setItem(PREF_COMMAND,open?"open":"closed");apply();});
     apply();
   }
 }

 // ---------- Live ----------
 const live=document.getElementById("blue-current-live");
 const grid=live?.querySelector(".live-command-grid");
 if(live&&grid){
   const action=grid.querySelector(".live-action-card");
   const copilot=grid.querySelector(".live-copilot-card");
   const timeline=grid.querySelector(".live-timeline-card");
   const connector=grid.querySelector(".connector-card");

   // Sequence by urgency: action -> copilot -> timeline -> system connection detail.
   [action,copilot,timeline,connector].filter(Boolean).forEach(x=>grid.appendChild(x));
   action?.classList.add("bc-live-priority-action");
   connector?.classList.add("bc-live-detail");

   // Add plain-language scan labels to KPI buttons.
   const kpis=Array.from(live.querySelectorAll(".live-kpi-grid button"));
   const intent={
     guests:"Right now",tables:"Floor load",calls:"Guest line",revenue:"Sales pace"
   };
   kpis.forEach(button=>{
     const focus=button.dataset.liveFocus;
     if(!button.querySelector(".bc-kpi-intent")){
       const tag=document.createElement("em");tag.className="bc-kpi-intent";tag.textContent=intent[focus]||"Live";
       button.prepend(tag);
     }
   });

   // One concise status line above detailed cards.
   const status=document.createElement("div");
   status.className="bc-live-scanline";
   status.innerHTML=`<div><small>SHIFT SNAPSHOT</small><strong>Read the numbers. Take the next action. Ask Blue Current when you need context.</strong></div>`;
   grid.insertAdjacentElement("beforebegin",status);

   if(connector){
     const dock=document.createElement("div");dock.className="bc-live-details-dock";
     const toggle=makeToggle("bcLiveDetailsToggle","Show system connections","Hide system connections");
     dock.innerHTML=`<div><small>SYSTEM STATUS</small><span>Connection health is available when troubleshooting is needed.</span></div>`;
     dock.appendChild(toggle);
     connector.insertAdjacentElement("beforebegin",dock);
     let open=localStorage.getItem(PREF_LIVE)==="open";
     const apply=()=>{
       live.classList.toggle("bc-live-details-open",open);
       toggle.textContent=open?toggle.dataset.openLabel:toggle.dataset.closedLabel;
       toggle.setAttribute("aria-expanded",String(open));
       connector.setAttribute("aria-hidden",open?"false":"true");
     };
     toggle.addEventListener("click",()=>{open=!open;localStorage.setItem(PREF_LIVE,open?"open":"closed");apply();});
     apply();
   }

   // Give KPI buttons an explicit accessible purpose.
   kpis.forEach(button=>{
     const label=button.querySelector("small")?.textContent?.trim()||"Live metric";
     if(!button.getAttribute("aria-label"))button.setAttribute("aria-label",`${label}. Open related live detail.`);
   });
 }
});
})();