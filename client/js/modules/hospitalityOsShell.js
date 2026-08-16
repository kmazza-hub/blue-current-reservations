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

let commandState={loading:false,locationId:null,lastLoadedAt:null};

function directSection(node){
  while(node&&node.parentElement&&node.parentElement.id!=="main")node=node.parentElement;
  return node&&node.parentElement?.id==="main"?node:null;
}

function candidateSections(name){
  const seen=new Set(),result=[];
  (workspaceMap[name]||[]).forEach(id=>{
    const el=document.getElementById(id),section=el?directSection(el):null;
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
    refreshCommand();
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

const el=id=>document.getElementById(id);
const setText=(id,value)=>{const node=el(id);if(node)node.textContent=value??"—";};
const money=value=>Number.isFinite(Number(value))?new Intl.NumberFormat([],{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value)):"—";
const pct=value=>Number.isFinite(Number(value))?`${Math.round(Number(value))}%`:"—";
const minutes=value=>Number.isFinite(Number(value))?`${Math.round(Number(value))}m`:"—";

function severityLabel(severity){
  return severity==="high"?"HIGH":severity==="watch"?"WATCH":severity==="guest"?"GUEST":"CLEAR";
}

function renderAttention(items=[]){
  const list=el("bcAttentionList");
  if(!list)return;
  list.replaceChildren();
  setText("bcAttentionCount",String(items.length));
  items.slice(0,5).forEach(item=>{
    const button=document.createElement("button");
    button.type="button";
    button.dataset.bcWorkspace=item.workspace||"service";

    const badge=document.createElement("span");
    badge.className=`bc-priority ${item.severity||"normal"}`;
    badge.textContent=severityLabel(item.severity);

    const copy=document.createElement("div");
    const title=document.createElement("strong");
    const detail=document.createElement("small");
    title.textContent=item.title||"Operational signal";
    detail.textContent=item.detail||"";
    copy.append(title,detail);

    const arrow=document.createElement("b");
    arrow.textContent="→";
    button.append(badge,copy,arrow);
    button.addEventListener("click",()=>activate(button.dataset.bcWorkspace));
    list.append(button);
  });
}

function renderLocations(data){
  const select=el("bcCommandLocation");
  if(!select)return;
  const prior=commandState.locationId||select.value;
  select.replaceChildren();
  (data.locations||[]).forEach(location=>{
    const option=document.createElement("option");
    option.value=location.id;
    option.textContent=location.name;
    select.append(option);
  });
  const selected=(data.locations||[]).some(x=>x.id===prior)?prior:data.location?.id;
  if(selected)select.value=selected;
  commandState.locationId=select.value||data.location?.id||null;
}

function buildIntelligence(data){
  const first=(data.attention||[])[0];
  const mode=data.dataMode==="historical-demo"?"historical demo snapshot":"current operating state";
  if(first&&first.severity!=="normal"){
    setText("bcIntelligenceSummary",
      `Blue Current is reading the ${mode}. The highest verified signal is ${first.title.toLowerCase()}. ${first.detail}`);
    setText("bcRecommendedFocus",`Review ${labels[first.workspace]||"the relevant workspace"} first. Blue Current has not executed an operational action automatically.`);
  }else{
    setText("bcIntelligenceSummary",
      `Blue Current is reading the ${mode}. No rule-based critical service exception is present in this snapshot.`);
    setText("bcRecommendedFocus","Maintain service rhythm and monitor the next demand, kitchen, and inventory signals.");
  }
}

function renderCommand(data){
  renderLocations(data);
  const s=data.service||{},n=data.next30Minutes||{},f=data.financial||{},inv=data.inventory||{};

  setText("bcCommandContext",`${data.location?.name||"Restaurant"} · Operating Command · ${data.dataMode==="historical-demo"?"Demo snapshot":"Live state"}`);
  setText("bcCommandTruth",
    data.dataMode==="historical-demo"
      ? `Historical seed data · newest operating event is approximately ${data.dataAgeHours}h old · figures below are derived, not presented as live telemetry.`
      : `Live persisted state · updated ${new Intl.DateTimeFormat([],{hour:"numeric",minute:"2-digit",second:"2-digit"}).format(new Date(data.generatedAt))}.`);

  setText("bcCmdRevenue",f.actualsAvailable?money(f.actualRevenue):money(f.salesForecast));
  setText("bcCmdRevenueSub",f.actualsAvailable?"Actual revenue":"Sales forecast · POS actual pending");
  setText("bcCmdGuests",String(s.activeCovers??0));
  setText("bcCmdGuestsSub",`${s.activeTables??0} active table${s.activeTables===1?"":"s"}`);
  setText("bcCmdOccupancy",pct(s.occupancyPercent));
  setText("bcCmdOccupancySub",`${s.activeCovers??0} of ${data.location?.capacity??0} configured seats`);
  setText("bcCmdWait",minutes(s.averageQuotedWaitMinutes));
  setText("bcCmdWaitSub",`${s.waitlistParties??0} waiting part${s.waitlistParties===1?"y":"ies"}`);
  setText("bcCmdKitchen",minutes(s.kitchenTargetMinutes));
  setText("bcCmdKitchenSub",`${s.activeKitchenTickets??0} active ticket${s.activeKitchenTickets===1?"":"s"} · ${s.foodReadyItems??0} ready item${s.foodReadyItems===1?"":"s"}`);
  setText("bcCmdLabor",f.targetLaborPercent!==null?pct(f.targetLaborPercent):"—");
  setText("bcCmdLaborSub",f.targetLaborPercent!==null?"Target labor · actual POS labor pending":`${s.activeStaff??0} active staff`);

  setText("bcNextReservations",String(n.reservations??0));
  setText("bcNextCovers",String(n.covers??0));
  setText("bcNextTurns",n.expectedTurns===null?"Not modeled":String(n.expectedTurns??0));

  const kitchenLoad=(s.activeKitchenTickets??0)>=4?"HIGH":(s.activeKitchenTickets??0)>=2?"MODERATE":"CLEAR";
  const pressure=Math.min(100,(s.activeKitchenTickets??0)*18+(s.foodReadyItems??0)*8);
  setText("bcKitchenPressure",kitchenLoad);
  const bar=el("bcKitchenPressureBar");if(bar)bar.style.width=`${pressure}%`;

  setText("bcSalesForecast",money(f.salesForecast));
  setText("bcLaborBudget",money(f.laborBudget));
  setText("bcLowStock",String(inv.lowStockItems??0));

  renderAttention(data.attention||[]);
  buildIntelligence(data);

  const rail=document.querySelector(".bc-os-rail-foot small");
  if(rail)rail.textContent=`V76.0 · ${data.dataMode==="historical-demo"?"Demo data":"Live data"}`;
  commandState.lastLoadedAt=Date.now();
}

function renderCommandError(error){
  setText("bcCommandTruth",`Operating picture unavailable · ${error?.message||"Unable to load Blue Current data."}`);
  renderAttention([{severity:"high",workspace:"system",title:"Operating picture unavailable",detail:"Open System and verify authentication, API health, and location access."}]);
}

async function refreshCommand(){
  const clock=el("bcCommandClock");
  if(clock)clock.textContent=new Intl.DateTimeFormat([],{hour:"numeric",minute:"2-digit"}).format(new Date());
  if(commandState.loading)return;
  commandState.loading=true;
  try{
    const query=commandState.locationId?`?locationId=${encodeURIComponent(commandState.locationId)}`:"";
    const response=await fetch(`/api/command/operating-picture${query}`,{
      method:"GET",credentials:"same-origin",headers:{"Accept":"application/json"}
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||`Operating picture returned ${response.status}.`);
    renderCommand(payload);
  }catch(error){
    renderCommandError(error);
  }finally{
    commandState.loading=false;
  }
}

function init(){
  document.body.classList.add("bc-hospitality-os");
  document.querySelectorAll("[data-bc-workspace]").forEach(button=>{
    button.addEventListener("click",()=>activate(button.dataset.bcWorkspace));
  });
  el("bcCommandLocation")?.addEventListener("change",event=>{
    commandState.locationId=event.target.value;
    refreshCommand();
  });
  hideDeepSurfaces();
  refreshCommand();
  setInterval(refreshCommand,30000);
  activate("command",{scroll:false});
}

document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();