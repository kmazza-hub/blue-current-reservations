(() => {
"use strict";
// V100.2.71 — Manager Action Follow-Up Intelligence.
// Surfaces a restrained, factual review signal for actions created at least 30 minutes ago and still open.
// It does not infer overdue status, mutate Manager Actions, or create a second task system.
const FOLLOW_UP_AFTER_MS=30*60*1000;
const byId=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

function ensureStyles(){
 if(byId("bcManagerFollowupStylesV100271"))return;
 const s=document.createElement("style");s.id="bcManagerFollowupStylesV100271";
 s.textContent=`
 .bc-manager-followup-v271{display:flex;justify-content:space-between;gap:16px;align-items:center;margin:0 0 16px;padding:13px 15px;border:1px solid #efd7c4;border-radius:15px;background:#fff8f2;color:#59331d}
 .bc-manager-followup-v271 small{display:block;color:#8a654f;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
 .bc-manager-followup-v271 strong{display:block;margin-top:3px;font-size:16px}.bc-manager-followup-v271 span{display:block;margin-top:3px;color:#76523c;font-size:12px}
 .bc-mgr-followup-chip-v271{display:inline-flex!important;width:max-content;margin-top:7px;padding:4px 7px;border-radius:999px;background:#fff3e8;color:#7a421f!important;font-size:10px!important;font-weight:900!important;letter-spacing:.05em;text-transform:uppercase}
 .bc-mgr-priority .bc-mgr-followup-chip-v271{background:#4a3428;color:#ffe7d5!important}
 @media(max-width:760px){.bc-manager-followup-v271{display:block}}
 `;
 document.head.appendChild(s);
}
function actions(){
 const state=window.BlueCurrentManagerTruthV100_2_68?.getState?.();
 return Array.isArray(state?.actions?.actions)?state.actions.actions:[];
}
function createdMs(action){
 const value=new Date(action?.createdAt||"").getTime();
 return Number.isFinite(value)&&value>0?value:null;
}
function ageMs(action,now=Date.now()){
 const created=createdMs(action);return created===null?null:Math.max(0,now-created);
}
function needsFollowUp(action,now=Date.now()){
 const age=ageMs(action,now);return !action?.completed&&age!==null&&age>=FOLLOW_UP_AFTER_MS;
}
function rank(action){return ({high:0,medium:1,low:2}[String(action?.priority||"").toLowerCase()]??9);}
function candidates(now=Date.now()){
 return actions().filter(action=>needsFollowUp(action,now)).sort((a,b)=>rank(a)-rank(b)||(createdMs(a)??Infinity)-(createdMs(b)??Infinity));
}
function formatAge(ms){
 const minutes=Math.max(0,Math.floor(ms/60000));
 if(minutes<60)return `${minutes}m`;
 const hours=Math.floor(minutes/60),remaining=minutes%60;
 if(hours<24)return remaining?`${hours}h ${remaining}m`:`${hours}h`;
 const days=Math.floor(hours/24),remainingHours=hours%24;
 return remainingHours?`${days}d ${remainingHours}h`:`${days}d`;
}
function actionForElement(element){
 const id=element?.querySelector?.("[data-bc-mgr-complete]")?.dataset?.bcMgrComplete;
 return id?actions().find(item=>String(item.id)===String(id)):null;
}
function addChip(element,action,now){
 if(!element||!action||element.querySelector(":scope .bc-mgr-followup-chip-v271")||!needsFollowUp(action,now))return;
 const age=ageMs(action,now);if(age===null)return;
 const content=element.querySelector("div")||element;
 const chip=document.createElement("small");chip.className="bc-mgr-followup-chip-v271";
 chip.textContent=`Follow-up review · created ${formatAge(age)} ago`;
 content.appendChild(chip);
}
function decorate(){
 const view=document.querySelector("#command-center > .bc-manager-truth-v268");if(!view)return;
 ensureStyles();
 view.querySelector(".bc-manager-followup-v271")?.remove();
 view.querySelectorAll(".bc-mgr-followup-chip-v271").forEach(node=>node.remove());
 const now=Date.now(),followUps=candidates(now),first=followUps[0]||null;
 if(first){
   const age=ageMs(first,now),box=document.createElement("div");box.className="bc-manager-followup-v271";
   box.innerHTML=`<div><small>Follow-up review</small><strong>${followUps.length} open action${followUps.length===1?"":"s"} created at least 30 minutes ago</strong><span>First review: ${esc(first.title)} · created ${esc(formatAge(age))} ago. This is a review signal, not an overdue diagnosis.</span></div>`;
   const grid=view.querySelector(".bc-mgr-grid");grid?.insertAdjacentElement("beforebegin",box);
 }
 view.querySelectorAll(".bc-mgr-action").forEach(row=>addChip(row,actionForElement(row),now));
 const priority=view.querySelector(".bc-mgr-priority");if(priority)addChip(priority,actionForElement(priority),now);
}
function init(){
 ensureStyles();
 window.addEventListener("bluecurrent:manager-operations-rendered",decorate);
 decorate();
 window.BlueCurrentManagerFollowUpV100_2_71={decorate,getFollowUps:()=>candidates().map(action=>({...action})),followUpAfterMinutes:FOLLOW_UP_AFTER_MS/60000};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
