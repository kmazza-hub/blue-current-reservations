(() => {
"use strict";
// V100.2.66 — Published Shift Attendance Exceptions.
// Person-level attendance exceptions are certified only from:
// 1) a published shift active right now, and
// 2) a matching Time Clock active record.
// Blue Current does not infer callout/no-show cause.
const LOCATION_ID="loc_marina";
const GRACE_MINUTES=10;
const byId=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const minutes=value=>{const [h,m]=String(value||"00:00").split(":").map(Number);return h*60+m;};
const isoLocal=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
let api=null,timer=null,loading=false,last=null;

function ensureStyles(){
 if(byId("bcStaffAttendanceStylesV100266"))return;
 const style=document.createElement("style");style.id="bcStaffAttendanceStylesV100266";
 style.textContent=`
 .bc-staff-attendance-v266{max-width:1132px;margin:0 auto 30px;padding:0 24px}
 .bc-staff-attendance-v266 .bc-att-card{background:#fff;border:1px solid #d8e5e8;border-radius:20px;padding:18px;color:#18343c}
 .bc-staff-attendance-v266 .bc-att-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:14px}
 .bc-staff-attendance-v266 .bc-att-head small{display:block;color:#637b82;font-size:11px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
 .bc-staff-attendance-v266 .bc-att-head strong{display:block;font-size:21px;margin-top:3px}.bc-staff-attendance-v266 .bc-att-head span{color:#6b8086;font-size:13px;text-align:right}
 .bc-staff-attendance-v266 .bc-att-priority{display:flex;justify-content:space-between;gap:18px;align-items:center;background:#0d303a;color:#fff;border-radius:16px;padding:14px 16px;margin-bottom:13px}
 .bc-staff-attendance-v266 .bc-att-priority small{display:block;color:#9ed4dd;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.bc-staff-attendance-v266 .bc-att-priority strong{display:block;font-size:18px;margin-top:2px}.bc-staff-attendance-v266 .bc-att-priority span{color:#d2e4e8;font-size:13px;text-align:right}
 .bc-staff-attendance-v266 .bc-att-priority[data-tone="attention"]{box-shadow:inset 4px 0 0 #ffad7a}.bc-staff-attendance-v266 .bc-att-priority[data-tone="clear"]{box-shadow:inset 4px 0 0 #80d7c6}
 .bc-staff-attendance-v266 .bc-att-list{display:grid;gap:10px}.bc-staff-attendance-v266 .bc-att-row{display:grid;grid-template-columns:1.3fr .8fr auto;gap:14px;align-items:center;background:#fff8f3;border:1px solid #efb58f;border-radius:14px;padding:13px}
 .bc-staff-attendance-v266 .bc-att-row small{display:block;color:#7a665a}.bc-staff-attendance-v266 .bc-att-row strong{font-size:17px}.bc-staff-attendance-v266 .bc-att-row span{font-size:13px;color:#705e54}
 .bc-staff-attendance-v266 .bc-att-row button{border:0;border-radius:11px;padding:10px 12px;background:#0c6978;color:#fff;font-weight:900;cursor:pointer}
 .bc-staff-attendance-v266 .bc-att-clear,.bc-staff-attendance-v266 .bc-att-unavailable{padding:16px;border:1px solid #dce7e9;border-radius:14px;background:#f7fbfc;color:#526a71}
 .bc-staff-attendance-v266 .bc-att-source{margin-top:12px;color:#70858b;font-size:12px}
 @media(max-width:760px){.bc-staff-attendance-v266{padding:0 12px}.bc-staff-attendance-v266 .bc-att-head,.bc-staff-attendance-v266 .bc-att-priority{display:block}.bc-staff-attendance-v266 .bc-att-head span,.bc-staff-attendance-v266 .bc-att-priority span{display:block;text-align:left;margin-top:7px}.bc-staff-attendance-v266 .bc-att-row{grid-template-columns:1fr}.bc-staff-attendance-v266 .bc-att-row button{width:100%}}
 `;
 document.head.appendChild(style);
}
function host(){
 const root=byId("workforce-intelligence");if(!root)return null;
 let node=root.querySelector(":scope > .bc-staff-attendance-v266");
 if(!node){node=document.createElement("div");node.className="bc-staff-attendance-v266";root.appendChild(node);}
 return node;
}
function employeeName(schedule,employeeId){
 return schedule?.employees?.find(e=>e.id===employeeId)?.name || employeeId || "Unassigned employee";
}
function attendanceExceptions(schedule,clock,now=new Date()){
 if(!schedule?.publication || schedule.publication.status!=="published")return{certified:false,reason:"Current schedule is not published.",rows:[]};
 const date=isoLocal(now),current=now.getHours()*60+now.getMinutes();
 const activeCards=new Set((clock?.active||[]).map(card=>String(card.employeeId)));
 const rows=(schedule?.shifts||[]).filter(shift=>{
   if(!shift.employeeId || shift.date!==date)return false;
   const start=minutes(shift.startTime),end=minutes(shift.endTime);
   return current>=start+GRACE_MINUTES && current<end;
 }).filter(shift=>!activeCards.has(String(shift.employeeId))).map(shift=>{
   const start=minutes(shift.startTime),late=Math.max(0,current-start);
   return {...shift,employeeName:employeeName(schedule,shift.employeeId),minutesPastStart:late};
 }).sort((a,b)=>b.minutesPastStart-a.minutesPastStart||String(a.employeeName).localeCompare(String(b.employeeName)));
 return{certified:true,rows};
}
function openTimeClock(){
 const target=byId("time-clock");if(!target)return;
 target.scrollIntoView({behavior:"smooth",block:"start"});target.setAttribute("tabindex","-1");target.focus({preventScroll:true});
}
function render(schedule,clock){
 last={schedule,clock};const node=host();if(!node)return;
 const result=attendanceExceptions(schedule,clock),published=schedule?.publication;
 if(!result.certified){
   node.innerHTML=`<div class="bc-att-card"><div class="bc-att-head"><div><small>Attendance exceptions</small><strong>Attendance not certified</strong></div><span>Published schedule required</span></div><div class="bc-att-unavailable"><strong>Blue Current will not infer who should be here.</strong><div>${esc(result.reason)}</div></div><div class="bc-att-source">Expected source: published Scheduling · Actual source: Time Clock · Cause inference disabled</div></div>`;
   return;
 }
 const first=result.rows[0]||null;
 const priority=first
   ? {tone:"attention",title:`Confirm ${first.employeeName}`,detail:`${first.role} shift started ${first.minutesPastStart}m ago and no active clock-in is recorded.`}
   : {tone:"clear",title:"No attendance exceptions",detail:`No published active shift is more than ${GRACE_MINUTES} minutes past start without a matching active clock-in.`};
 node.innerHTML=`<div class="bc-att-card"><div class="bc-att-head"><div><small>Attendance exceptions</small><strong>Who should be here but is not clocked in?</strong></div><span>${published?.publishedAt?`Published ${esc(new Date(published.publishedAt).toLocaleString())}`:"Published schedule"}</span></div>
 <div class="bc-att-priority" data-tone="${priority.tone}"><div><small>Attendance priority</small><strong>${esc(priority.title)}</strong></div><span>${esc(priority.detail)}</span></div>
 <div class="bc-att-list">${result.rows.length?result.rows.map(row=>`<article class="bc-att-row"><div><small>${esc(row.role)} · ${esc(row.startTime)}–${esc(row.endTime)}</small><strong>${esc(row.employeeName)}</strong></div><span>${row.minutesPastStart}m past scheduled start · no active clock-in</span><button type="button" data-bc-attendance-action>Open time clock</button></article>`).join(""):`<div class="bc-att-clear"><strong>Attendance matches the published active schedule.</strong><div>No person-level exception needs action right now.</div></div>`}</div>
 <div class="bc-att-source">Known fact only: published active shift + no matching active Time Clock record after ${GRACE_MINUTES}m grace · Blue Current does not label this a callout or no-show.</div></div>`;
 node.querySelectorAll("[data-bc-attendance-action]").forEach(button=>button.addEventListener("click",openTimeClock));
}
async function load(){
 if(loading)return;loading=true;ensureStyles();host();
 try{
   api ||= new window.BlueCurrentCloudApi("");
   if(!api?.token){render({publication:null,shifts:[]},{active:[]});return;}
   const [schedule,clock]=await Promise.all([api.scheduling(LOCATION_ID,""),api.timeClock(LOCATION_ID)]);
   render(schedule||{},clock||{});
 }catch(error){
   const node=host();if(node)node.innerHTML=`<div class="bc-att-card"><div class="bc-att-head"><div><small>Attendance exceptions</small><strong>Attendance unavailable</strong></div><span>Source error</span></div><div class="bc-att-unavailable"><strong>Blue Current will not estimate around a missing source.</strong><div>${esc(error?.message||"Unable to load Scheduling or Time Clock.")}</div></div></div>`;
 }finally{loading=false;}
}
function init(){
 if(!byId("workforce-intelligence"))return;
 ensureStyles();load();timer=setInterval(load,30000);
 window.BlueCurrentStaffAttendanceV100_2_66={refresh:load,attendanceExceptions,getState:()=>last?JSON.parse(JSON.stringify(last)):null,destroy:()=>clearInterval(timer)};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();