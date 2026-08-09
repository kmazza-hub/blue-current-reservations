(function(){"use strict";
function createExecutiveCommandCenterModule(eventBus,appState,cloudFoundationModule){
 const api=cloudFoundationModule?.api||new window.BlueCurrentCloudApi(""),$=id=>document.getElementById(id);
 let state={portfolio:{},locations:[],alerts:[],goals:[],brief:{}},selected=null;
 const present=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
 const money=v=>present(v)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(v)):"—";
 const num=v=>present(v)?String(v):"—";
 const pct=v=>present(v)?`${v}%`:"—";
 const mins=v=>present(v)?`${v}m`:"—";
 function render(){
  const p=state.portfolio||{};
  $("execHealth").textContent=p.health??"—";$("execRevenue").textContent=money(p.revenue);
  $("execRevenueTrend").textContent=present(p.revenueTrend)?`${p.revenueTrend>=0?"+":""}${p.revenueTrend}% vs yesterday`:"Revenue source unavailable";
  $("execGuests").textContent=num(p.guestCount);$("execOccupancy").textContent=pct(p.occupancy);
  $("execLocations").textContent=p.activeLocations||0;$("execAlerts").textContent=p.atRiskLocations||0;
  $("execTicketTime").textContent=mins(p.averageTicketMinutes);$("execAiDecisions").textContent=p.acceptedAiDecisions||0;
  $("execHealthRing")?.style.setProperty("--score",`${p.health||0}%`);
  $("execBriefHeadline").textContent=state.brief?.headline||"";$("execBriefSummary").textContent=state.brief?.summary||"";
  $("execBriefHighlights").innerHTML=(state.brief?.highlights||[]).map(x=>`<li>${x}</li>`).join("");
  $("execLastUpdated").textContent=state.generatedAt?new Date(state.generatedAt).toLocaleTimeString():"—";
  $("execLocationGrid").innerHTML=state.locations.map(x=>`<button class="exec-location-card risk-${x.risk} ${x.locationId===selected?"selected":""}" data-exec-location="${x.locationId}"><div class="exec-location-head"><div><small>${x.city}, ${x.state}</small><strong>${x.name}</strong></div><span>${num(x.health)}</span></div><div class="exec-location-metrics"><p><span>Revenue</span><b>${money(x.revenue)}</b></p><p><span>Trend</span><b>${present(x.revenueTrend)?`${x.revenueTrend>=0?"+":""}${x.revenueTrend}%`:"—"}</b></p><p><span>Occupancy</span><b>${pct(x.occupancy)}</b></p><p><span>Ticket time</span><b>${mins(x.averageTicketMinutes)}</b></p></div><footer><span>${num(x.guestCount)} guests</span><b>${x.risk} risk</b></footer></button>`).join("");
  const x=state.locations.find(v=>v.locationId===selected)||state.locations[0];
  $("execLocationDetail").innerHTML=x?`<div class="exec-detail-head"><div><small>${x.city}, ${x.state}</small><h3>${x.name}</h3></div><span>${num(x.health)}</span></div><div class="exec-detail-grid"><article><small>Revenue</small><strong>${money(x.revenue)}</strong><span>${present(x.revenueTrend)?`${x.revenueTrend}% trend`:"source unavailable"}</span></article><article><small>Guests</small><strong>${num(x.guestCount)}</strong><span>Today</span></article><article><small>Tables</small><strong>${x.activeTables}/${x.totalTables}</strong><span>${pct(x.occupancy)} occupied</span></article><article><small>Reservations</small><strong>${x.reservations}</strong><span>${x.waitlist} waiting</span></article><article><small>Kitchen</small><strong>${x.activeTickets}</strong><span>${x.readyTickets} ready</span></article><article><small>Staff</small><strong>${x.activeStaff}</strong><span>Active</span></article></div>`:"";
  $("execAlertFeed").innerHTML=state.alerts.map(a=>`<article class="severity-${a.severity}"><span>${a.severity}</span><div><strong>${a.title}</strong><p>${a.locationName} · ${a.detail}</p></div><button data-exec-alert-location="${a.locationId}">${a.action}</button></article>`).join("")||"<div class='exec-empty'><strong>No material portfolio alerts</strong></div>";
  $("execGoalList").innerHTML=state.goals.map(g=>`<article><div><small>${g.label}</small><strong>${g.unit==="currency"?money(g.target):g.target+(g.unit==="minutes"?"m":"")}</strong></div><button data-exec-goal="${g.id}">Edit</button></article>`).join("");
  appState.update({executivePortfolioHealth:present(p.health)?p.health:null,executivePortfolioRevenue:present(p.revenue)?p.revenue:null});
 }
 async function load(){if(!api.token)return;try{state=await api.executiveCommand();if(!selected)selected=state.locations[0]?.locationId||null;render();eventBus.emit("executive:loaded",state.portfolio);}catch(err){const el=$("execLastUpdated");if(el)el.textContent="Connection interrupted — retrying";}}
 $("execLocationGrid")?.addEventListener("click",e=>{const b=e.target.closest("[data-exec-location]");if(b){selected=b.dataset.execLocation;render();}});
 $("execAlertFeed")?.addEventListener("click",e=>{const b=e.target.closest("[data-exec-alert-location]");if(b){selected=b.dataset.execAlertLocation;render();}});
 $("execGoalList")?.addEventListener("click",async e=>{const b=e.target.closest("[data-exec-goal]");if(!b)return;const g=state.goals.find(x=>x.id===b.dataset.execGoal),v=prompt(`Update ${g.label}`,g.target);if(v!==null&&!Number.isNaN(Number(v))){await api.updateExecutiveGoal(g.id,{target:Number(v)});await load();}});
 $("execRefreshButton")?.addEventListener("click",load);eventBus.on?.("auth:signed-in",load);eventBus.on?.("auth:restored",load);setInterval(load,60000);window.addEventListener?.("online",load);load();
 return{reload:load,getState:()=>JSON.parse(JSON.stringify(state))};
}
window.createBlueCurrentExecutiveCommandCenterModule=createExecutiveCommandCenterModule;})();