(() => {
"use strict";
// V100.2.65 — Published Schedule → Live Role Coverage.
// Coverage is certified only when the current week's schedule has been published.
// Expected roles come from scheduled shifts active at the current local time.
// Actual roles come from clocked-in Time Clock records.
const LOCATION_ID=window.BlueCurrentFrontlineLocation?.reference||"loc_marina";
const byId=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const normalizeRole=value=>String(value||"Team member").trim().toLowerCase().replace(/\s+/g," ");
const minutes=value=>{const [h,m]=String(value||"00:00").split(":").map(Number);return h*60+m;};
const isoLocal=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
let api=null,timer=null,loading=false,lastSnapshot=null,observer=null;

function ensureStyles(){
 if(byId("bcStaffCoverageStylesV100265"))return;
 const style=document.createElement("style");style.id="bcStaffCoverageStylesV100265";
 style.textContent=`
 .bc-staff-coverage-v265{max-width:1132px;margin:0 auto 28px;padding:0 24px}
 .bc-staff-coverage-v265 .bc-cov-card{background:#fff;border:1px solid #d8e5e8;border-radius:20px;padding:18px;color:#18343c}
 .bc-staff-coverage-v265 .bc-cov-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:14px}
 .bc-staff-coverage-v265 .bc-cov-head small{display:block;color:#637b82;font-size:11px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
 .bc-staff-coverage-v265 .bc-cov-head strong{display:block;font-size:21px;margin-top:3px}.bc-staff-coverage-v265 .bc-cov-head span{color:#667c83;font-size:13px;text-align:right}
 .bc-staff-coverage-v265 .bc-cov-priority{display:flex;justify-content:space-between;gap:16px;align-items:center;background:#0d303a;color:#fff;border-radius:16px;padding:14px 16px;margin-bottom:13px}
 .bc-staff-coverage-v265 .bc-cov-priority small{display:block;color:#9ed4dd;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.bc-staff-coverage-v265 .bc-cov-priority strong{display:block;font-size:18px;margin-top:2px}.bc-staff-coverage-v265 .bc-cov-priority span{color:#d2e4e8;font-size:13px;text-align:right}
 .bc-staff-coverage-v265 .bc-cov-priority[data-tone="gap"]{box-shadow:inset 4px 0 0 #ffad7a}.bc-staff-coverage-v265 .bc-cov-priority[data-tone="clear"]{box-shadow:inset 4px 0 0 #80d7c6}
 .bc-staff-coverage-v265 .bc-cov-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.bc-staff-coverage-v265 .bc-cov-role{border:1px solid #dde8ea;border-radius:14px;padding:12px;background:#f7fbfc}
 .bc-staff-coverage-v265 .bc-cov-role[data-gap="true"]{border-color:#f0b48f;background:#fff8f3}.bc-staff-coverage-v265 .bc-cov-role small{display:block;color:#6d8288}.bc-staff-coverage-v265 .bc-cov-role strong{display:block;font-size:18px;margin-top:2px}.bc-staff-coverage-v265 .bc-cov-role span{display:block;margin-top:3px;color:#60767d;font-size:12px}
 .bc-staff-coverage-v265 .bc-cov-unavailable{border:1px dashed #c8d8dc;border-radius:14px;padding:16px;background:#f7fbfc;color:#526a71}
 .bc-staff-coverage-v265 .bc-cov-source{margin-top:12px;color:#70858b;font-size:12px}
 @media(max-width:760px){.bc-staff-coverage-v265{padding:0 12px}.bc-staff-coverage-v265 .bc-cov-head,.bc-staff-coverage-v265 .bc-cov-priority{display:block}.bc-staff-coverage-v265 .bc-cov-head span,.bc-staff-coverage-v265 .bc-cov-priority span{display:block;text-align:left;margin-top:7px}.bc-staff-coverage-v265 .bc-cov-grid{grid-template-columns:1fr}}
 `;
 document.head.appendChild(style);
}
function host(){
 const root=byId("workforce-intelligence");if(!root)return null;
 let node=root.querySelector(":scope > .bc-staff-coverage-v265");
 if(!node){node=document.createElement("div");node.className="bc-staff-coverage-v265";root.appendChild(node);}
 return node;
}
function currentShifts(schedule,now=new Date()){
 const date=isoLocal(now),current=now.getHours()*60+now.getMinutes();
 return (schedule?.shifts||[]).filter(shift =>
   shift.date===date &&
   minutes(shift.startTime)<=current &&
   minutes(shift.endTime)>current
 );
}
function coverage(schedule,clock,now=new Date()){
 if(!schedule?.publication || schedule.publication.status!=="published"){
   return {certified:false,reason:"Current schedule is not published.",roles:[],gaps:[],currentShifts:[]};
 }
 const shifts=currentShifts(schedule,now),active=Array.isArray(clock?.active)?clock.active:[];
 const expected=new Map(),actual=new Map();
 shifts.forEach(shift=>{const role=normalizeRole(shift.role);expected.set(role,(expected.get(role)||0)+1);});
 active.filter(item=>!item.onBreak).forEach(item=>{const role=normalizeRole(item.role);actual.set(role,(actual.get(role)||0)+1);});
 const roleNames=new Set([...expected.keys(),...actual.keys()]);
 const roles=[...roleNames].map(role=>{
   const scheduled=expected.get(role)||0,working=actual.get(role)||0,gap=Math.max(0,scheduled-working);
   return {role,scheduled,working,gap,extra:Math.max(0,working-scheduled)};
 }).filter(row=>row.scheduled>0||row.working>0).sort((a,b)=>b.gap-a.gap||b.scheduled-a.scheduled||a.role.localeCompare(b.role));
 return {certified:true,roles,gaps:roles.filter(row=>row.gap>0),currentShifts:shifts};
}
function titleRole(role){return role.replace(/\b\w/g,ch=>ch.toUpperCase());}
function render(schedule,clock){
 lastSnapshot={schedule,clock};
 const node=host();if(!node)return;
 const result=coverage(schedule,clock),published=schedule?.publication;
 if(!result.certified){
   node.innerHTML=`<div class="bc-cov-card"><div class="bc-cov-head"><div><small>Live role coverage</small><strong>Coverage not certified</strong></div><span>Published schedule required</span></div><div class="bc-cov-unavailable"><strong>Blue Current will not guess required staffing.</strong><div>${esc(result.reason)} Publish the current schedule before comparing expected coverage with clocked-in staff.</div></div><div class="bc-cov-source">Expected source: published Scheduling plan · Actual source: Time Clock · Synthetic requirements disabled</div></div>`;
   return;
 }
 const first=result.gaps[0]||null;
 const priority=first
   ? {tone:"gap",title:`${titleRole(first.role)} coverage gap`,detail:`${first.scheduled} scheduled now · ${first.working} actively working · ${first.gap} short. Confirm the shift or deploy coverage.`}
   : {tone:"clear",title:"Published role coverage is met",detail:`${result.currentShifts.length} scheduled ${result.currentShifts.length===1?"shift":"shifts"} should be active now; clocked-in role counts meet the published plan.`};
 node.innerHTML=`<div class="bc-cov-card"><div class="bc-cov-head"><div><small>Live role coverage</small><strong>Published plan vs. working now</strong></div><span>${published?.publishedAt?`Published ${esc(new Date(published.publishedAt).toLocaleString())}`:"Published schedule"}</span></div>
 <div class="bc-cov-priority" data-tone="${priority.tone}"><div><small>Coverage priority</small><strong>${esc(priority.title)}</strong></div><span>${esc(priority.detail)}</span></div>
 <div class="bc-cov-grid">${result.roles.length?result.roles.map(row=>`<article class="bc-cov-role" data-gap="${row.gap>0}"><small>${esc(titleRole(row.role))}</small><strong>${row.working} working / ${row.scheduled} scheduled</strong><span>${row.gap>0?`${row.gap} short right now`:row.extra>0?`${row.extra} above published count`:"Coverage met"}</span></article>`).join(""):`<div class="bc-cov-unavailable"><strong>No published shifts are active right now.</strong><div>There is no role requirement to compare at this moment.</div></div>`}</div>
 <div class="bc-cov-source">Expected: current active shifts from published Scheduling · Actual: clocked-in, not-on-break Time Clock roles · No demand-based staffing formula</div></div>`;
}
async function load(){
 if(loading)return;loading=true;ensureStyles();host();
 try{
   api ||= new window.BlueCurrentCloudApi("");
   if(!api?.token){render({publication:null,shifts:[]},{active:[]});return;}
   const [schedule,clock]=await Promise.all([api.scheduling(LOCATION_ID,""),api.timeClock(LOCATION_ID)]);
   render(schedule||{},clock||{});
 }catch(error){
   const node=host();if(node)node.innerHTML=`<div class="bc-cov-card"><div class="bc-cov-head"><div><small>Live role coverage</small><strong>Coverage unavailable</strong></div><span>Source error</span></div><div class="bc-cov-unavailable"><strong>Blue Current will not estimate around a missing source.</strong><div>${esc(error?.message||"Unable to load Scheduling or Time Clock.")}</div></div></div>`;
 }finally{loading=false;}
}
function init(){
 if(!byId("workforce-intelligence"))return;
 ensureStyles();load();
 timer=setInterval(load,30000);
 window.BlueCurrentStaffCoverageV100_2_65={refresh:load,coverage,getState:()=>lastSnapshot?JSON.parse(JSON.stringify(lastSnapshot)):null,destroy:()=>clearInterval(timer)};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
