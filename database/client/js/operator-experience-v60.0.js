(function(){
"use strict";
const CORE=[
 "command-center","blue-current-live","host-stand","journey",
 "workforce-intelligence","kitchenThroughputCenter","service-coordination",
 "executive-command-center","restaurantAiBrainV341"
];
const SUPPORT=[
 "hospitalityPerformanceCommand","hospitalityActionWorkspace","hospitalityOutcomeMeasurement",
 "serviceProfitabilityIntelligence","predictiveShiftControl","managerOperatingRhythm","multiLocationPerformance",
 "restaurantPulse","predictiveOperationsPanel","shiftRiskHeatmapPanel","operationsTimelinePanel",
 "guest-intelligence","workforce-foundation","inventory-intelligence","production-readiness","time-clock"
];
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();}
ready(()=>{
 const main=document.getElementById("main"); if(!main)return;
 // V100.2.0: legacy operator-priority classification owns only legacy
 // top-level surfaces. The Hospitality OS shell has its own renderer/router.
 const sections=Array.from(main.querySelectorAll(":scope > section[id]"))
   .filter(section=>section.id!=="blueCurrentCommand" && !section.classList.contains("bc-os-shell"));
 const advanced=new Set(Array.from(main.querySelectorAll(":scope > .bc-advanced-surface[id]")).map(x=>x.id));
 const core=new Set(CORE),support=new Set(SUPPORT);

 sections.forEach(section=>{
   if(advanced.has(section.id)) return;
   if(core.has(section.id)) section.dataset.bcPriority="primary";
   else if(support.has(section.id)) section.dataset.bcPriority="support";
   else section.dataset.bcPriority="deep";
 });

 // Purpose labels make every major operating section answer "why am I here?"
 const purposes={
  "command-center":"Start here · what needs attention now",
  "blue-current-live":"Live service · what is happening right now",
  "host-stand":"Floor · seat guests, manage tables, and control the front door",
  "journey":"Reservations · demand, commitments, arrivals, and occasions",
  "workforce-intelligence":"Staff · coverage, callout risk, and the next staffing decision",
  "kitchenThroughputCenter":"Kitchen · throughput, bottlenecks, and recovery",
  "service-coordination":"Service · tables, expo, server load, and live risk",
  "executive-command-center":"Executive · performance, risk, and leadership decisions",
  "restaurantAiBrainV341":"AI Brain · recommendations, evidence, and human decisions"
 };
 Object.entries(purposes).forEach(([id,text])=>{
   const section=document.getElementById(id); if(!section)return;
   if(section.querySelector(":scope > .bc-purpose-chip"))return;
   const chip=document.createElement("div");chip.className="bc-purpose-chip";chip.textContent=text;
   section.prepend(chip);
 });

 // Deep tools are retained, but hidden behind one intentional control instead of flooding the page.
 const deep=sections.filter(x=>x.dataset.bcPriority==="deep");
 if(deep.length){
   deep.forEach(x=>{x.classList.add("bc-deep-tool");x.setAttribute("aria-hidden","true");});
   const dock=document.createElement("section");
   dock.className="bc-tools-dock container";dock.id="bcToolsDock";
   dock.innerHTML=`<div><small>TOOLS & CONFIGURATION</small><strong>Keep the shift focused.</strong><span>${deep.length} specialist, configuration, intelligence, and administrative surfaces are available here when needed—not in the manager's primary operating path.</span></div><button type="button" class="button button-light button-small" id="bcToolsToggle">Show tools</button>`;
   main.appendChild(dock);
   let open=new URLSearchParams(location.search).get("tools")==="1";
   const apply=()=>{
     document.documentElement.classList.toggle("bc-tools-open",open);
     deep.forEach(x=>x.setAttribute("aria-hidden",open?"false":"true"));
     const b=document.getElementById("bcToolsToggle");if(b){b.textContent=open?"Hide tools":"Show tools";b.setAttribute("aria-expanded",String(open));}
   };
   document.getElementById("bcToolsToggle")?.addEventListener("click",()=>{open=!open;apply();if(open)deep[0]?.scrollIntoView({behavior:"smooth",block:"start"});});
   apply();
 }

 // Give unlabeled icon-only buttons an accessible title where aria-label exists.
 document.querySelectorAll("button[aria-label]:not([title])").forEach(b=>b.title=b.getAttribute("aria-label"));

 // Ensure common live-status text is legible and semantically surfaced.
 document.querySelectorAll(".demo-data-chip,.status-chip,.live-chip").forEach(x=>x.classList.add("bc-high-contrast-chip"));
});
})();