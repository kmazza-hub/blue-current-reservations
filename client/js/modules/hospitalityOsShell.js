(()=>{
"use strict";

const workspaceMap={
  guests:["host-stand","guest-journey-live"],
  service:["operating-current","digital-twin"],
  team:["staff-operations","workforce-intelligence","managerOperatingRhythm"],
  kitchen:["kitchen-operations","kitchenThroughputCenter"],
  inventory:["inventory-intelligence","inventoryWasteCenter"],
  performance:["profit-current","serviceProfitabilityIntelligence"],
  executive:["executive-command-center","executiveMorningBrief"],
  integrations:["integrationControlCenter","v5325RestaurantWorkflowIntegration"],
  system:["technicalActivationReadiness","deploymentReadinessCenter","production-readiness"]
};

const labels={
 command:"Command",guests:"Guests",service:"Service",team:"Team",kitchen:"Kitchen",
 inventory:"Inventory",performance:"Performance",executive:"Executive",
 integrations:"Integrations",system:"System"
};

function directSection(node){
  while(node&&node.parentElement&&node.parentElement.id!=="main")node=node.parentElement;
  return node&&node.parentElement?.id==="main"?node:null;
}

function candidateSections(name){
  const seen=new Set(), result=[];
  (workspaceMap[name]||[]).forEach(id=>{
    const el=document.getElementById(id), section=el?directSection(el):null;
    if(section&&!seen.has(section)){seen.add(section);result.push(section);}
  });
  return result;
}

function hideDeepSurfaces(){
  document.querySelectorAll("#main > section:not(.bc-os-shell)").forEach(section=>{
    section.classList.remove("bc-workspace-visible");
  });
}

function activate(name,{scroll=true}={}){
  if(!labels[name])name="command";
  hideDeepSurfaces();
  document.querySelectorAll("[data-bc-workspace]").forEach(button=>{
    button.classList.toggle("is-active",button.dataset.bcWorkspace===name);
  });

  const shell=document.getElementById("blueCurrentCommand");
  const returnBar=document.getElementById("bcWorkspaceReturn");
  const active=document.getElementById("bcActiveWorkspace");
  const sections=candidateSections(name);

  if(name==="command"){
    shell?.classList.remove("bc-shell-workspace-open");
    if(returnBar)returnBar.hidden=true;
    if(scroll)shell?.scrollIntoView({behavior:"smooth",block:"start"});
  }else{
    shell?.classList.add("bc-shell-workspace-open");
    sections.forEach(section=>section.classList.add("bc-workspace-visible"));
    if(returnBar)returnBar.hidden=false;
    if(active)active.textContent=labels[name];
    if(scroll){
      const first=sections[0]||returnBar;
      setTimeout(()=>first?.scrollIntoView({behavior:"smooth",block:"start"}),30);
    }
  }
  document.documentElement.dataset.bcWorkspace=name;
  try{sessionStorage.setItem("bluecurrent.workspace",name)}catch{}
  window.dispatchEvent(new CustomEvent("bluecurrent:workspace",{detail:{workspace:name,sections:sections.map(x=>x.id)}}));
}

function syncMetric(targetId,sourceIds,transform){
  const target=document.getElementById(targetId);
  if(!target)return;
  for(const id of sourceIds){
    const source=document.getElementById(id);
    const value=source?.textContent?.trim();
    if(value&&value!=="—"&&value!=="0"){
      target.textContent=transform?transform(value):value;
      return;
    }
  }
}

function refreshCommand(){
  syncMetric("bcCmdGuests",["eveningGuests","guestCount","execGuests"]);
  syncMetric("bcCmdOccupancy",["portfolioFocusOccupancy","digitalTwinOccupancy","execLocationOccupancy"]);
  syncMetric("bcCmdWait",["averageWait","portfolioFocusWait","execLocationWait"]);
  syncMetric("bcCmdRevenue",["restaurantPerformanceRevenue","execRevenue"]);
  syncMetric("bcCmdLabor",["restaurantPerformanceLabor","laborCostPercent"]);
  const clock=document.getElementById("bcCommandClock");
  if(clock)clock.textContent=new Intl.DateTimeFormat([], {hour:"numeric",minute:"2-digit"}).format(new Date());
}

function init(){
  document.body.classList.add("bc-hospitality-os");
  document.querySelectorAll("[data-bc-workspace]").forEach(button=>{
    button.addEventListener("click",()=>activate(button.dataset.bcWorkspace));
  });
  hideDeepSurfaces();
  refreshCommand();
  setInterval(refreshCommand,30000);
  activate("command",{scroll:false});
}

document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();