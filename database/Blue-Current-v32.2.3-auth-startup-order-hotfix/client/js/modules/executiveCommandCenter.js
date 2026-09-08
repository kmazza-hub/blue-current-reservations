(function(){"use strict";
function createExecutiveCommandCenterModule(eventBus,appState,cloudFoundationModule){
 const api=cloudFoundationModule?.api||new window.BlueCurrentCloudApi(""),$=id=>document.getElementById(id);
 let state={portfolio:{},locations:[],alerts:[],goals:[],brief:{}},selected=null;
 const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v||0);
 function render(){
  const p=state.portfolio||{};
  $("execHealth").textContent=p.health??"—";$("execRevenue").textContent=money(p.revenue);
  $("execRevenueTrend").textContent=`${p.revenueTrend>=0?"+":""}${p.revenueTrend||0}% vs yesterday`;
  $("execGuests").textContent=p.guestCount||0;$("execOccupancy").textContent=`${p.occupancy||0}%`;
  $("execLocations").textContent=p.activeLocations||0;$("execAlerts").textContent=p.atRiskLocations||0;
  $("execTicketTime").textContent=`${p.averageTicketMinutes||0}m`;$("execAiDecisions").textContent=p.acceptedAiDecisions||0;
  $("execHealthRing")?.style.setProperty("--score",`${p.health||0}%`);
  $("execBriefHeadline").textContent=state.brief?.headline||"";$("execBriefSummary").textContent=state.brief?.summary||"";
  $("execBriefHighlights").innerHTML=(state.brief?.highlights||[]).map(x=>`<li>${x}</li>`).join("");
  $("execLastUpdated").textContent=state.generatedAt?new Date(state.generatedAt).toLocaleTimeString():"—";
  $("execLocationGrid").innerHTML=state.locations.map(x=>`<button class="exec-location-card risk-${x.risk} ${x.locationId===selected?"selected":""}" data-exec-location="${x.locationId}"><div class="exec-location-head"><div><small>${x.city}, ${x.state}</small><strong>${x.name}</strong></div><span>${x.health}</span></div><div class="exec-location-metrics"><p><span>Revenue</span><b>${money(x.revenue)}</b></p><p><span>Trend</span><b>${x.revenueTrend>=0?"+":""}${x.revenueTrend}%</b></p><p><span>Occupancy</span><b>${x.occupancy}%</b></p><p><span>Ticket time</span><b>${x.averageTicketMinutes}m</b></p></div><footer><span>${x.guestCount} guests</span><b>${x.risk} risk</b></footer></button>`).join("");
  const x=state.locations.find(v=>v.locationId===selected)||state.locations[0];
  $("execLocationDetail").innerHTML=x?`<div class="exec-detail-head"><div><small>${x.city}, ${x.state}</small><h3>${x.name}</h3></div><span>${x.health}</span></div><div class="exec-detail-grid"><article><small>Revenue</small><strong>${money(x.revenue)}</strong><span>${x.revenueTrend}% trend</span></article><article><small>Guests</small><strong>${x.guestCount}</strong><span>Today</span></article><article><small>Tables</small><strong>${x.activeTables}/${x.totalTables}</strong><span>${x.occupancy}% occupied</span></article><article><small>Reservations</small><strong>${x.reservations}</strong><span>${x.waitlist} waiting</span></article><article><small>Kitchen</small><strong>${x.activeTickets}</strong><span>${x.readyTickets} ready</span></article><article><small>Staff</small><strong>${x.activeStaff}</strong><span>Active</span></article></div>`:"";
  $("execAlertFeed").innerHTML=state.alerts.map(a=>`<article class="severity-${a.severity}"><span>${a.severity}</span><div><strong>${a.title}</strong><p>${a.locationName} · ${a.detail}</p></div><button data-exec-alert-location="${a.locationId}">${a.action}</button></article>`).join("")||"<div class='exec-empty'><strong>No material portfolio alerts</strong></div>";
  $("execGoalList").innerHTML=state.goals.map(g=>`<article><div><small>${g.label}</small><strong>${g.unit==="currency"?money(g.target):g.target+(g.unit==="minutes"?"m":"")}</strong></div><button data-exec-goal="${g.id}">Edit</button></article>`).join("");
  appState.update({executivePortfolioHealth:p.health||0,executivePortfolioRevenue:p.revenue||0});
 }
 async function load(){if(!api.token)return;state=await api.executiveCommand();if(!selected)selected=state.locations[0]?.locationId||null;render();eventBus.emit("executive:loaded",state.portfolio);}
 $("execLocationGrid")?.addEventListener("click",e=>{const b=e.target.closest("[data-exec-location]");if(b){selected=b.dataset.execLocation;render();}});
 $("execAlertFeed")?.addEventListener("click",e=>{const b=e.target.closest("[data-exec-alert-location]");if(b){selected=b.dataset.execAlertLocation;render();}});
 $("execGoalList")?.addEventListener("click",async e=>{const b=e.target.closest("[data-exec-goal]");if(!b)return;const g=state.goals.find(x=>x.id===b.dataset.execGoal),v=prompt(`Update ${g.label}`,g.target);if(v!==null&&!Number.isNaN(Number(v))){await api.updateExecutiveGoal(g.id,{target:Number(v)});await load();}});
 $("execRefreshButton")?.addEventListener("click",load);eventBus.on?.("auth:signed-in",load);eventBus.on?.("auth:restored",load);setInterval(load,60000);load();
 return{reload:load,getState:()=>JSON.parse(JSON.stringify(state))};
}
window.createBlueCurrentExecutiveCommandCenterModule=createExecutiveCommandCenterModule;})();