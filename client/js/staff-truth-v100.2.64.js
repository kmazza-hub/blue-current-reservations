(() => {
"use strict";
// V100.3.14 — Staff Data Credibility refinement of the Staffing Truth Foundation.
// Primary staffing view is backed by the Time Clock API only.
// It does not present synthetic demand, scheduled coverage, or callout risk as live truth.
const LOCATION_ID="loc_marina";
const byId=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let api=null,timer=null,loading=false,lastState=null;

function ensureStyles(){
 if(byId("bcStaffTruthStylesV100264"))return;
 const style=document.createElement("style");style.id="bcStaffTruthStylesV100264";
 style.textContent=`
 #workforce-intelligence.bc-staff-truth-active-v264>.container{display:none!important}
 .bc-staff-truth-v264{max-width:1180px;margin:0 auto;padding:32px 24px}
 .bc-staff-truth-v264 .bc-staff-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px}
 .bc-staff-truth-v264 .bc-staff-head small{display:block;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#56717a}
 .bc-staff-truth-v264 .bc-staff-head h2{margin:5px 0 6px;font-size:32px;color:#102e37}
 .bc-staff-truth-v264 .bc-staff-head p{margin:0;max-width:760px;color:#5a7179}
 .bc-staff-truth-v264 .bc-staff-head button,.bc-staff-truth-v264 .bc-staff-priority button{border:0;border-radius:12px;padding:11px 14px;font-weight:900;cursor:pointer;background:#0c6978;color:#fff}
 .bc-staff-truth-v264 .bc-staff-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}
 .bc-staff-truth-v264 .bc-staff-kpis article{background:#f4f9fa;border:1px solid #d7e4e7;border-radius:18px;padding:15px}
 .bc-staff-truth-v264 .bc-staff-kpis span{display:block;color:#667d84;font-size:13px}.bc-staff-truth-v264 .bc-staff-kpis strong{display:block;color:#0f3039;font-size:28px;margin-top:4px}
 .bc-staff-truth-v264 .bc-staff-priority{display:flex;justify-content:space-between;gap:20px;align-items:center;background:#0c303a;color:#fff;border-radius:20px;padding:18px;margin:0 0 16px}
 .bc-staff-truth-v264 .bc-staff-priority small{display:block;color:#9ed4dd;font-size:11px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
 .bc-staff-truth-v264 .bc-staff-priority strong{display:block;font-size:21px;margin-top:3px}.bc-staff-truth-v264 .bc-staff-priority p{margin:5px 0 0;color:#d1e3e7}
 .bc-staff-truth-v264 .bc-staff-priority[data-tone="attention"]{box-shadow:inset 4px 0 0 #f3c965}.bc-staff-truth-v264 .bc-staff-priority[data-tone="recovery"]{box-shadow:inset 4px 0 0 #ffad7a}
 .bc-staff-truth-v264 .bc-staff-list{display:grid;gap:10px}.bc-staff-truth-v264 .bc-staff-row{display:grid;grid-template-columns:1.3fr .8fr .7fr;gap:14px;align-items:center;background:#fff;border:1px solid #dbe6e8;border-radius:17px;padding:14px 16px;color:#17333b}
 .bc-staff-truth-v264 .bc-staff-row small{display:block;color:#71848a}.bc-staff-truth-v264 .bc-staff-row strong{font-size:17px}
 .bc-staff-truth-v264 .bc-staff-empty,.bc-staff-truth-v264 .bc-staff-unavailable{padding:22px;border:1px solid #dbe6e8;border-radius:17px;background:#f7fbfc;color:#425d65}
 .bc-staff-truth-v264 .bc-staff-source{margin-top:14px;color:#6b8086;font-size:13px}
 @media(max-width:760px){.bc-staff-truth-v264{padding:20px 12px}.bc-staff-truth-v264 .bc-staff-head{display:block}.bc-staff-truth-v264 .bc-staff-head button{margin-top:12px}.bc-staff-truth-v264 .bc-staff-kpis{grid-template-columns:1fr 1fr}.bc-staff-truth-v264 .bc-staff-priority{display:block}.bc-staff-truth-v264 .bc-staff-priority button{margin-top:12px;width:100%}.bc-staff-truth-v264 .bc-staff-row{grid-template-columns:1fr}}
 `;
 document.head.appendChild(style);
}
function shell(){
 const root=byId("workforce-intelligence");if(!root)return null;
 root.classList.add("bc-staff-truth-active-v264");
 let view=root.querySelector(":scope > .bc-staff-truth-v264");
 if(!view){view=document.createElement("div");view.className="bc-staff-truth-v264";root.appendChild(view);}
 return view;
}
function openTimeClock(){
 const target=byId("time-clock");if(!target)return;
 target.scrollIntoView({behavior:"smooth",block:"start"});
 target.setAttribute("tabindex","-1");target.focus({preventScroll:true});
}
function firstPriority(summary={}){
 if(Number(summary.missedPunches||0)>0)return{tone:"recovery",title:"Review missed punches",detail:`${summary.missedPunches} timecard ${summary.missedPunches===1?"record needs":"records need"} manager review.`};
 if(Number(summary.overtimeRisk||0)>0)return{tone:"attention",title:"Check overtime exposure",detail:`${summary.overtimeRisk} clocked-in ${summary.overtimeRisk===1?"employee is":"employees are"} near or above the configured weekly overtime threshold.`};
 return{tone:"clear",title:"No timekeeping exception",detail:`${Number(summary.employeesWorking||0)} working now · ${Number(summary.onBreak||0)} on break. Role coverage will be certified separately from scheduled staffing.`};
}
function render(state){
 lastState=state;
 const view=shell();if(!view)return;
 const summary=state?.summary||{},active=Array.isArray(state?.active)?state.active:[],priority=firstPriority(summary);
 const sorted=[...active].sort((a,b)=>Number(b.requiresReview)-Number(a.requiresReview)||Number(b.overtimeRisk)-Number(a.overtimeRisk)||Number(b.onBreak)-Number(a.onBreak)||String(a.employeeName||"").localeCompare(String(b.employeeName||"")));
 view.innerHTML=`<div class="bc-staff-head"><div><small>Staff · live truth</small><h2>Who is actually working right now?</h2><p>Blue Current is using clocked-in Time & Attendance records here. Forecast demand, scheduled coverage, and callout risk stay out of the primary view until those inputs are certified.</p></div><button type="button" data-bc-staff-refresh>Refresh</button></div>
 <div class="bc-staff-kpis"><article><span>Working now</span><strong>${Number(summary.employeesWorking||0)}</strong></article><article><span>On break</span><strong>${Number(summary.onBreak||0)}</strong></article><article><span>Overtime risk</span><strong>${Number(summary.overtimeRisk||0)}</strong></article><article><span>Missed punches</span><strong>${Number(summary.missedPunches||0)}</strong></article></div>
 <div class="bc-staff-priority" data-tone="${priority.tone}"><div><small>First priority</small><strong>${esc(priority.title)}</strong><p>${esc(priority.detail)}</p></div><button type="button" data-bc-open-timeclock>Open time clock</button></div>
 <div class="bc-staff-list">${sorted.length?sorted.map(item=>`<article class="bc-staff-row"><div><small>${esc(item.role||"Team member")}</small><strong>${esc(item.employeeName||item.employeeId||"Employee")}</strong></div><div><small>Status</small><strong>${item.requiresReview?"Needs punch review":item.onBreak?"On break":"Working"}</strong></div><div><small>Today</small><strong>${Number(item.workedHours||0).toFixed(1)}h${item.requiresReview?" · review":item.overtimeRisk?" · OT risk":""}</strong></div></article>`).join(""):`<div class="bc-staff-empty"><strong>No one is clocked in.</strong><div>That is the current Time & Attendance record—not a staffing recommendation.</div></div>`}</div>
 <div class="bc-staff-source">Source: Blue Current Time Clock API · Updated ${state?.generatedAt?new Date(state.generatedAt).toLocaleTimeString():"now"} · No synthetic staffing demand</div>`;
 view.querySelector("[data-bc-staff-refresh]")?.addEventListener("click",load);
 view.querySelector("[data-bc-open-timeclock]")?.addEventListener("click",openTimeClock);
}
function renderUnavailable(message){
 const view=shell();if(!view)return;
 view.innerHTML=`<div class="bc-staff-head"><div><small>Staff · live truth</small><h2>Live staffing data unavailable</h2><p>Blue Current will not substitute forecast or demo staffing numbers for a missing Time & Attendance source.</p></div><button type="button" data-bc-staff-refresh>Try again</button></div><div class="bc-staff-unavailable"><strong>No live Time Clock snapshot.</strong><div>${esc(message||"Authentication or the Time Clock service is unavailable.")}</div></div><div class="bc-staff-source">Source required: Blue Current Time Clock API · Synthetic fallback disabled</div>`;
 view.querySelector("[data-bc-staff-refresh]")?.addEventListener("click",load);
}
async function load(){
 if(loading)return;loading=true;ensureStyles();shell();
 try{
   api ||= new window.BlueCurrentCloudApi("");
   if(!api?.token){renderUnavailable("Sign in to load the current clocked-in team.");return;}
   const state=await api.timeClock(LOCATION_ID);
   render(state||{});
 }catch(error){renderUnavailable(error?.message||"Unable to load live staffing data.");}
 finally{loading=false;}
}
function init(){
 if(!byId("workforce-intelligence"))return;
 ensureStyles();load();
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
 timer=setInterval(load,30000);
 window.BlueCurrentStaffTruthV100_2_64={refresh:load,getState:()=>lastState?JSON.parse(JSON.stringify(lastState)):null,destroy:()=>clearInterval(timer)};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
